// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultFilters, mergeFilters, SITE_SEARCH_DEFAULTS } from '../lib/defaults';
import type { MarketFilters } from '../lib/types';
import { MAX_RELAXATIONS, useRelaxations } from './useRelaxations';

afterEach(cleanup);

const base = defaultFilters({ hardcore: false, ladder: true });

/** A count decided by the filters it is asked about. */
function fakeCount(count: (f: MarketFilters) => number | Error) {
  return vi.fn(async (f: MarketFilters, _opts: { page: number; limit: number }) => {
    const n = count(f);
    if (n instanceof Error) throw n;
    return { total: n, totalExact: n < 1000 };
  });
}

const counted = (rows: { id: string; counting: boolean; total: number; totalExact: boolean }[] | null) =>
  rows?.map((r) => [r.id, r.counting ? 'counting' : r.total, r.totalExact]);

describe('useRelaxations', () => {
  it('counts the search without each filter, in filter order, zeros kept and failed counts left out', async () => {
    const f = mergeFilters(base, { itemName: 'Shako', corrupted: 'no', socketsMin: 1, hrMax: 3, ethereal: 'yes' });
    const count = fakeCount((g) =>
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
    const { result } = renderHook(() => useRelaxations(count, f, SITE_SEARCH_DEFAULTS));
    // Every filter shows at once, counting; the item name last
    expect(counted(result.current)).toEqual([
      ['corrupted', 'counting', true],
      ['sockets', 'counting', true],
      ['ethereal', 'counting', true],
      ['hr', 'counting', true],
      ['itemName', 'counting', true],
    ]);
    await waitFor(() => expect(result.current!.every((r) => !r.counting)).toBe(true));
    expect(counted(result.current)).toEqual([
      ['corrupted', 0, true],
      ['sockets', 3, true],
      ['hr', 12, true],
      ['itemName', 5000, false],
    ]);
    // One single-row count per filter
    expect(count.mock.calls.map(([, opts]) => opts.limit)).toEqual([1, 1, 1, 1, 1]);
  });

  it('fills each count in as it lands, while the others still count', async () => {
    const f = mergeFilters(base, { corrupted: 'no', socketsMin: 1 });
    const pending: ((n: number) => void)[] = [];
    const count = vi.fn(
      (_f: MarketFilters) =>
        new Promise<{ total: number; totalExact: boolean }>((resolve) =>
          pending.push((n) => resolve({ total: n, totalExact: true })),
        ),
    );
    const { result } = renderHook(() => useRelaxations(count, f, SITE_SEARCH_DEFAULTS));
    await waitFor(() => expect(pending).toHaveLength(2));
    await act(async () => pending[1](8));
    expect(counted(result.current)).toEqual([
      ['corrupted', 'counting', true],
      ['sockets', 8, true],
    ]);
    await act(async () => pending[0](2));
    expect(counted(result.current)).toEqual([
      ['corrupted', 2, true],
      ['sockets', 8, true],
    ]);
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
    const count = fakeCount(() => 1);
    const { result } = renderHook(() => useRelaxations(count, many, SITE_SEARCH_DEFAULTS));
    expect(result.current).toHaveLength(MAX_RELAXATIONS);
    await waitFor(() => expect(result.current!.every((r) => !r.counting)).toBe(true));
    expect(count).toHaveBeenCalledTimes(MAX_RELAXATIONS);

    count.mockClear();
    const idle = renderHook(() => useRelaxations(count, base, SITE_SEARCH_DEFAULTS));
    const none = renderHook(() => useRelaxations(count, null, SITE_SEARCH_DEFAULTS));
    expect(idle.result.current).toBeNull();
    expect(none.result.current).toBeNull();
    expect(count).not.toHaveBeenCalled();
  });

  it('does not count again when the same search re-renders with rebuilt filters', async () => {
    const f = mergeFilters(base, { corrupted: 'no' });
    const count = fakeCount(() => 2);
    const { result, rerender } = renderHook(({ filters }) => useRelaxations(count, filters, SITE_SEARCH_DEFAULTS), {
      initialProps: { filters: f },
    });
    await waitFor(() => expect(result.current?.[0].counting).toBe(false));
    rerender({ filters: { ...f } });
    expect(counted(result.current)).toEqual([['corrupted', 2, true]]);
    expect(count).toHaveBeenCalledTimes(1);
  });
});
