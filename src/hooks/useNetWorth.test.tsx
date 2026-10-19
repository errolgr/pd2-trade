// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { emit, listen } from '@/lib/browser-events';
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
import {
  ChildNetWorthProvider,
  NETWORTH_TAKE_SNAPSHOT_EVENT,
  NetWorthProvider,
  requestNetWorthSnapshot,
  useNetWorth,
} from './useNetWorth';

type Handler = (event: { payload: unknown }) => unknown;

const bus = vi.hoisted(() => ({ handlers: new Map<string, Set<(event: { payload: unknown }) => unknown>>() }));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => true), invoke: vi.fn() }));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/browser-events', () => ({
  emit: vi.fn(async (event: string, payload?: unknown) => {
    await Promise.all([...(bus.handlers.get(event) ?? [])].map((handler) => handler({ payload })));
  }),
  listen: vi.fn(async (event: string, handler: Handler) => {
    if (!bus.handlers.has(event)) bus.handlers.set(event, new Set());
    bus.handlers.get(event)!.add(handler);
    return () => bus.handlers.get(event)!.delete(handler);
  }),
}));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useOAuth', () => ({ useOAuth: vi.fn() }));
vi.mock('@/components/dialogs/SignInDialog', () => ({ SIGN_IN_DIALOG_EVENT: 'pd2:show-sign-in-dialog' }));
vi.mock('@/hooks/pd2website/usePD2Website', () => {
  class AuthenticationError extends Error {}
  class AccountMismatchError extends Error {}
  return {
    AuthenticationError,
    AccountMismatchError,
    usePd2Website: vi.fn(),
    Pd2WebsiteProvider: ({ children }: { children: React.ReactNode }) => children,
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
const SIGN_IN = 'pd2:show-sign-in-dialog';

let options: { settings: Partial<ISettings>; isLoading: boolean };
let authData: { user: { _id: string } } | null;
let holdings: Array<{ key: string; tab: string | null; qty: number }>;
let focused: boolean;
const updateSettings = vi.fn();
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
    settings: { pd2Token: 'tok', account: 'Acc', ladder: 'ladder', mode: 'softcore', netWorthTrackingEnabled: true, ...settings } as Partial<ISettings>,
    isLoading,
  };
  const hook = renderHook(() => useNetWorth(), { wrapper: NetWorthProvider });
  await flush();
  return hook;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  bus.handlers.clear();
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
    expect(result.current.needsConsent).toBe(false);

    options.isLoading = false;
    rerender();
    expect(result.current.status).toBe('signed-out');
    expect(result.current.owner).toBeNull();
    expect(syncSnapshot).not.toHaveBeenCalled();
  });

  it('asks for consent only once settings loaded and tracking was never chosen', async () => {
    const { result } = await renderHost({ netWorthTrackingEnabled: undefined });
    expect(result.current.needsConsent).toBe(true);
    expect(result.current.trackingEnabled).toBe(false);
  });

  it('derives the owner from account, ladder and mode', async () => {
    const { result } = await renderHost({ ladder: 'non-ladder', mode: 'hardcore' } as Partial<ISettings>);
    expect(result.current.owner).toEqual({ account: 'Acc', isLadder: false, isHardcore: true });
  });

  it('persists the tracking choice through settings', async () => {
    const { result } = await renderHost();
    act(() => result.current.setTrackingEnabled(false));
    expect(updateSettings).toHaveBeenCalledWith({ netWorthTrackingEnabled: false });
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

    expect(syncs()).toEqual([['startup', true], ['manual', true]]);
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
    expect(vi.mocked(emit).mock.calls.filter(([event]) => event === SIGN_IN)).toHaveLength(1);
  });

  it('prompts sign-in on 401 when the refresh fails', async () => {
    vi.mocked(syncSnapshot).mockRejectedValue(new NetWorthApiError('unauthorized', 401));
    await renderHost({ pd2RefreshToken: 'r' });

    expect(refreshTokens).toHaveBeenCalledWith('r');
    expect(vi.mocked(emit).mock.calls.filter(([event]) => event === SIGN_IN)).toHaveLength(1);
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
    expect(vi.mocked(emit).mock.calls.filter(([event]) => event === SIGN_IN)).toHaveLength(0);
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

  it('takes a snapshot when another window requests one', async () => {
    await renderHost();
    await act(() => requestNetWorthSnapshot('web'));
    await act(() => emit(NETWORTH_TAKE_SNAPSHOT_EVENT, {}));
    expect(syncs()).toEqual([['startup', true], ['web', true], ['manual', true]]);
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
    expect(syncs()).toEqual([['startup', true], ['interval', true]]);

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
    expect(syncs()).toEqual([['startup', true], ['interval', true]]);

    await advance(15 * MINUTE); // t=45m probe, nothing stored
    expect(syncs().at(-1)).toEqual(['interval', false]);
    expect(syncs()).toHaveLength(3);

    holdings = [{ key: 'ist', tab: '1', qty: 3 }];
    await advance(30 * MINUTE); // t=75m probe sees a change → stores a real snapshot
    expect(syncs().slice(3)).toEqual([['interval', false], ['interval', true]]);

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
});

describe('NetWorthProvider cross-window RPC', () => {
  async function rpc(request: Record<string, unknown>) {
    const responses: unknown[] = [];
    await listen('networth:rpc-response', (event) => {
      responses.push(event.payload);
    });
    await act(() => emit('networth:rpc-request', request));
    return responses;
  }

  it('answers RPC calls with the result or a described error', async () => {
    await renderHost();

    const ok = await rpc({ requestId: 'r1', method: 'takeSnapshot', trigger: 'manual' });
    expect(ok).toEqual([{ requestId: 'r1', ok: true, result: expect.objectContaining({ snapshotId: 'snap' }) }]);

    vi.mocked(postSessionMarker).mockRejectedValue(new NetWorthApiError('nope', 429));
    bus.handlers.delete('networth:rpc-response');
    const failed = await rpc({ requestId: 'r2', method: 'startSession' });
    expect(failed).toEqual([{ requestId: 'r2', ok: false, error: 'Too many requests. Try again in a minute.' }]);

    bus.handlers.delete('networth:rpc-response');
    await rpc({ requestId: 'r3', method: 'setTrackingEnabled', enabled: false });
    expect(updateSettings).toHaveBeenCalledWith({ netWorthTrackingEnabled: false });
  });

  it('ignores requests without an id and republishes state on request', async () => {
    await renderHost();
    expect(await rpc({ method: 'takeSnapshot' })).toEqual([]);

    const states: unknown[] = [];
    await listen('networth:state', (event) => {
      states.push(event.payload);
    });
    await act(() => emit('networth:request-state', {}));
    expect(states).toEqual([expect.objectContaining({ owner: OWNER, status: 'ok' })]);
  });
});

describe('ChildNetWorthProvider', () => {
  async function renderChild() {
    const hook = renderHook(() => useNetWorth(), { wrapper: ChildNetWorthProvider });
    await flush();
    return hook;
  }

  it('mirrors host state and asks for it on mount', async () => {
    const requested = vi.fn();
    await listen('networth:request-state', requested);
    const { result } = await renderChild();
    expect(requested).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('idle');

    await act(() => emit('networth:state', { ...result.current, status: 'ok', owner: OWNER }));
    expect(result.current.status).toBe('ok');
    expect(result.current.owner).toEqual(OWNER);
  });

  it('resolves actions through the host and surfaces host errors', async () => {
    await listen('networth:rpc-request', (event) => {
      const request = event.payload as { requestId: string; method: string };
      const response =
        request.method === 'takeSnapshot'
          ? { requestId: request.requestId, ok: true, result: snapshot('from-host') }
          : { requestId: request.requestId, ok: false, error: 'host says no' };
      emit('networth:rpc-response', response);
    });
    const { result } = await renderChild();

    await expect(result.current.takeSnapshot()).resolves.toMatchObject({ snapshotId: 'from-host' });
    await expect(result.current.startSession()).rejects.toThrow('host says no');
    await expect(result.current.stopSession()).rejects.toThrow('host says no');
  });

  it('times out unanswered requests after 60s; takeSnapshot then resolves to null', async () => {
    const { result } = await renderChild();

    let settled: SnapshotResponse | null | undefined;
    result.current.takeSnapshot().then((value) => (settled = value));
    await advance(60_000 - 1);
    expect(settled).toBeUndefined();
    await advance(1);
    expect(settled).toBeNull();

    const start = result.current.startSession();
    const assertion = expect(start).rejects.toThrow('Net worth request timed out (startSession)');
    await advance(60_000);
    await assertion;
  });

  it('rejects pending requests when unmounted', async () => {
    const { result, unmount } = await renderChild();
    const start = result.current.startSession();
    unmount();
    await expect(start).rejects.toThrow('ChildNetWorthProvider unmounted');
  });

  it('ignores responses for unknown requests', async () => {
    const { result } = await renderChild();
    const start = result.current.startSession();
    await act(() => emit('networth:rpc-response', { requestId: 'someone-else', ok: true }));

    const assertion = expect(start).rejects.toThrow('timed out');
    await advance(60_000);
    await assertion;
  });

  it('hosts its own state outside Tauri', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    options = { settings: { pd2Token: 'tok', account: 'Acc', ladder: 'ladder' } as Partial<ISettings>, isLoading: false };
    const { result } = await renderChild();
    await flush();

    expect(result.current.owner).toEqual(OWNER);
    expect(syncs()).toEqual([['startup', false]]);
  });
});
