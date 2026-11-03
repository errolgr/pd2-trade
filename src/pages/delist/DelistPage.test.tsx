// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { showToast } from '@/overlay';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import DelistPage from './DelistPage';

const h = vi.hoisted(() => ({
  panel: {
    payload: undefined as { listings: unknown[] } | undefined,
    payloadVersion: 0,
    close: (() => {}) as () => void,
  },
}));

vi.mock('@/overlay', () => ({ showToast: vi.fn(), usePanel: () => h.panel }));
vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));

const listing = (n: number, over: Record<string, unknown> = {}) =>
  ({
    _id: `L${n}`,
    price: '',
    hr_price: 0,
    item: { hash: `h${n}`, name: `Item ${n}`, quality: { name: 'Unique' }, modifiers: [], socket_count: 0 },
    ...over,
  }) as unknown as MarketListingEntry;

let deleteMarketListing: Mock<(id: string) => Promise<void>>;
let close: Mock<() => void>;

/** Simulates openPanel('delist', { listings }): new payload, bumped payloadVersion. */
function openWith(listings: MarketListingEntry[] | undefined) {
  h.panel = { payload: listings && { listings }, payloadVersion: h.panel.payloadVersion + 1, close };
}

function renderPage(listings: MarketListingEntry[] | undefined) {
  openWith(listings);
  return render(<DelistPage />);
}

const toasts = () => vi.mocked(showToast).mock.calls.map(([p]) => p);
const card = (name: string) => screen.getByRole('button', { name: `Remove ${name} listing` });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  deleteMarketListing = vi.fn(async () => {});
  close = vi.fn();
  h.panel = { payload: undefined, payloadVersion: 0, close };
  vi.mocked(usePd2Website).mockImplementation(() => ({ deleteMarketListing }) as never);
});
afterEach(cleanup);

describe('DelistPage', () => {
  it('renders the listings from the panel payload with their prices and a count', () => {
    renderPage([listing(1, { hr_price: 3, price: 'or offer' }), listing(2)]);
    expect(screen.getAllByRole('button', { name: /^Remove Item \d listing$/ })).toHaveLength(2);
    expect(screen.queryByText('3 HR')).not.toBeNull();
    expect(screen.queryByText('or offer')).not.toBeNull();
    expect(screen.getByLabelText('2 listings').textContent).toBe('2');
  });

  it('shows when each listing was listed, so same-named ones can be told apart', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-05T12:00:00Z'));
    renderPage([listing(1, { created_at: '2026-10-02T12:00:00Z' }), listing(2)]);
    expect(screen.queryByText('Listed 3 days ago')).not.toBeNull();
    expect(screen.queryAllByText(/^Listed /)).toHaveLength(1);
    vi.useRealTimers();
  });

  it('renders nothing (and does not crash) without a payload', () => {
    renderPage(undefined);
    expect(screen.queryAllByRole('button', { name: /^Remove/ })).toHaveLength(0);
    expect(screen.queryByLabelText(/listings$/)).toBeNull();
  });

  it('deletes the clicked listing, toasts, and closes the panel', async () => {
    const order: string[] = [];
    deleteMarketListing.mockImplementation(async (id) => void order.push(`delete ${id}`));
    close.mockImplementation(() => void order.push('close'));
    renderPage([listing(1), listing(2)]);
    await act(async () => {
      fireEvent.click(card('Item 2'));
    });
    expect(order).toEqual(['delete L2', 'close']);
    expect(toasts()).toEqual([{ title: 'Delist', description: 'Removed Item 2 listing.' }]);
  });

  it('ignores further selections while a delete is in flight', async () => {
    let finish!: () => void;
    deleteMarketListing.mockImplementation(() => new Promise<void>((r) => (finish = r)));
    renderPage([listing(1), listing(2)]);
    await act(async () => {
      fireEvent.click(card('Item 1'));
    });
    expect(screen.getByRole('status').textContent).toContain('Removing...');
    expect(card('Item 2').tabIndex).toBe(-1);
    await act(async () => {
      fireEvent.click(card('Item 2'));
    });
    expect(deleteMarketListing.mock.calls).toEqual([['L1']]);
    await act(async () => finish());
  });

  it('reports a failed delete as an error toast and still closes', async () => {
    deleteMarketListing.mockRejectedValueOnce(new Error('500'));
    renderPage([listing(1)]);
    await act(async () => {
      fireEvent.click(card('Item 1'));
    });
    expect(toasts()).toEqual([{ title: 'Delist', description: 'Failed to remove listing.', variant: 'error' }]);
    expect(close).toHaveBeenCalledTimes(1);
  });

  const fourMods = [1, 2, 3, 4].map((i) => ({ name: `m${i}`, label: `Mod ${i}` }));
  const withStats = () => listing(1, { item: { ...listing(1).item, modifiers: fourMods } });

  it.each(['Enter', ' '])('deletes via keyboard (%j) on the focused card only', async (key) => {
    renderPage([withStats()]);
    const target = card('Item 1');
    // Keys from the nested stats toggle must not trigger a delete.
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('button', { name: /Show More/ }), { key });
    });
    expect(deleteMarketListing).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.keyDown(target, { key });
    });
    expect(deleteMarketListing.mock.calls).toEqual([['L1']]);
  });

  it('expanding stats inside a card does not delete it', async () => {
    renderPage([withStats()]);
    expect(screen.queryByText('Mod 4')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Show More/ }));
    });
    expect(screen.queryByText('Mod 4')).not.toBeNull();
    expect(deleteMarketListing).not.toHaveBeenCalled();
  });

  it('replaces the list when reopened with new listings and re-enables selection', async () => {
    let finish!: () => void;
    deleteMarketListing.mockImplementationOnce(() => new Promise<void>((r) => (finish = r)));
    const view = renderPage([listing(1)]);
    await act(async () => {
      fireEvent.click(card('Item 1'));
    });
    openWith([listing(7), listing(8)]);
    view.rerender(<DelistPage />);
    expect(screen.queryByText('Item 1')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    await act(async () => {
      fireEvent.click(card('Item 8'));
    });
    expect(deleteMarketListing.mock.calls.map(([id]) => id)).toEqual(['L1', 'L8']);
    await act(async () => finish());
  });

  it('close button closes the panel', () => {
    renderPage([listing(1)]);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(close).toHaveBeenCalledTimes(1);
  });
});
