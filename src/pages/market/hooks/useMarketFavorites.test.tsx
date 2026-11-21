// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketListingEntry, MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { lookupListing } from '../alerts/listing-lookup';
import type { MarketApi } from '../lib/types';
import { getMarketPrefs, marketStoreActions, resetMarketPrefs } from '../store/useMarketStore';
import { useMarketFavorites } from './useMarketFavorites';

vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(async () => false),
  mkdir: vi.fn(async () => {}),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(async () => {}),
}));
vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('../alerts/listing-lookup', () => ({ lookupListing: vi.fn() }));

const listing = (id: string, hr = 1) =>
  ({ _id: id, hr_price: hr, user_id: 's', item: { name: `Item ${id}` } }) as unknown as MarketListingEntry;
const page = (...data: MarketListingEntry[]) => ({ total: data.length, data }) as unknown as MarketListingResult;

function apiAnswering(...answers: (MarketListingResult | null)[]) {
  const getMarketListings = vi.fn(async () => (answers.length > 0 ? answers.shift() : page()));
  return { api: { getMarketListings } as unknown as MarketApi, getMarketListings };
}

beforeEach(() => {
  resetMarketPrefs();
  vi.mocked(lookupListing).mockReset();
});
afterEach(cleanup);

describe('useMarketFavorites', () => {
  it("refresh shows PD2's current copy of a live favorite and how one that left the market ended", async () => {
    marketStoreActions.toggleFavorite(listing('sold'));
    marketStoreActions.toggleFavorite(listing('live', 1));
    vi.mocked(lookupListing).mockResolvedValue({ listing: listing('sold'), status: 'sold' });
    const { api, getMarketListings } = apiAnswering(page(listing('live', 3)));

    const { result } = renderHook(() => useMarketFavorites(api));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(getMarketListings).toHaveBeenCalledWith(expect.objectContaining({ _id: { $in: ['live', 'sold'] } }));
    expect(result.current.favorites.map((f) => [f.listingId, f.listing.hr_price, f.ended])).toEqual([
      ['live', 3, undefined],
      ['sold', 1, 'sold'],
    ]);

    // An ended favorite is final: the next refresh asks PD2 only about the live one
    act(() => result.current.reload());
    await waitFor(() => expect(getMarketListings).toHaveBeenCalledTimes(2));
    expect(getMarketListings).toHaveBeenLastCalledWith(expect.objectContaining({ _id: { $in: ['live'] } }));
  });

  it('a refresh PD2 refuses (401) keeps the saved favorites and reports the failure', async () => {
    marketStoreActions.toggleFavorite(listing('a', 2));
    const { api } = apiAnswering(null);

    const { result } = renderHook(() => useMarketFavorites(api));
    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error).toBe('Could not load favorites');
    expect(result.current.favorites.map((f) => [f.listingId, f.listing.hr_price])).toEqual([['a', 2]]);
    expect(lookupListing).not.toHaveBeenCalled();
  });

  it('signed out: favorites still show and toggle, nothing is refreshed', async () => {
    const { result } = renderHook(() => useMarketFavorites(null));
    act(() => result.current.toggle(listing('x')));
    expect(result.current).toMatchObject({ status: 'idle', error: null });
    expect(result.current.favorites.map((f) => f.listingId)).toEqual(['x']);

    act(() => result.current.toggle(listing('x')));
    expect(getMarketPrefs().favorites).toEqual([]);
  });
});
