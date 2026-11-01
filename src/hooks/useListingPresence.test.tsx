// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { ListingPresence } from '@/pages/market/lib/types';
import {
  clearListingPresenceCache,
  PRESENCE_BATCH_SIZE,
  PRESENCE_TTL_MS,
  rememberListingPresence,
  useListingPresence,
} from './useListingPresence';

const seen = (id: string): ListingPresence => ({
  user_last_online: `2026-10-18T11:00:00.000Z#${id}`,
  user_last_ingame: null,
});

/** PD2 answering for every id it is asked about. */
const getListingPresence = vi.fn(async (ids: string[]) => new Map(ids.map((id) => [id, seen(id)])));
const api = { getListingPresence };
const ids = (n: number, prefix = 'l') => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

beforeEach(() => {
  clearListingPresenceCache();
  getListingPresence.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useListingPresence', () => {
  it('asks PD2 for the shown ids in batches of at most 50 and returns their presence', async () => {
    const shown = ids(120);
    const { result } = renderHook(() => useListingPresence(api, shown));
    // Nothing yet: rows render with what they have
    expect(result.current.size).toBe(0);

    await waitFor(() => expect(result.current.size).toBe(120));
    const batches = getListingPresence.mock.calls.map(([batch]) => batch);
    expect(batches.map((b) => b.length)).toEqual([PRESENCE_BATCH_SIZE, PRESENCE_BATCH_SIZE, 20]);
    expect(batches.flat()).toEqual(shown);
    expect(result.current.get('l7')).toEqual(seen('l7'));
  });

  it('shares lookups app-wide for a minute: the next page asks only for its new ids', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const first = renderHook(({ shown }) => useListingPresence(api, shown), { initialProps: { shown: ids(20) } });
    await waitFor(() => expect(first.result.current.size).toBe(20));

    first.rerender({ shown: [...ids(20), ...ids(5, 'p')] });
    await waitFor(() => expect(first.result.current.size).toBe(25));
    expect(getListingPresence.mock.calls[1][0]).toEqual(ids(5, 'p'));

    // Another list showing the same listings (the market browser) asks nothing
    const other = renderHook(() => useListingPresence(api, ids(20)));
    expect(other.result.current.size).toBe(20);
    expect(getListingPresence).toHaveBeenCalledTimes(2);

    // After the TTL a change of the shown ids asks again
    vi.setSystemTime(Date.now() + PRESENCE_TTL_MS);
    first.rerender({ shown: ids(20) });
    await waitFor(() => expect(getListingPresence).toHaveBeenCalledTimes(3));
  });

  it('asks nothing signed out, or for listings PD2 itself just sent', () => {
    renderHook(() => useListingPresence(null, ids(3)));
    act(() =>
      rememberListingPresence([{ _id: 'fresh', user_last_online: '2026-10-18T11:00:00.000Z' }] as MarketListingEntry[]),
    );
    const { result } = renderHook(() => useListingPresence(api, ['fresh']));
    expect(getListingPresence).not.toHaveBeenCalled();
    expect(result.current.get('fresh')?.user_last_online).toBe('2026-10-18T11:00:00.000Z');
  });

  it('a failed lookup leaves the rows as they are and is retried with the next ids', async () => {
    getListingPresence.mockRejectedValueOnce(new Error('PD2 answered 503'));
    const { result, rerender } = renderHook(({ shown }) => useListingPresence(api, shown), {
      initialProps: { shown: ids(2) },
    });
    await waitFor(() => expect(getListingPresence).toHaveBeenCalledTimes(1));
    expect(result.current.size).toBe(0);

    rerender({ shown: [...ids(2), 'x'] });
    await waitFor(() => expect(result.current.size).toBe(3));
    expect(getListingPresence.mock.calls[1][0]).toEqual([...ids(2), 'x']);
  });
});
