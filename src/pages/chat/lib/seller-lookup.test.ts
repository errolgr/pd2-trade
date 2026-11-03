import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupSellerByName, modesFrom } from './seller-lookup';

const fetchMock = vi.fn();
vi.mock('@/lib/browser-http', () => ({ fetch: (...args: unknown[]) => fetchMock(...args) }));

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const hit = () =>
  json({
    items: [
      {
        listing: {
          user_id: '5f1e2d3c4b5a697887960a1b',
          user: { username: 'tharok_web', in_game_account: 'Tharok', game: { accounts: ['Tharok', ''] } },
        },
      },
    ],
  });
const empty = () => json({ items: [], total: 0 });
const sentFilters = () => fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));

describe('lookupSellerByName', () => {
  afterEach(() => fetchMock.mockReset());

  it('finds the owner from the first listing: user id, username and accounts', async () => {
    fetchMock.mockResolvedValueOnce(hit());

    await expect(lookupSellerByName(' *tharok ')).resolves.toEqual({
      status: 'found',
      seller: { userId: '5f1e2d3c4b5a697887960a1b', username: 'tharok_web', accounts: ['Tharok'] },
    });
    expect(sentFilters()).toEqual([{ filters: { hardcore: false, ladder: true, sellerName: 'tharok' }, limit: 1 }]);
  });

  it('searches the given modes in order, pacing each request, until one has a listing', async () => {
    fetchMock.mockResolvedValueOnce(empty()).mockResolvedValueOnce(hit());
    const beforeRequest = vi.fn(async () => {});

    const result = await lookupSellerByName('tharok', {
      modes: modesFrom({ hardcore: true, ladder: false }),
      beforeRequest,
    });

    expect(result.status).toBe('found');
    expect(sentFilters().map((b) => [b.filters.hardcore, b.filters.ladder])).toEqual([
      [true, false],
      [false, true],
    ]);
    expect(beforeRequest).toHaveBeenCalledTimes(2);
  });

  it('is none when no mode has a listing from them', async () => {
    fetchMock.mockImplementation(async () => empty());

    await expect(lookupSellerByName('nobody')).resolves.toEqual({ status: 'none' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('is none, without more requests, when the service rejects the name', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'bad' }, 400));

    await expect(lookupSellerByName('weird')).resolves.toEqual({ status: 'none' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails at once, with the Retry-After, when rate limited', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 429, { 'Retry-After': '12' }));

    await expect(lookupSellerByName('tharok')).resolves.toEqual({ status: 'failed', retryAfterMs: 12_000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails on a 5xx, a network error or an unreadable reply', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 503));
    await expect(lookupSellerByName('a')).resolves.toEqual({ status: 'failed', retryAfterMs: undefined });

    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await expect(lookupSellerByName('a')).resolves.toMatchObject({ status: 'failed' });

    fetchMock.mockResolvedValueOnce(json({ nope: true }));
    await expect(lookupSellerByName('a')).resolves.toMatchObject({ status: 'failed' });
  });

  it('skips a listing without a user id or username', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ items: [{ listing: { user_id: null, user: { username: 'x' } } }] }))
      .mockResolvedValueOnce(json({ items: [{ listing: { user_id: 'u1', user: null } }] }))
      .mockResolvedValueOnce(hit());

    await expect(lookupSellerByName('tharok')).resolves.toMatchObject({ status: 'found' });
  });

  it('is none when the name only matched the website username of someone not owning that account', async () => {
    fetchMock.mockImplementation(async () =>
      json({
        items: [{ listing: { user_id: 'u-bob', user: { username: 'bob', game: { accounts: ['Robert'] } } } }],
      }),
    );

    await expect(lookupSellerByName('bob')).resolves.toEqual({ status: 'none' });
  });

  it("adds the looked-up account when only the item's account shows it", async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        items: [
          {
            listing: {
              user_id: 'u-tharok',
              user: { username: 'tharok_web', game: { accounts: ['Tharok'] } },
              item: { account_id: 'Frostwind' },
            },
          },
        ],
      }),
    );

    await expect(lookupSellerByName('frostwind')).resolves.toEqual({
      status: 'found',
      seller: { userId: 'u-tharok', username: 'tharok_web', accounts: ['Tharok', 'Frostwind'] },
    });
  });

  it('is none for a blank or over-long name, without a request', async () => {
    for (const name of ['', '   ', '*', 'x'.repeat(65)]) {
      await expect(lookupSellerByName(name)).resolves.toEqual({ status: 'none' });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
