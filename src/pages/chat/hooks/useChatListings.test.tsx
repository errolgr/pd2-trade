// @vitest-environment happy-dom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import type { MarketListingEntry, MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { useChatListings } from './useChatListings';

vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));

// The listing cache lives for the app's lifetime, so every test uses ids no other test has seen.
let seq = 0;
const newId = () => (++seq).toString(16).padStart(24, 'a');

const entry = (_id: string) => ({ _id, item: { name: `Item ${_id}` } }) as unknown as MarketListingEntry;
const page = (data: MarketListingEntry[]) => ({ total: data.length, limit: 25, skip: 0, data }) as MarketListingResult;
const requestedIds = (fn: Mock) => fn.mock.calls.map(([query]) => query._id.$in);

/** Points usePd2Website at fresh fetchers returning `live` / `archived` listings. */
function setup(live: string[], archived: string[], signedIn = true) {
  const getMarketListings = vi.fn(async () => page(live.map(entry)));
  const getMarketListingsArchive = vi.fn(async () => page(archived.map(entry)));
  const value = { authData: signedIn ? { user: { _id: 'me' } } : null, getMarketListings, getMarketListingsArchive };
  vi.mocked(usePd2Website).mockImplementation(() => value as never);
  return { getMarketListings, getMarketListingsArchive };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useChatListings', () => {
  it('resolves live listings, falls back to the archive for the rest and marks unknown ids missing', async () => {
    const [live, sold, bogus] = [newId(), newId(), newId()];
    const api = setup([live], [sold]);
    const { result } = renderHook(() => useChatListings([live, sold, bogus, live]));

    expect(result.current.get(live)).toEqual({ status: 'loading' });
    await waitFor(() => expect(result.current.get(bogus)).toEqual({ status: 'missing' }));
    expect(result.current.get(live)).toEqual({ status: 'listed', listing: entry(live) });
    expect(result.current.get(sold)).toEqual({ status: 'unlisted', listing: entry(sold) });
    // One batched lookup for the deduped ids; only the ids not found live go to the archive.
    expect(requestedIds(api.getMarketListings)).toEqual([[live, sold, bogus].sort()]);
    expect(requestedIds(api.getMarketListingsArchive)).toEqual([[sold, bogus].sort()]);
  });

  it('prefers the live listing when the archive also has the id', async () => {
    const id = newId();
    const api = setup([id], [id]);
    const { result } = renderHook(() => useChatListings([id]));
    await waitFor(() => expect(result.current.get(id)?.status).toBe('listed'));
    expect(api.getMarketListingsArchive).not.toHaveBeenCalled();
  });

  it('serves listings looked up by an earlier conversation from the cache', async () => {
    const id = newId();
    setup([id], []);
    const one = renderHook(() => useChatListings([id]));
    await waitFor(() => expect(one.result.current.get(id)?.status).toBe('listed'));

    const second = setup([], []);
    const two = renderHook(() => useChatListings([id]));
    expect(two.result.current.get(id)?.status).toBe('listed');
    expect(second.getMarketListings).not.toHaveBeenCalled();
  });

  it('does not look anything up while signed out', () => {
    const api = setup([], [], false);
    const id = newId();
    const { result } = renderHook(() => useChatListings([id]));
    expect(result.current.size).toBe(0);
    expect(api.getMarketListings).not.toHaveBeenCalled();
  });

  it('drops ids whose lookup failed so they render as plain links, and retries them next time', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const id = newId();
    const api = setup([], []);
    api.getMarketListings.mockRejectedValueOnce(new Error('API Error: 500'));
    const { result } = renderHook(() => useChatListings([id]));
    await waitFor(() => expect(result.current.has(id)).toBe(false));

    setup([id], []);
    const again = renderHook(() => useChatListings([id]));
    await waitFor(() => expect(again.result.current.get(id)?.status).toBe('listed'));
  });

  it('treats a sign-in prompt (null result) as a failed lookup rather than missing listings', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const id = newId();
    const api = setup([], []);
    api.getMarketListings.mockResolvedValueOnce(null as never);
    const { result } = renderHook(() => useChatListings([id]));
    await waitFor(() => expect(result.current.has(id)).toBe(false));
    expect(api.getMarketListingsArchive).not.toHaveBeenCalled();
  });
});
