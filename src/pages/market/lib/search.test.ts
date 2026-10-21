import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MarketListingEntry, MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { defaultFilters, mergeFilters } from './defaults';
import { matchesClientFilters, runSearch, scoreListings, sortScored } from './search';
import { listing, mod } from './test-utils';
import type { MarketApi, MarketFilters, StatFilter } from './types';

const base = defaultFilters({ hardcore: false, ladder: true });
const filters = (partial: Partial<MarketFilters>) => mergeFilters(base, partial);
const pseudoRow = (key: string, over: Partial<StatFilter> = {}): StatFilter => ({
  id: key,
  kind: 'pseudo',
  key,
  enabled: true,
  ...over,
});

/** A server holding `all`, paged by $skip/$limit (capped at 250 like PD2). */
function fakeApi(all: MarketListingEntry[]) {
  const page = vi.fn(async (q: Record<string, unknown>): Promise<MarketListingResult> => {
    const skip = Number(q.$skip);
    const limit = Math.min(250, Number(q.$limit));
    return { total: all.length, limit, skip, data: all.slice(skip, skip + limit) };
  });
  const api: MarketApi = {
    getMarketListings: page,
    getMarketListingsArchive: vi.fn(page),
    getFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    findUsers: vi.fn(),
  };
  return { api, page };
}

const many = (n: number, mods = (i: number) => [mod('maxhp', i)]) =>
  Array.from({ length: n }, (_, i) => listing({ id: `L${i}`, mods: mods(i), hr: (i % 5) + 1 }));

afterEach(() => {
  vi.useRealTimers();
});

describe('matchesClientFilters', () => {
  const [scored] = scoreListings([listing({ mods: [mod('all_resist', 20)] })], base);

  it('applies enabled pseudo bounds only', () => {
    expect(matchesClientFilters(scored, filters({ stats: [pseudoRow('pseudo_total_res', { min: 80 })] }))).toBe(true);
    expect(matchesClientFilters(scored, filters({ stats: [pseudoRow('pseudo_total_res', { min: 81 })] }))).toBe(false);
    expect(matchesClientFilters(scored, filters({ stats: [pseudoRow('pseudo_total_res', { max: 79 })] }))).toBe(false);
    expect(
      matchesClientFilters(scored, filters({ stats: [pseudoRow('pseudo_total_res', { min: 81, enabled: false })] })),
    ).toBe(true);
    // Mod rows are the server's job
    expect(
      matchesClientFilters(
        scored,
        filters({ stats: [{ id: 'm', kind: 'mod', key: 'maxhp', min: 999, enabled: true }] }),
      ),
    ).toBe(true);
  });
});

describe('sortScored', () => {
  const items = scoreListings(
    [
      listing({ id: 'a', mods: [mod('maxhp', 10)], hr: 1, bumpedAt: '2026-10-18T10:00:00Z' }),
      listing({ id: 'b', mods: [mod('maxhp', 30)], hr: 10, bumpedAt: '2026-10-18T09:00:00Z' }),
      listing({ id: 'c', mods: [mod('maxhp', 10)], bumpedAt: '2026-10-18T11:00:00Z' }),
      listing({ id: 'd', mods: [], hr: 1, bumpedAt: '2026-10-18T08:00:00Z' }),
    ],
    filters({ stats: [{ id: 'w', kind: 'mod', key: 'maxhp', weight: 1, enabled: true }] }),
  );
  const ids = (sorted: typeof items) => sorted.map((s) => s.listing._id).join('');

  it('score desc/asc with newest bump breaking ties', () => {
    expect(ids(sortScored(items, { by: 'score', dir: 'desc' }))).toBe('bcad');
    expect(ids(sortScored(items, { by: 'score', dir: 'asc' }))).toBe('dcab');
  });

  it('value (score per HR) puts unpriced listings last in both directions', () => {
    expect(ids(sortScored(items, { by: 'value', dir: 'desc' }))).toBe('abdc');
    expect(ids(sortScored(items, { by: 'value', dir: 'asc' }))).toBe('dbac');
  });

  it('keeps server order for server sorts', () => {
    expect(ids(sortScored(items, { by: 'price', dir: 'asc' }))).toBe('abcd');
  });
});

describe('runSearch — server mode', () => {
  it('fetches exactly one page at the requested offset, scored but unfiltered', async () => {
    const { api, page } = fakeApi(many(35));
    const result = await runSearch(api, filters({}), { page: 2, pageSize: 10 });
    expect(page).toHaveBeenCalledTimes(1);
    expect(page.mock.calls[0][0]).toMatchObject({ $limit: 10, $skip: 20 });
    expect(result).toMatchObject({ mode: 'server', total: 35, fetched: 10, truncated: false });
    expect(result.items.map((s) => s.listing._id)).toEqual(Array.from({ length: 10 }, (_, i) => `L${20 + i}`));
  });

  it('uses the archive endpoint for the archive source', async () => {
    const { api } = fakeApi(many(3));
    await runSearch(api, filters({ source: 'archive' }));
    expect(api.getMarketListingsArchive).toHaveBeenCalledTimes(1);
  });

  it('turns the 401 null into an error instead of an empty result', async () => {
    const { api } = fakeApi([]);
    vi.mocked(api.getMarketListings).mockResolvedValueOnce(null);
    await expect(runSearch(api, filters({}))).rejects.toThrow(/session expired/);
  });
});

describe('runSearch — pool mode', () => {
  const scoreSort = filters({
    stats: [{ id: 'w', kind: 'mod', key: 'maxhp', weight: 1, enabled: true }],
    sort: { by: 'score', dir: 'desc' },
  });

  it('pages serially up to poolSize, reports progress and flags truncation', async () => {
    const { api, page } = fakeApi(many(600));
    const progress: [number, number][] = [];
    const result = await runSearch(api, scoreSort, { poolSize: 400, onProgress: (f, t) => progress.push([f, t]) });
    expect(page.mock.calls.map(([q]) => [q.$skip, q.$limit])).toEqual([
      [0, 250],
      [250, 150],
    ]);
    expect(progress).toEqual([
      [250, 400],
      [400, 400],
    ]);
    expect(result).toMatchObject({ mode: 'pool', total: 600, fetched: 400, truncated: true });
    expect(result.items[0].listing._id).toBe('L399');
    expect(result.items[0].score).toBe(399);
  });

  it('stops at the end of the results without truncation', async () => {
    const { api, page } = fakeApi(many(120));
    const result = await runSearch(api, scoreSort, { poolSize: 200, pageSize: 50 });
    expect(page).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ fetched: 120, truncated: false });
    expect(result.items).toHaveLength(120);
  });

  it('applies pseudo filters to the pool and keeps the server order for server sorts', async () => {
    const all = many(30, (i) => [mod('all_resist', i)]);
    const { api } = fakeApi(all);
    const result = await runSearch(api, filters({ stats: [pseudoRow('pseudo_total_res', { min: 100 })] }));
    expect(result.mode).toBe('pool');
    expect(result.items.map((s) => s.listing._id)).toEqual(all.slice(25).map((l) => l._id));
  });

  it('drops a listing repeated across pages by a bump', async () => {
    const all = many(4);
    const { api } = fakeApi([all[0], all[1], all[1], all[2], all[3]]);
    const result = await runSearch(api, scoreSort, { pageSize: 2 });
    expect(result.items.map((s) => s.listing._id).sort()).toEqual(['L0', 'L1', 'L2', 'L3']);
    expect(result.fetched).toBe(5);
  });

  it('keeps one time window across pages', async () => {
    const { api, page } = fakeApi(many(300));
    await runSearch(api, scoreSort, { poolSize: 300 });
    expect(page.mock.calls[0][0].updated_at).toEqual(page.mock.calls[1][0].updated_at);
  });

  it('aborts between pages', async () => {
    const { api, page } = fakeApi(many(600));
    const controller = new AbortController();
    const result = runSearch(api, scoreSort, {
      poolSize: 600,
      signal: controller.signal,
      onProgress: () => controller.abort(),
    });
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(page).toHaveBeenCalledTimes(1);
  });

  it('rejects at once when already aborted', async () => {
    const { api, page } = fakeApi(many(5));
    const controller = new AbortController();
    controller.abort();
    await expect(runSearch(api, scoreSort, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(page).not.toHaveBeenCalled();
  });
});

describe('runSearch — rate limiting', () => {
  const rateLimited = (retryAfterMs: number | null) =>
    Object.assign(new Error('API Error: 429 Too Many Requests'), { status: 429, retryAfterMs });

  it('waits for Retry-After, then retries the same page', async () => {
    vi.useFakeTimers();
    const { api, page } = fakeApi(many(3));
    page.mockRejectedValueOnce(rateLimited(3000));
    const result = runSearch(api, filters({}));
    await vi.advanceTimersByTimeAsync(2999);
    expect(page).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toMatchObject({ fetched: 3 });
    expect(page).toHaveBeenCalledTimes(2);
  });

  it('backs off exponentially when Retry-After is shorter, and gives up after the retry budget', async () => {
    vi.useFakeTimers();
    const { api, page } = fakeApi(many(3));
    page.mockRejectedValue(rateLimited(1));
    const result = runSearch(api, filters({}));
    const settled = expect(result).rejects.toMatchObject({ status: 429 });
    // 1 s, 2 s, 4 s, 8 s, 16 s
    await vi.advanceTimersByTimeAsync(31_000);
    await settled;
    expect(page).toHaveBeenCalledTimes(6);
  });

  it('abort during a backoff rejects without another request', async () => {
    vi.useFakeTimers();
    const { api, page } = fakeApi(many(3));
    page.mockRejectedValueOnce(rateLimited(10_000));
    const controller = new AbortController();
    const result = runSearch(api, filters({}), { signal: controller.signal });
    const settled = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    await settled;
    expect(page).toHaveBeenCalledTimes(1);
  });

  it('other errors propagate immediately', async () => {
    const { api, page } = fakeApi(many(3));
    page.mockRejectedValueOnce(new Error('API Error: 500 boom'));
    await expect(runSearch(api, filters({}))).rejects.toThrow('API Error: 500 boom');
    expect(page).toHaveBeenCalledTimes(1);
  });
});
