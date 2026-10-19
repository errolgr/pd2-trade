// @vitest-environment happy-dom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { presenceLabel, traderPresence, useKnownPresence, useTraderProfile } from './useTraderProfile';

vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));

const NOW = Date.parse('2026-05-01T12:00:00Z');
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();
const listing = (id: string, stamps: { ingame?: number; online?: number } = {}) =>
  ({
    _id: id,
    user_last_ingame: stamps.ingame === undefined ? undefined : ago(stamps.ingame),
    user_last_online: stamps.online === undefined ? undefined : ago(stamps.online),
  }) as unknown as MarketListingEntry;

// The profile cache lives for the app's lifetime, so every test uses users no other test has seen.
let seq = 0;
const newUser = () => `user-${++seq}`;

function setup(fetch: (query: { user_id: string }) => Promise<unknown>, signedIn = true) {
  const getMarketListings = vi.fn(fetch);
  vi.mocked(usePd2Website).mockImplementation(
    () => ({ authData: signedIn ? { user: { _id: 'me' } } : null, getMarketListings }) as never,
  );
  return getMarketListings;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('traderPresence', () => {
  it('is "in game" while the newest in-game stamp is under 5 minutes old', () => {
    const presence = traderPresence([listing('a', { ingame: 30 }), listing('b', { ingame: 3, online: 1 })], NOW);
    expect(presence).toEqual({ kind: 'ingame', at: NOW - 3 * 60_000 });
    expect(presenceLabel(presence, NOW)).toBe('In game now');
  });

  it('otherwise reads the newest in-game or online stamp: online within the hour, else last seen', () => {
    const online = traderPresence([listing('a', { ingame: 600, online: 12 }), listing('b', { online: 40 })], NOW);
    expect(presenceLabel(online, NOW)).toBe('Online 12m ago');
    const seen = traderPresence([listing('a', { ingame: 3 * 24 * 60 + 5, online: 4 * 24 * 60 })], NOW);
    expect(presenceLabel(seen, NOW)).toBe('Last seen 3d ago');
  });

  it('is unknown without listings or stamps (bad dates ignored)', () => {
    expect(traderPresence([], NOW)).toEqual({ kind: 'unknown' });
    const bad = { _id: 'x', user_last_ingame: 'not a date' } as unknown as MarketListingEntry;
    expect(presenceLabel(traderPresence([bad, listing('y')], NOW), NOW)).toBe('Unknown');
  });
});

describe('useTraderProfile', () => {
  it("loads a user's active listings once and serves later mounts from the cache", async () => {
    const user = newUser();
    const fetch = setup(async () => ({ total: 30, limit: 24, skip: 0, data: [listing('a', { ingame: 1 })] }));
    const first = renderHook(() => useTraderProfile(user, NOW));
    expect(first.result.current.status).toBe('loading');
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    expect(first.result.current.listings.map((l) => l._id)).toEqual(['a']);
    expect(first.result.current.total).toBe(30);
    expect(first.result.current.presence.kind).toBe('ingame');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toMatchObject({ user_id: user, $sort: { bumped_at: -1 } });

    // Another thread view of the same user, and the conversation list's presence dots
    const second = renderHook(() => useTraderProfile(user, NOW));
    expect(second.result.current.status).toBe('ready');
    const known = renderHook(() => useKnownPresence(NOW));
    expect(known.result.current(user)?.kind).toBe('ingame');
    expect(known.result.current(newUser())).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('fetches separately per user', async () => {
    const [a, b] = [newUser(), newUser()];
    const fetch = setup(async (query) => ({ total: 1, limit: 24, skip: 0, data: [listing(query.user_id)] }));
    const view = renderHook(({ user }) => useTraderProfile(user, NOW), { initialProps: { user: a } });
    await waitFor(() => expect(view.result.current.listings[0]?._id).toBe(a));
    view.rerender({ user: b });
    await waitFor(() => expect(view.result.current.listings[0]?._id).toBe(b));
    expect(fetch.mock.calls.map(([query]) => query.user_id)).toEqual([a, b]);
  });

  it('reports a failed lookup as an error with no listings, and retries on the next open', async () => {
    const user = newUser();
    const fetch = setup(async () => {
      throw new Error('offline');
    });
    const view = renderHook(() => useTraderProfile(user, NOW));
    await waitFor(() => expect(view.result.current.status).toBe('error'));
    expect(view.result.current.listings).toEqual([]);
    expect(view.result.current.presence).toEqual({ kind: 'unknown' });
    view.unmount();

    fetch.mockImplementation(async () => ({ total: 0, limit: 24, skip: 0, data: [] }));
    const again = renderHook(() => useTraderProfile(user, NOW));
    await waitFor(() => expect(again.result.current.status).toBe('ready'));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('fetches nothing without a website user or while signed out', () => {
    const fetch = setup(async () => ({ total: 0, limit: 24, skip: 0, data: [] }), false);
    expect(renderHook(() => useTraderProfile(newUser(), NOW)).result.current.status).toBe('idle');
    setup(async () => ({ total: 0, limit: 24, skip: 0, data: [] }));
    expect(renderHook(() => useTraderProfile(undefined, NOW)).result.current.status).toBe('idle');
    expect(fetch).not.toHaveBeenCalled();
  });
});
