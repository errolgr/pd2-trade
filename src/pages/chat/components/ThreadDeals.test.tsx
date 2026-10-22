// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import type { WhisperPerson, WhisperTrade } from '@/lib/whisper-history';
import { confirmToast, showToast, type ConfirmToastOptions } from '@/overlay';
import { ThreadDeals } from './ThreadDeals';

vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/overlay', () => ({ confirmToast: vi.fn(), showToast: vi.fn() }));

const offer = (over: Partial<TradeOffer>): TradeOffer => ({
  id: 'o1',
  isIncoming: true,
  playerName: 'bob',
  accountName: 'BobAcc',
  itemName: 'Harlequin Crest',
  price: '2 ist',
  timestamp: new Date('2026-10-01T00:00:00Z'),
  listingId: 'l1',
  userId: 'bob-id',
  ...over,
});

const person: WhisperPerson = {
  key: 'bobacc',
  accountName: 'BobAcc',
  characterName: 'BobSorc',
  playerName: 'BobAcc',
  messages: [],
  trades: [],
  readAt: 0,
};
const trade = (over: Partial<WhisperTrade> = {}): WhisperTrade => ({
  id: 't1',
  isIncoming: true,
  message: "Hi, I'm interested in your Shako listed for 2 ist",
  itemName: 'Shako',
  price: '2 ist',
  timestamp: Date.parse('2026-10-02T00:00:00Z'),
  ...over,
});

const actions = {
  acceptOffer: vi.fn(() => Promise.resolve()),
  rejectOffer: vi.fn(() => Promise.resolve()),
  unacceptOffer: vi.fn(() => Promise.resolve()),
  revokeOffer: vi.fn(() => Promise.resolve()),
  deleteOutgoingOffer: vi.fn(),
  restoreOutgoingOffer: vi.fn(),
  deleteMarketListing: vi.fn(() => Promise.resolve()),
  refresh: vi.fn(),
};

const onCounter = vi.fn();
const onSendWebsite = vi.fn(async (_text: string) => true);
const onWhisper = vi.fn();
const onDismissTrade = vi.fn();

function renderDeals({
  offers = [],
  hiddenOffers = [],
  whisperTrades = [],
  listingIds = ['l1'],
}: {
  offers?: TradeOffer[];
  hiddenOffers?: TradeOffer[];
  whisperTrades?: { person: WhisperPerson; trade: WhisperTrade }[];
  listingIds?: string[];
}) {
  return render(
    <ThreadDeals
      offers={offers}
      hiddenOffers={hiddenOffers}
      whisperTrades={whisperTrades}
      listingIds={listingIds}
      now={Date.parse('2026-10-05T00:03:00Z')}
      onCounter={onCounter}
      onSendWebsite={onSendWebsite}
      onWhisper={onWhisper}
      onDismissTrade={onDismissTrade}
    />,
  );
}

const rows = () => screen.queryAllByRole('listitem').filter((li) => !within(li).queryByText(/more$|Show less/));
const button = (name: RegExp | string) => screen.getByRole('button', { name });

/** Opens an Accept popover, fills the game (and password) and submits it. */
async function accept(game = '', password = '') {
  fireEvent.click(button(/^Accept$/));
  const form = await screen.findByRole('button', { name: /Accept offer/ });
  if (game) fireEvent.change(screen.getByRole('textbox', { name: 'Game name' }), { target: { value: game } });
  if (password) {
    fireEvent.change(screen.getByRole('textbox', { name: 'Game password' }), { target: { value: password } });
  }
  await act(async () => {
    fireEvent.click(form);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePd2Website).mockReturnValue(actions as never);
  vi.mocked(useOptions).mockReturnValue({
    settings: {
      acceptOfferMessageTemplate: 'Accepted {itemName} ({price}). Game: {gameInfo}',
      rejectOfferMessageTemplate: 'Sorry {accountName}, no.',
      soldOfferMessageTemplate: '{itemName} is sold.',
    },
  } as never);
});
afterEach(cleanup);

describe('ThreadDeals website offers', () => {
  it('renders nothing without deals', () => {
    const { container } = renderDeals({});
    expect(container.firstChild).toBeNull();
  });

  it('shows offers in both directions, linked listings first, and hides settled unlinked ones', () => {
    renderDeals({
      offers: [
        offer({ id: 'unlinked', listingId: 'l9', itemName: 'Arachnid Mesh', timestamp: new Date('2026-10-05') }),
        offer({ id: 'settled', listingId: 'l8', itemName: 'Mara', acceptedOfferId: 'someone-else' }),
        offer({ id: 'linked', listingId: 'l1', itemName: 'Harlequin Crest', acceptedOfferId: 'linked' }),
        offer({ id: 'buying', isIncoming: false, listingId: 'l5', itemName: 'Ber Rune', price: '1 ber' }),
      ],
    });
    const text = rows().map((row) => row.textContent);
    expect(text).toHaveLength(1);
    expect(text[0]).toContain('Harlequin Crest');
    expect(text[0]).toContain('accepted');

    fireEvent.click(button(/2 more/));
    const expanded = rows().map((row) => row.textContent ?? '');
    expect(expanded).toHaveLength(3);
    // Each row says whose offer it is and how fresh, then the item and the offered price
    expect(expanded.some((row) => /^Your offer · .*Ber Rune1 ber/.test(row))).toBe(true);
    expect(expanded.some((row) => /^New offer · 3m agoArachnid Mesh2 ist/.test(row))).toBe(true);
    expect(expanded.some((row) => row.includes('Mara'))).toBe(false);
  });

  it('accepts an open incoming offer without a game, by its ids, sending nothing', async () => {
    renderDeals({ offers: [offer({ id: 'o7', listingId: 'l7' })], listingIds: ['l7'] });
    await accept();
    expect(actions.acceptOffer).toHaveBeenCalledWith('l7', 'o7');
    expect(onSendWebsite).not.toHaveBeenCalled();
  });

  it('with a game, messages the filled accept template on the website before accepting', async () => {
    const order: string[] = [];
    onSendWebsite.mockImplementationOnce(async (text: string) => {
      order.push(`send ${text}`);
      return true;
    });
    actions.acceptOffer.mockImplementationOnce(async () => void order.push('accept'));
    renderDeals({ offers: [offer({ id: 'o7', listingId: 'l7' })], listingIds: ['l7'] });
    await accept('trade-1', 'pw');
    expect(order).toEqual(['send Accepted Harlequin Crest (2 ist). Game: trade-1////pw', 'accept']);
  });

  it('leaves the offer open when the game info message fails to send', async () => {
    onSendWebsite.mockResolvedValueOnce(false);
    renderDeals({ offers: [offer({ id: 'o7', listingId: 'l7' })], listingIds: ['l7'] });
    await accept('trade-1', 'pw');
    expect(onSendWebsite).toHaveBeenCalledTimes(1);
    expect(actions.acceptOffer).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Offer not accepted' }));
  });

  it('counters and declines an open incoming offer', async () => {
    renderDeals({ offers: [offer({ id: 'o7', listingId: 'l7' })], listingIds: ['l7'] });
    fireEvent.click(button(/Decline/));
    expect(actions.rejectOffer).toHaveBeenCalledWith('o7');
    await waitFor(() => expect(button(/Counter/)).toHaveProperty('disabled', false));
    fireEvent.click(button(/Counter/));
    expect(onCounter).toHaveBeenCalledWith('Counter for Harlequin Crest: ');
  });

  it('disables the actions while a request runs and recovers when it fails', async () => {
    let fail!: (error: Error) => void;
    actions.rejectOffer.mockImplementationOnce(() => new Promise<void>((_, reject) => (fail = reject)));
    renderDeals({ offers: [offer({})] });

    fireEvent.click(button(/Decline/));
    expect(button(/^Accept$/)).toHaveProperty('disabled', true);
    fail(new Error('nope'));
    await waitFor(() => expect(button(/^Accept$/)).toHaveProperty('disabled', false));
  });

  it('unaccepts an accepted incoming offer by its listing', () => {
    renderDeals({ offers: [offer({ id: 'o3', listingId: 'l3', acceptedOfferId: 'o3' })], listingIds: ['l3'] });
    expect(screen.queryByRole('button', { name: /^Accept$/ })).toBeNull();
    fireEvent.click(button(/Unaccept/));
    expect(actions.unacceptOffer).toHaveBeenCalledWith('l3');
  });

  it('deletes the listing after confirmation and refreshes the offers', async () => {
    renderDeals({ offers: [offer({ listingId: 'l1' })] });
    // A rare, destructive action: in the row's ⋯ menu
    expect(screen.queryByRole('button', { name: /Delete listing/ })).toBeNull();
    await act(async () => {
      fireEvent.pointerDown(button('More actions for Harlequin Crest'), {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: /Delete listing/ }));
    });
    expect(actions.deleteMarketListing).not.toHaveBeenCalled();
    const options = vi.mocked(confirmToast).mock.calls[0][0] as ConfirmToastOptions;
    expect(options.description).toContain('Harlequin Crest');
    await act(async () => {
      await options.onConfirm();
    });
    expect(actions.deleteMarketListing).toHaveBeenCalledWith('l1');
    expect(actions.refresh).toHaveBeenCalledTimes(1);
  });

  it('revokes or hides an open outgoing offer, and unhides a hidden one', async () => {
    renderDeals({
      offers: [offer({ id: 'o4', isIncoming: false, listingId: 'l4' })],
      hiddenOffers: [offer({ id: 'o5', isIncoming: false, listingId: 'l5', itemName: 'Mara' })],
      listingIds: ['l4'],
    });
    expect(screen.queryByRole('button', { name: /Accept|Decline|Counter/ })).toBeNull();
    fireEvent.click(button(/Revoke/));
    expect(actions.revokeOffer).toHaveBeenCalledWith('o4');
    await waitFor(() => expect(button(/^Hide/)).toHaveProperty('disabled', false));
    fireEvent.click(button(/^Hide/));
    expect(actions.deleteOutgoingOffer).toHaveBeenCalledWith('o4');

    // The hidden one sorts last, marked hidden
    expect(rows().at(-1)!.textContent).toContain('hidden');
    fireEvent.click(button(/Unhide/));
    expect(actions.restoreOutgoingOffer).toHaveBeenCalledWith('o5');
  });

  it('settles outgoing offers like incoming ones: no Revoke once the listing took an offer or closed', () => {
    const outgoing = (over: Partial<TradeOffer>) => offer({ isIncoming: false, ...over });
    renderDeals({
      offers: [
        outgoing({ id: 'won', listingId: 'l1', itemName: 'Won Item', acceptedOfferId: 'won' }),
        outgoing({ id: 'lost', listingId: 'l2', itemName: 'Lost Item', acceptedOfferId: 'other' }),
        outgoing({ id: 'gone', listingId: 'l3', itemName: 'Gone Item', listingClosed: true }),
        outgoing({ id: 'stale', listingId: 'l9', itemName: 'Stale Item', listingClosed: true }),
      ],
      listingIds: ['l1', 'l2', 'l3'],
    });
    fireEvent.click(button(/more/));

    const statusOf = (item: string) => rows().find((row) => row.textContent!.includes(item))?.textContent;
    expect(statusOf('Won Item')).toContain('accepted');
    expect(statusOf('Lost Item')).toContain('declined');
    expect(statusOf('Gone Item')).toContain('closed');
    expect(statusOf('Stale Item')).toBeUndefined();
    expect(screen.queryByRole('button', { name: /Revoke/ })).toBeNull();
  });
});

describe('ThreadDeals trade whispers', () => {
  it('copies accept (game required), reject and sold whispers from the templates and dismisses', async () => {
    renderDeals({ whisperTrades: [{ person, trade: trade() }], listingIds: [] });
    expect(rows()[0].textContent).toContain('Shako');
    expect(rows()[0].textContent).toContain('in-game');

    fireEvent.click(button(/^Accept$/));
    expect(await screen.findByRole('button', { name: /Accept offer/ })).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByRole('textbox', { name: 'Game name' }), { target: { value: 'g1' } });
    await act(async () => {
      fireEvent.click(button(/Accept offer/));
    });
    expect(onWhisper).toHaveBeenLastCalledWith(person, 'Accepted Shako (2 ist). Game: g1');

    fireEvent.click(button(/Reject/));
    expect(onWhisper).toHaveBeenLastCalledWith(person, 'Sorry BobAcc, no.');
    fireEvent.click(button(/Sold/));
    expect(onWhisper).toHaveBeenLastCalledWith(person, 'Shako is sold.');
    fireEvent.click(button(/Dismiss/));
    expect(onDismissTrade).toHaveBeenCalledWith(person, 't1');
    expect(actions.acceptOffer).not.toHaveBeenCalled();
  });

  it('only offers Dismiss on a trade whisper you sent', () => {
    renderDeals({ whisperTrades: [{ person, trade: trade({ isIncoming: false }) }], listingIds: [] });
    expect(rows()[0].textContent).toMatch(/^your in-game offer · /);
    expect(screen.queryByRole('button', { name: /Accept|Reject|Sold/ })).toBeNull();
    expect(button(/Dismiss/)).not.toBeNull();
  });
});
