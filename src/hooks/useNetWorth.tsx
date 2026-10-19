import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { emit as emitAppEvent, listen as listenAppEvent } from '@/lib/browser-events';
import { useOptions } from '@/hooks/useOptions';
import { useOAuth } from '@/hooks/useOAuth';
import { SIGN_IN_DIALOG_EVENT } from '@/components/dialogs/SignInDialog';
import {
  AccountMismatchError,
  AuthenticationError,
  Pd2WebsiteProvider,
  usePd2Website,
} from '@/hooks/pd2website/usePD2Website';
import {
  getSeasons,
  getSessions,
  NetWorthApiError,
  postSessionMarker,
  syncSnapshot,
  type NetWorthOwner,
  type Season,
  type SessionSummary,
  type SnapshotResponse,
  type SnapshotTrigger,
} from '@/lib/networth-api';
import { getCurrentSeason, SEASONS, startedSeasons } from '@/lib/seasons';

export type NetWorthStatus = 'idle' | 'loading' | 'ok' | 'error' | 'signed-out';
export type NetWorthTab = 'overview' | 'history';

export interface NetWorthContextValue {
  owner: NetWorthOwner | null;
  trackingEnabled: boolean;
  latest: SnapshotResponse | null;
  status: NetWorthStatus;
  error: string | null;
  lastSnapshotAt: number | null;
  currentSession: SessionSummary | null;
  seasons: Season[];
  currentSeasonId: string | null;
  takeSnapshot(trigger?: SnapshotTrigger): Promise<SnapshotResponse | null>;
  startSession(): Promise<void>;
  stopSession(): Promise<void>;
  openNetWorth(tab?: NetWorthTab): void;
}

/** Fire-and-forget: any window asks the host provider to take a snapshot. Payload `{ trigger?: SnapshotTrigger }`. */
export const NETWORTH_TAKE_SNAPSHOT_EVENT = 'networth:take-snapshot';
/** Ask the main window to open/focus the Net Worth window on a tab. Payload `{ tab: NetWorthTab }`. */
export const NETWORTH_OPEN_EVENT = 'networth:open';
const NETWORTH_STATE_EVENT = 'networth:state';
const NETWORTH_REQUEST_STATE_EVENT = 'networth:request-state';
const NETWORTH_RPC_REQUEST_EVENT = 'networth:rpc-request';
const NETWORTH_RPC_RESPONSE_EVENT = 'networth:rpc-response';

/** Auto triggers are skipped when the previous snapshot is younger than this. */
const AUTO_SNAPSHOT_FLOOR_MS = 2 * 60 * 1000;
const SCHEDULER_TICK_MS = 30 * 1000;
/**
 * AFK backoff: once interval snapshots have shown no holdings change for this long, stop storing
 * snapshots (so idle time doesn't stretch sessions / dilute HR/h) and only probe occasionally.
 */
const IDLE_AFTER_MS = 30 * 60 * 1000;
const IDLE_PROBE_MS = 30 * 60 * 1000;
const RPC_TIMEOUT_MS = 60 * 1000;

export function requestNetWorthSnapshot(trigger: SnapshotTrigger = 'manual'): Promise<void> {
  return emitAppEvent(NETWORTH_TAKE_SNAPSHOT_EVENT, { trigger });
}

type NetWorthState = Omit<NetWorthContextValue, 'takeSnapshot' | 'startSession' | 'stopSession' | 'openNetWorth'>;

type RpcCall =
  | { method: 'takeSnapshot'; trigger: SnapshotTrigger }
  | { method: 'startSession' }
  | { method: 'stopSession' };

type RpcRequest = RpcCall & { requestId: string };

interface RpcResponse {
  requestId: string;
  ok: boolean;
  result?: SnapshotResponse | null;
  error?: string;
}

const NetWorthContext = createContext<NetWorthContextValue | undefined>(undefined);

const openNetWorth = (tab: NetWorthTab = 'overview') => {
  emitAppEvent(NETWORTH_OPEN_EVENT, { tab }).catch((error) => {
    console.warn('[NetWorth] Failed to request window open:', error);
  });
};

function describeError(error: unknown): string {
  if (error instanceof AccountMismatchError) {
    return error.message || 'The selected account is not linked to your PD2 login. Check your account settings.';
  }
  if (error instanceof AuthenticationError) return 'Your PD2 session expired. Sign in again.';
  if (error instanceof NetWorthApiError) {
    if (error.status === 401) return 'Your PD2 session expired. Sign in again.';
    if (error.status === 429) return 'Too many requests. Try again in a minute.';
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

/** Holdings fingerprint (prices excluded) used to detect "nothing changed since last snapshot". */
function holdingsSignature(response: SnapshotResponse): string {
  return response.valuation.lines
    .map((line) => `${line.key}@${line.tab ?? ''}:${line.qty}`)
    .sort()
    .join('|');
}

async function isDiabloFocused(): Promise<boolean> {
  if (!isTauri()) return true;
  try {
    return await invoke<boolean>('is_diablo_focused');
  } catch {
    return false;
  }
}

/**
 * Host provider: mounted once in the main window (inside Pd2WebsiteProvider). Owns the stash fetch,
 * the auto-snapshot scheduler, sessions and seasons, and mirrors its state to child windows.
 */
export const NetWorthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, isLoading } = useOptions();
  const { authData } = usePd2Website();

  const token = settings.pd2Token;
  const account = settings.account;
  const isLadder = settings.ladder === 'ladder';
  const isHardcore = settings.mode === 'hardcore';
  const owner = useMemo<NetWorthOwner | null>(
    () => (token && account ? { account, isLadder, isHardcore } : null),
    [token, account, isLadder, isHardcore],
  );
  const ownerKey = owner ? `${owner.account.toLowerCase()}|${owner.isLadder}|${owner.isHardcore}` : null;
  // On by default; only an explicit `false` (Settings → Net Worth) turns history off.
  const trackingEnabled = settings.netWorthTrackingEnabled !== false;
  const autoMinutes = settings.netWorthAutoSnapshotMinutes ?? 15;

  const [latest, setLatest] = useState<SnapshotResponse | null>(null);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastSnapshotAt, setLastSnapshotAt] = useState<number | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionSummary | null>(null);
  const [seasons, setSeasons] = useState<Season[]>(() => startedSeasons(SEASONS));
  const [currentSeasonId, setCurrentSeasonId] = useState<string | null>(getCurrentSeason(SEASONS)?.id ?? null);

  const status: NetWorthStatus = isLoading ? 'idle' : !owner ? 'signed-out' : requestStatus;

  // Latest values for callbacks that must stay stable (scheduler, RPC listener).
  const latestRef = useRef({ token, owner, ownerKey, trackingEnabled, authData, currentSeasonId });
  latestRef.current = { token, owner, ownerKey, trackingEnabled, authData, currentSeasonId };
  const lastSnapshotAtRef = useRef<number | null>(null);
  const inFlightRef = useRef<Promise<SnapshotResponse | null> | null>(null);
  const lastSignatureRef = useRef<string | null>(null);
  const lastChangeAtRef = useRef<number>(Date.now());
  const { refreshTokens } = useOAuth();
  const retryAfterAuthRef = useRef<SnapshotTrigger | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Reset owner-scoped state when the account/ladder/mode changes.
  useEffect(() => {
    setLatest(null);
    setCurrentSession(null);
    setLastSnapshotAt(null);
    setRequestStatus('idle');
    setError(null);
    lastSnapshotAtRef.current = null;
    lastSignatureRef.current = null;
    lastChangeAtRef.current = Date.now();
  }, [ownerKey]);

  useEffect(() => {
    let cancelled = false;
    getSeasons()
      .then(({ seasons: serverSeasons, currentId }) => {
        if (cancelled || !serverSeasons?.length) return;
        setSeasons(serverSeasons);
        setCurrentSeasonId(currentId ?? getCurrentSeason(serverSeasons)?.id ?? null);
      })
      .catch((err) => {
        console.warn('[NetWorth] Using bundled seasons:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshSessions = useCallback(async () => {
    const { token: t, owner: o, trackingEnabled: tracking, currentSeasonId: seasonId } = latestRef.current;
    if (!t || !o || !tracking) {
      setCurrentSession(null);
      return;
    }
    try {
      const { sessions } = await getSessions(t, o, seasonId ?? undefined);
      setCurrentSession(sessions.find((s) => s.isOpen) ?? null);
    } catch (err) {
      console.warn('[NetWorth] Failed to load sessions:', err);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [ownerKey, trackingEnabled, currentSeasonId, refreshSessions]);

  // `persistOverride: false` = value-only probe (used while idle); otherwise persist follows tracking.
  const runSnapshot = useCallback(
    (trigger: SnapshotTrigger, persistOverride?: boolean): Promise<SnapshotResponse | null> => {
      if (inFlightRef.current) return inFlightRef.current;
      const { token: t, owner: o, ownerKey: key, trackingEnabled: tracking, authData: auth } = latestRef.current;
      // Before /oauth/me resolves the owner isn't confirmed; the startup snapshot fires once it is.
      if (!t || !o || !auth) return Promise.resolve(null);
      const persist = persistOverride ?? tracking;

      const run = (async () => {
        setRequestStatus('loading');
        try {
          // The server fetches the stash from PD2 itself, so holdings can't be forged client-side.
          const response = await syncSnapshot(t, o, trigger, persist);
          // Ignore results for an owner the user switched away from mid-request.
          if (latestRef.current.ownerKey !== key) return null;
          const now = Date.now();
          const signature = holdingsSignature(response);
          if (signature !== lastSignatureRef.current || trigger === 'manual') lastChangeAtRef.current = now;
          lastSignatureRef.current = signature;
          lastSnapshotAtRef.current = now;
          setLastSnapshotAt(now);
          setLatest(response);
          setError(null);
          setRequestStatus('ok');
          if (response.snapshotId) refreshSessions();
          return response;
        } catch (err) {
          if (latestRef.current.ownerKey !== key) return null;
          console.warn('[NetWorth] Snapshot failed:', err);
          setError(describeError(err));
          setRequestStatus('error');
          // Expired token: same recovery as the rest of the app (silent refresh, else sign-in dialog).
          if (err instanceof NetWorthApiError && err.status === 401) {
            const refreshToken = settingsRef.current.pd2RefreshToken;
            const refreshed = refreshToken ? await refreshTokens(refreshToken) : false;
            if (refreshed) retryAfterAuthRef.current = trigger;
            else await emitAppEvent(SIGN_IN_DIALOG_EVENT);
          }
          return null;
        } finally {
          inFlightRef.current = null;
        }
      })();
      inFlightRef.current = run;
      return run;
    },
    [refreshSessions, refreshTokens],
  );

  const takeSnapshot = useCallback((trigger: SnapshotTrigger = 'manual') => runSnapshot(trigger), [runSnapshot]);

  // Retry the snapshot that hit 401 once the refreshed token lands in settings.
  useEffect(() => {
    const trigger = retryAfterAuthRef.current;
    if (!trigger || !token) return;
    retryAfterAuthRef.current = null;
    runSnapshot(trigger);
  }, [token, runSnapshot]);

  const takeSnapshotRef = useRef(takeSnapshot);
  takeSnapshotRef.current = takeSnapshot;

  const sendMarker = useCallback(
    async (type: 'start' | 'stop') => {
      const { token: t, owner: o } = latestRef.current;
      if (!t || !o) return;
      await postSessionMarker(t, o, type);
      await refreshSessions();
    },
    [refreshSessions],
  );
  const startSession = useCallback(() => sendMarker('start'), [sendMarker]);
  const stopSession = useCallback(() => sendMarker('stop'), [sendMarker]);

  // Scheduler: one startup snapshot per owner once PD2 auth is confirmed, then every
  // `netWorthAutoSnapshotMinutes` while Diablo is focused. After IDLE_AFTER_MS without a holdings
  // change it backs off to a value-only probe every IDLE_PROBE_MS; a change (or a manual snapshot)
  // resumes normal cadence.
  const signedIn = !!owner && !!authData;
  const startupDoneForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!signedIn || !ownerKey || startupDoneForRef.current === ownerKey) return;
    startupDoneForRef.current = ownerKey;
    const last = lastSnapshotAtRef.current;
    if (last && Date.now() - last < AUTO_SNAPSHOT_FLOOR_MS) return;
    takeSnapshotRef.current('startup');
  }, [signedIn, ownerKey]);

  useEffect(() => {
    if (!signedIn || autoMinutes <= 0) return;
    const intervalMs = Math.max(autoMinutes * 60 * 1000, AUTO_SNAPSHOT_FLOOR_MS);
    let wasFocused = true;
    const timer = setInterval(async () => {
      const focused = await isDiabloFocused();
      // Coming back to the game ends the idle backoff immediately.
      if (focused && !wasFocused) lastChangeAtRef.current = Date.now();
      wasFocused = focused;
      if (!focused) return;
      const now = Date.now();
      const idle = now - lastChangeAtRef.current >= IDLE_AFTER_MS;
      const last = lastSnapshotAtRef.current;
      if (last && now - last < (idle ? IDLE_PROBE_MS : intervalMs)) return;
      if (!idle) {
        runSnapshot('interval');
        return;
      }
      const changedBefore = lastChangeAtRef.current;
      const probe = await runSnapshot('interval', false);
      // Holdings moved while idle: store a real snapshot and continue at normal cadence.
      if (probe && lastChangeAtRef.current !== changedBefore) runSnapshot('interval');
    }, SCHEDULER_TICK_MS);
    return () => clearInterval(timer);
  }, [signedIn, autoMinutes, runSnapshot]);

  // Mirror state to child windows.
  const state: NetWorthState = useMemo(
    () => ({
      owner,
      trackingEnabled,
      latest,
      status,
      error,
      lastSnapshotAt,
      currentSession,
      seasons,
      currentSeasonId,
    }),
    [owner, trackingEnabled, latest, status, error, lastSnapshotAt, currentSession, seasons, currentSeasonId],
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    emitAppEvent(NETWORTH_STATE_EVENT, state).catch((err) => {
      console.warn('[NetWorth] Failed to publish state:', err);
    });
  }, [state]);

  const rpcHandlersRef = useRef({ takeSnapshot, startSession, stopSession });
  rpcHandlersRef.current = { takeSnapshot, startSession, stopSession };

  useEffect(() => {
    const unlisteners: Promise<() => void>[] = [
      listenAppEvent(NETWORTH_REQUEST_STATE_EVENT, () => {
        emitAppEvent(NETWORTH_STATE_EVENT, stateRef.current).catch(() => {});
      }),
      listenAppEvent<{ trigger?: SnapshotTrigger }>(NETWORTH_TAKE_SNAPSHOT_EVENT, (event) => {
        takeSnapshotRef.current(event.payload?.trigger ?? 'manual');
      }),
      listenAppEvent<RpcRequest>(NETWORTH_RPC_REQUEST_EVENT, async (event) => {
        const request = event.payload;
        if (!request?.requestId) return;
        const handlers = rpcHandlersRef.current;
        let response: RpcResponse;
        try {
          let result: SnapshotResponse | null = null;
          switch (request.method) {
            case 'takeSnapshot':
              result = await handlers.takeSnapshot(request.trigger);
              break;
            case 'startSession':
              await handlers.startSession();
              break;
            case 'stopSession':
              await handlers.stopSession();
              break;
          }
          response = { requestId: request.requestId, ok: true, result };
        } catch (err) {
          response = { requestId: request.requestId, ok: false, error: describeError(err) };
        }
        await emitAppEvent(NETWORTH_RPC_RESPONSE_EVENT, response);
      }),
    ];
    return () => {
      unlisteners.forEach((p) => p.then((off) => off()).catch(() => {}));
    };
  }, []);

  const value: NetWorthContextValue = useMemo(
    () => ({ ...state, takeSnapshot, startSession, stopSession, openNetWorth }),
    [state, takeSnapshot, startSession, stopSession],
  );

  return <NetWorthContext.Provider value={value}>{children}</NetWorthContext.Provider>;
};

const EMPTY_STATE: NetWorthState = {
  owner: null,
  trackingEnabled: false,
  latest: null,
  status: 'idle',
  error: null,
  lastSnapshotAt: null,
  currentSession: null,
  seasons: startedSeasons(SEASONS),
  currentSeasonId: getCurrentSeason(SEASONS)?.id ?? null,
};

/** Child-window provider: mirrors the host's state and forwards actions to it over app events. */
export const ChildNetWorthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Browser-mode windows are separate tabs and app events do not cross tabs, so each one hosts its own state.
  if (!isTauri()) {
    return (
      <Pd2WebsiteProvider>
        <NetWorthProvider>{children}</NetWorthProvider>
      </Pd2WebsiteProvider>
    );
  }
  return <NetWorthMirror>{children}</NetWorthMirror>;
};

interface PendingRpc {
  resolve: (value: SnapshotResponse | null) => void;
  reject: (reason?: unknown) => void;
  timeout: NodeJS.Timeout;
}

const NetWorthMirror: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NetWorthState>(EMPTY_STATE);
  const pendingRef = useRef(new Map<string, PendingRpc>());

  useEffect(() => {
    const pending = pendingRef.current;
    const unlisteners: Promise<() => void>[] = [
      listenAppEvent<NetWorthState>(NETWORTH_STATE_EVENT, (event) => {
        if (event.payload) setState(event.payload);
      }),
      listenAppEvent<RpcResponse>(NETWORTH_RPC_RESPONSE_EVENT, (event) => {
        const response = event.payload;
        const entry = response?.requestId ? pending.get(response.requestId) : undefined;
        if (!entry) return;
        clearTimeout(entry.timeout);
        pending.delete(response.requestId);
        if (response.ok) entry.resolve(response.result ?? null);
        else entry.reject(new Error(response.error || 'Net worth request failed'));
      }),
    ];
    Promise.all(unlisteners).then(() => emitAppEvent(NETWORTH_REQUEST_STATE_EVENT, {}));
    return () => {
      unlisteners.forEach((p) => p.then((off) => off()).catch(() => {}));
      pending.forEach((entry) => {
        clearTimeout(entry.timeout);
        entry.reject(new Error('ChildNetWorthProvider unmounted'));
      });
      pending.clear();
    };
  }, []);

  const rpcCall = useCallback((call: RpcCall): Promise<SnapshotResponse | null> => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRef.current.delete(requestId);
        reject(new Error(`Net worth request timed out (${call.method})`));
      }, RPC_TIMEOUT_MS);
      pendingRef.current.set(requestId, { resolve, reject, timeout });
      const request: RpcRequest = { ...call, requestId };
      emitAppEvent(NETWORTH_RPC_REQUEST_EVENT, request).catch((err) => {
        clearTimeout(timeout);
        pendingRef.current.delete(requestId);
        reject(err);
      });
    });
  }, []);

  const value: NetWorthContextValue = useMemo(
    () => ({
      ...state,
      takeSnapshot: (trigger: SnapshotTrigger = 'manual') =>
        rpcCall({ method: 'takeSnapshot', trigger }).catch((err) => {
          console.warn('[NetWorth] takeSnapshot failed:', err);
          return null;
        }),
      startSession: async () => {
        await rpcCall({ method: 'startSession' });
      },
      stopSession: async () => {
        await rpcCall({ method: 'stopSession' });
      },
      openNetWorth,
    }),
    [state, rpcCall],
  );

  return <NetWorthContext.Provider value={value}>{children}</NetWorthContext.Provider>;
};

export function useNetWorth(): NetWorthContextValue {
  const ctx = useContext(NetWorthContext);
  if (!ctx) throw new Error('useNetWorth must be used within NetWorthProvider or ChildNetWorthProvider');
  return ctx;
}
