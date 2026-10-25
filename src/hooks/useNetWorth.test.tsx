// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useOverlay, type OverlayApi } from '@/overlay';
import { useSignIn } from '@/hooks/useSignIn';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { useOAuth } from '@/hooks/useOAuth';
import { AccountMismatchError, usePd2Website } from '@/hooks/pd2website/usePD2Website';
import {
  getSeasons,
  getSessions,
  NetWorthApiError,
  postSessionMarker,
  syncSnapshot,
  type SessionSummary,
  type SnapshotResponse,
} from '@/lib/networth-api';
import type * as NetWorthApiModule from '@/lib/networth-api';
import { NetWorthProvider, useNetWorth } from './useNetWorth';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => true), invoke: vi.fn() }));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/overlay', () => ({ useOverlay: vi.fn() }));
vi.mock('@/hooks/useSignIn', () => ({ useSignIn: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useOAuth', () => ({ useOAuth: vi.fn() }));
vi.mock('@/hooks/pd2website/usePD2Website', () => {
  class AuthenticationError extends Error {}
  class AccountMismatchError extends Error {}
  return {
    AuthenticationError,
    AccountMismatchError,
    usePd2Website: vi.fn(),
  };
});
vi.mock('@/lib/networth-api', async (importOriginal) => ({
  ...(await importOriginal<typeof NetWorthApiModule>()),
  getSeasons: vi.fn(),
  getSessions: vi.fn(),
  postSessionMarker: vi.fn(),
  syncSnapshot: vi.fn(),
}));

const NOW = new Date('2026-10-18T12:00:00Z').getTime();
const MINUTE = 60 * 1000;
const OWNER = { account: 'Acc', isLadder: true, isHardcore: false };

let options: { settings: Partial<ISettings>; isLoading: boolean };
let authData: { user: { _id: string } } | null;
let holdings: Array<{ key: string; tab: string | null; qty: number }>;
let focused: boolean;
const updateSettings = vi.fn();
const openPanel = vi.fn();
const openSignIn = vi.fn();
const refreshTokens = vi.fn<(refreshToken: string) => Promise<boolean>>();

function snapshot(snapshotId: string | null = 'snap'): SnapshotResponse {
  const response = {
    valuation: { ...OWNER, lines: holdings.map((line) => ({ ...line })) },
    snapshotId,
    deduped: false,
    delta: { sincePrevious: null, previousTakenAt: null },
  };
  // Only the fields the provider reads are populated.
  return response as unknown as SnapshotResponse;
}

function session(id: string, isOpen: boolean): SessionSummary {
  const summary = { id, isOpen, start: '', end: '', manual: false, topGains: [] };
  return summary as unknown as SessionSummary;
}

/** [trigger, persist] for every sync request, in order. */
function syncs() {
  return vi.mocked(syncSnapshot).mock.calls.map(([, , trigger, persist]) => [trigger, persist]);
}

async function flush() {
  await act(() => vi.advanceTimersByTimeAsync(0));
}

async function advance(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

async function renderHost(settings: Partial<ISettings> = {}, isLoading = false) {
  options = {
    settings: {
      pd2Token: 'tok',
      account: 'Acc',
      ladder: 'ladder',
      mode: 'softcore',
      netWorthTrackingEnabled: true,
      ...settings,
    } as Partial<ISettings>,
    isLoading,
  };
  const hook = renderHook(() => useNetWorth(), { wrapper: NetWorthProvider });
  await flush();
  return hook;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  authData = { user: { _id: 'me' } };
  holdings = [{ key: 'ist', tab: '1', qty: 2 }];
  focused = true;
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(invoke).mockImplementation(async (cmd) => (cmd === 'is_diablo_focused' ? focused : undefined));
  updateSettings.mockReset();
  refreshTokens.mockReset().mockResolvedValue(false);
  vi.mocked(useOAuth).mockReturnValue({ startOAuthFlow: vi.fn(), refreshTokens });
  vi.mocked(useOptions).mockImplementation(() => ({
    isOpen: false,
    setIsOpen: vi.fn(),
    isLoading: options.isLoading,
    settings: options.settings as ISettings,
    updateSettings,
  }));
  vi.mocked(usePd2Website).mockImplementation(() => ({ authData }) as never);
  openPanel.mockReset();
  vi.mocked(useOverlay).mockReturnValue({ openPanel } as unknown as OverlayApi);
  openSignIn.mockReset();
  vi.mocked(useSignIn).mockReturnValue({ openSignIn, isOpen: false } as never);
  vi.mocked(getSeasons).mockRejectedValue(new Error('offline'));
  vi.mocked(getSessions).mockResolvedValue({ sessions: [] } as never);
  vi.mocked(postSessionMarker).mockResolvedValue({ ok: true });
  vi.mocked(syncSnapshot).mockImplementation(async () => snapshot());
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useNetWorth', () => {
  it('throws outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useNetWorth())).toThrow('useNetWorth must be used within');
  });
});

describe('NetWorthProvider status and owner', () => {
  it('is idle while settings load, then signed-out without a token or account', async () => {
    const { result, rerender } = await renderHost({ pd2Token: undefined }, true);
    expect(result.current.status).toBe('idle');

    options.isLoading = false;
    rerender();
    expect(result.current.status).toBe('signed-out');
    expect(result.current.owner).toBeNull();
    expect(syncSnapshot).not.toHaveBeenCalled();
  });

  it('saves history by default and respects an explicit off', async () => {
    const { result, unmount } = await renderHost({ netWorthTrackingEnabled: undefined });
    expect(result.current.trackingEnabled).toBe(true);
    unmount();
    const off = await renderHost({ netWorthTrackingEnabled: false });
    expect(off.result.current.trackingEnabled).toBe(false);
  });

  it('derives the owner from account, ladder and mode', async () => {
    const { result } = await renderHost({ ladder: 'non-ladder', mode: 'hardcore' } as Partial<ISettings>);
    expect(result.current.owner).toEqual({ account: 'Acc', isLadder: false, isHardcore: true });
  });
});

describe('NetWorthProvider snapshots', () => {
  it('takes one startup snapshot once PD2 auth is confirmed', async () => {
    authData = null;
    const { result, rerender } = await renderHost();
    expect(syncSnapshot).not.toHaveBeenCalled();

    authData = { user: { _id: 'me' } };
    rerender();
    await flush();
    rerender();
    await flush();

    expect(syncs()).toEqual([['startup', true]]);
    expect(result.current.status).toBe('ok');
    expect(result.current.latest?.valuation.lines).toEqual(holdings);
    expect(result.current.lastSnapshotAt).toBe(NOW);
  });

  it('does not persist snapshots when tracking is off', async () => {
    await renderHost({ netWorthTrackingEnabled: false });
    expect(syncs()).toEqual([['startup', false]]);
  });

  it('reports loading while a snapshot is in flight and shares one request between callers', async () => {
    const { result } = await renderHost();
    const pending = Promise.withResolvers<SnapshotResponse>();
    vi.mocked(syncSnapshot).mockReturnValue(pending.promise);

    let first!: Promise<SnapshotResponse | null>;
    let second!: Promise<SnapshotResponse | null>;
    act(() => {
      first = result.current.takeSnapshot();
      second = result.current.takeSnapshot('interval');
    });
    expect(result.current.status).toBe('loading');

    const response = snapshot('manual-snap');
    await act(async () => pending.resolve(response));

    expect(syncs()).toEqual([
      ['startup', true],
      ['manual', true],
    ]);
    await expect(first).resolves.toBe(response);
    await expect(second).resolves.toBe(response);
    expect(result.current.status).toBe('ok');
  });

  it.each([
    ['rate limit', new NetWorthApiError('slow down', 429), 'Too many requests. Try again in a minute.'],
    ['other API error', new NetWorthApiError('Stash unavailable', 502), 'Stash unavailable'],
    ['account mismatch', new AccountMismatchError('Account "x" is not yours'), 'Account "x" is not yours'],
    ['non-Error throw', 'boom', 'boom'],
  ])('maps a %s to a readable error', async (_label, failure, message) => {
    vi.mocked(syncSnapshot).mockRejectedValue(failure);
    const { result } = await renderHost();

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe(message);
    expect(result.current.latest).toBeNull();
  });

  it('clears a previous error after a successful snapshot', async () => {
    vi.mocked(syncSnapshot).mockRejectedValueOnce(new NetWorthApiError('down', 500));
    const { result } = await renderHost();
    expect(result.current.status).toBe('error');

    await act(() => result.current.takeSnapshot());
    expect(result.current.status).toBe('ok');
    expect(result.current.error).toBeNull();
  });

  it('prompts sign-in on 401 when there is no refresh token', async () => {
    vi.mocked(syncSnapshot).mockRejectedValue(new NetWorthApiError('unauthorized', 401));
    const { result } = await renderHost();

    expect(result.current.error).toBe('Your PD2 session expired. Sign in again.');
    expect(refreshTokens).not.toHaveBeenCalled();
    expect(openSignIn).toHaveBeenCalledTimes(1);
  });

  it('prompts sign-in on 401 when the refresh fails', async () => {
    vi.mocked(syncSnapshot).mockRejectedValue(new NetWorthApiError('unauthorized', 401));
    await renderHost({ pd2RefreshToken: 'r' });

    expect(refreshTokens).toHaveBeenCalledWith('r');
    expect(openSignIn).toHaveBeenCalledTimes(1);
  });

  it('retries the failed snapshot with the refreshed token', async () => {
    refreshTokens.mockResolvedValue(true);
    vi.mocked(syncSnapshot).mockRejectedValueOnce(new NetWorthApiError('unauthorized', 401));
    const { result, rerender } = await renderHost({ pd2RefreshToken: 'r' });
    expect(syncs()).toEqual([['startup', true]]);

    options.settings = { ...options.settings, pd2Token: 'tok2' };
    rerender();
    await flush();

    expect(vi.mocked(syncSnapshot).mock.calls.map(([token, , trigger]) => [token, trigger])).toEqual([
      ['tok', 'startup'],
      ['tok2', 'startup'],
    ]);
    expect(result.current.status).toBe('ok');
    expect(openSignIn).not.toHaveBeenCalled();
  });

  it('drops a result that lands after switching accounts and resets owner state', async () => {
    const { result, rerender } = await renderHost();
    expect(result.current.latest).not.toBeNull();

    const pending = Promise.withResolvers<SnapshotResponse>();
    vi.mocked(syncSnapshot).mockReturnValueOnce(pending.promise);
    act(() => {
      result.current.takeSnapshot();
    });

    options.settings = { ...options.settings, account: 'Other' };
    rerender();
    expect(result.current.latest).toBeNull();
    expect(result.current.lastSnapshotAt).toBeNull();

    await act(async () => pending.resolve(snapshot('stale')));
    expect(result.current.latest).toBeNull();
  });

  it('openNetWorth opens the Net Worth panel on the requested tab (overview by default)', async () => {
    const { result } = await renderHost();
    act(() => result.current.openNetWorth('history'));
    act(() => result.current.openNetWorth());
    expect(openPanel.mock.calls).toEqual([
      ['currency', { tab: 'history' }],
      ['currency', { tab: 'overview' }],
    ]);
  });
});

describe('NetWorthProvider sessions and seasons', () => {
  it('loads the open session when tracking and refreshes it after a stored snapshot', async () => {
    vi.mocked(getSessions).mockResolvedValue({ sessions: [session('old', false), session('live', true)] } as never);
    const { result } = await renderHost();

    expect(result.current.currentSession?.id).toBe('live');
    const callsBefore = vi.mocked(getSessions).mock.calls.length;

    vi.mocked(syncSnapshot).mockResolvedValueOnce(snapshot(null));
    await act(() => result.current.takeSnapshot());
    expect(vi.mocked(getSessions).mock.calls.length).toBe(callsBefore);

    await act(() => result.current.takeSnapshot());
    expect(vi.mocked(getSessions).mock.calls.length).toBe(callsBefore + 1);
  });

  it('has no session and skips the request when tracking is off', async () => {
    const { result } = await renderHost({ netWorthTrackingEnabled: false });
    expect(result.current.currentSession).toBeNull();
    expect(getSessions).not.toHaveBeenCalled();
  });

  it('start/stop post a marker then reload sessions', async () => {
    const { result } = await renderHost();
    vi.mocked(getSessions).mockResolvedValue({ sessions: [session('s', true)] } as never);

    await act(() => result.current.startSession());
    expect(postSessionMarker).toHaveBeenLastCalledWith('tok', OWNER, 'start');
    expect(result.current.currentSession?.id).toBe('s');

    vi.mocked(getSessions).mockResolvedValue({ sessions: [session('s', false)] } as never);
    await act(() => result.current.stopSession());
    expect(postSessionMarker).toHaveBeenLastCalledWith('tok', OWNER, 'stop');
    expect(result.current.currentSession).toBeNull();
  });

  it('prefers the server season list and its current id', async () => {
    const serverSeasons = [{ id: 's99', label: 'Future', startDate: '2026-01-01', endDate: null }];
    vi.mocked(getSeasons).mockResolvedValue({ seasons: serverSeasons, currentId: 's99' });
    const { result } = await renderHost();

    expect(result.current.seasons).toEqual(serverSeasons);
    expect(result.current.currentSeasonId).toBe('s99');
    expect(vi.mocked(getSessions).mock.calls.at(-1)?.[2]).toBe('s99');
  });

  it('keeps the bundled seasons when the server list is empty or unavailable', async () => {
    vi.mocked(getSeasons).mockResolvedValue({ seasons: [], currentId: 'x' });
    const { result } = await renderHost();
    expect(result.current.seasons.map((s) => s.id)).toEqual(['s13', 's12']);
    expect(result.current.currentSeasonId).toBe('s13');
  });
});

describe('NetWorthProvider scheduler', () => {
  it('snapshots on the configured cadence only while Diablo is focused', async () => {
    await renderHost({ netWorthAutoSnapshotMinutes: 5 });

    await advance(5 * MINUTE - 30_000);
    expect(syncs()).toEqual([['startup', true]]);
    await advance(30_000);
    expect(syncs()).toEqual([
      ['startup', true],
      ['interval', true],
    ]);

    focused = false;
    await advance(20 * MINUTE);
    expect(syncs()).toHaveLength(2);
  });

  it('never runs faster than every 2 minutes, and is off at 0 minutes', async () => {
    const fast = await renderHost({ netWorthAutoSnapshotMinutes: 1 });
    await advance(90_000);
    expect(syncs()).toHaveLength(1);
    await advance(30_000);
    expect(syncs()).toHaveLength(2);
    fast.unmount();

    vi.mocked(syncSnapshot).mockClear();
    await renderHost({ netWorthAutoSnapshotMinutes: 0, account: 'Other' });
    await advance(60 * MINUTE);
    expect(syncs()).toEqual([['startup', true]]);
  });

  it('backs off to value-only probes after 30 idle minutes and resumes when holdings change', async () => {
    await renderHost({ netWorthAutoSnapshotMinutes: 15 });

    await advance(15 * MINUTE); // t=15m interval, unchanged holdings
    await advance(15 * MINUTE); // t=30m idle; last snapshot 15m ago < 30m probe spacing
    expect(syncs()).toEqual([
      ['startup', true],
      ['interval', true],
    ]);

    await advance(15 * MINUTE); // t=45m probe, nothing stored
    expect(syncs().at(-1)).toEqual(['interval', false]);
    expect(syncs()).toHaveLength(3);

    holdings = [{ key: 'ist', tab: '1', qty: 3 }];
    await advance(30 * MINUTE); // t=75m probe sees a change → stores a real snapshot
    expect(syncs().slice(3)).toEqual([
      ['interval', false],
      ['interval', true],
    ]);

    await advance(15 * MINUTE); // back to normal cadence
    expect(syncs().at(-1)).toEqual(['interval', true]);
  });

  it('ends the idle backoff as soon as the player returns to the game', async () => {
    await renderHost({ netWorthAutoSnapshotMinutes: 15 });
    await advance(15 * MINUTE);

    focused = false;
    await advance(30 * MINUTE);
    expect(syncs()).toHaveLength(2);

    focused = true;
    await advance(30_000);
    expect(syncs().at(-1)).toEqual(['interval', true]);
  });

  it('backs off exponentially after failed snapshots and resumes the cadence after a success', async () => {
    vi.mocked(syncSnapshot).mockRejectedValue(new NetWorthApiError('Stash unavailable', 502));
    await renderHost({ netWorthAutoSnapshotMinutes: 5 });
    expect(syncs()).toHaveLength(1);

    // Failures at 0, then retries after 5, 10 and 20 minutes (t = 5, 15, 35).
    await advance(35 * MINUTE);
    expect(syncs()).toHaveLength(4);
    await advance(39 * MINUTE + 30_000);
    expect(syncs()).toHaveLength(4);

    vi.mocked(syncSnapshot).mockImplementation(async () => snapshot());
    await advance(30_000); // t = 75: 40 minutes after the last failure
    // Idle by now, so a value probe first; its new holdings store a snapshot right away.
    expect(syncs().slice(4)).toEqual([
      ['interval', false],
      ['interval', true],
    ]);
    await advance(5 * MINUTE);
    expect(syncs()).toHaveLength(7);
  });

  it('caps the backoff at an hour', async () => {
    vi.mocked(syncSnapshot).mockRejectedValue(new NetWorthApiError('Stash unavailable', 502));
    await renderHost({ netWorthAutoSnapshotMinutes: 15 });
    await advance(10 * 60 * MINUTE);
    // 0, 15, 45, 105 (60 min wait from here on), 165, …, 585
    expect(syncs()).toHaveLength(12);
  });

  it('refreshes the token once per failure streak when PD2 keeps answering 401', async () => {
    refreshTokens.mockResolvedValue(true);
    vi.mocked(syncSnapshot).mockRejectedValue(new NetWorthApiError('unauthorized', 401));
    const { result } = await renderHost({ netWorthAutoSnapshotMinutes: 5, pd2RefreshToken: 'r' });

    await advance(60 * MINUTE);
    expect(syncs().length).toBeGreaterThan(2);
    expect(refreshTokens).toHaveBeenCalledTimes(1);
    expect(openSignIn).not.toHaveBeenCalled();

    // A manual snapshot still gets a refresh.
    await act(() => result.current.takeSnapshot());
    expect(refreshTokens).toHaveBeenCalledTimes(2);
  });
});
