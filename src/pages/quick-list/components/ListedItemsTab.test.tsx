// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { useInView } from 'react-intersection-observer';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { emit } from '@/lib/browser-events';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import ListedItemsTab from './ListedItemsTab';

vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/lib/browser-events', () => ({ emit: vi.fn() }));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/lib/telemetry', () => ({ trackEvent: vi.fn(), trackMeasurement: vi.fn() }));
vi.mock('react-intersection-observer', () => ({ useInView: vi.fn() }));

const NOW = new Date('2026-03-01T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

function makeListing(n: number, over: Partial<MarketListingEntry> = {}): MarketListingEntry {
  return {
    _id: `L${n}`,
    price: '',
    hr_price: 0,
    bumped_at: hoursAgo(24),
    created_at: hoursAgo(48),
    item: {
      hash: `h${n}`,
      name: `Item ${n}`,
      base: { name: `Base ${n}` },
      quality: { name: 'Unique' },
      modifiers: [{ name: 'fcr', label: `+${n}% Faster Cast Rate` }],
      socket_count: 0,
    },
    ...over,
  } as unknown as MarketListingEntry;
}

type Api = {
  getMarketListings: Mock<(q: MarketListingQuery) => Promise<{ data: MarketListingEntry[]; total: number }>>;
  updateMarketListing: Mock<(id: string, fields: Record<string, unknown>) => Promise<void>>;
  updateItemByHash: Mock<(hash: string, fields: Record<string, unknown>) => Promise<void>>;
  deleteMarketListing: Mock<(id: string) => Promise<void>>;
  bumpAllMarketListings: Mock<(userId: string) => Promise<void>>;
  authData: { user: { _id: string } } | null;
};

let server: MarketListingEntry[];
let api: Api;
let inView: boolean;
const queries: { limit: number; skip: number; hc: boolean; ladder: boolean }[] = [];

const toasts = () => vi.mocked(emit).mock.calls.filter(([e]) => e === 'toast-event').map(([, p]) => p);
const row = (name: string) => screen.getByText(name).closest<HTMLElement>('[class*="rounded"][class*="border"]')!;
const countChip = () => screen.getByText('Listed Items').querySelector('span')!.textContent;

function renderTab(props: Partial<React.ComponentProps<typeof ListedItemsTab>> = {}) {
  return render(
    <TooltipProvider>
      <ListedItemsTab onClose={vi.fn()}
        {...props} />
    </TooltipProvider>,
  );
}

async function click(el: Element) {
  await act(async () => {
    fireEvent.click(el);
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  server = Array.from({ length: 7 }, (_, i) => makeListing(i + 1));
  queries.length = 0;
  inView = false;
  api = {
    getMarketListings: vi.fn(async (q) => {
      queries.push({ limit: q.$limit, skip: q.$skip, hc: q.is_hardcore, ladder: q.is_ladder });
      return { data: server.slice(q.$skip, q.$skip + q.$limit), total: server.length };
    }),
    updateMarketListing: vi.fn(async () => {}),
    updateItemByHash: vi.fn(async () => {}),
    deleteMarketListing: vi.fn(async (id) => {
      server = server.filter((l) => l._id !== id);
    }),
    bumpAllMarketListings: vi.fn(async () => {}),
    authData: { user: { _id: 'u1' } },
  };
  vi.mocked(usePd2Website).mockImplementation(() => api as never);
  // The real provider hands out a stable settings object; a fresh one per render would refire every query memo.
  const options = { settings: { mode: 'hardcore', ladder: 'non-ladder' } };
  vi.mocked(useOptions).mockImplementation(() => options as never);
  vi.mocked(useInView).mockImplementation(() => ({ ref: vi.fn(), inView }) as never);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('loading', () => {
  it('fetches the first page for the current realm on mount and reports it to the parent', async () => {
    const onTotalCountChange = vi.fn();
    const onListingsChange = vi.fn();
    renderTab({ onTotalCountChange, onListingsChange });
    expect(screen.queryByText('Loading listings...')).not.toBeNull();
    await screen.findByText('Item 1');
    expect(queries[0]).toEqual({ limit: 5, skip: 0, hc: true, ladder: false });
    expect(screen.queryByText('Item 5')).not.toBeNull();
    expect(screen.queryByText('Item 6')).toBeNull();
    expect(countChip()).toBe('7');
    expect(onTotalCountChange).toHaveBeenLastCalledWith(7);
    expect(onListingsChange.mock.lastCall![0].map((l: MarketListingEntry) => l._id)).toEqual([
      'L1',
      'L2',
      'L3',
      'L4',
      'L5',
    ]);
  });

  it('uses parent-provided first page without fetching, capped to one page', async () => {
    renderTab({ initialListings: server, initialTotalCount: 7 });
    expect(screen.queryByText('Item 5')).not.toBeNull();
    expect(screen.queryByText('Item 6')).toBeNull();
    expect(api.getMarketListings).not.toHaveBeenCalled();
  });

  async function scrollToSentinel() {
    const view = renderTab({ initialListings: server, initialTotalCount: 7 });
    inView = true;
    view.rerender(
      <TooltipProvider>
        <ListedItemsTab onClose={vi.fn()}
          initialListings={server}
          initialTotalCount={7} />
      </TooltipProvider>,
    );
    await screen.findByText('Item 7');
    await act(async () => {});
  }

  it('loads the next page when the scroll sentinel comes into view, without duplicating rows', async () => {
    await scrollToSentinel();
    expect(new Set(queries.map((q) => q.skip))).toEqual(new Set([5]));
    expect(screen.getAllByText('Item 1')).toHaveLength(1);
    expect(screen.getAllByText('Item 6')).toHaveLength(1);
  });

  // BUG: the page-change effect (ListedItemsTab.tsx:271-285) depends on listings.length, so appending page N
  // re-runs it while currentPage is still N and fetches the same page a second time (deduped, but wasted).
  it.fails('requests each page only once', async () => {
    await scrollToSentinel();
    expect(queries).toEqual([{ limit: 5, skip: 5, hc: true, ladder: false }]);
  });

  it('shows an error with a working Retry when the first fetch fails', async () => {
    api.getMarketListings.mockRejectedValueOnce(new Error('Gateway timeout'));
    renderTab();
    await screen.findByText('Gateway timeout');
    await click(screen.getByRole('button', { name: /Retry/ }));
    await screen.findByText('Item 1');
    expect(screen.queryByText("Couldn't load listings")).toBeNull();
  });

  it('distinguishes "no listings" from "not signed in"', async () => {
    server = [];
    const view = renderTab();
    await screen.findByText('No active listings');
    view.unmount();

    api.authData = null;
    renderTab();
    expect(screen.queryByText('Not signed in')).not.toBeNull();
    expect((screen.getByRole('button', { name: /Bump All/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('bumping', () => {
  it('bumps an eligible listing and puts it on cooldown', async () => {
    renderTab({ initialListings: server, initialTotalCount: 7 });
    const bump = within(row('Item 2')).getByRole('button', { name: /^Bump$/ }) as HTMLButtonElement;
    await click(bump);
    expect(api.updateMarketListing.mock.calls[0][0]).toBe('L2');
    expect(api.updateItemByHash.mock.calls[0][0]).toBe('h2');
    expect(toasts()).toEqual(['Item bumped successfully!']);
    const after = within(row('Item 2')).getByRole('button', { name: /Bump/ }) as HTMLButtonElement;
    expect(after.disabled).toBe(true);
    // Others are untouched.
    expect((within(row('Item 1')).getByRole('button', { name: /Bump/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('keeps a listing bumped under 12h ago on cooldown', () => {
    server[0] = makeListing(1, { bumped_at: hoursAgo(11) });
    renderTab({ initialListings: server, initialTotalCount: 7 });
    expect((within(row('Item 1')).getByRole('button', { name: /Bump/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('reports a failed bump and leaves the listing bumpable', async () => {
    api.updateMarketListing.mockRejectedValueOnce(new Error('nope'));
    renderTab({ initialListings: server, initialTotalCount: 7 });
    await click(within(row('Item 1')).getByRole('button', { name: /Bump/ }));
    expect(toasts()).toEqual(['Failed to bump item']);
    expect((within(row('Item 1')).getByRole('button', { name: /Bump/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('Bump All bumps every listing for the signed-in user', async () => {
    renderTab({ initialListings: server, initialTotalCount: 7 });
    await click(screen.getByRole('button', { name: /Bump All/ }));
    expect(api.bumpAllMarketListings.mock.calls).toEqual([['u1']]);
    expect(toasts()).toEqual(['Successfully bumped all items!']);
    for (const name of ['Item 1', 'Item 5']) {
      expect((within(row(name)).getByRole('button', { name: /Bump/ }) as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('Bump All failure leaves listings bumpable', async () => {
    api.bumpAllMarketListings.mockRejectedValueOnce(new Error('x'));
    renderTab({ initialListings: server, initialTotalCount: 7 });
    await click(screen.getByRole('button', { name: /Bump All/ }));
    expect(toasts()).toEqual(['Failed to bump all items']);
    expect((within(row('Item 1')).getByRole('button', { name: /Bump/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('Bump All refuses without authentication', async () => {
    api.authData = null;
    renderTab({ initialListings: server, initialTotalCount: 7 });
    await click(screen.getByRole('button', { name: /Bump All/ }));
    expect(api.bumpAllMarketListings).not.toHaveBeenCalled();
    expect(toasts()).toEqual(['Unable to bump listings: not authenticated']);
  });
});

describe('deleting', () => {
  it('removes the row, decrements the count and informs the parent', async () => {
    const onTotalCountChange = vi.fn();
    const onListingsChange = vi.fn();
    renderTab({ initialListings: server, initialTotalCount: 7, onTotalCountChange, onListingsChange });
    await click(within(row('Item 3')).getByLabelText('Remove listing'));
    expect(api.deleteMarketListing.mock.calls).toEqual([['L3']]);
    expect(screen.queryByText('Item 3')).toBeNull();
    expect(countChip()).toBe('6');
    expect(onTotalCountChange).toHaveBeenLastCalledWith(6);
    expect(onListingsChange.mock.lastCall![0].map((l: MarketListingEntry) => l._id)).toEqual(['L1', 'L2', 'L4', 'L5']);
    expect(toasts()).toEqual(['Removed Item 3 market listing.']);
  });

  it('on failure keeps the row, toasts, and refetches the first page', async () => {
    api.deleteMarketListing.mockRejectedValueOnce(new Error('500'));
    renderTab({ initialListings: server, initialTotalCount: 7 });
    await click(within(row('Item 3')).getByLabelText('Remove listing'));
    expect(toasts()).toEqual(['Failed to delete listing']);
    expect(queries).toEqual([{ limit: 5, skip: 0, hc: true, ladder: false }]);
    expect(screen.queryByText('Item 3')).not.toBeNull();
    expect(countChip()).toBe('7');
  });
});

describe('editing', () => {
  async function startEdit(name: string) {
    await click(within(row(name)).getByRole('button', { name: /Edit/ }));
  }
  const note = () => screen.getByLabelText('Note') as HTMLInputElement;
  const price = () => screen.getByLabelText('HR price') as HTMLInputElement;
  const save = () => screen.getByRole('button', { name: /Save/ }) as HTMLButtonElement;

  it('prefills from the listing and disables Save once both fields are empty', async () => {
    server[0] = makeListing(1, { price: 'or offer', hr_price: 2 });
    renderTab({ initialListings: server, initialTotalCount: 7 });
    await startEdit('Item 1');
    expect(note().value).toBe('or offer');
    expect(price().value).toBe('2');
    fireEvent.change(note(), { target: { value: '' } });
    fireEvent.change(price(), { target: { value: '' } });
    expect(save().disabled).toBe(true);
  });

  it('saving a note only clears the HR price and updates the row in place', async () => {
    server[0] = makeListing(1, { price: '', hr_price: 4 });
    renderTab({ initialListings: server, initialTotalCount: 7 });
    await startEdit('Item 1');
    fireEvent.change(note(), { target: { value: 'pc' } });
    fireEvent.change(price(), { target: { value: '' } });
    fireEvent.submit(save().closest('form')!);
    await waitFor(() => expect(toasts()).toEqual(['Listing updated!']));
    expect(api.updateMarketListing.mock.calls).toEqual([['L1', { price: 'pc', hr_price: 0 }]]);
    expect(api.updateItemByHash.mock.calls).toEqual([['h1', { price: 'pc', hr_price: 0 }]]);
    expect(screen.queryByLabelText('Note')).toBeNull();
    expect(within(row('Item 1')).queryByText('4 HR')).toBeNull();
    expect(within(row('Item 1')).queryByText('pc')).not.toBeNull();
  });

  it('saving a price sends it as a number alongside the note', async () => {
    renderTab({ initialListings: server, initialTotalCount: 7 });
    await startEdit('Item 2');
    fireEvent.change(price(), { target: { value: ' 1.5 ' } });
    fireEvent.submit(save().closest('form')!);
    await waitFor(() => expect(api.updateMarketListing).toHaveBeenCalled());
    expect(api.updateMarketListing.mock.calls[0]).toEqual(['L2', { hr_price: 1.5, price: '' }]);
    await screen.findByText('1.5 HR');
  });

  it('keeps the editor open and reports failure when the update fails', async () => {
    api.updateMarketListing.mockRejectedValueOnce(new Error('x'));
    renderTab({ initialListings: server, initialTotalCount: 7 });
    await startEdit('Item 1');
    fireEvent.change(note(), { target: { value: 'pc' } });
    fireEvent.submit(save().closest('form')!);
    await waitFor(() => expect(toasts()).toEqual(['Failed to update listing']));
    expect(screen.queryByLabelText('Note')).not.toBeNull();
  });

  it('Escape cancels editing without saving', async () => {
    renderTab({ initialListings: server, initialTotalCount: 7 });
    await startEdit('Item 1');
    fireEvent.keyDown(note(), { key: 'Escape' });
    expect(screen.queryByLabelText('Note')).toBeNull();
    expect(api.updateMarketListing).not.toHaveBeenCalled();
  });
});

describe('search', () => {
  const search = () => screen.getByLabelText('Search listings') as HTMLInputElement;

  it('searches across all listings (not just the loaded page) and updates the count', async () => {
    server.push(makeListing(8, { item: { ...makeListing(8).item, name: 'Griffon Eye' } }));
    renderTab({ initialListings: server, initialTotalCount: 8 });
    fireEvent.change(search(), { target: { value: 'griffon' } });
    await screen.findByText('Griffon Eye');
    expect(queries.at(-1)).toEqual({ limit: 1000, skip: 0, hc: true, ladder: false });
    expect(screen.queryByText('Item 1')).toBeNull();
    expect(countChip()).toBe('1');
  });

  it('shows a no-match state, and Escape restores the paged list', async () => {
    renderTab({ initialListings: server, initialTotalCount: 7 });
    fireEvent.change(search(), { target: { value: 'zzzzzzzz' } });
    await screen.findByText('No matches');
    fireEvent.keyDown(search(), { key: 'Escape' });
    expect(search().value).toBe('');
    expect(screen.queryByText('Item 1')).not.toBeNull();
    expect(countChip()).toBe('7');
  });

  it('a failed search fetch yields no results rather than stale ones', async () => {
    renderTab({ initialListings: server, initialTotalCount: 7 });
    api.getMarketListings.mockRejectedValueOnce(new Error('x'));
    fireEvent.change(search(), { target: { value: 'Item 1' } });
    await screen.findByText('No matches');
  });

  it('removing a listing while searching drops it from the results', async () => {
    renderTab({ initialListings: server, initialTotalCount: 7 });
    fireEvent.change(search(), { target: { value: 'Item 6' } });
    await screen.findByText('Item 6');
    await click(within(row('Item 6')).getByLabelText('Remove listing'));
    expect(screen.queryByText('Item 6')).toBeNull();
  });
});

it('toggles the stats panel per listing', async () => {
  renderTab({ initialListings: server, initialTotalCount: 7 });
  const toggle = within(row('Item 1')).getByRole('button', { name: /Show Stats/ });
  await click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(screen.queryByText('+1% Faster Cast Rate')).not.toBeNull();
  expect(screen.queryByText('+2% Faster Cast Rate')).toBeNull();
  await click(toggle);
  expect(screen.queryByText('+1% Faster Cast Rate')).toBeNull();
});
