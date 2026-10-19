// @vitest-environment happy-dom
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { emit, listen } from '@/lib/browser-events';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import DelistPage from './DelistPage';

vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));
vi.mock('@/lib/browser-events', () => ({ emit: vi.fn(), listen: vi.fn() }));
vi.mock('@/lib/browser-webview', () => ({ getCurrentWebviewWindow: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ OptionsProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/hooks/useItems', () => ({ ItemsProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({
  ChildPd2WebsiteProvider: ({ children }: { children: React.ReactNode }) => children,
  usePd2Website: vi.fn(),
}));

const listing = (n: number, over: Record<string, unknown> = {}) =>
  ({
    _id: `L${n}`,
    price: '',
    hr_price: 0,
    item: { hash: `h${n}`, name: `Item ${n}`, quality: { name: 'Unique' }, modifiers: [], socket_count: 0 },
    ...over,
  }) as unknown as MarketListingEntry;

let deleteMarketListing: Mock<(id: string) => Promise<void>>;
let close: Mock<() => Promise<void>>;
let delistUpdate: ((e: { payload: MarketListingEntry[] }) => void) | null;
let unlisten: Mock<() => void>;

function renderPage(listings: MarketListingEntry[] | string) {
  const data = typeof listings === 'string' ? listings : encodeURIComponent(btoa(JSON.stringify(listings)));
  return render(
    <MemoryRouter initialEntries={[`/delist?data=${data}`]}>
      <DelistPage />
    </MemoryRouter>,
  );
}

const toasts = () => vi.mocked(emit).mock.calls.filter(([e]) => e === 'toast-event').map(([, p]) => p);
const card = (name: string) => screen.getByRole('button', { name: `Remove ${name} listing` });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  deleteMarketListing = vi.fn(async () => {});
  close = vi.fn(async () => {});
  delistUpdate = null;
  unlisten = vi.fn();
  vi.mocked(usePd2Website).mockImplementation(() => ({ deleteMarketListing }) as never);
  vi.mocked(getCurrentWebviewWindow).mockReturnValue({ close } as never);
  vi.mocked(listen).mockImplementation(async (event, cb) => {
    if (event === 'delist-update') delistUpdate = cb as typeof delistUpdate;
    return unlisten;
  });
});
afterEach(cleanup);

describe('DelistPage', () => {
  it('renders the listings passed in the URL with their prices and a count', () => {
    renderPage([listing(1, { hr_price: 3, price: 'or offer' }), listing(2)]);
    expect(screen.getAllByRole('button', { name: /^Remove Item \d listing$/ })).toHaveLength(2);
    expect(screen.queryByText('3 HR')).not.toBeNull();
    expect(screen.queryByText('or offer')).not.toBeNull();
    expect(screen.getByLabelText('2 listings').textContent).toBe('2');
  });

  it('renders nothing (and does not crash) for malformed data', () => {
    renderPage('%%%not-base64');
    expect(screen.queryAllByRole('button', { name: /^Remove/ })).toHaveLength(0);
    expect(screen.queryByLabelText(/listings$/)).toBeNull();
  });

  it('deletes the clicked listing, toasts, and closes the window', async () => {
    const order: string[] = [];
    deleteMarketListing.mockImplementation(async (id) => void order.push(`delete ${id}`));
    close.mockImplementation(async () => void order.push('close'));
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

  it('replaces the list on delist-update and re-enables selection', async () => {
    let finish!: () => void;
    deleteMarketListing.mockImplementationOnce(() => new Promise<void>((r) => (finish = r)));
    renderPage([listing(1)]);
    await act(async () => {
      fireEvent.click(card('Item 1'));
    });
    await act(async () => {
      delistUpdate!({ payload: [listing(7), listing(8)] });
    });
    expect(screen.queryByText('Item 1')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    await act(async () => {
      fireEvent.click(card('Item 8'));
    });
    expect(deleteMarketListing.mock.calls.map(([id]) => id)).toEqual(['L1', 'L8']);
    await act(async () => finish());
  });

  it('close button closes the window and swallows close errors', async () => {
    close.mockRejectedValueOnce(new Error('already closed'));
    renderPage([listing(1)]);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('stops listening for updates on unmount', async () => {
    const view = renderPage([]);
    await act(async () => {});
    view.unmount();
    expect(unlisten).toHaveBeenCalledTimes(1);
  });
});
