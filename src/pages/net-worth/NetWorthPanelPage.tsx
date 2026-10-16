import React, { useEffect, useMemo, useState } from 'react';
import { Camera, ExternalLink, GripVertical, Loader2, Play, Square, X } from 'lucide-react';
import { OptionsProvider, useOptions } from '@/hooks/useOptions';
import { ItemsProvider } from '@/hooks/useItems';
import { ChildPd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { ChildNetWorthProvider, useNetWorth } from '@/hooks/useNetWorth';
import { getPoints, NetWorthPoint } from '@/lib/networth-api';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatHr, formatSignedHr } from './overlay';

const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;
const SPARK_WIDTH = 320;
const SPARK_HEIGHT = 64;

const Sparkline: React.FC<{ values: number[] }> = ({ values }) => {
  if (values.length < 2) {
    return (
      <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
        Not enough snapshots yet
      </div>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * SPARK_WIDTH;
      const y = SPARK_HEIGHT - 4 - ((v - min) / range) * (SPARK_HEIGHT - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const rising = values[values.length - 1] >= values[0];
  return (
    <svg viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      className="h-16 w-full"
      preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        strokeWidth={2}
        className={rising ? 'stroke-emerald-400' : 'stroke-red-400'}
      />
    </svg>
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

  return (
    <Card className="flex h-screen w-full flex-col gap-3 overflow-hidden border bg-background p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <GripVertical data-tauri-drag-region
            className="h-4 w-4 cursor-grab text-muted-foreground" />
          <h2 className="text-base font-semibold">Net Worth</h2>
        </div>
        <Button variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => getCurrentWebviewWindow().hide()}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {status === 'signed-out' || !owner ? (
        <p className="text-sm text-muted-foreground">Sign in with your PD2 account to track your net worth.</p>
      ) : (
        <>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold tabular-nums">
                {latest ? `${formatHr(latest.valuation.totalHr)} HR` : '—'}
              </div>
              {latest && latest.valuation.uncertainHr > 0 && (
                <div className="text-xs text-muted-foreground">
                  +{formatHr(latest.valuation.uncertainHr)} HR uncertain
                </div>
              )}
            </div>
            {sessionOpen && currentSession && sessionDelta !== null && (
              <div className="text-right text-xs">
                <div
                  className={cn('font-medium tabular-nums', sessionDelta >= 0 ? 'text-emerald-400' : 'text-red-400')}
                >
                  {formatSignedHr(sessionDelta)} HR session
                </div>
                <div className="text-muted-foreground tabular-nums">
                  {formatHr(currentSession.hrPerHour)} HR/h · {Math.round(currentSession.durationMinutes)} min
                </div>
              </div>
            )}
          </div>

          {trackingEnabled ? (
            <>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">
                  {sessionOpen ? 'This session' : 'Last 24 hours'}
                </div>
                <Sparkline values={sessionValues} />
              </div>
              <div className="flex-1 min-h-0">
                <div className="mb-1 text-xs text-muted-foreground">Recent snapshots</div>
                {recentDeltas.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No changes recorded yet.</div>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {recentDeltas.map(({ point, delta }) => (
                      <li key={point.snapshotId}
                        className="flex justify-between tabular-nums">
                        <span className="text-muted-foreground">{new Date(point.takenAt).toLocaleTimeString()}</span>
                        <span>{formatHr(point.totalHr)} HR</span>
                        <span
                          className={cn(
                            'w-16 text-right',
                            delta === null || delta === 0
                              ? 'text-muted-foreground'
                              : delta > 0
                                ? 'text-emerald-400'
                                : 'text-red-400',
                          )}
                        >
                          {delta === null ? '' : formatSignedHr(delta)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {pointsError && <div className="mt-1 text-xs text-red-400">{pointsError}</div>}
              </div>
            </>
          ) : (
            <p className="flex-1 text-xs text-muted-foreground">
              History is off. Turn on &quot;Save net worth history&quot; in Settings → Net Worth to see sessions and
              changes.
            </p>
          )}

          {status === 'error' && error && <div className="text-xs text-red-400">{error}</div>}

          <div className="flex flex-wrap gap-2">
            <Button size="sm"
              disabled={busy !== null}
              onClick={() => run('snapshot', () => takeSnapshot('manual'))}>
              {busy === 'snapshot' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Snapshot now
            </Button>
            {trackingEnabled && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={() => run('session', sessionOpen ? stopSession : startSession)}
              >
                {sessionOpen ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {sessionOpen ? 'Stop session' : 'Start session'}
              </Button>
            )}
            <Button size="sm"
              variant="ghost"
              onClick={() => openNetWorth('history')}>
              <ExternalLink className="h-4 w-4" />
              Open full view
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};

const NetWorthPanelPage: React.FC = () => (
  <OptionsProvider>
    <ItemsProvider>
      <ChildPd2WebsiteProvider>
        <ChildNetWorthProvider>
          <NetWorthPanel />
        </ChildNetWorthProvider>
      </ChildPd2WebsiteProvider>
    </ItemsProvider>
  </OptionsProvider>
);

export default NetWorthPanelPage;
