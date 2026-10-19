// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { useInView } from 'react-intersection-observer';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AccountMismatchError, AuthenticationError, usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { emit } from '@/lib/browser-events';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import { ToastActionType } from '@/common/types/Events';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import type { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import ListItemShortcutForm from './ListItemShortcut';

vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }));
vi.mock('@/hooks/pd2website/usePD2Website', () => {
  class AuthenticationError extends Error {}
  class AccountMismatchError extends Error {}
  return { usePd2Website: vi.fn(), AuthenticationError, AccountMismatchError };
});
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/lib/browser-events', () => ({ emit: vi.fn() }));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/lib/browser-webview', () => ({ getCurrentWebviewWindow: vi.fn() }));
vi.mock('@/lib/telemetry', () => ({ trackEvent: vi.fn(), trackMeasurement: vi.fn() }));
vi.mock('react-intersection-observer', () => ({ useInView: vi.fn() }));

const POLL_INTERVAL = 15_000;
const QUEUE_KEY = 'pd2_pending_listings_queue';

const copied = { name: 'Harlequin Crest', type: 'Shako', location: 'Stash' } as unknown as PriceCheckItem;

const stash = (n: number): GameStashItem =>
  ({ hash: `h${n}`, name: `Shako #${n}`, quality: { name: 'Unique' }, modifiers: [], socket_count: 0 }) as never;

const marketListing = (n: number, over: Partial<MarketListingEntry> = {}) =>
  ({
    _id: `L${n}`,
    price: '',
    hr_price: 0,
    bumped_at: new Date(0).toISOString(),
    created_at: new Date(0).toISOString(),
    item: stash(n),
    ...over,
  }) as unknown as MarketListingEntry;

type Api = {
  findMatchingItems: Mock<(item: PriceCheckItem) => Promise<GameStashItem[]>>;
  listSpecificItem: Mock<(item: GameStashItem, hr: number, note: string, type: string) => Promise<{ _id: string }>>;
  getMarketListings: Mock<(q: MarketListingQuery) => Promise<{ data: MarketListingEntry[]; total: number }>>;
  updateMarketListing: Mock<(id: string, fields: Record<string, unknown>) => Promise<void>>;
  updateItemByHash: Mock<(hash: string, fields: Record<string, unknown>) => Promise<void>>;
  deleteMarketListing: Mock<(id: string) => Promise<void>>;
  bumpAllMarketListings: Mock<(id: string) => Promise<void>>;
  authData: { user: { _id: string } } | null;
};

let api: Api;
/** Listings that belong to the user (what the "all listings" query returns). */
let userListings: MarketListingEntry[];
/** Total reported by the server; defaults to userListings.length. */
let userTotal: number | null;
let hide: Mock<() => Promise<void>>;

const toasts = () => vi.mocked(emit).mock.calls.filter(([e]) => e === 'toast-event').map(([, p]) => p);
const tab = (name: RegExp) => screen.getByRole('tab', { name });
const submitButton = () => document.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const priceInput = () => screen.getByPlaceholderText('HR') as HTMLInputElement;
const noteInput = () => screen.getByPlaceholderText('Note...') as HTMLInputElement;
const storedQueue = () => JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');

function renderForm(item: PriceCheckItem | null = copied) {
  const view = render(
    <TooltipProvider>
      <ListItemShortcutForm item={item} />
    </TooltipProvider>,
  );
  return {
    ...view,
    setItem: (next: PriceCheckItem | null) =>
      view.rerender(
        <TooltipProvider>
          <ListItemShortcutForm item={next} />
        </TooltipProvider>,
      ),
  };
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function submit() {
  await act(async () => {
    fireEvent.submit(submitButton().closest('form')!);
  });
  await flush();
}

async function selectTab(name: RegExp) {
  await act(async () => {
    fireEvent.mouseDown(tab(name), { button: 0 });
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.mocked(emit).mockResolvedValue(undefined);
  userListings = [];
  userTotal = null;
  api = {
    findMatchingItems: vi.fn(async () => [stash(1)]),
    listSpecificItem: vi.fn(async () => ({ _id: 'NEW' })),
    getMarketListings: vi.fn(async (q) => {
      const hashes: string[] | undefined = q['item.hash']?.$in;
      if (hashes) {
        const data = userListings.filter((l) => hashes.includes(l.item.hash));
        return { data, total: data.length };
      }
      return { data: userListings.slice(q.$skip, q.$skip + q.$limit), total: userTotal ?? userListings.length };
    }),
    updateMarketListing: vi.fn(async () => {}),
    updateItemByHash: vi.fn(async () => {}),
    deleteMarketListing: vi.fn(async () => {}),
    bumpAllMarketListings: vi.fn(async () => {}),
    authData: { user: { _id: 'u1' } },
  };
  vi.mocked(usePd2Website).mockImplementation(() => api as never);
  const options = { settings: { mode: 'softcore', ladder: 'ladder' } };
  vi.mocked(useOptions).mockImplementation(() => options as never);
  vi.mocked(useInView).mockImplementation(() => ({ ref: vi.fn(), inView: false }) as never);
  hide = vi.fn(async () => {});
  const win = { hide };
  vi.mocked(getCurrentWebviewWindow).mockReturnValue(win as never);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('tabs', () => {
  it('opens on List Item for a stash item', async () => {
    renderForm();
    await flush();
    expect(tab(/List Item/).getAttribute('data-state')).toBe('active');
  });

  it('opens on Manage with List Item disabled for a non-stash item', async () => {
    renderForm({ ...copied, location: 'Equipped' } as never);
    await flush();
    expect(tab(/Manage/).getAttribute('data-state')).toBe('active');
    expect((tab(/List Item/) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the user listing count on the Manage tab', async () => {
    userListings = [marketListing(5), marketListing(6)];
    userTotal = 12;
    renderForm();
    await flush();
    expect(tab(/Manage/).textContent).toBe('Manage12');
  });

  it('close hides the window', async () => {
    renderForm();
    await flush();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    });
    expect(hide).toHaveBeenCalledTimes(1);
  });
});

describe('finding the item', () => {
  it('auto-selects a single match and offers Post', async () => {
    renderForm();
    await flush();
    expect(api.findMatchingItems.mock.calls).toEqual([[copied]]);
    const card = screen.getByRole('button', { name: /Shako #1/ });
    expect(card.getAttribute('aria-pressed')).toBe('true');
    expect(submitButton().textContent).toBe('Post');
  });

  it('requires picking one of multiple matches before the form appears', async () => {
    api.findMatchingItems.mockResolvedValue([stash(1), stash(2)]);
    renderForm();
    await flush();
    expect(screen.queryByPlaceholderText('HR')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Shako #2/ }));
    });
    expect(screen.getByRole('button', { name: /Shako #2/ }).getAttribute('aria-pressed')).toBe('true');
    expect(submitButton().textContent).toBe('Post');
  });

  it('shows a retryable error when the stash lookup fails', async () => {
    api.findMatchingItems.mockRejectedValueOnce(new Error('Stash API down'));
    renderForm();
    await flush();
    expect(screen.getByRole('alert').textContent).toContain('Stash API down');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Retry Search/ }));
    });
    await flush();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(submitButton().textContent).toBe('Post');
  });

  it('explains an account mismatch and raises a destructive toast', async () => {
    api.findMatchingItems.mockRejectedValueOnce(new AccountMismatchError('Wrong account'));
    renderForm();
    await flush();
    expect(screen.queryByText('Wrong account detected')).not.toBeNull();
    expect(toasts()).toEqual([
      { title: 'Account Mismatch', description: 'Wrong account', variant: 'destructive', duration: 8000 },
    ]);
  });

  it('shows auth errors inline without logging them as app errors', async () => {
    api.findMatchingItems.mockRejectedValueOnce(new AuthenticationError('Session expired'));
    renderForm();
    await flush();
    expect(screen.getByRole('alert').textContent).toContain('Session expired');
    expect(console.error).not.toHaveBeenCalled();
    expect(toasts()).toEqual([]);
  });

  it('does not search before the user is authenticated', async () => {
    api.authData = null;
    renderForm();
    await flush();
    expect(api.findMatchingItems).not.toHaveBeenCalled();
  });

  it('prompts to copy an item when none is provided', async () => {
    renderForm(null);
    await flush();
    await selectTab(/List Item/);
    expect(screen.queryByText('No Item Selected')).not.toBeNull();
  });
});

describe('listing a new item', () => {
  it('posts with an exact HR price, toasts a link to the listing, and hides', async () => {
    renderForm();
    await flush();
    fireEvent.change(noteInput(), { target: { value: 'fast trade' } });
    fireEvent.change(priceInput(), { target: { value: ' 2.5 ' } });
    await submit();
    expect(api.listSpecificItem.mock.calls).toEqual([[stash(1), 2.5, 'fast trade', 'exact']]);
    expect(toasts()).toEqual([
      {
        title: 'Item listed!',
        description: 'Added to the PD2 marketplace.',
        action: { label: 'Shako #1', type: ToastActionType.OPEN_MARKET_LISTING, data: { listingId: 'NEW' } },
      },
    ]);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it('posts a note-only listing with zero HR', async () => {
    renderForm();
    await flush();
    fireEvent.change(noteInput(), { target: { value: 'offers' } });
    await submit();
    expect(api.listSpecificItem.mock.calls).toEqual([[stash(1), 0, 'offers', 'note']]);
  });

  it('refuses to post at the 50-listing cap', async () => {
    userTotal = 50;
    renderForm();
    await flush();
    fireEvent.change(priceInput(), { target: { value: '1' } });
    await submit();
    expect(api.listSpecificItem).not.toHaveBeenCalled();
    expect(toasts()).toEqual([expect.objectContaining({ title: 'Maximum listings reached', variant: 'error' })]);
    expect(hide).not.toHaveBeenCalled();
    expect(submitButton().disabled).toBe(false);
  });

  it('surfaces a failed post inline and keeps the window open', async () => {
    api.listSpecificItem.mockRejectedValueOnce(new Error('Item already listed'));
    renderForm();
    await flush();
    fireEvent.change(priceInput(), { target: { value: '1' } });
    await submit();
    expect(screen.getByRole('alert').textContent).toContain('Item already listed');
    expect(hide).not.toHaveBeenCalled();
  });
});

describe('updating an existing listing', () => {
  beforeEach(() => {
    userListings = [marketListing(1, { hr_price: 3, price: 'or best' })];
  });

  it('prefills the form from the listing and switches to Update', async () => {
    renderForm();
    await flush();
    expect(noteInput().value).toBe('or best');
    expect(priceInput().value).toBe('3');
    expect(submitButton().textContent).toBe('Update');
  });

  it('updates the listing and stash item instead of creating a new one', async () => {
    renderForm();
    await flush();
    fireEvent.change(priceInput(), { target: { value: '' } });
    await submit();
    expect(api.listSpecificItem).not.toHaveBeenCalled();
    expect(api.updateMarketListing.mock.calls).toEqual([['L1', { price: 'or best', hr_price: 0 }]]);
    expect(api.updateItemByHash.mock.calls).toEqual([['h1', { price: 'or best', hr_price: 0 }]]);
    expect(toasts()).toEqual([{ title: 'PD2 Trader', description: 'Listing updated!' }]);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it('allows updating even at the 50-listing cap', async () => {
    userTotal = 50;
    renderForm();
    await flush();
    fireEvent.change(priceInput(), { target: { value: '4' } });
    await submit();
    expect(api.updateMarketListing.mock.calls).toEqual([['L1', { hr_price: 4, price: 'or best' }]]);
  });

  it('bumping from the badge updates both the listing and the stash item', async () => {
    renderForm();
    await flush();
    const card = screen.getByRole('button', { name: /Shako #1/ });
    fireEvent.mouseEnter(within(card).getByText('Listed').closest('span.relative')!);
    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: /Bump/ }));
    });
    await flush();
    expect(api.updateMarketListing.mock.calls[0][0]).toBe('L1');
    expect(api.updateItemByHash.mock.calls[0][0]).toBe('h1');
    expect(toasts()).toContain('Item bumped successfully!');
    // The badge's refresh re-runs the stash search.
    expect(api.findMatchingItems).toHaveBeenCalledTimes(2);
  });
});

describe('queueing', () => {
  async function queueWithNote(note: string) {
    fireEvent.change(noteInput(), { target: { value: note } });
    await submit();
  }

  it('offers queueing when nothing matches, then shows the item on the Queued tab', async () => {
    api.findMatchingItems.mockResolvedValue([]);
    renderForm();
    await flush();
    expect(screen.queryByText('No items found matching "Harlequin Crest"')).not.toBeNull();
    expect(submitButton().textContent).toBe('Queue Item');
    await queueWithNote('wts');

    expect(toasts()[0]).toMatchObject({ title: 'Item queued' });
    expect(tab(/Queued/).getAttribute('data-state')).toBe('active');
    expect(tab(/Queued/).textContent).toBe('Queued1');
    expect(screen.queryByText('Note: wts')).not.toBeNull();
    expect(storedQueue()).toHaveLength(1);
    expect(storedQueue()[0]).toMatchObject({ item: copied, formData: { note: 'wts' } });
    expect(storedQueue()[0].initialMatchingHashes).toBeUndefined();
  });

  it('lists the queued item once it appears in the stash', async () => {
    api.findMatchingItems.mockResolvedValue([]);
    renderForm();
    await flush();
    fireEvent.change(priceInput(), { target: { value: '2' } });
    await submit();
    // The immediate poll still sees nothing.
    expect(api.listSpecificItem).not.toHaveBeenCalled();

    api.findMatchingItems.mockResolvedValue([stash(9)]);
    await tick(POLL_INTERVAL);
    expect(api.listSpecificItem.mock.calls).toEqual([[stash(9), 2, '', 'exact']]);
    expect(toasts().at(-1)).toMatchObject({
      title: 'Item listed!',
      action: { data: { listingId: 'NEW' }, label: 'Shako #9' },
    });
    expect(storedQueue()).toEqual([]);
    expect(tab(/Queued/).textContent).toBe('Queued');
  });

  it('"None of these match?" queues against only new stash items', async () => {
    api.findMatchingItems.mockResolvedValue([stash(1), stash(2)]);
    renderForm();
    await flush();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Queue Item' }));
    });
    expect(screen.queryByText(/Queue this item to wait for the new one/)).not.toBeNull();
    await queueWithNote('new one');
    expect(storedQueue()[0].initialMatchingHashes).toEqual(['h1', 'h2']);

    // Polls that only see the original items must not list anything.
    await tick(POLL_INTERVAL);
    expect(api.listSpecificItem).not.toHaveBeenCalled();

    api.findMatchingItems.mockResolvedValue([stash(1), stash(3), stash(2)]);
    await tick(POLL_INTERVAL);
    expect(api.listSpecificItem.mock.calls).toEqual([[stash(3), 0, 'new one', 'note']]);
  });

  it('gives up after the timeout window with an error toast', async () => {
    api.findMatchingItems.mockResolvedValue([]);
    renderForm();
    await flush();
    await queueWithNote('x');
    await tick(59 * POLL_INTERVAL);
    expect(storedQueue()).toHaveLength(1);
    await tick(POLL_INTERVAL);
    expect(storedQueue()).toEqual([]);
    expect(toasts().at(-1)).toMatchObject({ title: 'Listing timeout', variant: 'error' });
    expect(api.listSpecificItem).not.toHaveBeenCalled();
    // Polling stops once the queue is empty.
    const calls = api.findMatchingItems.mock.calls.length;
    await tick(5 * POLL_INTERVAL);
    expect(api.findMatchingItems.mock.calls.length).toBe(calls);
  });

  it('drops a queued item on account mismatch during polling', async () => {
    api.findMatchingItems.mockResolvedValue([]);
    renderForm();
    await flush();
    await queueWithNote('x');
    api.findMatchingItems.mockRejectedValueOnce(new AccountMismatchError('mismatch'));
    await tick(POLL_INTERVAL);
    expect(storedQueue()).toEqual([]);
    expect(toasts().at(-1)).toMatchObject({ title: 'Account Mismatch', description: 'mismatch' });
  });

  it('keeps polling after a transient lookup error', async () => {
    api.findMatchingItems.mockResolvedValue([]);
    renderForm();
    await flush();
    await queueWithNote('x');
    api.findMatchingItems.mockRejectedValueOnce(new Error('503'));
    await tick(POLL_INTERVAL);
    expect(storedQueue()).toHaveLength(1);
    api.findMatchingItems.mockResolvedValue([stash(4)]);
    await tick(POLL_INTERVAL);
    expect(api.listSpecificItem).toHaveBeenCalledTimes(1);
  });

  it('re-checks the cap when the queued item is found', async () => {
    api.findMatchingItems.mockResolvedValue([]);
    renderForm();
    await flush();
    await queueWithNote('x');
    userTotal = 50;
    api.findMatchingItems.mockResolvedValue([stash(4)]);
    await tick(POLL_INTERVAL);
    expect(api.listSpecificItem).not.toHaveBeenCalled();
    expect(toasts().at(-1)).toMatchObject({ title: 'Maximum listings reached' });
    expect(storedQueue()).toEqual([]);
  });

  it('reports a failed listing of a found queued item', async () => {
    api.findMatchingItems.mockResolvedValue([]);
    renderForm();
    await flush();
    await queueWithNote('x');
    api.listSpecificItem.mockRejectedValueOnce(new Error('rejected'));
    api.findMatchingItems.mockResolvedValue([stash(4)]);
    await tick(POLL_INTERVAL);
    expect(toasts().at(-1)).toEqual({ title: 'Failed to list item', description: 'rejected', variant: 'error' });
  });

  async function queueThenCancel() {
    api.findMatchingItems.mockResolvedValue([]);
    renderForm();
    await flush();
    await queueWithNote('x');
    const before = api.findMatchingItems.mock.calls.length;
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Cancel/ }));
    });
    await flush();
    return before;
  }

  it('cancelling the last queued item stops polling and re-runs the stash search', async () => {
    const before = await queueThenCancel();
    expect(storedQueue()).toEqual([]);
    expect(screen.queryByText('No Queued Items')).not.toBeNull();
    const afterCancel = api.findMatchingItems.mock.calls.length;
    expect(afterCancel).toBeGreaterThan(before);
    await tick(3 * POLL_INTERVAL);
    expect(api.findMatchingItems.mock.calls.length).toBe(afterCancel);
  });

  // BUG: the Cancel handler (ListItemShortcut.tsx:927-941) runs side effects (findMatchingItemsInStash, which
  // itself sets state) inside a setQueuedListingIds updater. React may invoke updaters more than once (eager
  // state + render), so cancelling fires the stash search twice.
  it.fails('cancelling runs the stash search exactly once', async () => {
    const before = await queueThenCancel();
    expect(api.findMatchingItems.mock.calls.length).toBe(before + 1);
  });

  it('resumes a queue persisted by a previous window', async () => {
    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify([
        {
          id: 'p1',
          item: { name: 'Arach', type: 'Spiderweb Sash' },
          formData: { type: 'exact', note: '', price: '5', currency: 'HR' },
          createdAt: Date.now(),
          lastPolled: Date.now(),
        },
      ]),
    );
    api.findMatchingItems.mockImplementation(async (item) => (item.name === 'Arach' ? [stash(7)] : []));
    renderForm(null);
    await flush();
    expect(api.listSpecificItem.mock.calls).toEqual([[stash(7), 5, '', 'exact']]);
  });

  // BUG: handleSubmit's queue path (ListItemShortcut.tsx:568-569) awaits fetchAllListings() but then reads the
  // `totalListingsCount` captured by the render closure, so a cap reached since the window opened is ignored and
  // the user is told the item was queued (it later fails the re-check in processQueuedListing).
  it.fails('refuses to queue when the refreshed count is at the cap', async () => {
    api.findMatchingItems.mockResolvedValue([]);
    renderForm();
    await flush();
    userTotal = 50;
    await queueWithNote('x');
    expect(storedQueue()).toEqual([]);
    expect(toasts()[0]).toMatchObject({ title: 'Maximum listings reached' });
  });

  // BUG: when the copied item is already queued, the item effect (ListItemShortcut.tsx:203) switches to the
  // Queued tab and skips the stash search, but the later tab effect (ListItemShortcut.tsx:809) immediately
  // switches back to List Item, which then shows the previous item's stale matches.
  it.fails('switches to the Queued tab when the copied item is already queued', async () => {
    api.findMatchingItems.mockResolvedValue([]);
    const view = renderForm();
    await flush();
    await queueWithNote('x');
    const other = { ...copied, name: 'Arach' } as PriceCheckItem;
    api.findMatchingItems.mockResolvedValue([stash(2)]);
    view.setItem(other);
    await flush();
    view.setItem(copied);
    await flush();
    expect(tab(/Queued/).getAttribute('data-state')).toBe('active');
  });
});

it('Manage tab receives the prefetched first page', async () => {
  userListings = [marketListing(5), marketListing(6)];
  renderForm();
  await flush();
  await selectTab(/Manage/);
  await waitFor(() => expect(screen.queryByText('Shako #5')).not.toBeNull());
  expect(screen.queryByText('Shako #6')).not.toBeNull();
});
