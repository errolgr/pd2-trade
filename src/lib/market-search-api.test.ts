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
  it('POSTs the filters with page and limit, and maps the rows', async () => {
    const listing = { _id: 'L1', price: '2 hr', hr_price: 2, item: { name: 'Dread Visage' } };
    respond(200, {
      items: [
        { listing, pseudo: { pseudo_total_res: 75 }, score: 95, value: 47.5 },
        { listing: { _id: 'L2' }, pseudo: {}, score: null, value: null },
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
      items: [
        { listing, pseudo: { pseudo_total_res: 75 }, score: 95, value: 47.5 },
        { listing: { _id: 'L2' }, pseudo: {}, score: null, value: null },
      ],
    });
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
});
