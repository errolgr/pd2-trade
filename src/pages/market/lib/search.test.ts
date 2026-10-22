import { describe, expect, it, vi } from 'vitest';
import { defaultFilters, mergeFilters } from './defaults';
import { runSearch, scoreListings } from './search';
import { listing, mod } from './test-utils';
import type { MarketApi, MarketFilters } from './types';

const base = defaultFilters({ hardcore: false, ladder: true });
const filters = (partial: Partial<MarketFilters>) => mergeFilters(base, partial);

function fakeApi(
  items = [{ listing: listing({ id: 'a' }), pseudo: { pseudo_life: 5 }, score: 3, value: 1.5 }],
  total = 40,
) {
  const searchListings = vi.fn(
    async (_f: MarketFilters, _opts: { page: number; limit: number; signal?: AbortSignal }) => ({
      items,
      total,
    }),
  );
  return { api: { searchListings } as unknown as MarketApi, searchListings };
}

describe('runSearch', () => {
  it('asks the market service for one page and passes its ranking through', async () => {
    const { api, searchListings } = fakeApi();
    const f = filters({ sort: { by: 'stat', key: 'pseudo_life', dir: 'desc' } });
    const signal = new AbortController().signal;
    const result = await runSearch(api, f, { page: 2, pageSize: 25, signal });
    expect(searchListings).toHaveBeenCalledWith(f, { page: 2, limit: 25, signal });
    expect(result).toEqual({
      items: [{ listing: expect.objectContaining({ _id: 'a' }), pseudo: { pseudo_life: 5 }, score: 3, value: 1.5 }],
      total: 40,
      fetched: 1,
      mode: 'server',
    });
  });

  it('defaults to the first page of 25 and keeps page sizes within the service limits', async () => {
    const { api, searchListings } = fakeApi();
    await runSearch(api, base);
    await runSearch(api, base, { page: -3, pageSize: 1000 });
    await runSearch(api, base, { pageSize: 0 });
    expect(searchListings.mock.calls.map((c) => c[1])).toEqual([
      { page: 0, limit: 25, signal: undefined },
      { page: 0, limit: 100, signal: undefined },
      { page: 0, limit: 1, signal: undefined },
    ]);
  });

  it('lets service errors through', async () => {
    const { api, searchListings } = fakeApi();
    searchListings.mockRejectedValueOnce(new Error('down'));
    await expect(runSearch(api, base)).rejects.toThrow('down');
  });
});

describe('scoreListings', () => {
  it('scores listings that came from elsewhere (favorites) like search rows', () => {
    const [row] = scoreListings(
      [listing({ mods: [mod('maxhp', 30), mod('all_resist', 10)], hr: 2 })],
      filters({ stats: [{ id: 'w', kind: 'mod', key: 'maxhp', weight: 1, enabled: true }] }),
    );
    expect(row.pseudo.pseudo_total_res).toBe(40);
    expect(row.score).toBe(30);
    expect(row.value).toBe(15);
  });
});
