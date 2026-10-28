// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { reportApiError } from '@/lib/error-reporting';
import type { ISettings } from '@/hooks/useOptions';
import type { AuthData } from '@/common/types/pd2-website/AuthResponse';
import type { GameData, Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { useMarketActions } from './useMarketActions';
import { AuthenticationError } from './usePD2Website';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/error-reporting', () => ({ reportApiError: vi.fn() }));

const fetchMock = vi.mocked(tauriFetch);
const TTL = 5 * 60 * 1000;
const NOW = new Date('2026-10-18T12:00:00.000Z');

function fakeResponse(status: number, body: unknown, url = 'https://api.projectdiablo2.com/market/listing') {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    url,
    text: async () => text,
    json: async () => JSON.parse(text),
  } as unknown as Response;
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: String(url), init: init as RequestInit & { headers: Record<string, string> } };
}

const baseSettings = {
  pd2Token: 'tok',
  account: 'MyAcc',
  mode: 'softcore',
  ladder: 'ladder',
} as ISettings;

const authData = { user: { _id: 'user-1' } } as AuthData;
const shako = { hash: 'h1', name: 'Harlequin Crest' } as GameStashItem;
const priceCheckItem = { name: 'Harlequin Crest', type: 'Shako', quality: 'Unique' } as PriceCheckItem;

function market(
  opts: {
    settings?: Partial<ISettings>;
    cache?: { data: GameData; timestamp: number } | null;
    findItemsByName?: (items: GameStashItem[], item: PriceCheckItem) => GameStashItem[];
  } = {},
) {
  const fetchAndCacheStash = vi.fn(async () => ({ items: [shako] }) as GameData);
  const findItemsByName = vi.fn(opts.findItemsByName ?? ((items: GameStashItem[]) => items));
  const onAuthError = vi.fn();
  const stashCache = { current: opts.cache ?? null };
  const { result } = renderHook(() =>
    useMarketActions({
      settings: { ...baseSettings, ...opts.settings } as ISettings,
      authData,
      fetchAndCacheStash,
      findItemsByName,
      stashCache,
      CACHE_TTL: TTL,
      onAuthError,
    }),
  );
  return { actions: result.current, fetchAndCacheStash, findItemsByName, onAuthError };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  fetchMock.mockResolvedValue(fakeResponse(200, { _id: 'listing-1' }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('findMatchingItems', () => {
  const cachedItem = { hash: 'cached', name: 'Harlequin Crest' } as GameStashItem;

  it('uses a fresh cache hit without refetching the stash', async () => {
    const { actions, fetchAndCacheStash } = market({
      cache: { data: { items: [cachedItem] } as GameData, timestamp: NOW.getTime() - TTL + 1 },
    });
    await expect(actions.findMatchingItems(priceCheckItem)).resolves.toEqual([cachedItem]);
    expect(fetchAndCacheStash).not.toHaveBeenCalled();
  });

  it('refetches when the cache is exactly TTL old', async () => {
    const { actions, fetchAndCacheStash } = market({
      cache: { data: { items: [cachedItem] } as GameData, timestamp: NOW.getTime() - TTL },
    });
    await expect(actions.findMatchingItems(priceCheckItem)).resolves.toEqual([shako]);
    expect(fetchAndCacheStash).toHaveBeenCalledTimes(1);
  });

  it('refetches when the fresh cache has no match (item may have just been stashed)', async () => {
    const { actions, fetchAndCacheStash } = market({
      cache: { data: { items: [cachedItem] } as GameData, timestamp: NOW.getTime() },
      findItemsByName: (items) => items.filter((i) => i.hash === 'h1'),
    });
    await expect(actions.findMatchingItems(priceCheckItem)).resolves.toEqual([shako]);
    expect(fetchAndCacheStash).toHaveBeenCalledTimes(1);
  });

  it('fetches when there is no cache and tolerates a stash without items', async () => {
    const { actions, fetchAndCacheStash, findItemsByName } = market();
    fetchAndCacheStash.mockResolvedValueOnce({} as GameData);
    await expect(actions.findMatchingItems(priceCheckItem)).resolves.toEqual([]);
    expect(findItemsByName).toHaveBeenCalledWith([], priceCheckItem);
  });

  it('treats a cached entry with null data as empty and refetches', async () => {
    const { actions, fetchAndCacheStash } = market({ cache: { data: null, timestamp: NOW.getTime() } });
    await expect(actions.findMatchingItems(priceCheckItem)).resolves.toEqual([shako]);
    expect(fetchAndCacheStash).toHaveBeenCalledTimes(1);
  });
});

describe('listSpecificItem', () => {
  it('posts a listing tagged with mode/ladder, lowercased account, and bump time', async () => {
    const { actions } = market({ settings: { mode: 'hardcore', ladder: 'non-ladder' } });
    await expect(actions.listSpecificItem(shako, 2.5, '2.5 HR obo', 'note')).resolves.toEqual({ _id: 'listing-1' });

    const { url, init } = lastCall();
    expect(url).toBe('https://api.projectdiablo2.com/market/listing');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body as string)).toEqual({
      user_id: 'user-1',
      type: 'item',
      is_hardcore: true,
      is_ladder: false,
      item: { ...shako, account_id: 'myacc' },
      hr_price: 2.5,
      price: '2.5 HR obo',
      bumped_at: NOW.toISOString(),
    });
  });

  it('softcore ladder maps to is_hardcore=false, is_ladder=true', async () => {
    const { actions } = market();
    await actions.listSpecificItem(shako, 1, '', 'exact');
    const body = JSON.parse(lastCall().init.body as string);
    expect([body.is_hardcore, body.is_ladder]).toEqual([false, true]);
  });
});

describe('listing queries', () => {
  const query = {
    user_id: 'user-1',
    is_hardcore: false,
    'item.name': { $in: ['Shako', 'Arachnid Mesh'] },
    $sort: { bumped_at: -1 },
    $limit: 50,
  };
  beforeEach(() => {
    fetchMock.mockResolvedValue(fakeResponse(200, { total: 0, limit: 0, skip: 0, data: [] }));
  });

  it('serializes nested operators with literal bracket keys and indexed arrays', async () => {
    const { actions } = market();
    await actions.getMarketListings(query as never);
    expect(lastCall().url).toBe(
      'https://api.projectdiablo2.com/market/listing?user_id=user-1&is_hardcore=false' +
        '&item.name[$in][0]=Shako&item.name[$in][1]=Arachnid%20Mesh&$sort[bumped_at]=-1&$limit=50',
    );
    expect(lastCall().init.method).toBe('GET');
    expect(lastCall().init.headers.Authorization).toBe('Bearer tok');
  });

  it('getMarketListingsArchive targets the archive collection with the same serialization', async () => {
    const { actions } = market();
    await actions.getMarketListingsArchive({ user_id: 'u' } as never);
    expect(lastCall().url).toBe('https://api.projectdiablo2.com/market/listingArchive?user_id=u');
  });

  it('an empty query produces no dangling "?"', async () => {
    const { actions } = market();
    await actions.getMarketListings({} as never);
    expect(lastCall().url).toBe('https://api.projectdiablo2.com/market/listing');
  });

  it('reports non-auth failures with the serialized query as context', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse(500, { name: 'GeneralError', code: 500, className: 'general-error' }));
    const { actions } = market();
    await expect(actions.getMarketListings(query as never)).rejects.toThrow(/^API Error: 500/);
    expect(reportApiError).toHaveBeenCalledWith(expect.any(Error), 'pd2-api', '/market/listing', 500, {
      errorName: 'GeneralError',
      errorCode: 500,
      errorClassName: 'general-error',
      query: JSON.stringify(query),
    });
  });

  it('401 calls onAuthError and resolves null', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse(401, { message: 'expired' }));
    const { actions, onAuthError } = market();
    await expect(actions.getMarketListings(query as never)).resolves.toBeNull();
    expect(onAuthError).toHaveBeenCalledTimes(1);
  });

  it('drops listings PD2 sent without an item, live and archived (chat cards and prices need one)', async () => {
    const page = { total: 2, limit: 25, skip: 0, data: [{ _id: 'L1', item: { name: 'Shako' } }, { _id: 'L2' }] };
    // `fetched` keeps the rows PD2 sent, so callers still page on a full page
    const expected = { ...page, data: [page.data[0]], fetched: 2 };
    const { actions } = market();
    fetchMock.mockResolvedValueOnce(fakeResponse(200, page));
    await expect(actions.getMarketListings(query as never)).resolves.toEqual(expected);
    fetchMock.mockResolvedValueOnce(fakeResponse(200, page));
    await expect(actions.getMarketListingsArchive(query as never)).resolves.toEqual(expected);
  });
});

describe('listing mutations', () => {
  it('updateMarketListing PATCHes the listing by id with the JSON update', async () => {
    const { actions } = market();
    await actions.updateMarketListing('L1', { hr_price: 3 });
    const { url, init } = lastCall();
    expect(url).toBe('https://api.projectdiablo2.com/market/listing/L1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ hr_price: 3 });
  });

  it('deleteMarketListing DELETEs by id, treats an already-gone listing as deleted, and propagates failures', async () => {
    const { actions } = market();
    await actions.deleteMarketListing('L2');
    expect(lastCall().url).toBe('https://api.projectdiablo2.com/market/listing/L2');
    expect(lastCall().init.method).toBe('DELETE');

    fetchMock.mockResolvedValueOnce(fakeResponse(404, 'gone', 'https://api.projectdiablo2.com/market/listing/L2'));
    await expect(actions.deleteMarketListing('L2')).resolves.toBeUndefined();

    fetchMock.mockResolvedValueOnce(fakeResponse(500, 'boom', 'https://api.projectdiablo2.com/market/listing/L2'));
    await expect(actions.deleteMarketListing('L2')).rejects.toThrow('API Error: 500');
  });

  it("bumpAllMarketListings PATCHes all of the user's listings with the current time", async () => {
    const { actions } = market();
    await actions.bumpAllMarketListings('user-1');
    const { url, init } = lastCall();
    expect(url).toBe('https://api.projectdiablo2.com/market/listing?user_id=user-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ bumped_at: NOW.toISOString() });
  });
});

describe('market browser API', () => {
  it('getFavorites pages newest first with each listing and its seller resolved', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse(200, { total: 0, data: [] }));
    const { actions } = market();
    await expect(actions.getFavorites({ limit: 20, skip: 40 })).resolves.toEqual({ total: 0, data: [] });
    expect(lastCall().url).toBe(
      'https://api.projectdiablo2.com/market/favorite?$limit=20&$skip=40&$sort[updated_at]=-1' +
        '&$resolve[listing][user]=true',
    );
    expect(lastCall().init.method).toBe('GET');
  });

  it('getFavorites keeps a favorite whose listing came without an item, minus that listing', async () => {
    const shown = { _id: 'F1', listing_id: 'L1', listing: { _id: 'L1', item: { name: 'Shako' } } };
    const bare = { _id: 'F2', listing_id: 'L2', listing: { _id: 'L2' } };
    fetchMock.mockResolvedValueOnce(fakeResponse(200, { total: 2, data: [shown, bare] }));
    const { actions } = market();
    const page = await actions.getFavorites();
    expect(page.data).toEqual([shown, { _id: 'F2', listing_id: 'L2' }]);
  });

  it('addFavorite posts the listing and seller; removeFavorite deletes by favorite id', async () => {
    const { actions } = market();
    await actions.addFavorite('L1', 'S1');
    expect(lastCall().url).toBe('https://api.projectdiablo2.com/market/favorite');
    expect(lastCall().init.method).toBe('POST');
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ listing_id: 'L1', seller_id: 'S1' });

    await actions.removeFavorite('F1');
    expect(lastCall().url).toBe('https://api.projectdiablo2.com/market/favorite/F1');
    expect(lastCall().init.method).toBe('DELETE');
  });

  it('getListing reads one listing with its seller; 404 or no item is null, 401 is an error (not "gone")', async () => {
    const listing = { _id: 'L1', price: '2 hr', item: { name: 'Shako' } };
    fetchMock.mockResolvedValueOnce(fakeResponse(200, listing));
    const { actions, onAuthError } = market();
    await expect(actions.getListing('L1')).resolves.toEqual(listing);
    expect(lastCall().url).toBe(
      'https://api.projectdiablo2.com/market/listing/L1?$resolve[user][in_game_account]=true',
    );

    fetchMock.mockResolvedValueOnce(fakeResponse(200, { _id: 'L1', price: '2 hr' }));
    await expect(actions.getListing('L1')).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(fakeResponse(404, { name: 'NotFound' }));
    await expect(actions.getListing('L1')).resolves.toBeNull();
    expect(reportApiError).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(fakeResponse(401, { message: 'expired' }));
    await expect(actions.getListing('L1')).rejects.toBeInstanceOf(AuthenticationError);
    expect(onAuthError).toHaveBeenCalledTimes(1);
  });

  it('createOffer posts what the site posts: listing, offer text and HR value', async () => {
    const { actions } = market();
    await actions.createOffer('L1', { price: '2 ist', hrPrice: 0.5 });
    expect(lastCall().url).toBe('https://api.projectdiablo2.com/market/offer');
    expect(lastCall().init.method).toBe('POST');
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ listing_id: 'L1', offer: '2 ist', hr_offer: 0.5 });
  });

  it('createOffer has the offers lists refetched once PD2 took the offer, not on a 401 or a failure', async () => {
    const onOfferCreated = vi.fn();
    const { result } = renderHook(() =>
      useMarketActions({
        settings: baseSettings,
        authData,
        fetchAndCacheStash: vi.fn(),
        findItemsByName: vi.fn(),
        stashCache: { current: null },
        CACHE_TTL: TTL,
        onAuthError: vi.fn(),
        onOfferCreated,
      }),
    );
    fetchMock.mockResolvedValueOnce(
      fakeResponse(201, { _id: 'offer-1' }, 'https://api.projectdiablo2.com/market/offer'),
    );
    await result.current.createOffer('L1', { price: '2 ist' });
    expect(onOfferCreated).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValueOnce(
      fakeResponse(401, { message: 'expired' }, 'https://api.projectdiablo2.com/market/offer'),
    );
    await result.current.createOffer('L1', { price: '2 ist' }).catch(() => {});
    fetchMock.mockResolvedValueOnce(
      fakeResponse(500, { message: 'boom' }, 'https://api.projectdiablo2.com/market/offer'),
    );
    await result.current.createOffer('L1', { price: '2 ist' }).catch(() => {});
    expect(onOfferCreated).toHaveBeenCalledTimes(1);
  });

  it('marketApi exposes the same functions and stays stable across renders', () => {
    const { result, rerender } = renderHook(() =>
      useMarketActions({
        settings: baseSettings,
        authData,
        fetchAndCacheStash: vi.fn(),
        findItemsByName: vi.fn(),
        stashCache: { current: null },
        CACHE_TTL: TTL,
      }),
    );
    const first = result.current.marketApi;
    expect(first.getMarketListings).toBe(result.current.getMarketListings);
    expect(first.createOffer).toBe(result.current.createOffer);
    rerender();
    expect(result.current.marketApi).toBe(first);
  });
});
