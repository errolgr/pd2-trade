// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { runSearch } from '../lib/search';
import { isPoolMode } from '../lib/query';
import type { MarketApi, MarketFilters, ScoredListing, SearchResult, StatFilter } from '../lib/types';
import { clearMarketSearchCache, MARKET_PAGE_SIZE, rescore, useMarketSearch } from './useMarketSearch';
import type * as SearchModule from '../lib/search';

vi.mock('../lib/search', async (importOriginal) => ({
  ...(await importOriginal<typeof SearchModule>()),
  runSearch: vi.fn(),
}));
vi.mock('../lib/query', () => ({ isPoolMode: vi.fn() }));
// score = Σ weight × pseudo[key]: enough to see re-ranking without the real stat tables
vi.mock('../lib/scoring', () => ({
  scoreListing: (listing: MarketListingEntry, stats: StatFilter[], pseudo: Record<string, number>) => {
    const weighted = stats.filter((s) => s.enabled && s.weight);
    if (!weighted.length) return { score: null, value: null };
    const score = weighted.reduce((sum, s) => sum + (s.weight ?? 0) * (pseudo[s.key] ?? 0), 0);
    return { score, value: listing.hr_price > 0 ? score / listing.hr_price : null };
  },
}));

const api = {} as MarketApi;

const filters = (over: Partial<MarketFilters> = {}): MarketFilters => ({
  source: 'live',
  hardcore: false,
  ladder: true,
  rarity: [],
  ethereal: 'any',
  corrupted: 'any',
  desecrated: 'any',
  identified: 'any',
  userOnlineSite: 'all',
  userOnlineGame: 'all',
  hasBuyout: 'any',
  requirements: {},
  stats: [],
  corruptions: [],
  maxAgeDays: 3,
  sort: { by: 'bumped', dir: 'desc' },
  ...over,
});

const row = (id: string, pseudo: Record<string, number> = {}, hr = 1): ScoredListing => ({
  listing: { _id: id, hr_price: hr } as MarketListingEntry,
  pseudo,
  score: null,
  value: null,
});

const result = (items: ScoredListing[], over: Partial<SearchResult> = {}): SearchResult => ({
  items,
  total: items.length,
  fetched: items.length,
  truncated: false,
  mode: 'server',
  ...over,
});

beforeEach(() => {
  clearMarketSearchCache();
  vi.mocked(isPoolMode).mockImplementation((f: MarketFilters) => f.sort.by === 'score' || f.sort.by === 'value');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useMarketSearch', () => {
  it('debounces filter changes and aborts the superseded search', async () => {
    const signals: AbortSignal[] = [];
    vi.mocked(runSearch).mockImplementation(async (_api, f, opts) => {
      signals.push(opts!.signal!);
      return result([row(f.itemName ?? 'x')]);
    });
    const { result: hook, rerender } = renderHook(
      ({ f }) => useMarketSearch(api, f, { signedIn: true, debounceMs: 20 }),
      {
        initialProps: { f: filters({ itemName: 'a' }) },
      },
    );
    rerender({ f: filters({ itemName: 'b' }) });
    rerender({ f: filters({ itemName: 'c' }) });

    await waitFor(() => expect(hook.current.status).toBe('ready'));
    // Only the last edit ran: the earlier ones were cancelled inside the debounce window
    expect(runSearch).toHaveBeenCalledTimes(1);
    expect(hook.current.items.map((r) => r.listing._id)).toEqual(['c']);
    expect(signals[0].aborted).toBe(false);
  });

  it('serves a repeated query from the cache and refetches on refresh', async () => {
    vi.mocked(runSearch).mockResolvedValue(result([row('1')]));
    const f = filters({ itemName: 'Shako' });
    const { result: hook, rerender } = renderHook(
      ({ f }) => useMarketSearch(api, f, { signedIn: true, debounceMs: 0 }),
      {
        initialProps: { f },
      },
    );
    await waitFor(() => expect(hook.current.status).toBe('ready'));
    rerender({ f: filters({ itemName: 'Other' }) });
    await waitFor(() => expect(runSearch).toHaveBeenCalledTimes(2));
    rerender({ f: filters({ itemName: 'Shako' }) });
    await waitFor(() => expect(hook.current.filters?.itemName).toBe('Shako'));
    expect(runSearch).toHaveBeenCalledTimes(2);

    act(() => hook.current.refresh());
    await waitFor(() => expect(runSearch).toHaveBeenCalledTimes(3));
  });

  it('re-ranks fetched rows instead of refetching when only weights change', async () => {
    vi.mocked(runSearch).mockResolvedValue(
      result([row('fire', { res: 10, life: 50 }), row('life', { res: 40, life: 5 })], { mode: 'pool' }),
    );
    const stat = (weight: number): StatFilter => ({ id: 's', kind: 'pseudo', key: 'res', weight, enabled: true });
    const life = (weight: number): StatFilter => ({ id: 'l', kind: 'pseudo', key: 'life', weight, enabled: true });
    const sort = { by: 'score' as const, dir: 'desc' as const };
    const { result: hook, rerender } = renderHook(
      ({ f }) => useMarketSearch(api, f, { signedIn: true, debounceMs: 0 }),
      {
        initialProps: { f: filters({ sort, stats: [stat(1), life(0)] }) },
      },
    );
    await waitFor(() => expect(hook.current.status).toBe('ready'));

    rerender({ f: filters({ sort, stats: [stat(0), life(1)] }) });
    await waitFor(() => expect(hook.current.items[0].listing._id).toBe('fire'));
    expect(hook.current.items[0].score).toBe(50);
    expect(runSearch).toHaveBeenCalledTimes(1);
  });

  it('appends server pages on loadMore', async () => {
    vi.mocked(runSearch).mockImplementation(async (_api, _f, opts) => result([row(`p${opts!.page}`)], { total: 2 }));
    const f = filters();
    const { result: hook } = renderHook(() => useMarketSearch(api, f, { signedIn: true, debounceMs: 0 }));
    await waitFor(() => expect(hook.current.hasMore).toBe(true));
    await act(() => hook.current.loadMore());
    expect(hook.current.items.map((r) => r.listing._id)).toEqual(['p0', 'p1']);
    expect(hook.current.hasMore).toBe(false);
    expect(vi.mocked(runSearch).mock.calls[1][2]).toMatchObject({ page: 1, pageSize: MARKET_PAGE_SIZE });
  });

  it('reports sign-in and errors', async () => {
    const f = filters();
    const { result: signedOut } = renderHook(() => useMarketSearch(api, f, { signedIn: false }));
    expect(signedOut.current.status).toBe('auth');

    vi.mocked(runSearch).mockRejectedValue(Object.assign(new Error('API Error: 429 Too Many'), { status: 429 }));
    const g = filters({ itemName: 'x' });
    const { result: hook } = renderHook(() => useMarketSearch(api, g, { signedIn: true, debounceMs: 0 }));
    await waitFor(() => expect(hook.current.status).toBe('error'));
    expect(hook.current.error).toMatch(/rate limiting/);
  });
});

describe('rescore', () => {
  it('orders by value ascending with unknown values last', () => {
    const f = filters({
      sort: { by: 'value', dir: 'asc' },
      stats: [{ id: 's', kind: 'pseudo', key: 'res', weight: 1, enabled: true }],
    });
    const rows = rescore([row('a', { res: 10 }, 1), row('b', { res: 10 }, 0), row('c', { res: 10 }, 5)], f);
    expect(rows.map((r) => r.listing._id)).toEqual(['c', 'a', 'b']);
  });
});
