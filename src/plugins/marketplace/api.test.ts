import { describe, expect, it, vi } from 'vitest';
import { MarketplaceHttpError, createMarketplaceApi, listQueryString } from './api';

const BASE = 'https://pd2trader.test/api/plugins';

const listing = (over: Record<string, unknown> = {}) => ({
  id: 'com.example.ticker',
  name: 'Ticker',
  summary: 'Rune prices',
  author: 'alice',
  category: 'pricing',
  tags: ['runes'],
  iconUrl: '/api/plugins/com.example.ticker/media/icon.png',
  screenshots: [
    {
      file: 'a.png',
      url: '/api/plugins/com.example.ticker/media/a.png',
      type: 'image/png',
      width: 1280,
      height: 720,
      caption: 'Main',
    },
    { file: 'b.png', url: 'https://cdn.test/b.png', type: 'image/png', width: 1280, height: 720, caption: null },
  ],
  latestVersion: '1.1.0',
  permissions: ['prices:read'],
  network: [],
  sdk: '^1.0.0',
  compatible: true,
  installs: 10,
  weeklyInstalls: 3,
  rating: { average: 4.5, count: 2 },
  verified: true,
  repo: null,
  approvedAt: null,
  publishedAt: null,
  updatedAt: '2026-11-01T00:00:00Z',
  ...over,
});

function fakeHttp(body: unknown, status = 200) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
}

describe('listQueryString', () => {
  it('sends only the set filters', () => {
    expect(listQueryString({})).toBe('');
    expect(listQueryString({ q: '  rune ', category: 'pricing', tag: 'runes', sort: 'trending', cursor: 'c1' })).toBe(
      '?q=rune&category=pricing&tag=runes&sort=trending&cursor=c1',
    );
    expect(listQueryString({ q: ' ', category: null, tag: null, sort: null, cursor: null })).toBe('');
  });
});

describe('createMarketplaceApi', () => {
  it('lists with sort/tag params and resolves relative media URLs against the backend', async () => {
    const http = fakeHttp({ items: [listing()], nextCursor: 'n' });
    const api = createMarketplaceApi(BASE, http);
    const page = await api.list({ sort: 'new', tag: 'runes' });
    expect(http.mock.calls[0][0]).toBe(`${BASE}/?tag=runes&sort=new`);
    expect(page.nextCursor).toBe('n');
    expect(page.items[0].iconUrl).toBe('https://pd2trader.test/api/plugins/com.example.ticker/media/icon.png');
    expect(page.items[0].screenshots.map((s) => s.url)).toEqual([
      'https://pd2trader.test/api/plugins/com.example.ticker/media/a.png',
      'https://cdn.test/b.png',
    ]);
  });

  it('fills v2 defaults for older listing payloads', async () => {
    const old: Record<string, unknown> = listing();
    for (const key of ['tags', 'screenshots', 'rating', 'weeklyInstalls', 'compatible']) delete old[key];
    const api = createMarketplaceApi(BASE, fakeHttp({ items: [old] }));
    const [item] = (await api.list({})).items;
    expect(item).toMatchObject({
      tags: [],
      screenshots: [],
      rating: { average: null, count: 0 },
      weeklyInstalls: 0,
      compatible: null,
    });
  });

  it('loads discover shelves and drops unknown categories', async () => {
    const http = fakeHttp({
      collections: [{ slug: 'featured', title: 'Featured', description: null, items: [listing()] }],
      trending: [listing()],
      new: [],
      updated: [],
      categories: [
        { slug: 'ui', label: 'UI & themes', count: 2 },
        { slug: 'theme', label: 'Themes', count: 1 },
      ],
    });
    const page = await createMarketplaceApi(BASE, http).discover();
    expect(http.mock.calls[0][0]).toBe(`${BASE}/discover`);
    expect(page.categories).toEqual([{ slug: 'ui', label: 'UI & themes', count: 2 }]);
    expect(page.collections[0].items[0].screenshots[0].url).toMatch(/^https:\/\/pd2trader\.test\//);
  });

  it('parses detail versions with changelog HTML and permission changes', async () => {
    const http = fakeHttp({
      ...listing(),
      description: '# Hi',
      descriptionHtml: '<h2>Hi</h2>',
      versions: [
        {
          version: '1.1.0',
          publishedAt: '2026-11-01T00:00:00Z',
          permissions: ['prices:read', 'chat:read'],
          network: [],
          sdk: '^1.0.0',
          compatible: true,
          changelogHtml: '<ul><li>Chat</li></ul>',
          changes: { permissionsAdded: ['chat:read'], permissionsRemoved: [], hostsAdded: [], hostsRemoved: [] },
        },
      ],
    });
    const detail = await createMarketplaceApi(BASE, http).get('com.example.ticker');
    expect(http.mock.calls[0][0]).toBe(`${BASE}/com.example.ticker`);
    expect(detail.descriptionHtml).toBe('<h2>Hi</h2>');
    expect(detail.versions[0]).toMatchObject({
      changelogHtml: '<ul><li>Chat</li></ul>',
      changes: { permissionsAdded: ['chat:read'] },
    });
  });

  it('pages reviews with sort and cursor', async () => {
    const http = fakeHttp({
      items: [],
      nextCursor: null,
      summary: { average: null, count: 0, histogram: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } },
    });
    await createMarketplaceApi(BASE, http).reviews('a.b', { sort: 'lowest', cursor: 'c' });
    expect(http.mock.calls[0][0]).toBe(`${BASE}/a.b/reviews?sort=lowest&cursor=c`);
  });

  it('saves my review with the bearer and the version', async () => {
    const review = {
      id: 'r1',
      author: 'bob',
      rating: 4,
      body: 'ok',
      version: '1.1.0',
      createdAt: 'x',
      updatedAt: 'x',
      reply: null,
    };
    const http = fakeHttp(review);
    await createMarketplaceApi(BASE, http).saveReview('a.b', 'tok', { rating: 4, body: 'ok', version: '1.1.0' });
    const [url, init] = http.mock.calls[0];
    expect(url).toBe(`${BASE}/a.b/reviews/mine`);
    expect(init?.method).toBe('PUT');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(init?.body as string)).toEqual({ rating: 4, body: 'ok', version: '1.1.0' });
  });

  it('reports a review, omitting empty details, and surfaces 409 as a status', async () => {
    const http = fakeHttp({ statusCode: 409, message: 'Already reported' }, 409);
    const error = await createMarketplaceApi(BASE, http)
      .reportReview('a.b', 'r1', 'tok', { reason: 'spam' })
      .catch((e) => e);
    expect(http.mock.calls[0][0]).toBe(`${BASE}/a.b/reviews/r1/reports`);
    expect(JSON.parse(http.mock.calls[0][1]?.body as string)).toEqual({ reason: 'spam' });
    expect(error).toBeInstanceOf(MarketplaceHttpError);
    expect(error).toMatchObject({ status: 409, message: 'Already reported' });
  });

  it('reports a plugin with details', async () => {
    const http = fakeHttp({ id: 'x', status: 'open' }, 201);
    await createMarketplaceApi(BASE, http).reportPlugin('a.b', 'tok', { reason: 'malware', details: 'steals' });
    expect(http.mock.calls[0][0]).toBe(`${BASE}/a.b/reports`);
    expect(JSON.parse(http.mock.calls[0][1]?.body as string)).toEqual({ reason: 'malware', details: 'steals' });
  });

  it('downloads relative bundle URLs from the backend', async () => {
    const http = vi.fn(async () => new Response(new Uint8Array([1, 2])));
    await createMarketplaceApi(BASE, http).download('/api/plugins/a.b/versions/1.0.0/bundle');
    expect(http).toHaveBeenCalledWith('https://pd2trader.test/api/plugins/a.b/versions/1.0.0/bundle');
  });
});
