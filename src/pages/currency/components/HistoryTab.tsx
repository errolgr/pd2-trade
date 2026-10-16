import React, { useCallback, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import moment from 'moment';
import { GitCompareArrows, Loader2, Play, Square, Star, Trash2 } from 'lucide-react';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  deleteHistory,
  getDiff,
  getPoints,
  getSessions,
  NET_WORTH_CATEGORIES,
  type NetWorthOwner,
  type NetWorthPoint,
  type Season,
  type SessionSummary,
} from '@/lib/networth-api';
import { useNetWorth } from '@/hooks/useNetWorth';
import { CATEGORY_COLORS, CATEGORY_LABELS, deltaClass, formatDuration, formatSignedHr } from '../lib/networth-format';
import { useNetWorthQuery } from '../lib/useNetWorthQuery';

type Range = '24h' | '7d' | 'season' | 'all';

interface HistoryTabProps {
  token: string;
  owner: NetWorthOwner;
  seasons: Season[];
  currentSeasonId: string | null;
  seasonPoints: NetWorthPoint[] | null;
  /** Changes whenever a new snapshot lands; triggers reloads. */
  refreshKey: string | null;
  onHistoryChanged: () => void;
}

const SNAPSHOT_PAGE = 30;
const SESSION_PAGE = 8;
const SESSION_CALENDAR = {
  sameDay: '[Today] HH:mm',
  lastDay: '[Yesterday] HH:mm',
  lastWeek: 'ddd HH:mm',
  sameElse: 'MMM D HH:mm',
};

export function HistoryTab(props: HistoryTabProps) {
  const { token, owner, seasons, currentSeasonId, seasonPoints, refreshKey, onHistoryChanged } = props;
  const [range, setRange] = useState<Range>('7d');
  const [stacked, setStacked] = useState(false);

  const loadRange = useCallback(async (): Promise<NetWorthPoint[]> => {
    const seasonId = currentSeasonId ?? undefined;
    if (range === '24h' || range === '7d') {
      const from = moment()
        .subtract(range === '24h' ? 24 : 24 * 7, 'hours')
        .toISOString();
      return (await getPoints(token, owner, { seasonId, from, resolution: 'raw' })).points;
    }
    if (range === 'all') {
      const perSeason = await Promise.all(
        seasons.map((season) => getPoints(token, owner, { seasonId: season.id, resolution: 'day' })),
      );
      return perSeason.flatMap((r) => r.points).sort((a, b) => a.takenAt.localeCompare(b.takenAt));
    }
    return [];
  }, [token, owner, currentSeasonId, seasons, range]);

  const rangeQuery = useNetWorthQuery(range === 'season' ? null : loadRange, refreshKey);
  const points = range === 'season' ? seasonPoints : rangeQuery.data;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={range}
            onValueChange={(v) => v && setRange(v as Range)}
          >
            <ToggleGroupItem value="24h"
              className="flex-none px-3">
              24h
            </ToggleGroupItem>
            <ToggleGroupItem value="7d"
              className="flex-none px-3">
              7d
            </ToggleGroupItem>
            <ToggleGroupItem value="season"
              className="flex-none px-3">
              Season
            </ToggleGroupItem>
            <ToggleGroupItem value="all"
              className="flex-none px-3">
              All
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="flex items-center gap-2">
            <Switch id="stacked"
              checked={stacked}
              onCheckedChange={setStacked} />
            <Label htmlFor="stacked"
              className="text-xs text-muted-foreground">
              Stack by category
            </Label>
          </div>
        </div>
        {rangeQuery.error && range !== 'season' ? (
          <p className="text-sm text-red-400">{rangeQuery.error}</p>
        ) : points === null ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <NetWorthChart points={points}
            stacked={stacked}
            seasons={seasons} />
        )}
      </section>

      <SessionsSection token={token}
        owner={owner}
        seasonId={currentSeasonId}
        refreshKey={refreshKey} />

      <SnapshotsSection token={token}
        owner={owner}
        points={points ?? []} />

      <DeleteHistory
        token={token}
        owner={owner}
        seasons={seasons}
        currentSeasonId={currentSeasonId}
        onDeleted={() => {
          onHistoryChanged();
          rangeQuery.reload();
        }}
      />
    </div>
  );
}

const chartConfig: ChartConfig = {
  totalHr: { label: 'Net worth', color: 'var(--chart-1)' },
  ...Object.fromEntries(NET_WORTH_CATEGORIES.map((c) => [c, { label: CATEGORY_LABELS[c], color: CATEGORY_COLORS[c] }])),
};

function NetWorthChart({ points, stacked, seasons }: { points: NetWorthPoint[]; stacked: boolean; seasons: Season[] }) {
  const data = useMemo(
    () => points.map((p) => ({ t: Date.parse(p.takenAt), totalHr: p.totalHr, ...p.byCategory })),
    [points],
  );
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-md border text-sm text-muted-foreground">
        No snapshots in this range yet.
      </div>
    );
  }
  const first = data[0].t;
  const last = data[data.length - 1].t;
  const spanHours = (last - first) / 3_600_000;
  const tickFormat = spanHours <= 36 ? 'HH:mm' : spanHours <= 24 * 10 ? 'ddd HH:mm' : 'MMM D';
  const boundaries = seasons
    .map((s) => ({ t: Date.parse(s.startDate), label: s.label }))
    .filter((b) => b.t > first && b.t <= last);

  return (
    <ChartContainer config={chartConfig}
      className="aspect-auto h-56 w-full">
      <AreaChart data={data}
        margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false}
          strokeOpacity={0.15} />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(t: number) => moment(t).format(tickFormat)}
          minTickGap={40}
        />
        <YAxis width={44}
          tickFormatter={(v: number) => v.toFixed(0)} />
        <ChartTooltip
          content={({ active, payload }) => {
            const row = active && payload?.[0]?.payload;
            if (!row) return null;
            return (
              <div className="rounded-md border bg-background px-2 py-1 text-xs shadow">
                <p className="text-muted-foreground">{moment(row.t).format('MMM D HH:mm')}</p>
                <p className="font-medium">{row.totalHr.toFixed(2)} HR</p>
              </div>
            );
          }}
        />
        {stacked ? (
          NET_WORTH_CATEGORIES.map((c) => (
            <Area
              key={c}
              dataKey={c}
              type="monotone"
              stackId="cat"
              stroke={CATEGORY_COLORS[c]}
              fill={CATEGORY_COLORS[c]}
              fillOpacity={0.35}
              isAnimationActive={false}
            />
          ))
        ) : (
          <Area
            dataKey="totalHr"
            type="monotone"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.25}
            isAnimationActive={false}
          />
        )}
        {boundaries.map((b) => (
          <ReferenceLine
            key={b.t}
            x={b.t}
            strokeDasharray="4 4"
            label={{ value: b.label, position: 'insideTopLeft', fontSize: 10 }}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

function SessionsSection({
  token,
  owner,
  seasonId,
  refreshKey,
}: {
  token: string;
  owner: NetWorthOwner;
  seasonId: string | null;
  refreshKey: string | null;
}) {
  const { currentSession, startSession, stopSession } = useNetWorth();
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(SESSION_PAGE);
  const load = useCallback(async () => {
    return (await getSessions(token, owner, seasonId ?? undefined)).sessions;
  }, [token, owner, seasonId]);
  const { data: sessions, error, reload } = useNetWorthQuery(load, refreshKey);
  const bestId = useMemo(() => {
    const ranked = (sessions ?? []).filter((s) => s.durationMinutes >= 10 && s.farmedHr > 0);
    return ranked.sort((a, b) => b.hrPerHour - a.hrPerHour)[0]?.id ?? null;
  }, [sessions]);

  const mark = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
      reload();
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Sessions</h3>
        <div className="flex gap-2">
          <Button size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => mark(startSession)}>
            <Play className="h-3.5 w-3.5" /> Start new session
          </Button>
          <Button size="sm"
            variant="outline"
            disabled={busy || !currentSession}
            onClick={() => mark(stopSession)}>
            <Square className="h-3.5 w-3.5" /> Stop session
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!sessions && !error && <Skeleton className="h-16 w-full" />}
      {sessions && sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No sessions yet. Sessions build automatically from snapshots taken less than 30 minutes apart.
        </p>
      )}
      {sessions && sessions.length > 0 && (
        <div className="rounded-md border divide-y text-sm">
          <div className="grid grid-cols-[1fr_4rem_5rem_5rem_4rem] gap-2 px-3 py-1.5 text-xs text-muted-foreground">
            <span>When</span>
            <span className="text-right">Duration</span>
            <span className="text-right">Farmed</span>
            <span className="text-right">Drift</span>
            <span className="text-right">HR/h</span>
          </div>
          {sessions.slice(0, limit).map((s) => (
            <SessionRow key={s.id}
              session={s}
              best={s.id === bestId} />
          ))}
          {sessions.length > limit && (
            <button
              className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setLimit((l) => l + SESSION_PAGE)}
            >
              Show more ({sessions.length - limit} older)
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function SessionRow({ session: s, best }: { session: SessionSummary; best: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="grid grid-cols-[1fr_4rem_5rem_5rem_4rem] items-center gap-2 px-3 py-1.5">
          <span className="flex items-center gap-1.5 truncate">
            {s.isOpen && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
            {moment(s.start).calendar(null, SESSION_CALENDAR)}–{moment(s.end).format('HH:mm')}
            {s.manual && <span className="text-[10px] text-muted-foreground">manual</span>}
            {best && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          </span>
          <span className="text-right tabular-nums text-muted-foreground">{formatDuration(s.durationMinutes)}</span>
          <span className={cn('text-right tabular-nums', deltaClass(s.farmedHr))}>{formatSignedHr(s.farmedHr)}</span>
          <span className={cn('text-right tabular-nums', deltaClass(s.marketDriftHr))}>
            {formatSignedHr(s.marketDriftHr)}
          </span>
          <span className="text-right tabular-nums">{s.hrPerHour.toFixed(2)}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom"
        className="max-w-xs">
        <p className="mb-1">
          {s.startHr.toFixed(2)} → {s.endHr.toFixed(2)} HR · {s.snapshotCount} snapshots
        </p>
        {s.topGains.length > 0 ? (
          s.topGains.map((g) => (
            <p key={g.key}>
              {g.qtyDelta > 0 ? '+' : ''}
              {g.qtyDelta}× {g.name} ({formatSignedHr(g.valueDelta)})
            </p>
          ))
        ) : (
          <p>No item gains.</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function SnapshotsSection({ token, owner, points }: { token: string; owner: NetWorthOwner; points: NetWorthPoint[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [limit, setLimit] = useState(SNAPSHOT_PAGE);
  const [priceBasis, setPriceBasis] = useState<'then' | 'now'>('then');
  const rows = useMemo(() => [...points].reverse(), [points]);

  const pair = useMemo(() => {
    if (selected.length !== 2) return null;
    const [a, b] = selected.map((id) => points.find((p) => p.snapshotId === id)).filter(Boolean) as NetWorthPoint[];
    if (!a || !b) return null;
    return a.takenAt <= b.takenAt ? { from: a, to: b } : { from: b, to: a };
  }, [selected, points]);

  const loadDiff = useCallback(
    async () => (pair ? getDiff(token, owner, pair.from.snapshotId, pair.to.snapshotId, priceBasis) : null),
    [token, owner, pair, priceBasis],
  );
  const diff = useNetWorthQuery(pair ? loadDiff : null);

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current.slice(-1), id]));

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Snapshots</h3>
        <span className="text-xs text-muted-foreground">Pick two to compare</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No snapshots in this range.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-md border divide-y text-sm">
          {rows.slice(0, limit).map((p, i) => {
            const prev = rows[i + 1];
            const change = prev ? p.totalHr - prev.totalHr : null;
            return (
              <div
                key={p.snapshotId}
                className="grid grid-cols-[1.5rem_1fr_5rem_5rem_4.5rem_2rem] items-center gap-2 px-3 py-1"
              >
                <Checkbox
                  checked={selected.includes(p.snapshotId)}
                  disabled={!p.hasHoldings}
                  onCheckedChange={() => toggle(p.snapshotId)}
                />
                <span className="truncate">{moment(p.takenAt).format('MMM D HH:mm')}</span>
                <span className="text-right tabular-nums">{p.totalHr.toFixed(2)}</span>
                <span className={cn('text-right tabular-nums', deltaClass(change))}>
                  {change === null ? '' : formatSignedHr(change)}
                </span>
                <span className="text-right text-xs text-muted-foreground">{p.trigger}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  title="Compare with previous"
                  disabled={!prev || !p.hasHoldings || !prev.hasHoldings}
                  onClick={() => prev && setSelected([prev.snapshotId, p.snapshotId])}
                >
                  <GitCompareArrows className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
          {rows.length > limit && (
            <button
              className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setLimit((l) => l + SNAPSHOT_PAGE)}
            >
              Show more ({rows.length - limit} older)
            </button>
          )}
        </div>
      )}

      {pair && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm">
              {moment(pair.from.takenAt).format('MMM D HH:mm')} → {moment(pair.to.takenAt).format('MMM D HH:mm')}
            </p>
            <ToggleGroup
              type="single"
              size="sm"
              variant="outline"
              value={priceBasis}
              onValueChange={(v) => v && setPriceBasis(v as 'then' | 'now')}
            >
              <ToggleGroupItem value="then"
                className="flex-none px-3">
                Prices then
              </ToggleGroupItem>
              <ToggleGroupItem value="now"
                className="flex-none px-3">
                Prices now
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          {diff.loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {diff.error && <p className="text-sm text-red-400">{diff.error}</p>}
          {diff.data && !diff.loading && (
            <>
              <p className="text-xs text-muted-foreground">
                Farmed <span className={deltaClass(diff.data.farmedHr)}>{formatSignedHr(diff.data.farmedHr)}</span> ·
                Market drift{' '}
                <span className={deltaClass(diff.data.marketDriftHr)}>{formatSignedHr(diff.data.marketDriftHr)}</span> ·{' '}
                {diff.data.from.totalHr.toFixed(2)} → {diff.data.to.totalHr.toFixed(2)} HR
              </p>
              {diff.data.lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No holdings changed.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y text-sm">
                  {diff.data.lines.map((line) => (
                    <div key={line.key}
                      className="grid grid-cols-[1fr_6rem_4rem_5rem] gap-2 py-1">
                      <span className="truncate">{line.name}</span>
                      <span className="text-right tabular-nums text-muted-foreground">
                        {line.qtyFrom} → {line.qtyTo}
                      </span>
                      <span className={cn('text-right tabular-nums', deltaClass(line.qtyDelta))}>
                        {line.qtyDelta > 0 ? '+' : ''}
                        {line.qtyDelta}
                      </span>
                      <span className={cn('text-right tabular-nums', deltaClass(line.valueDelta))}>
                        {formatSignedHr(line.valueDelta)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function DeleteHistory({
  token,
  owner,
  seasons,
  currentSeasonId,
  onDeleted,
}: {
  token: string;
  owner: NetWorthOwner;
  seasons: Season[];
  currentSeasonId: string | null;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const seasonLabel = seasons.find((s) => s.id === currentSeasonId)?.label ?? 'this season';

  const run = async (seasonId?: string) => {
    setBusy(true);
    try {
      const { deletedPoints } = await deleteHistory(token, owner, seasonId);
      setResult(`Deleted ${deletedPoints} snapshots.`);
      onDeleted();
    } catch (err) {
      setResult(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex items-center justify-between border-t pt-4">
      <p className="text-xs text-muted-foreground">
        History is private to your PD2 login and stored on pd2trader.com. {result}
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm"
            variant="ghost"
            className="text-red-400"
            disabled={busy}>
            <Trash2 className="h-3.5 w-3.5" /> Delete history
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete net worth history?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes stored snapshots for {owner.account} ({owner.isLadder ? 'ladder' : 'non-ladder'},{' '}
              {owner.isHardcore ? 'hardcore' : 'softcore'}). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {currentSeasonId && (
              <AlertDialogAction onClick={() => run(currentSeasonId)}>Delete {seasonLabel}</AlertDialogAction>
            )}
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => run()}>
              Delete all seasons
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
