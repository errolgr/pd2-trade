import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { defaultFilters, mergeFilters } from '@/pages/market/lib/defaults';
import type { MarketFilters } from '@/pages/market/lib/types';
import {
  MARKET_SEARCH_TIMEOUT_MS,
  MarketBackendError,
  marketSearchBody,
  searchMarketListings,
} from './market-search-api';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));

const base = defaultFilters({ hardcore: false, ladder: true });

function respond(status: number, body: unknown = {}, headers: Record<string, string> = {}) {
  vi.mocked(fetch).mockResolvedValue(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    }),
  );
}

const search = (f: MarketFilters = base, signal?: AbortSignal) =>
  searchMarketListings(f, { page: 1, limit: 25, signal });

afterEach(() => {
  vi.mocked(fetch).mockReset();
  vi.useRealTimers();
});

describe('searchMarketListings', () => {
  it('POSTs the filters with page and limit, maps the rows and drops those without an item', async () => {
    const listing = { _id: 'L1', price: '2 hr', hr_price: 2, item: { name: 'Dread Visage' } };
    const unscored = { _id: 'L3', item: { name: 'Shako' } };
    respond(200, {
      items: [
        { listing, pseudo: { pseudo_total_res: 75 }, score: 95, value: 47.5 },
        { listing: { _id: 'L2' }, pseudo: {}, score: 1, value: 1 },
        { listing: unscored, pseudo: {}, score: null, value: null },
      ],
      total: 312,
      page: 1,
      limit: 25,
      mode: 'server',
    });
    const f = mergeFilters(base, { typeCode: 'circ', sort: { by: 'value', dir: 'desc' } });

    const result = await search(f);

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`${BACKEND_URL}/api/market/search`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual(JSON.parse(JSON.stringify(marketSearchBody(f, 1, 25))));
    expect(result).toEqual({
      total: 312,
      totalExact: true,
      // Rows the service sent, the dropped one included: paging reads this
      fetched: 3,
      items: [
        { listing, pseudo: { pseudo_total_res: 75 }, score: 95, value: 47.5 },
        { listing: unscored, pseudo: {}, score: null, value: null },
      ],
    });
  });

  it("reads each row's status and lifetime, and sends the statuses a search asks for", async () => {
    const listing = { _id: 'L1', item: { name: 'Shako' } };
    respond(200, {
      items: [
        {
          listing,
          pseudo: {},
          score: null,
          value: null,
          status: 'removed',
          listedAt: '2026-10-20T09:00:00.000Z',
          endedAt: '2026-10-22T09:00:00.000Z',
          durationSeconds: 172800,
        },
      ],
      total: 1,
    });
    const f = mergeFilters(base, { source: 'archive', status: ['sold', 'removed', 'expired'] });

    const result = await search(f);

    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string).filters.status).toEqual([
      'sold',
      'removed',
      'expired',
    ]);
    expect(result.items[0]).toMatchObject({
      status: 'removed',
      listedAt: '2026-10-20T09:00:00.000Z',
      endedAt: '2026-10-22T09:00:00.000Z',
      durationSeconds: 172800,
    });
  });

  it('reads totalExact, an exact count when the service omits it', async () => {
    respond(200, { items: [], total: 1000, totalExact: false });
    await expect(search()).resolves.toMatchObject({ total: 1000, totalExact: false });
    respond(200, { items: [], total: 1000, totalExact: 'no' });
    await expect(search()).resolves.toMatchObject({ totalExact: true });
  });

  it.each([
    [500, 'unavailable'],
    [502, 'unavailable'],
    [503, 'unavailable'],
    [404, 'unavailable'],
    [429, 'rate-limited'],
    [400, 'invalid'],
  ] as const)('HTTP %i → MarketBackendError %s', async (status, kind) => {
    respond(status, { message: 'filters.stats[0].key must be a property key' }, { 'retry-after': '12' });
    const error = await search().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MarketBackendError);
    expect(error).toMatchObject({ kind, status });
    if (kind === 'invalid') expect(error).toMatchObject({ message: 'filters.stats[0].key must be a property key' });
    if (kind === 'rate-limited') expect(error).toMatchObject({ retryAfterMs: 12_000 });
  });

  it('an unreachable service or an unreadable reply is unavailable', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(search()).rejects.toMatchObject({ name: 'MarketBackendError', kind: 'unavailable' });
    respond(200, '<html>maintenance</html>');
    await expect(search()).rejects.toMatchObject({ kind: 'unavailable' });
    respond(200, { nope: true });
    await expect(search()).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('times out after 8 s as unavailable', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
        ),
    );
    const pending = search().catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(MARKET_SEARCH_TIMEOUT_MS);
    expect(await pending).toMatchObject({ kind: 'unavailable', message: expect.stringMatching(/too long/) });
  });

  it("the caller's abort rejects with the abort, not a service error", async () => {
    vi.mocked(fetch).mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
        ),
    );
    const controller = new AbortController();
    const pending = search(base, controller.signal).catch((e: unknown) => e);
    controller.abort();
    expect(await pending).toMatchObject({ name: 'AbortError' });

    const aborted = new AbortController();
    aborted.abort();
    await expect(search(base, aborted.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('marketSearchBody', () => {
  it('sends only the fields the service accepts, and a sort key only with a stat sort', () => {
    const stale = {
      ...mergeFilters(base, {
        stats: [{ id: 's1', kind: 'pseudo', key: 'pseudo_life', min: 40, enabled: true }],
        sort: { by: 'price', dir: 'asc', key: 'pseudo_life' },
      }),
      legacyField: 'x',
    } as MarketFilters;
    const body = JSON.parse(JSON.stringify(marketSearchBody(stale, 0, 25)));
    expect(body.filters).not.toHaveProperty('legacyField');
    expect(body.filters.sort).toEqual({ by: 'price', dir: 'asc' });
    expect(body.filters.stats).toEqual([{ id: 's1', kind: 'pseudo', key: 'pseudo_life', min: 40, enabled: true }]);
    expect(body).toMatchObject({ page: 0, limit: 25 });

    const stat = marketSearchBody(mergeFilters(base, { sort: { by: 'stat', key: 'maxhp', dir: 'desc' } }), 0, 25);
    expect(stat.filters.sort).toEqual({ by: 'stat', key: 'maxhp', dir: 'desc' });
  });

  it('leaves out stat rows whose stat has not been picked yet', () => {
    const f = mergeFilters(base, {
      stats: [
        { id: 'a', kind: 'mod', key: '', enabled: true },
        { id: 'b', kind: 'mod', key: 'item_fastercastrate', enabled: true },
      ],
    });
    expect(marketSearchBody(f, 0, 25).filters.stats.map((s) => s.id)).toEqual(['b']);
  });

  it('sends an exclusive HR max (a price chart bucket) only with a max', () => {
    const body = (f: Partial<MarketFilters>) => marketSearchBody(mergeFilters(base, f), 0, 25).filters;
    expect(body({ hrMin: 0.5, hrMax: 1, hrMaxExclusive: true })).toMatchObject({ hrMax: 1, hrMaxExclusive: true });
    expect(body({ hrMin: 2, hrMaxExclusive: true }).hrMaxExclusive).toBeUndefined();
    expect(body({ hrMax: 1 }).hrMaxExclusive).toBeUndefined();
  });

  it('sends OR blocks, NOT and corruption rows, and never text over the service limits', () => {
    const f = mergeFilters(base, {
      priceText: 'x'.repeat(150),
      sellerName: 'CIutch',
      stats: [
        { id: 'a', kind: 'corruption', key: 'item_fastercastrate', min: 10, enabled: true, or: 2 },
        { id: 'b', kind: 'mod', key: 'maxhp', enabled: true, or: undefined },
        { id: 'c', kind: 'mod', key: 'strength', enabled: true, not: true },
      ],
    });
    const body = JSON.parse(JSON.stringify(marketSearchBody(f, 0, 25)));
    expect(body.filters.stats).toEqual([
      { id: 'a', kind: 'corruption', key: 'item_fastercastrate', min: 10, enabled: true, or: 2 },
      { id: 'b', kind: 'mod', key: 'maxhp', enabled: true },
      { id: 'c', kind: 'mod', key: 'strength', enabled: true, not: true },
    ]);
    expect(body.filters.priceText).toHaveLength(100);
    expect(body.filters.sellerName).toBe('CIutch');
    // A seller picked from a listing is queried by id
    const byId = marketSearchBody({ ...f, sellerUserId: 'u1' }, 0, 25).filters;
    expect(byId).toMatchObject({ sellerUserId: 'u1', sellerName: undefined });
  });
});

describe('facets', () => {
  it('sends facets only when asked, and reads them from the reply', async () => {
    expect(marketSearchBody(base, 0, 25)).not.toHaveProperty('facets');
    expect(marketSearchBody(base, 0, 25, [])).not.toHaveProperty('facets');
    expect(marketSearchBody(base, 0, 25, ['quality', 'price'])).toMatchObject({ facets: ['quality', 'price'] });

    respond(200, {
      items: [],
      total: 3,
      facets: {
        quality: [
          { value: 'Unique', count: 3 },
          { value: 'Set', count: 'many' },
        ],
        sockets: [{ value: 0, count: 2 }],
        ethereal: [{ value: true, count: 1 }],
        price: [
          { from: 0, to: 0.05, count: 2 },
          { from: 20, to: null, count: 1 },
        ],
      },
    });
    const page = await searchMarketListings(base, { page: 0, limit: 25, facets: ['quality', 'sockets'] });
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(init?.body as string).facets).toEqual(['quality', 'sockets']);
    expect(page.facets).toMatchObject({
      // A malformed bucket is dropped, not the facet
      quality: [{ value: 'Unique', count: 3 }],
      sockets: [{ value: 0, count: 2 }],
      ethereal: [{ value: true, count: 1 }],
      price: [
        { from: 0, to: 0.05, count: 2 },
        { from: 20, to: null, count: 1 },
      ],
    });

    respond(200, { items: [], total: 0 });
    expect((await search()).facets).toBeUndefined();
  });
});
