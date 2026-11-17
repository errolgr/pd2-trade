import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { defaultFilters } from '@/pages/market/lib/defaults';
import { MarketApiError } from './market-api';
import {
  bumpWtbRequest,
  contactWtbRequest,
  createWtbRequest,
  deleteWtbRequest,
  listMyWtbRequests,
  searchWtbRequests,
  matchWtbRequests,
  updateWtbRequest,
} from './wtb-api';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));

const URL = `${BACKEND_URL}/api/market/wtb`;
const call = (n = 0) => vi.mocked(fetch).mock.calls[n] as [string, RequestInit];
const body = (n = 0) => JSON.parse(String(call(n)[1].body));
const filters = { ...defaultFilters({ hardcore: false, ladder: true }), itemName: 'Shako', priceText: 'cheap' };

afterEach(() => {
  vi.mocked(fetch).mockReset();
});

describe('wtb-api requests', () => {
  it('searches the Wanted source with the body, the token when signed in', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ items: [{ id: 'r1' }], nextCursor: 'c2', total: 3 }));
    const query = { ladder: true, hardcore: false, itemName: 'Shako', overlap: true, sort: 'offer' as const, limit: 3 };
    const page = await searchWtbRequests(query, { token: 'tok' });
    expect(call()[0]).toBe(`${URL}/search`);
    expect(call()[1]).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
    });
    expect(body()).toEqual(query);
    expect(page).toEqual({ items: [{ id: 'r1' }], nextCursor: 'c2', total: 3 });

    vi.mocked(fetch).mockResolvedValueOnce(Response.json({}));
    expect(await searchWtbRequests({ ladder: true, hardcore: true })).toEqual({
      items: [],
      nextCursor: null,
      total: 0,
    });
    expect(call(1)[1].headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('posts the filters as a live search even from the Wanted source', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ id: 'r1' }, { status: 201 }));
    await createWtbRequest('tok', {
      title: 'Shako',
      whisperTo: 'Acc',
      filters: { ...filters, source: 'wanted', wanted: { mine: true } },
      niceToHaveIds: [],
      offer: { amount: 1, currency: 'HR' },
      openToOffers: true,
      expiresInDays: 7,
    });
    expect(body().filters.source).toBe('live');
    expect(body().filters).not.toHaveProperty('wanted');
  });

  it('reads mine with the bearer token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ items: [{ id: 'r1' }] }));
    expect(await listMyWtbRequests('tok')).toEqual([{ id: 'r1' }]);
    expect(call()).toEqual([`${URL}/mine`, { headers: { Authorization: 'Bearer tok' } }]);
  });

  it('posts a request with only the search fields of the filters', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ id: 'r1' }, { status: 201 }));
    await createWtbRequest('tok', {
      title: 'Harlequin Crest',
      whisperTo: 'Acc',
      filters: { ...filters, extra: 1 } as typeof filters,
      niceToHaveIds: [],
      offer: { amount: 2, currency: 'HR' },
      openToOffers: true,
      expiresInDays: 7,
    });
    expect(call()[0]).toBe(URL);
    expect(call()[1]).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
    });
    const sent = body();
    expect(Object.keys(sent).sort()).toEqual(
      ['expiresInDays', 'filters', 'niceToHaveIds', 'offer', 'openToOffers', 'title', 'whisperTo'].sort(),
    );
    expect(sent.filters).toMatchObject({ itemName: 'Shako', ladder: true, hardcore: false });
    expect(sent.filters).not.toHaveProperty('extra');
  });

  it('patches, deletes and counts a contact by id', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({ id: 'a/b' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ id: 'req1' }));
    await updateWtbRequest('tok', 'a/b', { status: 'paused', expiryDays: 3 });
    expect(call(0)[0]).toBe(`${URL}/a%2Fb`);
    expect(call(0)[1].method).toBe('PATCH');
    expect(body(0)).toEqual({ status: 'paused', expiryDays: 3 });

    await expect(deleteWtbRequest('tok', 'r1')).resolves.toBeUndefined();
    expect(call(1)).toEqual([`${URL}/r1`, { method: 'DELETE', headers: { Authorization: 'Bearer tok' } }]);

    // Signed out: counted only; signed in: the bearer, the channel, the account and the item make a response
    await contactWtbRequest('r1', { channel: 'copy' }, null);
    expect(call(2)).toEqual([
      `${URL}/r1/contact`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"channel":"copy"}' },
    ]);
    await contactWtbRequest('r1', { channel: 'whisper', account: 'MyAcc', text: '{"a":1}' }, 'tok');
    expect(call(3)[1].headers).toEqual({ Authorization: 'Bearer tok', 'Content-Type': 'application/json' });
    expect(body(3)).toEqual({ channel: 'whisper', account: 'MyAcc', text: '{"a":1}' });

    // Mark filled: closed, with the response that filled it
    await updateWtbRequest('tok', 'req1', { status: 'closed', filledByResponseId: 'resp1' });
    expect(body(4)).toEqual({ status: 'closed', filledByResponseId: 'resp1' });
  });

  it('bumps a request, a 429 carrying when the next bump is allowed', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({ id: 'r1', bumpedAt: '2026-11-16T12:00:00Z' }))
      .mockResolvedValueOnce(
        Response.json({ message: 'Too soon', nextBumpAt: '2026-11-17T00:00:00Z' }, { status: 429 }),
      );
    await expect(bumpWtbRequest('tok', 'a/b')).resolves.toMatchObject({ id: 'r1' });
    expect(call(0)).toEqual([`${URL}/a%2Fb/bump`, { method: 'POST', headers: { Authorization: 'Bearer tok' } }]);
    await expect(bumpWtbRequest('tok', 'r1')).rejects.toMatchObject({
      status: 429,
      nextBumpAt: '2026-11-17T00:00:00Z',
    });
  });

  it('matches items, sending countViews only when asked and the token when signed in', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        results: [
          { key: 'item', requests: [{ request: { id: 'r1' }, niceToHave: [] }] },
          { key: 'x', requests: [] },
        ],
      }),
    );
    const matches = await matchWtbRequests({ ladder: true, hardcore: false }, [{ key: 'item', text: '{}' }], {
      countViews: true,
    });
    expect(call()[0]).toBe(`${URL}/match`);
    expect(call()[1].headers).toEqual({ 'Content-Type': 'application/json' });
    expect(body()).toEqual({ ladder: true, hardcore: false, items: [{ key: 'item', text: '{}' }], countViews: true });
    expect([...matches.keys()]).toEqual(['item']);

    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ results: [] }));
    await matchWtbRequests({ ladder: false, hardcore: true }, [{ key: 'h', item: { name: 'x' } }], { token: 'tok' });
    expect(call(1)[1].headers).toEqual({ Authorization: 'Bearer tok', 'Content-Type': 'application/json' });
    expect(body(1)).not.toHaveProperty('countViews');
  });
});

describe('wtb-api errors', () => {
  it("throws the server's message and status (409 cap)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ message: 'Too many open requests' }, { status: 409 }));
    const error = await listMyWtbRequests('tok').catch((e) => e);
    expect(error).toBeInstanceOf(MarketApiError);
    expect(error).toMatchObject({ status: 409, message: 'Too many open requests' });
  });

  it('carries the rule a rejected post names', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ message: 'Add at least one required stat', rule: 'detail' }, { status: 400 }),
    );
    const error = await createWtbRequest('tok', {
      title: 'Circlet',
      whisperTo: 'Acc',
      filters,
      niceToHaveIds: [],
      offer: { amount: 1, currency: 'HR' },
      openToOffers: true,
      expiresInDays: 7,
    }).catch((e) => e);
    expect(error).toMatchObject({ status: 400, rule: 'detail' });
  });

  it('carries Retry-After of a throttled match', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ message: ['slow', 'down'] }, { status: 429, headers: { 'retry-after': '5' } }),
    );
    const error = await matchWtbRequests({ ladder: true, hardcore: false }, []).catch((e) => e);
    expect(error).toMatchObject({ status: 429, retryAfterMs: 5000, message: 'slow, down' });
  });
});
