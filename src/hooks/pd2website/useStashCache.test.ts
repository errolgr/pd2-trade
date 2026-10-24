// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch as tauriFetch } from '@/lib/browser-http';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { AccountMismatchError, AuthenticationError, NoAccountSelectedError, PD2ApiError } from './usePD2Website';
import { useStashCache } from './useStashCache';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/error-reporting', () => ({ reportApiError: vi.fn() }));

const fetchMock = vi.mocked(tauriFetch);
const NOW = new Date('2026-10-18T12:00:00.000Z');

function fakeResponse(status: number, body: unknown, url: string) {
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

const settings = { pd2Token: 'tok', account: 'MyAcc', mode: 'softcore', ladder: 'ladder' };
const authData = { user: { _id: 'u1' } };

function stash(authOverride: unknown = authData, settingsOverride: unknown = settings, onAuthError = vi.fn()) {
  const ref = { current: onAuthError };
  const { result } = renderHook(() => useStashCache(authOverride, settingsOverride, ref));
  return { hook: result.current, onAuthError };
}

function stashItem(
  hash: string,
  quality: string,
  extra: Partial<Record<'name' | 'base' | 'modifiers' | 'socket_count' | 'is_ethereal', unknown>> = {},
) {
  return { hash, quality: { name: quality }, ...extra } as unknown as GameStashItem;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('fetchAndCacheStash', () => {
  it('requires authentication and settings before hitting the network', async () => {
    // AuthenticationError: callers treat a signed-out user as expected state, not an error to report
    const signedOut = await stash(null)
      .hook.fetchAndCacheStash()
      .catch((e) => e);
    expect(signedOut).toBeInstanceOf(AuthenticationError);
    expect(signedOut.message).toBe('Not authenticated');
    await expect(stash(authData, null).hook.fetchAndCacheStash()).rejects.toThrow('Settings not found!');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws NoAccountSelectedError without requesting /game/stash/ (a 405) when no account is chosen', async () => {
    for (const account of [undefined, '', '  ']) {
      const err = await stash(authData, { ...settings, account })
        .hook.fetchAndCacheStash()
        .catch((e) => e);
      expect(err).toBeInstanceOf(NoAccountSelectedError);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests the account stash with softcore/ladder flags and caches it with a timestamp', async () => {
    const data = { items: [stashItem('h1', 'Unique')] };
    fetchMock.mockResolvedValueOnce(fakeResponse(200, data, ''));
    const { hook } = stash();

    await expect(hook.fetchAndCacheStash()).resolves.toEqual(data);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.projectdiablo2.com/game/stash/MyAcc?account=MyAcc&softcore=true&ladder=true');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(hook.stashCache.current).toEqual({ data, timestamp: NOW.getTime() });
    expect(hook.CACHE_TTL).toBe(5 * 60 * 1000);
  });

  it('hardcore non-ladder flips both flags', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse(200, { items: [] }, ''));
    await stash(authData, { ...settings, mode: 'hardcore', ladder: 'non-ladder' }).hook.fetchAndCacheStash();
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://api.projectdiablo2.com/game/stash/MyAcc?account=MyAcc&softcore=false&ladder=false',
    );
  });

  it('on 401 triggers re-auth, throws AuthenticationError, and keeps null out of the cache', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse(401, { message: 'expired' }, ''));
    const { hook, onAuthError } = stash();
    const previous = { data: { items: [] }, timestamp: 1 };
    hook.stashCache.current = previous;

    const err = await hook.fetchAndCacheStash().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(onAuthError).toHaveBeenCalledTimes(1);
    expect(hook.stashCache.current).toBe(previous);
  });

  it('maps 404 on the stash endpoint to AccountMismatchError naming the account', async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse(404, { message: 'nope' }, 'https://api.projectdiablo2.com/game/stash/MyAcc?account=MyAcc'),
    );
    const err = await stash()
      .hook.fetchAndCacheStash()
      .catch((e) => e);
    expect(err).toBeInstanceOf(AccountMismatchError);
    expect(err.account).toBe('MyAcc');
    expect(err.message).toContain('"MyAcc"');
  });

  it('a 404 for an account linked to the login is a transient PD2 failure, not a mismatch', async () => {
    const linked = { user: { _id: 'u1', game: { accounts: ['Other'], beta_accounts: ['myacc'] } } };
    fetchMock.mockResolvedValueOnce(
      fakeResponse(404, { message: 'Page not found' }, 'https://api.projectdiablo2.com/game/stash/MyAcc'),
    );
    const err = await stash(linked)
      .hook.fetchAndCacheStash()
      .catch((e) => e);
    expect(err).not.toBeInstanceOf(AccountMismatchError);
    expect(err).toBeInstanceOf(PD2ApiError);
    expect(err.message).toBe('PD2 couldn\'t load the stash for "MyAcc" right now. Try again in a minute.');

    const unlinked = { user: { _id: 'u1', game: { accounts: ['Other'] } } };
    fetchMock.mockResolvedValueOnce(
      fakeResponse(404, { message: 'Page not found' }, 'https://api.projectdiablo2.com/game/stash/MyAcc'),
    );
    await expect(stash(unlinked).hook.fetchAndCacheStash()).rejects.toBeInstanceOf(AccountMismatchError);
  });
});

describe('updateItemByHash / clearStashCache', () => {
  it('returns false when there is nothing to update', () => {
    const { hook } = stash();
    expect(hook.updateItemByHash('h1', { price: 1 })).toBe(false);
    hook.stashCache.current = { data: { items: 'bad' }, timestamp: 0 };
    expect(hook.updateItemByHash('h1', { price: 1 })).toBe(false);
    hook.stashCache.current = { data: { items: [stashItem('h1', 'Rare')] }, timestamp: 0 };
    expect(hook.updateItemByHash('missing', { price: 1 })).toBe(false);
  });

  it('merges the update into the matching cached item only', () => {
    const { hook } = stash();
    const items = [stashItem('h1', 'Rare', { name: 'a' }), stashItem('h2', 'Rare', { name: 'b' })];
    hook.stashCache.current = { data: { items }, timestamp: 0 };

    expect(hook.updateItemByHash('h2', { listed: true })).toBe(true);
    expect(hook.stashCache.current.data.items).toEqual([
      stashItem('h1', 'Rare', { name: 'a' }),
      { ...stashItem('h2', 'Rare', { name: 'b' }), listed: true },
    ]);
  });

  it('clearStashCache drops the cache so the next lookup refetches', () => {
    const { hook } = stash();
    hook.stashCache.current = { data: { items: [] }, timestamp: 0 };
    hook.clearStashCache();
    expect(hook.stashCache.current).toBeNull();
  });
});

describe('findItemsByName', () => {
  const strength = (value: number) => ({ name: 'strength', label: `+${value} to Strength`, values: [value] });

  it('rare items match by base, filter by quality, and rank by stat closeness', () => {
    const { hook } = stash();
    const far = stashItem('far', 'Rare', { base: { name: 'Ring' }, modifiers: [strength(2)] });
    const close = stashItem('close', 'Rare', { base: { name: 'Ring' }, modifiers: [strength(10)] });
    const magic = stashItem('magic', 'Magic', { base: { name: 'Ring' }, modifiers: [strength(10)] });
    const amulet = stashItem('amulet', 'Rare', { base: { name: 'Amulet' }, modifiers: [strength(10)] });
    const query = {
      type: 'Ring',
      quality: 'Rare',
      stats: [{ stat_id: 0, name: '+10 to Strength', value: 10 }],
    } as PriceCheckItem;

    expect(hook.findItemsByName([far, magic, amulet, close], query).map((i) => i.hash)).toEqual(['close', 'far']);
  });

  it('returns nothing for an unrecognised base type', () => {
    const { hook } = stash();
    const ring = stashItem('r', 'Rare', { base: { name: 'Ring' } });
    expect(hook.findItemsByName([ring], { type: 'Not A Base', quality: 'Rare', stats: [] } as PriceCheckItem)).toEqual(
      [],
    );
  });

  it('ranks by matching socket count and ethereal state', () => {
    const { hook } = stash();
    const wrong = stashItem('wrong', 'Unique', { base: { name: 'Shako' }, socket_count: 0, is_ethereal: true });
    const right = stashItem('right', 'Unique', { base: { name: 'Shako' }, socket_count: 1, is_ethereal: false });
    const query = { type: 'Shako', quality: 'Unique', sockets: 1, isEthereal: false, stats: [] } as PriceCheckItem;
    expect(hook.findItemsByName([wrong, right], query).map((i) => i.hash)).toEqual(['right', 'wrong']);
  });

  it('skill stats prefer skill modifiers over fuzzy label matches', () => {
    const { hook } = stash();
    const none = stashItem('none', 'Rare', { base: { name: 'Ring' }, modifiers: [strength(1)] });
    const fuzzy = stashItem('fuzzy', 'Rare', {
      base: { name: 'Ring' },
      modifiers: [{ name: 'other', label: 'Battle Orders', values: [3] }],
    });
    const skill = stashItem('skill', 'Rare', {
      base: { name: 'Ring' },
      modifiers: [{ name: 'item_singleskill', label: '+3 to Battle Orders', values: [3] }],
    });
    const query = {
      type: 'Ring',
      quality: 'Rare',
      stats: [{ stat_id: 97, name: '+3 to Battle Orders', skill: 'Battle Orders' }],
    } as PriceCheckItem;
    expect(hook.findItemsByName([none, fuzzy, skill], query).map((i) => i.hash)).toEqual(['skill', 'fuzzy', 'none']);
  });

  it('unique charms match the exact known item name, not other uniques of the same base', () => {
    const { hook } = stash();
    const anni = stashItem('anni', 'Unique', { name: 'Annihilus' });
    const torch = stashItem('torch', 'Unique', { name: 'Hellfire Torch' });
    const query = { name: 'Annihilus', type: 'Small Charm', quality: 'Unique', stats: [] } as PriceCheckItem;
    expect(hook.findItemsByName([torch, anni], query).map((i) => i.hash)).toEqual(['anni']);
  });

  it('falls back to fuzzy name search for unknown unique charm names', () => {
    const { hook } = stash();
    const custom = stashItem('custom', 'Unique', { name: 'Zzyzx Charm' });
    const other = stashItem('other', 'Unique', { name: 'Completely Different' });
    const query = { name: 'Zzyzx Charm', type: 'Grand Charm', quality: 'Unique', stats: [] } as PriceCheckItem;
    expect(hook.findItemsByName([other, custom], query).map((i) => i.hash)).toEqual(['custom']);
  });
});
