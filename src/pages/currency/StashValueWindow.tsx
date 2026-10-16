import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import { AlertTriangle, GripVertical, History, LogIn, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import { emit as emitAppEvent, listen as listenAppEvent } from '@/lib/browser-events';
import { SIGN_IN_DIALOG_EVENT } from '@/components/dialogs/SignInDialog';
import { useOptions } from '@/hooks/useOptions';
import { NETWORTH_OPEN_EVENT, useNetWorth, type NetWorthTab } from '@/hooks/useNetWorth';
import {
  getPoints,
  type NetWorthCategory,
  type NetWorthOwner,
  type NetWorthPoint,
  type Valuation,
} from '@/lib/networth-api';
import { cn } from '@/lib/utils';
import { useEconomyData } from '../price-check/hooks/useEconomyData';
import { RunePricePopover } from '../price-check/components/RunePricePopover';
import { HoldingsTable } from './components/HoldingsTable';
import { OverviewTab } from './components/OverviewTab';
import { HistoryTab } from './components/HistoryTab';
import { deltaClass, formatSignedHr } from './lib/networth-format';
import { useNetWorthQuery } from './lib/useNetWorthQuery';

type WindowTab = 'overview' | 'runes' | 'currency' | 'ubers' | 'gems-mats' | 'uniques-sets' | 'other' | 'history';

const HOLDING_TABS: { value: WindowTab; label: string; categories: NetWorthCategory[]; showTab?: boolean }[] = [
  { value: 'runes', label: 'Runes', categories: ['runes'] },
  { value: 'currency', label: 'Currency', categories: ['currency'] },
  { value: 'ubers', label: 'Uber Mats', categories: ['ubers'] },
  { value: 'gems-mats', label: 'Gems & Mats', categories: ['gems', 'mats'] },
  { value: 'uniques-sets', label: 'Uniques & Sets', categories: ['uniques', 'sets'], showTab: true },
  { value: 'other', label: 'Other', categories: ['other'], showTab: true },
];

/** Re-value on open/focus when the latest snapshot is older than this. */
const STALE_ON_OPEN_MS = 2 * 60 * 1000;

function initialTab(): WindowTab {
  return new URLSearchParams(window.location.search).get('tab') === 'history' ? 'history' : 'overview';
}

export function StashValueWindow() {
  const netWorth = useNetWorth();
  const { owner, latest, status, error, trackingEnabled, needsConsent, takeSnapshot, lastSnapshotAt } = netWorth;
  const { settings } = useOptions();
  const token = settings.pd2Token ?? null;
  const [tab, setTab] = useState<WindowTab>(initialTab);

  // Deep link from ticker / panel / toasts
  useEffect(() => {
    const unlisten = listenAppEvent<{ tab?: NetWorthTab }>(NETWORTH_OPEN_EVENT, ({ payload }) => {
      if (payload?.tab) setTab(payload.tab);
    });
    return () => {
      unlisten.then((off) => off());
    };
  }, []);

  // Re-value when the window is opened or refocused with a stale (or no) valuation
  const refreshRef = useRef({ owner, lastSnapshotAt, status, takeSnapshot });
  useEffect(() => {
    refreshRef.current = { owner, lastSnapshotAt, status, takeSnapshot };
  });
  const refreshIfStale = useCallback(() => {
    const current = refreshRef.current;
    if (!current.owner || current.status === 'loading') return;
    if (current.lastSnapshotAt && Date.now() - current.lastSnapshotAt < STALE_ON_OPEN_MS) return;
    current.takeSnapshot('manual');
  }, []);
  const ownerKey = owner ? `${owner.account}|${owner.isLadder}|${owner.isHardcore}` : null;
  useEffect(() => {
    if (ownerKey) refreshIfStale();
  }, [ownerKey, refreshIfStale]);
  useEffect(() => {
    window.addEventListener('focus', refreshIfStale);
    return () => window.removeEventListener('focus', refreshIfStale);
  }, [refreshIfStale]);

  const loadSeasonPoints = useCallback(async (): Promise<NetWorthPoint[]> => {
    if (!token || !owner) return [];
    const seasonId = netWorth.currentSeasonId ?? undefined;
    return (await getPoints(token, owner, { seasonId, resolution: 'hour' })).points;
  }, [token, owner, netWorth.currentSeasonId]);
  const seasonPoints = useNetWorthQuery(
    token && owner && trackingEnabled ? loadSeasonPoints : null,
    latest?.valuation.takenAt,
  );

  const valuation = latest?.valuation ?? null;

  return (
    <TooltipProvider>
      <div className="min-h-screen w-full space-y-4 bg-background p-6">
        <WindowTitle
          owner={owner}
          seasonLabel={netWorth.seasons.find((s) => s.id === (valuation?.seasonId ?? netWorth.currentSeasonId))?.label}
        />

        {status === 'signed-out' ? (
          <SignedOut hasToken={!!token} />
        ) : (
          <>
            {(valuation || status !== 'error') && (
              <Header
                valuation={valuation}
                sincePrevious={latest?.delta.sincePrevious ?? null}
                seasonPoints={seasonPoints.data}
                loading={status === 'loading'}
                onRefresh={() => takeSnapshot('manual')}
              />
            )}

            {needsConsent && <ConsentPrompt onAnswer={netWorth.setTrackingEnabled} />}

            {status === 'error' && error && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-red-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </span>
                <Button size="sm"
                  variant="outline"
                  onClick={() => takeSnapshot('manual')}>
                  Retry
                </Button>
              </div>
            )}

            <Separator />

            <Tabs value={tab}
              onValueChange={(v) => setTab(v as WindowTab)}>
              <TabsList className="w-full">
                <TabsTrigger value="overview"
                  className="text-xs">
                  Overview
                </TabsTrigger>
                {HOLDING_TABS.map((t) => (
                  <TabsTrigger key={t.value}
                    value={t.value}
                    className="text-xs">
                    {t.label}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="history"
                  className="text-xs">
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview"
                className="pt-2">
                {valuation ? <OverviewTab valuation={valuation} /> : <TabSkeleton failed={status === 'error'} />}
              </TabsContent>

              {HOLDING_TABS.map((t) => (
                <TabsContent key={t.value}
                  value={t.value}
                  className="pt-2">
                  {valuation ? (
                    <HoldingsTable
                      lines={valuation.lines.filter((line) => t.categories.includes(line.category))}
                      totalHr={valuation.totalHr}
                      showTab={t.showTab}
                      toolbar={t.value === 'runes' ? <RuneExchange /> : undefined}
                    />
                  ) : (
                    <TabSkeleton failed={status === 'error'} />
                  )}
                </TabsContent>
              ))}

              <TabsContent value="history"
                className="pt-2">
                {!trackingEnabled ? (
                  <TrackingDisabled onEnable={() => netWorth.setTrackingEnabled(true)} />
                ) : token && owner ? (
                  <HistoryTab
                    token={token}
                    owner={owner}
                    seasons={netWorth.seasons}
                    currentSeasonId={netWorth.currentSeasonId}
                    seasonPoints={seasonPoints.data}
                    refreshKey={latest?.valuation.takenAt ?? null}
                    onHistoryChanged={seasonPoints.reload}
                  />
                ) : (
                  <TabSkeleton failed={false} />
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

function WindowTitle({ owner, seasonLabel }: { owner: NetWorthOwner | null; seasonLabel?: string }) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-1">
        <GripVertical
          data-tauri-drag-region
          className="h-5 w-5 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          id="titlebar-drag-handle"
        />
        <h2 className="text-xl font-bold">Stash Value</h2>
        {owner && (
          <span className="ml-2 text-xs text-muted-foreground">
            {owner.account} · {owner.isLadder ? 'Ladder' : 'Non-ladder'} {owner.isHardcore ? 'HC' : 'SC'}
            {seasonLabel ? ` · ${seasonLabel}` : ''}
          </span>
        )}
      </div>
      <Button variant="ghost"
        size="icon"
        onClick={() => getCurrentWebviewWindow().hide()}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Header({
  valuation,
  sincePrevious,
  seasonPoints,
  loading,
  onRefresh,
}: {
  valuation: Valuation | null;
  sincePrevious: number | null;
  seasonPoints: NetWorthPoint[] | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const deltas = useMemo(() => {
    if (!valuation) return [];
    const total = valuation.totalHr;
    const result: { label: string; value: number | null }[] = [{ label: 'last', value: sincePrevious }];
    if (seasonPoints && seasonPoints.length > 0) {
      const dayAgo = moment().subtract(24, 'hours').toISOString();
      const baseline = [...seasonPoints].reverse().find((p) => p.takenAt <= dayAgo) ?? seasonPoints[0];
      result.push({ label: '24h', value: total - baseline.totalHr });
      result.push({ label: 'season', value: total - seasonPoints[0].totalHr });
    }
    return result;
  }, [valuation, sincePrevious, seasonPoints]);

  if (!valuation) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-3xl font-semibold tabular-nums">{valuation.totalHr.toFixed(2)} HR</span>
        {deltas.map((d) => (
          <span key={d.label}
            className={cn('text-sm tabular-nums', deltaClass(d.value))}>
            {d.value === null ? '—' : formatSignedHr(d.value)}{' '}
            <span className="text-muted-foreground">({d.label})</span>
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          as of {moment(valuation.takenAt).format('HH:mm')} · prices {valuation.priceDay} ·{' '}
          {valuation.gold.toLocaleString()} gold
          {valuation.priceSource === 'ladder-fallback' && (
            <span className="ml-1 text-amber-300">· valued with ladder prices (no non-ladder market data)</span>
          )}
        </p>
        <Button size="sm"
          variant="outline"
          disabled={loading}
          onClick={onRefresh}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
        </Button>
      </div>
    </div>
  );
}

function ConsentPrompt({ onAnswer }: { onAnswer: (enabled: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-sky-900 bg-sky-950/30 px-3 py-2 text-sm">
      <span className="flex items-center gap-2">
        <History className="h-4 w-4 shrink-0 text-sky-300" />
        Track net worth over time? Snapshots are stored on pd2trader.com.
      </span>
      <span className="flex shrink-0 gap-2">
        <Button size="sm"
          variant="ghost"
          onClick={() => onAnswer(false)}>
          No thanks
        </Button>
        <Button size="sm"
          onClick={() => onAnswer(true)}>
          Track history
        </Button>
      </span>
    </div>
  );
}

function TrackingDisabled({ onEnable }: { onEnable: () => void }) {
  return (
    <div className="space-y-3 rounded-md border p-6 text-center">
      <History className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="text-sm">History is off.</p>
      <p className="mx-auto max-w-md text-xs text-muted-foreground">
        Turn on tracking to store a snapshot of your stash value on pd2trader.com each time it is refreshed (on
        start-up, every few minutes while Diablo is focused, and on demand). You get a chart, sessions with HR/hour, and
        item diffs between any two snapshots. History is private to your PD2 login and can be deleted at any time.
      </p>
      <Button size="sm"
        onClick={onEnable}>
        Enable tracking
      </Button>
    </div>
  );
}

function SignedOut({ hasToken }: { hasToken: boolean }) {
  return (
    <div className="space-y-3 rounded-md border p-8 text-center">
      <LogIn className="mx-auto h-8 w-8 text-muted-foreground" />
      {hasToken ? (
        <p className="text-sm">Choose your PD2 account in Settings to value your stash.</p>
      ) : (
        <>
          <p className="text-sm">Sign in with your PD2 account to value your stash.</p>
          <Button size="sm"
            onClick={() => emitAppEvent(SIGN_IN_DIALOG_EVENT)}>
            Sign in
          </Button>
        </>
      )}
    </div>
  );
}

function TabSkeleton({ failed }: { failed: boolean }) {
  if (failed) return <p className="py-8 text-center text-sm text-muted-foreground">No valuation yet.</p>;
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i}
          className="h-8 w-full" />
      ))}
    </div>
  );
}

function RuneExchange() {
  const { loading, calculatedRuneValues, selectedRuneBreakdown, selectedRuneCombinations, setSelectedRuneBreakdown } =
    useEconomyData();
  return (
    <RunePricePopover
      loading={loading}
      calculatedRuneValues={calculatedRuneValues}
      selectedRuneBreakdown={selectedRuneBreakdown}
      selectedRuneCombinations={selectedRuneCombinations}
      onRuneBreakdownSelect={setSelectedRuneBreakdown}
    />
  );
}
