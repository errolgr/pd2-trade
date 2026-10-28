import { t } from '@/i18n';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useOptions } from '@/hooks/useOptions';
import { useOAuth } from '@/hooks/useOAuth';
import { AccountMismatchError, AuthenticationError, usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOverlay } from '@/overlay';
import { useSignIn } from '@/hooks/useSignIn';
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
  /** Opens (or switches) the Net Worth panel on `tab` (default overview). */
  openNetWorth(tab?: NetWorthTab): void;
}

/** Auto triggers are skipped when the previous snapshot is younger than this. */
const AUTO_SNAPSHOT_FLOOR_MS = 2 * 60 * 1000;
const SCHEDULER_TICK_MS = 30 * 1000;
/**
 * AFK backoff: once interval snapshots have shown no holdings change for this long, stop storing
 * snapshots (so idle time doesn't stretch sessions / dilute HR/h) and only probe occasionally.
 */
const IDLE_AFTER_MS = 30 * 60 * 1000;
const IDLE_PROBE_MS = 30 * 60 * 1000;
/**
 * Failed automatic snapshots back off: the n-th failure in a row waits interval × 2^(n-1), capped
 * here, so an outage (PD2 stash down, 4xx for the account) isn't retried every scheduler tick.
 */
const FAILURE_BACKOFF_MAX_MS = 60 * 60 * 1000;

const NetWorthContext = createContext<NetWorthContextValue | undefined>(undefined);

function describeError(error: unknown): string {
  if (error instanceof AccountMismatchError) {
    return error.message || t('system:netWorth.accountMismatch');
  }
  if (error instanceof AuthenticationError) return t('system:netWorth.sessionExpired');
  if (error instanceof NetWorthApiError) {
    if (error.status === 401) return t('system:netWorth.sessionExpired');
    if (error.status === 429) return t('system:netWorth.rateLimited');
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
 * Mounted once at the app root (inside Pd2WebsiteProvider and OverlayProvider). Owns the stash fetch, the
 * auto-snapshot scheduler, sessions and seasons.
 */
export const NetWorthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, isLoading } = useOptions();
  const { authData } = usePd2Website();
  const { openPanel } = useOverlay();
  const { openSignIn } = useSignIn();

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
  // Consecutive failed snapshots and when the last one failed (scheduler backoff).
  const failuresRef = useRef(0);
  const lastFailureAtRef = useRef<number | null>(null);
  // A 401 gets one token refresh (or sign-in prompt) per failure streak, not one per attempt.
  const authRecoveryUsedRef = useRef(false);

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
    failuresRef.current = 0;
    lastFailureAtRef.current = null;
    authRecoveryUsedRef.current = false;
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
          failuresRef.current = 0;
          lastFailureAtRef.current = null;
          authRecoveryUsedRef.current = false;
          if (response.snapshotId) refreshSessions();
          return response;
        } catch (err) {
          if (latestRef.current.ownerKey !== key) return null;
          console.warn('[NetWorth] Snapshot failed:', err);
          setError(describeError(err));
          setRequestStatus('error');
          failuresRef.current += 1;
          lastFailureAtRef.current = Date.now();
          // Expired token: same recovery as the rest of the app (silent refresh, else sign-in dialog),
          // once per failure streak so a token PD2 keeps rejecting doesn't loop refresh → retry → 401.
          // A manual snapshot always gets it.
          if (
            err instanceof NetWorthApiError &&
            err.status === 401 &&
            (trigger === 'manual' || !authRecoveryUsedRef.current)
          ) {
            authRecoveryUsedRef.current = true;
            const refreshToken = settingsRef.current.pd2RefreshToken;
            const refreshed = refreshToken ? await refreshTokens(refreshToken) : false;
            if (refreshed) retryAfterAuthRef.current = trigger;
            else openSignIn();
          }
          return null;
        } finally {
          inFlightRef.current = null;
        }
      })();
      inFlightRef.current = run;
      return run;
    },
    [refreshSessions, refreshTokens, openSignIn],
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
      // After failures, wait interval × 2^(n-1) (capped) since the last failed attempt.
      const failedAt = lastFailureAtRef.current;
      if (failedAt && failuresRef.current > 0) {
        const wait = Math.min(intervalMs * 2 ** (failuresRef.current - 1), FAILURE_BACKOFF_MAX_MS);
        if (now - failedAt < wait) return;
      }
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

  const openNetWorth = useCallback((tab: NetWorthTab = 'overview') => openPanel('currency', { tab }), [openPanel]);

  const value: NetWorthContextValue = useMemo(
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
      takeSnapshot,
      startSession,
      stopSession,
      openNetWorth,
    }),
    [
      owner,
      trackingEnabled,
      latest,
      status,
      error,
      lastSnapshotAt,
      currentSession,
      seasons,
      currentSeasonId,
      takeSnapshot,
      startSession,
      stopSession,
      openNetWorth,
    ],
  );

  return <NetWorthContext.Provider value={value}>{children}</NetWorthContext.Provider>;
};

export function useNetWorth(): NetWorthContextValue {
  const ctx = useContext(NetWorthContext);
  if (!ctx) throw new Error('useNetWorth must be used within NetWorthProvider');
  return ctx;
}
