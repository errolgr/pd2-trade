import React, { useMemo, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, History, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotionSafe } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import {
  type BuildsMode,
  getCharacterSnapshot,
  getCharacterSnapshots,
  type SnapshotDetail,
  type SnapshotListEntry,
} from '@/lib/builds-api';
import { peekBuildsCache, primeBuildsCache, snapshotQueryKey, useBuildsQuery } from '../lib/useBuildsQuery';
import { type BuildDiff, diffBuilds, type DiffItem, isEmptyDiff } from '../lib/build-diff';
import { fmtDateTime, fmtHr, qualityText } from '../lib/format';
import { QueryError, Section } from './parts';

/** Snapshots whose changes the feed shows at first; "Show older" adds as many. */
const FEED_PAGE = 12;

const chartConfig: ChartConfig = {
  level: { label: 'Level', color: 'var(--chart-2)' },
  gear: { label: 'Gear value', color: 'var(--chart-1)' },
};

/** Level and gear value over time, and what changed between snapshots; picking one shows that build. */
export function Timeline({
  name,
  mode,
  selectedId,
  onSelect,
}: {
  name: string;
  mode: BuildsMode;
  selectedId: string | null;
  /** null: back to now. */
  onSelect: (id: string | null) => void;
}) {
  const list = useBuildsQuery(`snapshots|${name.toLowerCase()}|${mode}`, (signal) =>
    getCharacterSnapshots(name, { mode }, signal),
  );
  const [shown, setShown] = useState(FEED_PAGE);
  const snapshots = list.data && !list.stale ? list.data : null;
  // Newest first; one more than shown so the oldest shown has something to diff against
  const ids = useMemo(() => (snapshots ?? []).slice(0, shown + 1).map((s) => s.id), [snapshots, shown]);
  const docs = useBuildsQuery(
    ids.length ? `snapshot-docs|${name.toLowerCase()}|${mode}|${ids.join(',')}` : null,
    (signal) =>
      Promise.all(
        ids.map((id) => {
          const key = snapshotQueryKey(name, mode, id);
          const hit = peekBuildsCache<SnapshotDetail>(key);
          if (hit) return hit;
          return getCharacterSnapshot(name, id, { mode }, signal).then((doc) => {
            primeBuildsCache(key, doc);
            return doc;
          });
        }),
      ),
  );

  if (list.error) return <QueryError query={list}
    className="m-3"
    title="Couldn't load the history" />;
  if (!snapshots) {
    return (
      <div aria-busy
        className="space-y-2 p-3">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const feed = docs.data?.length ? buildFeed(docs.data, snapshots.length) : null;

  return (
    <div className="divide-y divide-border/50">
      {/* One snapshot is a lone dot: the chart starts at the first change */}
      {snapshots.length > 1 && (
        <Section
          title={`${snapshots.length} snapshots`}
          icon={<History />}
          action={
            <span className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-3 rounded-full bg-chart-2" /> Level
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-3 rounded-full bg-chart-1" /> Gear value (HR)
              </span>
            </span>
          }
          bodyClassName="px-1 py-2"
        >
          <SnapshotChart snapshots={snapshots}
            selectedId={selectedId}
            onSelect={onSelect} />
        </Section>
      )}
      <Section title="Changes"
        bodyClassName="px-0 py-0">
        {snapshots.length < 2 ? (
          <p className="p-3 text-center text-xs text-muted-foreground">
            No changes recorded yet. A snapshot is saved when the build changes (at most hourly).
          </p>
        ) : docs.error ? (
          <QueryError query={docs}
            className="m-2"
            compact
            title="Couldn't load the changes" />
        ) : !feed || docs.stale ? (
          <div aria-busy
            className="space-y-1.5 p-1">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i}
                className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <ol className="divide-y divide-border/40">
              {feed.map((entry) => (
                <FeedEntry
                  key={entry.id}
                  entry={entry}
                  selected={entry.id === selectedId}
                  latest={entry.id === snapshots[0].id}
                  hardcore={mode === 'hardcore'}
                  onSelect={onSelect}
                />
              ))}
            </ol>
            {snapshots.length > shown + 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-7 w-full text-xs text-muted-foreground"
                onClick={() => setShown(shown + FEED_PAGE)}
              >
                Show older
              </Button>
            )}
          </>
        )}
      </Section>
    </div>
  );
}

interface FeedItem {
  id: string;
  takenAt: string;
  /** Diff from the previous snapshot; null for the first one ever. */
  diff: BuildDiff | null;
  level: number;
}

/** Newest first; unchanged steps dropped. `docs` newest first; `total` = every snapshot of the character. */
function buildFeed(docs: SnapshotDetail[], total: number): FeedItem[] {
  const feed: FeedItem[] = [];
  for (let i = 0; i < docs.length; i++) {
    const older = docs[i + 1];
    if (!older) {
      // The oldest loaded: the very first snapshot ("first seen") or the extra one only used for diffing
      if (docs.length === total)
        feed.push({ id: docs[i].id, takenAt: docs[i].takenAt, diff: null, level: docs[i].doc.level });
      break;
    }
    const diff = diffBuilds(older.doc, docs[i].doc);
    if (!isEmptyDiff(diff)) feed.push({ id: docs[i].id, takenAt: docs[i].takenAt, diff, level: docs[i].doc.level });
  }
  return feed;
}

function ItemName({ item }: { item: DiffItem }) {
  return <span className={qualityText(item.quality, item.runeword)}>{item.name}</span>;
}

function FeedEntry({
  entry,
  selected,
  latest,
  hardcore,
  onSelect,
}: {
  entry: FeedItem;
  selected: boolean;
  latest: boolean;
  /** Deaths only matter in hardcore (softcore characters revive). */
  hardcore: boolean;
  onSelect: (id: string | null) => void;
}) {
  const d = entry.diff;
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        title={latest ? 'The current build' : 'Show the build at this time'}
        onClick={() => onSelect(latest || selected ? null : entry.id)}
        className={cn(
          'relative w-full px-3 py-2 text-left text-xs outline-none transition-colors duration-(--dur-fast) hover:bg-accent/40 focus-visible:bg-accent/50',
          selected && 'bg-primary/10 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{fmtDateTime(entry.takenAt)}</span>
          {latest && <span className="text-[10px] text-muted-foreground uppercase">now</span>}
          {d?.gearValueDelta != null && (
            <span className={cn('ml-auto tabular-nums', d.gearValueDelta > 0 ? 'text-success' : 'text-destructive')}>
              {d.gearValueDelta > 0 ? '+' : '−'}
              {fmtHr(Math.abs(d.gearValueDelta))} HR
            </span>
          )}
        </div>
        {!d ? (
          <p className="text-muted-foreground">First seen at level {entry.level}</p>
        ) : (
          <ul className="mt-0.5 space-y-px text-muted-foreground">
            {d.level && (
              <li>
                Level {d.level.from} <ArrowRight className="inline size-3" />{' '}
                <span className="text-foreground">{d.level.to}</span>
              </li>
            )}
            {d.died && hardcore && (
              <li className="flex items-center gap-1 text-destructive">
                <Skull className="size-3" /> Died
              </li>
            )}
            {d.items.map((c) => (
              <li key={`${c.merc ? 'm' : 'c'}:${c.slot}`}>
                <span className="text-muted-foreground/80">
                  {c.merc ? 'Merc ' : ''}
                  {c.slot}:
                </span>{' '}
                {c.removed && (
                  <span className="line-through decoration-muted-foreground/60 opacity-70">
                    <ItemName item={c.removed} />
                  </span>
                )}
                {c.removed && c.added && <ArrowRight className="mx-1 inline size-3" />}
                {c.added ? <ItemName item={c.added} /> : <span className="italic"> removed</span>}
              </li>
            ))}
            {d.merc && (
              <li>
                Merc: {d.merc.from ?? 'none'} <ArrowRight className="inline size-3" />{' '}
                <span className="text-foreground">{d.merc.to ?? 'none'}</span>
              </li>
            )}
            {d.skills.slice(0, 6).map((s) => (
              <li key={s.name}>
                {s.name}{' '}
                <span className="tabular-nums">
                  {s.from} <ArrowRight className="inline size-3" />{' '}
                  <span className={s.to > s.from ? 'text-success' : 'text-destructive'}>{s.to}</span>
                </span>
              </li>
            ))}
            {d.skills.length > 6 && <li>+{d.skills.length - 6} more skill changes</li>}
          </ul>
        )}
      </button>
    </li>
  );
}

type ChartRow = { id: string; t: number; level: number; gear: number | null };

function SnapshotChart({
  snapshots,
  selectedId,
  onSelect,
}: {
  snapshots: SnapshotListEntry[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const reduce = useReducedMotionSafe();
  const data = useMemo<ChartRow[]>(
    () =>
      [...snapshots]
        .reverse()
        .map((s) => ({ id: s.id, t: Date.parse(s.takenAt), level: s.level, gear: s.gearValueHr })),
    [snapshots],
  );
  if (data.length === 0) return <p className="p-3 text-center text-xs text-muted-foreground">No snapshots yet.</p>;
  const selected = data.find((d) => d.id === selectedId);
  const latestId = data[data.length - 1].id;
  const animation = { isAnimationActive: !reduce, animationDuration: 500 };
  return (
    <ChartContainer config={chartConfig}
      className="aspect-auto h-44 w-full">
      <ComposedChart
        data={data}
        margin={{ left: 0, right: 4, top: 8 }}
        onClick={(state) => {
          const index = Number(state?.activeTooltipIndex ?? state?.activeIndex);
          const row = Number.isInteger(index) ? data[index] : undefined;
          if (row) onSelect(row.id === latestId ? null : row.id);
        }}
        className="cursor-pointer"
      >
        <CartesianGrid vertical={false}
          strokeDasharray="3 4"
          stroke="var(--border)"
          strokeOpacity={0.7} />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          minTickGap={40}
          tickLine={false}
          axisLine={false}
          fontSize={10}
        />
        <YAxis
          yAxisId="level"
          width={28}
          domain={['dataMin - 1', 99]}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          fontSize={10}
        />
        <YAxis
          yAxisId="gear"
          orientation="right"
          width={34}
          tickFormatter={(v: number) => fmtHr(v)}
          tickLine={false}
          axisLine={false}
          fontSize={10}
        />
        <ChartTooltip
          cursor={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.5, strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            const row = active ? (payload?.[0]?.payload as ChartRow | undefined) : undefined;
            if (!row) return null;
            return (
              <div className="rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-xs text-popover-foreground shadow-panel">
                <p className="text-muted-foreground">{fmtDateTime(new Date(row.t).toISOString())}</p>
                <p>
                  Level <span className="font-semibold tabular-nums">{row.level}</span>
                </p>
                <p>
                  Gear <span className="font-semibold text-q-gold tabular-nums">{fmtHr(row.gear)} HR</span>
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Click to view this build</p>
              </div>
            );
          }}
        />
        {selected && <ReferenceLine x={selected.t}
          yAxisId="level"
          stroke="var(--primary)"
          strokeDasharray="4 3" />}
        <Line
          yAxisId="level"
          dataKey="level"
          type="stepAfter"
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={false}
          {...animation}
        />
        <Line
          yAxisId="gear"
          dataKey="gear"
          type="monotone"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 2.5, fill: 'var(--chart-1)' }}
          connectNulls
          {...animation}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
