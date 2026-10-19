import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { AlertTriangle, Clock, Coins, Gem, History, LogIn, PackageOpen, RefreshCw, Tag, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WindowChrome } from '@/components/custom/window-chrome';
import { usePanel, useOverlay } from '@/overlay';
import { useOptions } from '@/hooks/useOptions';
import { useNetWorth } from '@/hooks/useNetWorth';
import { useWealthRank } from '@/hooks/useWealthRank';
import {
  getPoints,
  type NetWorthCategory,
  type NetWorthOwner,
  type NetWorthPoint,
  type Valuation,
} from '@/lib/networth-api';
import { DEFAULT_VERDICT_RULE } from '@/lib/rare-appraisal-api';
import { cn } from '@/lib/utils';
import { useEconomyData } from '../price-check/hooks/useEconomyData';
import { RunePricePopover } from '../price-check/components/RunePricePopover';
import { HoldingsTable } from './components/HoldingsTable';
import { OverviewTab } from './components/OverviewTab';
import { HistoryTab } from './components/HistoryTab';
import { AnimatedNumber } from './components/AnimatedNumber';
import { RaresTab } from './components/RaresTab';
import { Banner, EmptyState } from './components/StatePanel';
import { deltaPillClass, formatSignedHr } from './lib/networth-format';
import { useNetWorthQuery } from './lib/useNetWorthQuery';

type WindowTab =
  | 'overview'
  | 'runes'
  | 'currency'
  | 'ubers'
  | 'gems-mats'
  | 'uniques-sets'
  | 'other'
  | 'rares'
  | 'history';

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

const TRIGGER_CLASS = 'shrink-0 px-2 text-xs';

export function StashValueWindow() {
  const netWorth = useNetWorth();
  const { owner, latest, status, error, trackingEnabled, takeSnapshot, lastSnapshotAt } = netWorth;
  const { settings } = useOptions();
  const token = settings.pd2Token ?? null;
  const wealthRank = useWealthRank();
  const { payload, payloadVersion, close } = usePanel<'currency'>();
  const { gameFocused } = useOverlay();
  const [tab, setTab] = useState<WindowTab>(() => payload?.tab ?? 'overview');

  // Deep link from ticker / panel / hotkey: every openPanel('currency', { tab }) switches the tab
  const [seenVersion, setSeenVersion] = useState(payloadVersion);
  if (payloadVersion !== seenVersion) {
    setSeenVersion(payloadVersion);
    if (payload?.tab) setTab(payload.tab);
  }

  // Re-value when the panel is opened or shown again with a stale (or no) valuation
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
  // On open, re-open (payloadVersion) and when the panel shows again after the game regains focus
  useEffect(() => {
    if (ownerKey && gameFocused) refreshIfStale();
  }, [ownerKey, payloadVersion, gameFocused, refreshIfStale]);

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
  // Rares come only with the sync response (server has rare appraisal on); never part of the total.
  const rares = latest?.rares && latest.raresSummary ? latest.rares : null;

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={300}>
        <div className="h-full w-full overflow-y-auto bg-background text-foreground">
          <WindowTitle
            owner={owner}
            seasonLabel={
              netWorth.seasons.find((s) => s.id === (valuation?.seasonId ?? netWorth.currentSeasonId))?.label
            }
            onClose={close}
          />

          <div className="space-y-4 px-6 pb-6 pt-4">
            {status === 'signed-out' ? (
              <SignedOut hasToken={!!token} />
            ) : (
              <>
                {(valuation || status !== 'error') && (
                  <Header
                    valuation={valuation}
                    sincePrevious={latest?.delta.sincePrevious ?? null}
                    seasonPoints={seasonPoints.data}
                    wealthRank={wealthRank}
                    loading={status === 'loading'}
                    onRefresh={() => takeSnapshot('manual')}
                  />
                )}

                <AnimatePresence initial={false}>
                  {status === 'error' && error && (
                    <Banner
                      key="error"
                      tone="destructive"
                      role="alert"
                      icon={<AlertTriangle />}
                      actions={
                        <Button size="sm"
                          variant="outline"
                          onClick={() => takeSnapshot('manual')}>
                          <RefreshCw className="size-3.5" />
                          Retry
                        </Button>
                      }
                    >
                      <span className="text-destructive">{error}</span>
                    </Banner>
                  )}
                </AnimatePresence>

                <Tabs value={tab}
                  onValueChange={(v) => setTab(v as WindowTab)}
                  className="gap-3">
                  <TabsList
                    className="h-10 w-full justify-start overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    onWheel={(e) => {
                      if (e.deltaX === 0 && e.deltaY !== 0) {
                        e.currentTarget.scrollLeft += e.deltaY;
                      }
                    }}
                  >
                    <TabsTrigger value="overview"
                      className={TRIGGER_CLASS}>
                      Overview
                    </TabsTrigger>
                    {HOLDING_TABS.map((t) => (
                      <TabsTrigger key={t.value}
                        value={t.value}
                        className={TRIGGER_CLASS}>
                        {t.label}
                      </TabsTrigger>
                    ))}
                    {rares && (
                      <TabsTrigger value="rares"
                        className={TRIGGER_CLASS}>
                        Rares
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="history"
                      className={cn(TRIGGER_CLASS, 'gap-1')}>
                      <History className="size-3.5" />
                      History
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview"
                    className="pt-1">
                    {valuation ? <OverviewTab valuation={valuation} /> : <TabSkeleton failed={status === 'error'} />}
                  </TabsContent>

                  {HOLDING_TABS.map((t) => (
                    <TabsContent key={t.value}
                      value={t.value}
                      className="pt-1">
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

                  {rares && latest?.raresSummary && (
                    <TabsContent value="rares"
                      className="pt-1">
                      <RaresTab
                        rares={rares}
                        rule={latest.rareRule ?? DEFAULT_VERDICT_RULE}
                        summary={latest.raresSummary}
                        hardcore={!!owner?.isHardcore}
                      />
                    </TabsContent>
                  )}

                  <TabsContent value="history"
                    className="pt-1">
                    {!trackingEnabled ? (
                      <TrackingDisabled />
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
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}

function WindowTitle({
  owner,
  seasonLabel,
  onClose,
}: {
  owner: NetWorthOwner | null;
  seasonLabel?: string;
  onClose: () => void;
}) {
  return (
    <WindowChrome
      className="sticky top-0 z-30 h-12 border-border/70 bg-background/85 px-4 backdrop-blur-md"
      titleClassName="flex items-center gap-2.5 overflow-hidden text-base"
      icon={<Gem className="text-q-unique" />}
      onClose={onClose}
      title={
        <>
          <span className="shrink-0">Net Worth</span>
          {owner && (
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-normal">
              <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
                <UserRound className="size-3 shrink-0" />
                <span className="truncate font-medium text-foreground/90">{owner.account}</span>
              </span>
              <span className="shrink-0 rounded-full border border-border bg-muted/50 px-2 py-px text-muted-foreground">
                {owner.isLadder ? 'Ladder' : 'Non-ladder'} {owner.isHardcore ? 'HC' : 'SC'}
              </span>
              {seasonLabel && (
                <span className="truncate rounded-full border border-border bg-muted/50 px-2 py-px text-muted-foreground">
                  {seasonLabel}
                </span>
              )}
            </span>
          )}
        </>
      }
    />
  );
}

function Header({
  valuation,
  sincePrevious,
  seasonPoints,
  wealthRank,
  loading,
  onRefresh,
}: {
  valuation: Valuation | null;
  sincePrevious: number | null;
  seasonPoints: NetWorthPoint[] | null;
  /** "#41 Wealth · Top 7%" (leaderboards live and ranked), else null. */
  wealthRank: string | null;
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
      <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4"
        aria-busy="true">
        <Skeleton className="h-3 w-20" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-72" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card/50 p-4 shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-glow/10 blur-3xl"
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Net worth
            {wealthRank && (
              <span className="rounded-full border border-glow/40 bg-glow/10 px-2 py-px font-semibold normal-case tracking-normal text-foreground tabular-nums">
                {wealthRank}
              </span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-4xl font-semibold leading-none tracking-tight">
              <AnimatedNumber value={valuation.totalHr}
                format={(v) => v.toFixed(2)} />{' '}
              <span className="text-2xl font-medium text-muted-foreground">HR</span>
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              {deltas.map((d) => (
                <span
                  key={d.label}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
                    deltaPillClass(d.value),
                  )}
                >
                  {d.value === null ? '—' : formatSignedHr(d.value)}{' '}
                  <span className="font-normal opacity-75">({d.label})</span>
                </span>
              ))}
            </span>
          </div>
        </div>
        <Tooltip>
          {/* Span trigger: Button has no forwardRef (React 18); also keeps the tooltip working while disabled */}
          <TooltipTrigger asChild>
            <span className="inline-flex shrink-0">
              <Button size="sm"
                variant="outline"
                disabled={loading}
                onClick={onRefresh}>
                <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} /> {loading ? 'Refreshing' : 'Refresh'}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Re-value your stash now</TooltipContent>
        </Tooltip>
      </div>
      <div className="relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          as of {moment(valuation.takenAt).format('HH:mm')}
        </span>
        <span className="inline-flex items-center gap-1">
          <Tag className="size-3" />
          prices {valuation.priceDay}
        </span>
        <span className="inline-flex items-center gap-1">
          <Coins className="size-3 text-q-gold" />
          {valuation.gold.toLocaleString()} gold
        </span>
        {valuation.priceSource === 'ladder-fallback' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2 py-0.5 text-warning">
            <AlertTriangle className="size-3" />
            valued with ladder prices (no non-ladder market data)
          </span>
        )}
      </div>
    </div>
  );
}

function TrackingDisabled() {
  return (
    <EmptyState
      icon={<History />}
      title="History is off."
      description='Turn on "Save net worth history" in Settings → Net Worth to see a chart, sessions with HR/hour, and what changed between snapshots.'
    />
  );
}

function SignedOut({ hasToken }: { hasToken: boolean }) {
  const { openPanel } = useOverlay();
  return hasToken ? (
    <EmptyState
      className="mt-6"
      icon={<UserRound />}
      title="Choose your PD2 account in Settings to value your stash."
    />
  ) : (
    <EmptyState
      className="mt-6"
      icon={<LogIn />}
      title="Sign in with your PD2 account to value your stash."
      action={
        <Button size="sm"
          onClick={() => openPanel('signIn')}>
          <LogIn className="size-3.5" />
          Sign in
        </Button>
      }
    />
  );
}

function TabSkeleton({ failed }: { failed: boolean }) {
  if (failed) {
    return (
      <EmptyState
        compact
        className="py-10"
        icon={<PackageOpen />}
        title="No valuation yet."
        description="Your stash couldn't be valued. Use Retry above once PD2 is reachable."
      />
    );
  }
  return (
    <div className="space-y-2"
      aria-busy="true">
      <Skeleton className="h-2.5 w-full rounded-full" />
      <Skeleton className="mb-4 h-3 w-2/3" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i}
          className="h-9 w-full"
          style={{ opacity: 1 - i * 0.12 }} />
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
