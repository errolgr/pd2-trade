import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { defaultFilters } from '@/pages/market/lib/defaults';
import { listing } from '@/pages/market/lib/test-utils';
import {
  encodeMarketQuery,
  fetchNewestListings,
  MarketApiError,
  openLiveSearchStream,
  watchQuery,
} from './market-api';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));

/** `q` back to its filters (what the server does). */
const decode = (q: string) => {
  const binary = atob(q.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
};

afterEach(() => {
  vi.mocked(fetch).mockReset();
});

describe('encodeMarketQuery', () => {
  it('is base64url without padding of the UTF-8 JSON (what Buffer#toString("base64url") gives)', () => {
    expect(encodeMarketQuery({ hardcore: false, ladder: true, itemName: 'Harlequin Crest', hrMax: 1 })).toBe(
      'eyJoYXJkY29yZSI6ZmFsc2UsImxhZGRlciI6dHJ1ZSwiaXRlbU5hbWUiOiJIYXJsZXF1aW4gQ3Jlc3QiLCJock1heCI6MX0',
    );
    const q = encodeMarketQuery({ itemName: 'Ünïcødé ✓ ?/+' });
    expect(q).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decode(q)).toEqual({ itemName: 'Ünïcødé ✓ ?/+' });
  });
});

describe('watchQuery', () => {
  it('encodes the request filters sorted newest bump first, the same for the same search', () => {
    const filters = { ...defaultFilters({ hardcore: false, ladder: true }), itemName: 'Shako' };
    const q = watchQuery({ ...filters, sort: { by: 'price', dir: 'asc' } });
    expect(decode(q)).toMatchObject({ itemName: 'Shako', ladder: true, sort: { by: 'bumped', dir: 'desc' } });
    expect(watchQuery(filters)).toBe(q);
  });
});

describe('live search requests', () => {
  it('opens one stream with every q, and maps the newest listings of a q to summaries', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 200 }));
    await openLiveSearchStream(['a', 'b'], new AbortController().signal);
    expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/api/market/search/live?q=a&q=b`, expect.anything());

    const row = listing({ id: 'l1', bumpedAt: '2026-10-21T08:00:00Z', hr: 2, price: '2 hr' });
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ items: [{ listing: row }, { listing: null }] }));
    const listings = await fetchNewestListings('q1');
    expect(fetch).toHaveBeenLastCalledWith(`${BACKEND_URL}/api/market/search/q1?limit=25`);
    expect(listings).toEqual([
      expect.objectContaining({ id: 'l1', bumpedAt: '2026-10-21T08:00:00Z', hrPrice: 2, price: '2 hr' }),
    ]);
  });

  it('throws the status and Retry-After of a refused stream', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ message: 'busy' }, { status: 429, headers: { 'retry-after': '30' } }),
    );
    const error = await openLiveSearchStream(['a'], new AbortController().signal).catch((e) => e);
    expect(error).toBeInstanceOf(MarketApiError);
    expect(error).toMatchObject({ status: 429, retryAfterMs: 30_000, message: 'busy' });
  });
});
