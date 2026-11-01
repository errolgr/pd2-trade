// @vitest-environment happy-dom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultFilters, mergeFilters, SITE_SEARCH_DEFAULTS } from '../lib/defaults';
import type { MarketApi, MarketFilters } from '../lib/types';
import { MAX_RELAXATIONS, useRelaxations } from './useRelaxations';

afterEach(cleanup);

const base = defaultFilters({ hardcore: false, ladder: true });

/** An api whose count is decided by the filters it is asked about. */
function fakeApi(count: (f: MarketFilters) => number | Error) {
  const searchListings = vi.fn(async (f: MarketFilters, _opts: { page: number; limit: number }) => {
    const n = count(f);
    if (n instanceof Error) throw n;
    return { items: [], total: n, totalExact: n < 1000, fetched: 0 };
  });
  return { api: { searchListings } as unknown as MarketApi, searchListings };
}

describe('useRelaxations', () => {
  it('counts the search without each filter, best first, leaving out drops that find nothing or fail', async () => {
    const f = mergeFilters(base, { itemName: 'Shako', corrupted: 'no', socketsMin: 1, hrMax: 3, ethereal: 'yes' });
    const { api, searchListings } = fakeApi((g) =>
      !g.itemName
        ? 5000
        : g.hrMax === undefined
          ? 12
          : g.socketsMin === undefined
            ? 3
            : g.ethereal === 'any'
              ? new Error('429')
              : 0,
    );
    const { result } = renderHook(() => useRelaxations(api, f, SITE_SEARCH_DEFAULTS));
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current!.map((r) => [r.filter.id, r.total, r.totalExact])).toEqual([
      ['itemName', 5000, false],
      ['hr', 12, true],
      ['sockets', 3, true],
    ]);
    // One single-row count per filter, the item name tried last
    expect(searchListings.mock.calls.map(([, opts]) => opts.limit)).toEqual([1, 1, 1, 1, 1]);
    expect(searchListings.mock.calls[4][0].itemName).toBeUndefined();
  });

  it('tries at most MAX_RELAXATIONS filters, and nothing without filters or a search', async () => {
    const many = mergeFilters(base, {
      corrupted: 'no',
      ethereal: 'no',
      desecrated: 'no',
      identified: 'yes',
      socketsMin: 1,
      hrMax: 3,
      priceText: 'ist',
      requirements: { levelMax: 50 },
    });
    const { api, searchListings } = fakeApi(() => 1);
    const { result } = renderHook(() => useRelaxations(api, many, SITE_SEARCH_DEFAULTS));
    await waitFor(() => expect(result.current).toHaveLength(MAX_RELAXATIONS));
    expect(searchListings).toHaveBeenCalledTimes(MAX_RELAXATIONS);

    searchListings.mockClear();
    const idle = renderHook(() => useRelaxations(api, base, SITE_SEARCH_DEFAULTS));
    const none = renderHook(() => useRelaxations(api, null, SITE_SEARCH_DEFAULTS));
    expect(idle.result.current).toBeNull();
    expect(none.result.current).toBeNull();
    expect(searchListings).not.toHaveBeenCalled();
  });
});
