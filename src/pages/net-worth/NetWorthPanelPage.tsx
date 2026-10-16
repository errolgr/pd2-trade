import React, { useEffect, useId, useMemo, useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { AlertTriangle, Camera, ExternalLink, LogIn, Loader2, Play, Square, TrendingUp } from 'lucide-react';
import { OptionsProvider, useOptions } from '@/hooks/useOptions';
import { ItemsProvider } from '@/hooks/useItems';
import { ChildPd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { ChildNetWorthProvider, useNetWorth } from '@/hooks/useNetWorth';
import { getPoints, NetWorthPoint } from '@/lib/networth-api';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import { emit as emitAppEvent } from '@/lib/browser-events';
import { SIGN_IN_DIALOG_EVENT } from '@/components/dialogs/SignInDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { EASE_OUT, listItem, listStagger, useReducedMotionSafe } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/pages/currency/components/AnimatedNumber';
import { deltaPillClass } from '@/pages/currency/lib/networth-format';
import { formatHr, formatSignedHr } from './overlay';

const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;
const SPARK_WIDTH = 320;
const SPARK_HEIGHT = 56;

const Sparkline: React.FC<{ values: number[] }> = ({ values }) => {
  const gradientId = useId();
  const reduce = useReducedMotionSafe();
  if (values.length < 2) {
    return (
      <div className="flex h-14 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
        Not enough snapshots yet
      </div>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coords = values.map((v, i) => ({
    x: (i / (values.length - 1)) * SPARK_WIDTH,
    y: SPARK_HEIGHT - 4 - ((v - min) / range) * (SPARK_HEIGHT - 8),
  }));
  const points = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `0,${SPARK_HEIGHT} ${points} ${SPARK_WIDTH},${SPARK_HEIGHT}`;
  const end = coords[coords.length - 1];
  const rising = values[values.length - 1] >= values[0];
  return (
    <motion.div
      className={cn('relative h-14 w-full', rising ? 'text-success' : 'text-destructive')}
      initial={reduce ? false : { clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
    >
      <svg viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId}
            x1="0"
            y1="0"
            x2="0"
            y2="1">
            <stop offset="0%"
              stopColor="currentColor"
              stopOpacity={0.3} />
            <stop offset="100%"
              stopColor="currentColor"
              stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points={area}
          fill={`url(#${gradientId})`} />
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        aria-hidden
        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-2 ring-surface"
        style={{ left: `${(end.x / SPARK_WIDTH) * 100}%`, top: `${(end.y / SPARK_HEIGHT) * 100}%` }}
      />
    </motion.div>
  );
};

const NetWorthPanel: React.FC = () => {
  const { settings } = useOptions();
  const {
    owner: ctxOwner,
    latest,
    status,
    error,
    trackingEnabled,
    currentSession,
    takeSnapshot,
    startSession,
    stopSession,
    openNetWorth,
  } = useNetWorth();
  const [points, setPoints] = useState<NetWorthPoint[]>([]);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'snapshot' | 'session' | null>(null);
  const token = settings.pd2Token;
  // Stable owner identity so the points effect only reruns when the account/realm actually changes
  const ownerAccount = ctxOwner?.account;
  const ownerLadder = ctxOwner?.isLadder;
  const ownerHardcore = ctxOwner?.isHardcore;
  const owner = useMemo(
    () =>
      ownerAccount === undefined
        ? null
        : { account: ownerAccount, isLadder: ownerLadder === true, isHardcore: ownerHardcore === true },
    [ownerAccount, ownerLadder, ownerHardcore],
  );

  // Reload recent points whenever a new valuation or session state arrives
  useEffect(() => {
    if (!token || !owner || !trackingEnabled) {
      setPoints([]);
      return;
    }
    let cancelled = false;
    getPoints(token, owner, { from: new Date(Date.now() - HISTORY_WINDOW_MS).toISOString(), resolution: 'raw' })
      .then(({ points }) => {
        if (cancelled) return;
        setPoints(points);
        setPointsError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setPointsError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [token, owner, trackingEnabled, latest?.snapshotId, currentSession?.id, currentSession?.snapshotCount]);

  const sessionValues = useMemo(() => {
    const start = currentSession?.isOpen ? Date.parse(currentSession.start) : 0;
    return points.filter((p) => Date.parse(p.takenAt) >= start).map((p) => p.totalHr);
  }, [points, currentSession]);

  const recentDeltas = useMemo(
    () =>
      points
        .slice(-6)
        .map((p, i, arr) => ({ point: p, delta: i === 0 ? null : p.totalHr - arr[i - 1].totalHr }))
        .slice(1)
        .reverse(),
    [points],
  );

  const run = async (kind: 'snapshot' | 'session', action: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  const sessionOpen = currentSession?.isOpen ?? false;
  const sessionDelta = sessionOpen && currentSession ? currentSession.endHr - currentSession.startHr : null;
  const sparkChange =
    sessionValues.length > 1 ? sessionValues[sessionValues.length - 1] - sessionValues[0] : null;

  const signedIn = status !== 'signed-out' && !!owner;

  return (
    <WindowPanel animate
      className="h-screen w-full">
      <WindowChrome
        title="Net Worth"
        icon={<TrendingUp />}
        closeLabel="Hide"
        onClose={() => getCurrentWebviewWindow().hide()}
        actions={
          signedIn ? (
            <Button size="sm"
              variant="ghost"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => openNetWorth('history')}>
              <ExternalLink className="size-3.5" />
              Open full view
            </Button>
          ) : undefined
        }
      />

      {!signedIn ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
            <LogIn className="size-5" />
          </span>
          <p className="max-w-60 text-sm text-muted-foreground">Sign in with your PD2 account to track your net worth.</p>
          {!token && (
            <Button size="sm"
              onClick={() => emitAppEvent(SIGN_IN_DIALOG_EVENT)}>
              <LogIn className="size-3.5" />
              Sign in
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-4 pb-2.5 pt-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {latest ? (
                  <div className="text-3xl font-semibold leading-none tracking-tight">
                    <AnimatedNumber value={latest.valuation.totalHr}
                      format={formatHr} />{' '}
                    <span className="text-lg font-medium text-muted-foreground">HR</span>
                  </div>
                ) : status === 'error' ? (
                  <div className="text-3xl font-semibold leading-none text-muted-foreground">— HR</div>
                ) : (
                  <Skeleton className="h-8 w-28" />
                )}
                {latest && latest.valuation.uncertainHr > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                    +{formatHr(latest.valuation.uncertainHr)} HR uncertain
                  </div>
                )}
              </div>
              {sessionOpen && currentSession && sessionDelta !== null && (
                <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 font-medium tabular-nums',
                      sessionDelta >= 0 ? 'bg-success/12 text-success' : 'bg-destructive/12 text-destructive',
                    )}
                  >
                    {formatSignedHr(sessionDelta)} HR session
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatHr(currentSession.hrPerHour)} HR/h · {Math.round(currentSession.durationMinutes)} min
                  </span>
                </div>
              )}
            </div>

            {trackingEnabled ? (
              <>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      {sessionOpen && <span className="size-1.5 rounded-full bg-success" />}
                      {sessionOpen ? 'This session' : 'Last 24 hours'}
                    </span>
                    {sparkChange !== null && (
                      <span className={cn('tabular-nums', sparkChange >= 0 ? 'text-success' : 'text-destructive')}>
                        {formatSignedHr(sparkChange)}
                      </span>
                    )}
                  </div>
                  <Sparkline values={sessionValues} />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="mb-1 text-xs text-muted-foreground">Recent snapshots</div>
                  {recentDeltas.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No changes recorded yet.</div>
                  ) : (
                    <motion.ul variants={listStagger}
                      initial="hidden"
                      animate="visible"
                      className="text-xs">
                      {recentDeltas.map(({ point, delta }) => (
                        <motion.li
                          key={point.snapshotId}
                          variants={listItem}
                          className="-mx-1.5 grid grid-cols-[1fr_auto_4rem] items-center gap-3 rounded px-1.5 py-0.5 tabular-nums transition-colors duration-(--dur-fast) hover:bg-muted/50"
                        >
                          <span className="text-muted-foreground">{new Date(point.takenAt).toLocaleTimeString()}</span>
                          <span className="font-medium">{formatHr(point.totalHr)} HR</span>
                          <span className="flex justify-end">
                            {delta !== null && (
                              <span className={cn('rounded px-1.5 font-medium leading-4', deltaPillClass(delta))}>
                                {formatSignedHr(delta)}
                              </span>
                            )}
                          </span>
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                  {pointsError && <div className="mt-1 text-xs text-destructive">{pointsError}</div>}
                </div>
              </>
            ) : (
              <p className="flex-1 rounded-md border border-dashed border-border p-3 text-xs leading-relaxed text-muted-foreground">
                History is off. Turn on &quot;Save net worth history&quot; in Settings → Net Worth to see sessions and
                changes.
              </p>
            )}

            {status === 'error' && error && (
              <div role="alert"
                className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                <AlertTriangle className="mt-px size-3.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2.5 [&>button]:h-8 [&>button]:flex-1 [&>button]:text-xs">
            <Button size="sm"
              className="px-2.5"
              disabled={busy !== null}
              onClick={() => run('snapshot', () => takeSnapshot('manual'))}>
              {busy === 'snapshot' ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
              Snapshot now
            </Button>
            {trackingEnabled && (
              <Button
                size="sm"
                variant="outline"
                className="px-2.5"
                disabled={busy !== null}
                onClick={() => run('session', sessionOpen ? stopSession : startSession)}
              >
                {busy === 'session' ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : sessionOpen ? (
                  <Square className="size-3.5" />
                ) : (
                  <Play className="size-3.5" />
                )}
                {sessionOpen ? 'Stop session' : 'Start session'}
              </Button>
            )}
          </div>
        </>
      )}
    </WindowPanel>
  );
};

const NetWorthPanelPage: React.FC = () => (
  <MotionConfig reducedMotion="user">
    <OptionsProvider>
      <ItemsProvider>
        <ChildPd2WebsiteProvider>
          <ChildNetWorthProvider>
            <NetWorthPanel />
          </ChildNetWorthProvider>
        </ChildPd2WebsiteProvider>
      </ItemsProvider>
    </OptionsProvider>
  </MotionConfig>
);

export default NetWorthPanelPage;
