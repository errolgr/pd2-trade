// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { writeText } from '@/lib/browser-clipboard';
import { confirmToast, type ConfirmToastOptions } from '@/overlay';
import { openUrl } from '@/lib/browser-opener';
import { TradeMessage, type TradeMessageData } from './TradeMessage';

vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/lib/browser-clipboard', () => ({ writeText: vi.fn(), readText: vi.fn() }));
const openPanel = vi.hoisted(() => vi.fn());
vi.mock('@/overlay', () => ({ confirmToast: vi.fn(), useOverlay: () => ({ openPanel }) }));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));

beforeAll(() => {
  // framer-motion animations abort under happy-dom; skip them so exits unmount synchronously.
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

const NOW = new Date('2026-05-01T12:00:00Z');

let settings: Record<string, string | undefined>;
let site: {
  authData: { user: { _id: string } } | null;
  createConversation: Mock<(ids: string[]) => Promise<{ _id: string }>>;
  sendMessage: Mock<(conversationId: string, content: string, senderId: string) => Promise<void>>;
};
let calls: string[];

function whisper(overrides: Partial<TradeMessageData> = {}): TradeMessageData {
  return {
    id: 't1',
    isIncoming: true,
    playerName: 'Buyer',
    accountName: 'buyeracct',
    characterName: 'BuyerChar',
    message: 'Hi, I would like to buy your Shako',
    itemName: 'Shako',
    price: '2 Ist',
    timestamp: NOW,
    ...overrides,
  };
}

function websiteOffer(overrides: Partial<TradeMessageData> = {}): TradeMessageData {
  return whisper({ id: 'offer1', listingId: 'listing1', userId: 'buyer-user', ...overrides });
}

function renderTrade(props: Partial<React.ComponentProps<typeof TradeMessage>> & { trade: TradeMessageData }) {
  const onClose = vi.fn();
  const view = render(
    <TooltipProvider>
      <TradeMessage onClose={onClose}
        {...props} />
    </TooltipProvider>,
  );
  return { ...view, onClose };
}

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function click(el: Element) {
  await act(async () => {
    fireEvent.click(el);
  });
  await flush();
}

const button = (name: string) => screen.getByRole('button', { name });
const lastClipboard = () => vi.mocked(writeText).mock.calls.at(-1)?.[0];

async function openAcceptAndSubmit(game: string, password = '') {
  await click(button('Accept'));
  const gameInput = screen.getByPlaceholderText('Game');
  fireEvent.change(gameInput, { target: { value: game } });
  if (password) fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: password } });
  await act(async () => {
    fireEvent.submit(gameInput.closest('form')!);
  });
  await flush();
}

/** Options of the last confirmToast() call; `confirm()` runs its onConfirm like the toast's confirm button. */
function lastConfirm() {
  const options = vi.mocked(confirmToast).mock.calls.at(-1)?.[0] as ConfirmToastOptions;
  return {
    options,
    confirm: async () => {
      await act(async () => {
        await options.onConfirm();
      });
      await flush();
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  settings = {};
  calls = [];
  site = {
    authData: { user: { _id: 'me' } },
    createConversation: vi.fn(async (ids: string[]) => {
      calls.push(`conversation ${ids.join(',')}`);
      return { _id: 'conv1' };
    }),
    sendMessage: vi.fn(async (conversationId: string, content: string, senderId: string) => {
      calls.push(`message ${conversationId} ${senderId}: ${content}`);
    }),
  };
  // Partial hook values: the component only reads these fields.
  vi.mocked(usePd2Website).mockImplementation(() => site as unknown as ReturnType<typeof usePd2Website>);
  vi.mocked(useOptions).mockImplementation(() => ({ settings }) as unknown as ReturnType<typeof useOptions>);
  vi.mocked(writeText).mockResolvedValue(undefined);
  vi.mocked(confirmToast).mockReset();
  openPanel.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TradeMessage display', () => {
  it('shows player, item and price for a whisper, with item as plain text', () => {
    renderTrade({ trade: whisper() });
    expect(screen.queryByText('Buyer')).not.toBeNull();
    expect(screen.getByText('Shako').tagName).toBe('SPAN');
    expect(screen.queryByText('2 Ist')).not.toBeNull();
    expect(screen.queryByText(whisper().message)).toBeNull();
  });

  it('falls back to the raw message when neither item nor price is known', () => {
    renderTrade({ trade: whisper({ itemName: undefined, price: undefined }) });
    expect(screen.queryByText(whisper().message)).not.toBeNull();
  });

  it('links the item to its market listing for website offers', async () => {
    renderTrade({ trade: websiteOffer() });
    const link = screen.getByText('Shako');
    expect(link.getAttribute('href')).toBe('https://www.projectdiablo2.com/market/listing/listing1');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    fireEvent(link, event);
    expect(event.defaultPrevented).toBe(true);
    expect(vi.mocked(openUrl)).toHaveBeenCalledWith('https://www.projectdiablo2.com/market/listing/listing1');
  });

  it('refreshes the relative timestamp every 30 seconds', async () => {
    renderTrade({ trade: whisper() });
    expect(screen.queryByText('a few seconds ago')).not.toBeNull();
    vi.setSystemTime(new Date(NOW.getTime() + 59_000));
    await flush(30_000);
    expect(screen.queryByText('a minute ago')).not.toBeNull();
  });

  it('opens the character profile', async () => {
    renderTrade({ trade: whisper() });
    await click(button('View profile'));
    expect(vi.mocked(openUrl)).toHaveBeenCalledWith('https://www.projectdiablo2.com/character/BuyerChar');
  });
});

describe('TradeMessage whisper actions (clipboard)', () => {
  it('copies the whisper command and shows transient copied feedback', async () => {
    renderTrade({ trade: whisper() });
    await click(button('Copy whisper command'));

    expect(lastClipboard()).toBe('/w *buyeracct ');
    expect(screen.queryAllByText('Copied to clipboard!').length).toBeGreaterThan(0);

    await flush(2000);
    expect(screen.queryAllByText('Copied to clipboard!')).toHaveLength(0);
  });

  it('requires a game name before accepting', async () => {
    renderTrade({ trade: whisper() });
    await click(button('Accept'));
    const submit = screen.getAllByRole('button', { name: 'Accept' }).find((b) => b.getAttribute('type') === 'submit')!;
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      fireEvent.submit(submit.closest('form')!);
    });
    expect(vi.mocked(writeText)).not.toHaveBeenCalled();
  });

  it('copies the default accept whisper with game and password joined by ////', async () => {
    renderTrade({ trade: whisper() });
    await openAcceptAndSubmit('trade123', 'pw');
    expect(lastClipboard()).toBe('/w *buyeracct Your offer has been accepted. Game: trade123////pw');
    // Popover closes after a successful accept
    expect(screen.queryByPlaceholderText('Game')).toBeNull();
  });

  it('omits the password separator when no password is given', async () => {
    renderTrade({ trade: whisper() });
    await openAcceptAndSubmit('trade123');
    expect(lastClipboard()).toBe('/w *buyeracct Your offer has been accepted. Game: trade123');
  });

  it('fills every placeholder of a custom accept template, including repeats', async () => {
    settings.acceptOfferMessageTemplate =
      '{characterName}/{accountName}: {itemName} for {price} -> {gameInfo} ({gameInfo})';
    renderTrade({ trade: whisper() });
    await openAcceptAndSubmit('g1');
    expect(lastClipboard()).toBe('/w *buyeracct BuyerChar/buyeracct: Shako for 2 Ist -> g1 (g1)');
  });

  it('copies the reject whisper using the default and the custom template', async () => {
    const { unmount } = renderTrade({ trade: whisper() });
    await click(button('Reject'));
    expect(lastClipboard()).toBe('/w *buyeracct Your offer has been rejected.');
    unmount();

    settings.rejectOfferMessageTemplate = 'Sorry {characterName}, {itemName} is gone';
    renderTrade({ trade: whisper() });
    await click(button('Reject'));
    expect(lastClipboard()).toBe('/w *buyeracct Sorry BuyerChar, Shako is gone');
  });

  it('copies the sold whisper, substituting missing fields with empty strings', async () => {
    settings.soldOfferMessageTemplate = '{itemName}|{price} sold';
    renderTrade({ trade: whisper({ itemName: undefined, price: undefined }) });
    await click(button('Item sold'));
    expect(lastClipboard()).toBe('/w *buyeracct | sold');
  });

  it('stops tracking a whisper via delete', async () => {
    const { onClose } = renderTrade({ trade: whisper() });
    await click(button('Delete trade offer'));
    expect(onClose).toHaveBeenCalledWith('t1');
  });

  it('shows no accept/reject controls for outgoing whispers', () => {
    renderTrade({ trade: whisper({ isIncoming: false }) });
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });
});

describe('TradeMessage history', () => {
  it('lists history oldest-first, labelling own messages as You, and closes on Escape', async () => {
    renderTrade({
      trade: whisper({
        history: [
          { id: 'h2', isIncoming: false, message: 'sure, inv?', timestamp: new Date(NOW.getTime() - 60_000) },
          { id: 'h1', isIncoming: true, message: 'wtb shako', timestamp: new Date(NOW.getTime() - 120_000) },
        ],
      }),
    });
    await click(button('View history'));

    const dialog = screen.getByRole('dialog', { name: 'Communication History' });
    const entries = Array.from(dialog.querySelectorAll('p.whitespace-pre-wrap')).map((p) => p.textContent);
    expect(entries).toEqual(['wtb shako', 'sure, inv?']);
    expect(dialog.textContent).toContain('You');

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    await flush(500);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows an empty history state and closes on outside click after the open delay', async () => {
    renderTrade({ trade: whisper() });
    await click(button('View history'));
    expect(screen.queryByText('No history yet')).not.toBeNull();

    await flush(100);
    await act(async () => {
      fireEvent.pointerDown(document.body);
    });
    await flush(500);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on a press outside even when the target stops propagation (other panels drag handles)', async () => {
    renderTrade({ trade: whisper() });
    const other = document.createElement('div');
    other.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.appendChild(other);
    await click(button('View history'));

    await flush(100);
    await act(async () => {
      fireEvent.pointerDown(other);
    });
    await flush(500);
    expect(screen.queryByRole('dialog')).toBeNull();
    other.remove();
  });

  it('renders the history card inside the enclosing panel frame', async () => {
    const frame = document.createElement('div');
    frame.setAttribute('data-panel-id', 'tradeMessages');
    document.body.appendChild(frame);
    render(
      <TooltipProvider>
        <TradeMessage trade={whisper()}
          onClose={vi.fn()} />
      </TooltipProvider>,
      { container: frame.appendChild(document.createElement('div')) },
    );
    await click(button('View history'));
    expect(frame.contains(screen.getByRole('dialog', { name: 'Communication History' }))).toBe(true);
    frame.remove();
  });

  it('has no history or sold actions for website offers', () => {
    renderTrade({ trade: websiteOffer(), onAccept: vi.fn(), onReject: vi.fn() });
    expect(screen.queryByRole('button', { name: 'View history' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Item sold' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete trade offer' })).toBeNull();
  });
});

describe('TradeMessage website offer accept/decline', () => {
  it('messages the buyer with the game info before accepting the offer', async () => {
    const onAccept = vi.fn(async (listingId: string, offerId: string) => {
      calls.push(`accept ${listingId} ${offerId}`);
    });
    renderTrade({ trade: websiteOffer(), onAccept });
    await openAcceptAndSubmit('g1', 'p1');

    expect(calls).toEqual([
      'conversation me,buyer-user',
      'message conv1 me: Your offer has been accepted. Game: g1////p1',
      'accept listing1 offer1',
    ]);
    expect(vi.mocked(writeText)).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('Game')).toBeNull();
    expect(screen.queryAllByText('Offer accepted!').length).toBeGreaterThan(0);
  });

  it('does not accept when the user is not signed in', async () => {
    site.authData = null;
    const onAccept = vi.fn();
    renderTrade({ trade: websiteOffer(), onAccept });
    await openAcceptAndSubmit('g1');

    expect(onAccept).not.toHaveBeenCalled();
    expect(site.createConversation).not.toHaveBeenCalled();
  });

  it('does not accept when the offer has no buyer user id', async () => {
    const onAccept = vi.fn();
    renderTrade({ trade: websiteOffer({ userId: undefined }), onAccept });
    await openAcceptAndSubmit('g1');
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('does not accept if messaging the buyer fails, and keeps the form usable', async () => {
    site.sendMessage.mockRejectedValue(new Error('chat down'));
    const onAccept = vi.fn();
    renderTrade({ trade: websiteOffer(), onAccept });
    await openAcceptAndSubmit('g1');

    expect(onAccept).not.toHaveBeenCalled();
    const submit = screen.getAllByRole('button', { name: 'Accept' }).find((b) => b.getAttribute('type') === 'submit');
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });

  it('ignores a second submit while the first accept is still processing', async () => {
    const pending = Promise.withResolvers<void>();
    const onAccept = vi.fn(() => pending.promise);
    renderTrade({ trade: websiteOffer(), onAccept });
    await openAcceptAndSubmit('g1');
    const form = screen.getByPlaceholderText('Game').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });
    await flush();

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(site.sendMessage).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve());
  });

  it('rejects via the website and disables the button while pending', async () => {
    const pending = Promise.withResolvers<void>();
    const onReject = vi.fn(() => pending.promise);
    renderTrade({ trade: websiteOffer(), onReject });
    await click(button('Reject'));

    expect(onReject).toHaveBeenCalledWith('offer1');
    expect((button('Reject') as HTMLButtonElement).disabled).toBe(true);
    expect(vi.mocked(writeText)).not.toHaveBeenCalled();

    await act(async () => pending.resolve());
    await flush();
    expect((button('Reject') as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryAllByText('Offer rejected!').length).toBeGreaterThan(0);
  });

  it('re-enables reject after a failed website reject', async () => {
    const onReject = vi.fn().mockRejectedValue(new Error('500'));
    renderTrade({ trade: websiteOffer(), onReject });
    await click(button('Reject'));
    expect((button('Reject') as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryAllByText('Offer rejected!')).toHaveLength(0);
  });

  it('shows the accepted state with unaccept instead of accept/reject', async () => {
    const onUnaccept = vi.fn(async () => {});
    renderTrade({ trade: websiteOffer({ acceptedOfferId: 'offer1' }), onUnaccept, onReject: vi.fn() });

    expect(screen.queryByText('Accepted')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();

    await click(button('Unaccept'));
    expect(onUnaccept).toHaveBeenCalledWith('listing1');
    expect(screen.queryAllByText('Offer unaccepted!').length).toBeGreaterThan(0);
  });

  it('treats a different accepted offer on the same listing as not accepted', () => {
    renderTrade({ trade: websiteOffer({ acceptedOfferId: 'other-offer' }), onReject: vi.fn() });
    expect(screen.queryByText('Accepted')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeNull();
  });

  it('opens a chat with the buyer', async () => {
    renderTrade({ trade: websiteOffer() });
    await click(button('Start chat'));
    expect(openPanel).toHaveBeenCalledWith('chat', {
      conversationId: 'conv1',
      conversation: { _id: 'conv1' },
    });
    expect(site.createConversation).toHaveBeenCalledWith(['me', 'buyer-user']);
  });

  it('does not open a chat when signed out', async () => {
    site.authData = null;
    renderTrade({ trade: websiteOffer() });
    await click(button('Start chat'));
    expect(openPanel).not.toHaveBeenCalled();
  });
});

describe('TradeMessage listing deletion', () => {
  it('asks for confirmation naming the item, then deletes and closes the offer', async () => {
    const onDelete = vi.fn(async () => {});
    const { onClose } = renderTrade({ trade: websiteOffer(), onDelete });

    await click(button('Delete listing'));
    const { options, confirm } = lastConfirm();
    expect(options).toMatchObject({
      title: 'Delete Listing?',
      description: 'Are you sure you want to delete the listing for Shako?',
      confirmLabel: 'Delete',
      variant: 'warning',
      duration: 10000,
    });
    expect(onDelete).not.toHaveBeenCalled();

    await confirm();
    expect(onDelete).toHaveBeenCalledWith('listing1');
    expect(onClose).toHaveBeenCalledWith('offer1');
  });

  it('uses a generic description when the item name is unknown', async () => {
    renderTrade({ trade: websiteOffer({ itemName: undefined }), onDelete: vi.fn() });
    await click(button('Delete listing'));
    expect(lastConfirm().options.description).toBe('Are you sure you want to delete this listing?');
  });

  it('keeps the offer open when deletion fails', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('nope'));
    const { onClose } = renderTrade({ trade: websiteOffer(), onDelete });
    await click(button('Delete listing'));
    await lastConfirm().confirm();
    expect(onDelete).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores a second confirmation while the delete is still running', async () => {
    const pending = Promise.withResolvers<void>();
    const onDelete = vi.fn(() => pending.promise);
    renderTrade({ trade: websiteOffer(), onDelete });
    await click(button('Delete listing'));
    await click(button('Delete listing'));
    const first = vi.mocked(confirmToast).mock.calls[0][0].onConfirm;
    const second = vi.mocked(confirmToast).mock.calls[1][0].onConfirm;

    await act(async () => {
      void first();
      void second();
      pending.resolve();
    });
    await flush();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('offers no listing deletion without a delete handler', () => {
    renderTrade({ trade: websiteOffer() });
    expect(screen.queryByRole('button', { name: 'Delete listing' })).toBeNull();
  });
});

describe('TradeMessage outgoing website offers', () => {
  it('hides an outgoing offer and removes it from the list', async () => {
    const onDeleteOutgoing = vi.fn();
    const { onClose } = renderTrade({
      trade: websiteOffer({ isIncoming: false }),
      onDeleteOutgoing,
      onRevoke: vi.fn(),
    });
    await click(button('Hide offer'));
    expect(onDeleteOutgoing).toHaveBeenCalledWith('offer1');
    expect(onClose).toHaveBeenCalledWith('offer1');
  });

  it('revokes an active outgoing offer and survives a revoke failure', async () => {
    const onRevoke = vi.fn().mockRejectedValue(new Error('gone'));
    const { onClose } = renderTrade({ trade: websiteOffer({ isIncoming: false }), onRevoke });
    await click(button('Revoke offer'));
    expect(onRevoke).toHaveBeenCalledWith('offer1');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Revoke offer' })).not.toBeNull();
  });

  it('offers restore instead of revoke for hidden offers', async () => {
    const onRestoreOutgoing = vi.fn();
    const { onClose } = renderTrade({
      trade: websiteOffer({ isIncoming: false }),
      onRevoke: vi.fn(),
      onRestoreOutgoing,
      isHidden: true,
    });
    expect(screen.queryByText('Hidden')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Revoke offer' })).toBeNull();

    await click(button('Restore offer'));
    expect(onRestoreOutgoing).toHaveBeenCalledWith('offer1');
    expect(onClose).toHaveBeenCalledWith('offer1');
  });

  it('shows a refresh action only when a refresh handler is given', async () => {
    const onRefresh = vi.fn();
    renderTrade({ trade: whisper(), onRefresh });
    await click(button('Refresh'));
    expect(onRefresh).toHaveBeenCalledWith('t1');
  });
});
