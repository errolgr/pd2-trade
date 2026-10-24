// @vitest-environment happy-dom
import { cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { showToast } from '@/overlay';
import { NoAccountSelectedError, usePd2Website } from '@/hooks/pd2website/usePD2Website';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import DelistHandler, { useDelist } from './DelistHandler';

const overlay = vi.hoisted(() => ({ openPanel: vi.fn() }));
vi.mock('@/overlay', () => ({ showToast: vi.fn(), useOverlay: () => overlay }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({
  usePd2Website: vi.fn(),
  NoAccountSelectedError: class NoAccountSelectedError extends Error {},
}));
// Query building has its own tests; any stash match yields a query here.
vi.mock('@/pages/price-check/lib/tradeUrlBuilder', () => ({
  buildGetMarketListingByStashItemQuery: () => ({ 'item.hash': { $in: ['h1'] } }),
}));

const listing = (n: number) => ({ _id: `L${n}`, item: { name: `Item ${n}` } }) as unknown as MarketListingEntry;
const RAW = JSON.stringify({ name: 'Shako', type: 'Shako' });

let listings: MarketListingEntry[];
let deleteMarketListing: Mock<(id: string) => Promise<void>>;

/** What AppController does: grab the stable API (it is not a child of DelistHandler). */
function delistItem(raw: string) {
  return renderHook(() => useDelist()).result.current.delistItem(raw);
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  listings = [];
  deleteMarketListing = vi.fn(async () => {});
  vi.mocked(usePd2Website).mockImplementation(
    () =>
      ({
        authData: { user: { _id: 'u1' } },
        findMatchingItems: vi.fn(async () => [{ hash: 'h1' }]),
        getMarketListings: vi.fn(async () => ({ data: listings, total: listings.length })),
        deleteMarketListing,
      }) as never,
  );
});
afterEach(cleanup);

describe('DelistHandler / useDelist', () => {
  it('opens the delist picker with every match when several listings match', async () => {
    listings = [listing(1), listing(2)];
    render(<DelistHandler />);
    await delistItem(RAW);
    expect(overlay.openPanel).toHaveBeenCalledWith('delist', { listings });
    expect(deleteMarketListing).not.toHaveBeenCalled();
  });

  it('removes a single match directly and toasts', async () => {
    listings = [listing(1)];
    render(<DelistHandler />);
    await delistItem(RAW);
    expect(deleteMarketListing).toHaveBeenCalledWith('L1');
    expect(showToast).toHaveBeenCalledWith({ title: 'Delist', description: 'Removed Item 1 listing.' });
    expect(overlay.openPanel).not.toHaveBeenCalled();
  });

  it('asks for an in-game account instead of reporting a failure when none is chosen', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(usePd2Website).mockReturnValue({
      authData: { user: { _id: 'u1' } },
      findMatchingItems: vi.fn(async () => {
        throw new NoAccountSelectedError('Choose your in-game account');
      }),
    } as never);
    render(<DelistHandler />);
    await delistItem(RAW);
    expect(showToast).toHaveBeenCalledWith({
      title: 'Delist',
      description: 'Choose your in-game account',
      variant: 'error',
    });
    expect(error).not.toHaveBeenCalled();
  });

  it('does nothing once DelistHandler is unmounted', async () => {
    listings = [listing(1), listing(2)];
    const view = render(<DelistHandler />);
    view.unmount();
    await delistItem(RAW);
    expect(overlay.openPanel).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });
});
