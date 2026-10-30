// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { MarketBackendError } from '@/lib/market-search-api';
import { runSearch } from '../lib/search';
import type { MarketApi, MarketFilters, ScoredListing, SearchResult, StatFilter } from '../lib/types';
import {
  clearMarketSearchCache,
  MARKET_PAGE_SIZE,
  searchCountText,
  searchErrorMessage,
  useMarketSearch,
} from './useMarketSearch';
import type * as SearchModule from '../lib/search';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('../lib/search', async (importOriginal) => ({
  ...(await importOriginal<typeof SearchModule>()),
  runSearch: vi.fn(),
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
  maxAgeDays: 3,
  sort: { by: 'bumped', dir: 'desc' },
  ...over,
});

const row = (id: string): ScoredListing => ({
  listing: { _id: id, hr_price: 1 } as MarketListingEntry,
  pseudo: {},
  score: null,
  value: null,
});

const result = (items: ScoredListing[], over: Partial<SearchResult> = {}): SearchResult => ({
  items,
  total: items.length,
  totalExact: true,
  fetched: items.length,
  mode: 'server',
  ...over,
});

beforeEach(() => {
  clearMarketSearchCache();
  vi.mocked(runSearch).mockReset();
});

afterEach(() => {
  cleanup();
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
      { initialProps: { f: filters({ itemName: 'a' }) } },
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
    const { result: hook, rerender } = renderHook(
      ({ f }) => useMarketSearch(api, f, { signedIn: true, debounceMs: 0 }),
      { initialProps: { f: filters({ itemName: 'Shako' }) } },
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

  it('refetches when only weights or a stat sort change: the service ranks', async () => {
    vi.mocked(runSearch).mockResolvedValue(result([row('1')]));
    const weight = (w: number): StatFilter => ({
      id: 's',
      kind: 'pseudo',
      key: 'pseudo_total_res',
      weight: w,
      enabled: true,
    });
    const { result: hook, rerender } = renderHook(
      ({ f }) => useMarketSearch(api, f, { signedIn: true, debounceMs: 0 }),
      { initialProps: { f: filters({ stats: [weight(1)], sort: { by: 'score', dir: 'desc' } }) } },
    );
    await waitFor(() => expect(hook.current.status).toBe('ready'));
    rerender({ f: filters({ stats: [weight(2)], sort: { by: 'score', dir: 'desc' } }) });
    await waitFor(() => expect(runSearch).toHaveBeenCalledTimes(2));
    rerender({ f: filters({ stats: [weight(2)], sort: { by: 'stat', key: 'pseudo_life', dir: 'desc' } }) });
    await waitFor(() => expect(runSearch).toHaveBeenCalledTimes(3));
    expect(vi.mocked(runSearch).mock.calls[2][1].sort).toEqual({ by: 'stat', key: 'pseudo_life', dir: 'desc' });
  });

  it('appends pages on loadMore', async () => {
    vi.mocked(runSearch).mockImplementation(async (_api, _f, opts) => result([row(`p${opts!.page}`)], { total: 2 }));
    const f = filters();
    const { result: hook } = renderHook(() => useMarketSearch(api, f, { signedIn: true, debounceMs: 0 }));
    await waitFor(() => expect(hook.current.hasMore).toBe(true));
    expect(vi.mocked(runSearch).mock.calls[0][2]).toMatchObject({ page: 0, pageSize: MARKET_PAGE_SIZE });
    await act(() => hook.current.loadMore());
    expect(hook.current.items.map((r) => r.listing._id)).toEqual(['p0', 'p1']);
    expect(hook.current.hasMore).toBe(false);
    expect(vi.mocked(runSearch).mock.calls[1][2]).toMatchObject({ page: 1, pageSize: MARKET_PAGE_SIZE });
  });

  it('keeps paging past a page whose rows were all item-less: rows, not shown items, decide', async () => {
    const pages: SearchResult[] = [
      result([row('a'), row('b')], { total: 60, fetched: MARKET_PAGE_SIZE }),
      result([], { total: 60, fetched: MARKET_PAGE_SIZE }),
      result([row('c')], { total: 60, fetched: 10 }),
    ];
    vi.mocked(runSearch).mockImplementation(async (_api, _f, opts) => pages[opts!.page!]);
    const f = filters();
    const { result: hook } = renderHook(() => useMarketSearch(api, f, { signedIn: true, debounceMs: 0 }));
    await waitFor(() => expect(hook.current.hasMore).toBe(true));
    await act(() => hook.current.loadMore());
    expect(hook.current.hasMore).toBe(true);
    await act(() => hook.current.loadMore());
    expect(hook.current.items.map((r) => r.listing._id)).toEqual(['a', 'b', 'c']);
    expect(hook.current.hasMore).toBe(false);
  });

  it('pages by the chosen page size, and by MARKET_PAGE_SIZE for a size the settings do not offer', async () => {
    vi.mocked(runSearch).mockImplementation(async (_api, _f, opts) =>
      result([row(`p${opts!.page}`)], { total: 100, fetched: 50 }),
    );
    const f = filters();
    const { result: hook } = renderHook(() => useMarketSearch(api, f, { signedIn: true, debounceMs: 0, pageSize: 50 }));
    await waitFor(() => expect(hook.current.hasMore).toBe(true));
    await act(() => hook.current.loadMore());
    expect(vi.mocked(runSearch).mock.calls[1][2]).toMatchObject({ page: 1, pageSize: 50 });
    // 1 × 50 + 50 rows: all 100 loaded
    expect(hook.current.hasMore).toBe(false);

    const g = filters({ itemName: 'x' });
    renderHook(() => useMarketSearch(api, g, { signedIn: true, debounceMs: 0, pageSize: 30 }));
    await waitFor(() => expect(runSearch).toHaveBeenCalledTimes(3));
    expect(vi.mocked(runSearch).mock.calls[2][2]).toMatchObject({ page: 0, pageSize: MARKET_PAGE_SIZE });
  });

  it('asks to sign in when signed out, and says the service is unavailable when it is', async () => {
    const f = filters();
    const { result: signedOut } = renderHook(() => useMarketSearch(api, f, { signedIn: false }));
    expect(signedOut.current.status).toBe('auth');

    vi.mocked(runSearch).mockRejectedValue(new MarketBackendError('down', 'unavailable', 503));
    const g = filters({ itemName: 'x' });
    const { result: hook } = renderHook(() => useMarketSearch(api, g, { signedIn: true, debounceMs: 0 }));
    await waitFor(() => expect(hook.current.status).toBe('error'));
    expect(hook.current.error).toBe('Market service unavailable. Retry in a moment.');
  });

  it('a failed next page stops automatic loading until Retry, and Retry waits out a rate limit', async () => {
    let failNext: Error | null = new MarketBackendError('slow down', 'rate-limited', 429, 3000);
    vi.mocked(runSearch).mockImplementation(async (_api, _f, opts) => {
      if (opts!.page! > 0 && failNext) throw failNext;
      return result([row(`p${opts!.page}`)], { total: 3 });
    });
    const f = filters();
    const { result: hook } = renderHook(() => useMarketSearch(api, f, { signedIn: true, debounceMs: 0 }));
    await waitFor(() => expect(hook.current.hasMore).toBe(true));

    await act(() => hook.current.loadMore());
    expect(hook.current).toMatchObject({ loadingMore: false, hasMore: true, status: 'ready' });
    expect(hook.current.loadMoreError).toMatch(/Too many market searches/);
    expect(hook.current.loadMoreRetryAt).toBeGreaterThan(Date.now() + 2000);

    // The list's end-of-scroll effect calls loadMore again after every loadingMore flip: no request now
    await act(() => hook.current.loadMore());
    await act(() => hook.current.loadMore());
    expect(runSearch).toHaveBeenCalledTimes(2);
    // Retry before Retry-After passed is ignored too
    await act(() => hook.current.retryLoadMore());
    expect(runSearch).toHaveBeenCalledTimes(2);

    const now = Date.now();
    const spy = vi.spyOn(Date, 'now').mockReturnValue(now + 3001);
    failNext = null;
    await act(() => hook.current.retryLoadMore());
    spy.mockRestore();
    expect(runSearch).toHaveBeenCalledTimes(3);
    expect(hook.current.loadMoreError).toBeNull();
    expect(hook.current.items.map((r) => r.listing._id)).toEqual(['p0', 'p1']);
  });

  it('an unavailable next page can be retried at once, and a refresh clears the error', async () => {
    let fail = true;
    vi.mocked(runSearch).mockImplementation(async (_api, _f, opts) => {
      if (opts!.page! > 0 && fail) throw new MarketBackendError('down', 'unavailable', 503);
      return result([row(`p${opts!.page}`)], { total: 3 });
    });
    const f = filters();
    const { result: hook } = renderHook(() => useMarketSearch(api, f, { signedIn: true, debounceMs: 0 }));
    await waitFor(() => expect(hook.current.hasMore).toBe(true));
    await act(() => hook.current.loadMore());
    expect(hook.current).toMatchObject({
      loadMoreError: 'Market service unavailable. Retry in a moment.',
      loadMoreRetryAt: null,
    });

    act(() => hook.current.refresh());
    await waitFor(() => expect(runSearch).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(hook.current.status).toBe('ready'));
    expect(hook.current.loadMoreError).toBeNull();
    fail = false;
    await act(() => hook.current.loadMore());
    expect(hook.current.items.map((r) => r.listing._id)).toEqual(['p0', 'p1']);
  });
});

describe('searchErrorMessage', () => {
  it('words each market service failure', () => {
    expect(searchErrorMessage(new MarketBackendError('x', 'rate-limited', 429))).toMatch(/Too many market searches/);
    expect(searchErrorMessage(new MarketBackendError('filters.stats[0].key is bad', 'invalid', 400))).toBe(
      'The market service rejected these filters: filters.stats[0].key is bad',
    );
    expect(searchErrorMessage(new Error('boom\nstack'))).toBe('boom');
  });
});

describe('searchCountText', () => {
  const count = (total: number, totalExact: boolean, over: Partial<MarketFilters> = {}) =>
    searchCountText({ total, totalExact, filters: filters(over) });

  it('says an exact count as is', () => {
    expect(count(1, true)).toBe('1 listing');
    expect(count(312, true, { userOnlineGame: 'online' })).toBe('312 listings');
  });

  it('a capped count is a lower bound, a Seller online count an estimate', () => {
    expect(count(1000, false)).toBe(`${(1000).toLocaleString()}+ listings`);
    expect(count(312, false, { userOnlineSite: 'online' })).toBe('~312 listings');
    expect(count(1, false, { userOnlineGame: 'online' })).toBe('~1 listing');
  });
});
