import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Flame,
  RotateCcw,
  ShoppingBag,
  Skull,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BUILD_CLASSES,
  type BuildsFilters,
  type CharacterListEntry,
  type CharacterListResponse,
  type CharacterSort,
  filterParams,
  getBuildCharacters,
  getBuildShoppingList,
  getBuildUsage,
  type ItemUsage,
  type ShoppingListResponse,
  type UsageCount,
  type UsageResponse,
} from '@/lib/builds-api';
import { useBuildsActions } from '../lib/context';
import { type BuildsQuery, useBuildsQuery } from '../lib/useBuildsQuery';
import { CORE_SHARE, coreKitTotal } from '../lib/gear-up';
import { classMeta, fmtHr, fmtPct, keyLabel, qualityText, skillFilter, skillLabel, timeAgo } from '../lib/format';
import {
  ClassEmblem,
  ItemActionsMenu,
  ItemIcon,
  PriceChip,
  QueryError,
  SearchMarketButton,
  Section,
  Segmented,
  ShareBar,
  SkillIcon,
} from './parts';

export const BUDGET_STEPS = [0.5, 1, 2, 3, 5, 8, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500];
const LEVEL_PRESETS = [
  { value: 'any', label: '80+', min: null },
  { value: '90', label: '90+', min: 90 },
  { value: '95', label: '95+', min: 95 },
  { value: '99', label: '99', min: 99 },
] as const;
const SORTS: { value: CharacterSort; label: string }[] = [
  { value: 'level', label: 'Level' },
  { value: 'life', label: 'Life' },
  { value: 'gearValueHr', label: 'Gear' },
  { value: 'lastUpdated', label: 'Updated' },
];
const PAGE_SIZE = 25;

type ListKey = 'classes' | 'skills' | 'items' | 'mercTypes' | 'mercItems';

/** `value` added to / removed from one of the filter lists. */
export function toggleListFilter(filters: BuildsFilters, list: ListKey, value: string): BuildsFilters {
  const has = filters[list].includes(value);
  return { ...filters, [list]: has ? filters[list].filter((v) => v !== value) : [...filters[list], value] };
}

export function MetaTab({
  filters,
  onChange,
  labels,
}: {
  /** Mode included. */
  filters: BuildsFilters;
  onChange: (filters: BuildsFilters) => void;
  /** Names of item keys added from elsewhere (character view), for the chips. */
  labels: ReadonlyMap<string, string>;
}) {
  const filterKey = JSON.stringify(filterParams(filters));
  const [list, setList] = useState({
    filterKey,
    page: 1,
    sort: 'level' as CharacterSort,
    dir: 'desc' as 'asc' | 'desc',
  });
  // New filters start at page 1 (adjusted during render)
  if (list.filterKey !== filterKey) setList({ ...list, filterKey, page: 1 });
  const page = list.filterKey === filterKey ? list.page : 1;

  const characters = useBuildsQuery(`characters|${filterKey}|${page}|${list.sort}|${list.dir}`, (signal) =>
    getBuildCharacters(filters, { page, pageSize: PAGE_SIZE, sort: list.sort, dir: list.dir, signal }),
  );
  const usage = useBuildsQuery(`usage|${filterKey}`, (signal) => getBuildUsage(filters, signal));
  const shopping = useBuildsQuery(`shopping|${filterKey}`, (signal) => getBuildShoppingList(filters, signal));

  const itemNames = useMemo(() => {
    const names = new Map(labels);
    for (const item of [...(usage.data?.items ?? []), ...(usage.data?.mercItems ?? [])]) names.set(item.key, item.name);
    return names;
  }, [labels, usage.data]);

  const toggle = (key: ListKey, value: string) => onChange(toggleListFilter(filters, key, value));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ClassBar
        breakdown={characters.data?.breakdown}
        selected={filters.classes}
        onToggle={(c) => toggle('classes', c)}
      />
      <FilterBar filters={filters}
        onChange={onChange}
        itemNames={itemNames} />
      <div className="flex min-h-0 flex-1 border-t border-border/50">
        <aside className="flex w-[260px] shrink-0 flex-col border-r border-border/50">
          <UsagePanel usage={usage}
            filters={filters}
            onToggle={toggle} />
        </aside>
        <main className="@container flex min-w-0 flex-1 flex-col">
          <CharacterList
            query={characters}
            page={page}
            sort={list.sort}
            dir={list.dir}
            onPage={(p) => setList({ ...list, filterKey, page: p })}
            onSort={(sort, dir) => setList({ ...list, filterKey, sort, dir, page: 1 })}
          />
        </main>
        <aside className="flex w-[260px] shrink-0 flex-col divide-y divide-border/50 overflow-y-auto border-l border-border/50">
          <CoreKit query={shopping}
            filters={filters}
            onToggleItem={(key) => toggle('items', key)} />
        </aside>
      </div>
    </div>
  );
}

// ───────────────────────────── class composition ─────────────────────────────

function ClassBar({
  breakdown,
  selected,
  onToggle,
}: {
  breakdown: Record<string, number> | undefined;
  selected: string[];
  onToggle: (className: string) => void;
}) {
  const total = breakdown ? Object.values(breakdown).reduce((a, b) => a + b, 0) : 0;
  const classes = BUILD_CLASSES.map((name) => ({ name, count: breakdown?.[name] ?? 0 }));
  return (
    <div
      className="flex shrink-0 divide-x divide-border/50 border-b border-border/50"
      role="group"
      aria-label="Classes"
    >
      {classes.map(({ name, count }) => {
        const meta = classMeta(name);
        const active = selected.includes(name);
        const dim = selected.length > 0 && !active;
        const pct = total ? (count / total) * 100 : 0;
        return (
          <button
            key={name}
            type="button"
            aria-pressed={active}
            title={`${name}: ${count.toLocaleString()} characters${active ? ' (click to remove)' : ''}`}
            onClick={() => onToggle(name)}
            className={cn(
              'group relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-3 py-2 text-left outline-none transition-[opacity,background-color] duration-(--dur-fast) hover:bg-accent/40 focus-visible:bg-accent/40',
              active && 'bg-accent/50',
              dim && 'opacity-45 hover:opacity-90',
            )}
          >
            <ClassEmblem className={name}
              size={26} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium"
                style={{ color: meta.color }}>
                {meta.name}
              </span>
              <span className="block text-[11px] text-muted-foreground tabular-nums">
                {breakdown ? (
                  <>
                    {count.toLocaleString()} <span className="opacity-70">· {fmtPct(pct)}</span>
                  </>
                ) : (
                  <Skeleton className="mt-0.5 h-2.5 w-12" />
                )}
              </span>
            </span>
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 origin-left transition-[transform,height] duration-(--dur-med)"
              style={{
                background: meta.color,
                height: active ? 2 : 1,
                transform: `scaleX(${active ? 1 : Math.min(1, pct / 30)})`,
                opacity: active ? 1 : 0.7,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────────── filters ─────────────────────────────

function FilterBar({
  filters,
  onChange,
  itemNames,
}: {
  filters: BuildsFilters;
  onChange: (filters: BuildsFilters) => void;
  itemNames: ReadonlyMap<string, string>;
}) {
  const chips: { key: string; label: React.ReactNode; remove: () => void }[] = [];
  const listChip = (list: ListKey, value: string, label: React.ReactNode) =>
    chips.push({ key: `${list}:${value}`, label, remove: () => onChange(toggleListFilter(filters, list, value)) });
  for (const c of filters.classes) listChip('classes', c, <span style={{ color: classMeta(c).color }}>{c}</span>);
  for (const s of filters.skills) listChip('skills', s, skillLabel(s));
  for (const i of filters.items) listChip('items', i, itemNames.get(i) ?? keyLabel(i));
  for (const m of filters.mercTypes) listChip('mercTypes', m, `Merc: ${m}`);
  for (const i of filters.mercItems) listChip('mercItems', i, `Merc: ${itemNames.get(i) ?? keyLabel(i)}`);
  if (filters.minLevel || filters.maxLevel) {
    const label =
      filters.minLevel && filters.maxLevel
        ? `Level ${filters.minLevel}–${filters.maxLevel}`
        : filters.minLevel
          ? `Level ${filters.minLevel}+`
          : `Level ≤ ${filters.maxLevel}`;
    chips.push({ key: 'level', label, remove: () => onChange({ ...filters, minLevel: null, maxLevel: null }) });
  }
  if (filters.maxCostHr != null) {
    chips.push({
      key: 'budget',
      label: `Gear ≤ ${fmtHr(filters.maxCostHr)} HR`,
      remove: () => onChange({ ...filters, maxCostHr: null }),
    });
  }

  const levelPreset = !filters.maxLevel && LEVEL_PRESETS.find((p) => p.min === (filters.minLevel ?? null))?.value;

  return (
    <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-1.5">
      <Segmented
        label="Level"
        layoutId="builds-level"
        value={levelPreset || ('' as string)}
        options={LEVEL_PRESETS.map((p) => ({ value: p.value, label: p.label, title: `Level ${p.label}` }))}
        onChange={(v) =>
          onChange({ ...filters, minLevel: LEVEL_PRESETS.find((p) => p.value === v)?.min ?? null, maxLevel: null })
        }
      />
      <BudgetControl value={filters.maxCostHr ?? null}
        onChange={(maxCostHr) => onChange({ ...filters, maxCostHr })} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
        aria-label="Active filters">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex h-6 items-center gap-1 rounded-full border border-border bg-muted/40 pr-0.5 pl-2.5 text-[11px]"
          >
            {chip.label}
            <button
              type="button"
              aria-label="Remove filter"
              onClick={chip.remove}
              className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {chips.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
            onClick={() =>
              onChange({
                ...filters,
                classes: [],
                skills: [],
                items: [],
                mercTypes: [],
                mercItems: [],
                minLevel: null,
                maxLevel: null,
                maxCostHr: null,
              })
            }
          >
            <RotateCcw className="size-3" /> Reset
          </Button>
        )}
        {chips.length === 0 && (
          <span className="text-[11px] text-muted-foreground">
            Click a class, skill or item to filter. Ladder characters level 80+, refreshed daily.
          </span>
        )}
      </div>
    </div>
  );
}

/** Max gear value: stepped slider (last step = any). Applies when released. */
function BudgetControl({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const indexOf = (v: number | null) =>
    v == null
      ? BUDGET_STEPS.length
      : Math.max(
          0,
          BUDGET_STEPS.findIndex((s) => s >= v),
        );
  const [drag, setDrag] = useState<number | null>(null);
  const index = drag ?? indexOf(value);
  const any = index >= BUDGET_STEPS.length;
  return (
    <div className="flex items-center gap-2"
      title="Maximum gear value">
      <span className="text-[11px] text-muted-foreground">Gear</span>
      <Slider
        aria-label="Maximum gear value"
        className="w-28 [&_[role=slider]]:size-3.5"
        min={0}
        max={BUDGET_STEPS.length}
        step={1}
        value={[index]}
        onValueChange={([i]) => setDrag(i)}
        onValueCommit={([i]) => {
          setDrag(null);
          onChange(i >= BUDGET_STEPS.length ? null : BUDGET_STEPS[i]);
        }}
      />
      <span className={cn('w-16 text-[11px] tabular-nums', any ? 'text-muted-foreground' : 'text-q-gold')}>
        {any ? 'Any' : `≤ ${fmtHr(BUDGET_STEPS[index])} HR`}
      </span>
    </div>
  );
}

// ───────────────────────────── usage ─────────────────────────────

type UsageView = 'skills' | 'items' | 'merc';

function UsagePanel({
  usage,
  filters,
  onToggle,
}: {
  usage: BuildsQuery<UsageResponse>;
  filters: BuildsFilters;
  onToggle: (list: ListKey, value: string) => void;
}) {
  const [view, setView] = useState<UsageView>('skills');
  const data = usage.data;
  return (
    <Section
      className="flex min-h-0 flex-1 flex-col"
      bodyClassName="min-h-0 flex-1 overflow-y-auto px-0 py-1"
      icon={<Flame />}
      title="Usage"
      action={
        <Segmented
          label="Usage"
          layoutId="builds-usage-view"
          className="h-6"
          value={view}
          onChange={setView}
          options={[
            { value: 'skills', label: 'Skills' },
            { value: 'items', label: 'Items' },
            { value: 'merc', label: 'Merc' },
          ]}
        />
      }
    >
      {usage.error ? (
        <QueryError query={usage}
          className="m-2"
          compact />
      ) : !data ? (
        <ListSkeleton rows={12} />
      ) : data.total === 0 ? (
        <p className="p-3 text-center text-xs text-muted-foreground">No characters match these filters.</p>
      ) : (
        <div className={cn('transition-opacity duration-(--dur-med)', usage.stale && 'opacity-60')}>
          {view === 'skills' && (
            <>
              <p className="px-3 pt-1 pb-1 text-[10px] tracking-wide text-muted-foreground uppercase">
                Maxed skills (20 hard points)
              </p>
              {data.skills.slice(0, 30).map((s) => (
                <UsageRow
                  key={s.name}
                  icon={<SkillIcon name={s.name}
                    size={22} />}
                  name={s.name}
                  usage={s}
                  active={filters.skills.includes(skillFilter(s.name))}
                  onClick={() => onToggle('skills', skillFilter(s.name))}
                />
              ))}
            </>
          )}
          {view === 'items' &&
            data.items
              .slice(0, 40)
              .map((item) => (
                <ItemUsageRow
                  key={item.key}
                  item={item}
                  active={filters.items.includes(item.key)}
                  onClick={() => onToggle('items', item.key)}
                />
              ))}
          {view === 'merc' && (
            <>
              <p className="px-3 pt-1 pb-1 text-[10px] tracking-wide text-muted-foreground uppercase">Merc types</p>
              {data.mercTypes.map((m) => (
                <UsageRow
                  key={m.name}
                  icon={<Users className="size-4 text-muted-foreground" />}
                  name={m.name}
                  usage={m}
                  active={filters.mercTypes.includes(m.name)}
                  onClick={() => onToggle('mercTypes', m.name)}
                />
              ))}
              <p className="mt-1 border-t border-border/50 px-3 pt-2 pb-1 text-[10px] tracking-wide text-muted-foreground uppercase">
                Merc items
              </p>
              {data.mercItems.slice(0, 25).map((item) => (
                <ItemUsageRow
                  key={item.key}
                  item={item}
                  merc
                  active={filters.mercItems.includes(item.key)}
                  onClick={() => onToggle('mercItems', item.key)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </Section>
  );
}

function UsageRow({
  icon,
  name,
  nameClassName,
  usage,
  active,
  onClick,
  trailing,
}: {
  icon: React.ReactNode;
  name: string;
  nameClassName?: string;
  usage: Pick<UsageCount, 'pct' | 'count'>;
  active: boolean;
  onClick: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 px-3 py-1 transition-colors duration-(--dur-fast) hover:bg-accent/40',
        active && 'bg-primary/10 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary',
      )}
    >
      <button
        type="button"
        aria-pressed={active}
        title={active ? `Remove filter: ${name}` : `Filter by ${name}`}
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {icon}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className={cn('min-w-0 flex-1 truncate text-xs', nameClassName)}>{name}</span>
            <span
              className="shrink-0 text-[11px] text-muted-foreground tabular-nums"
              title={`${usage.count.toLocaleString()} characters`}
            >
              {fmtPct(usage.pct)}
            </span>
          </span>
          <ShareBar pct={usage.pct}
            className="mt-1" />
        </span>
      </button>
      {trailing}
    </div>
  );
}

function ItemUsageRow({
  item,
  active,
  onClick,
  merc = false,
}: {
  item: ItemUsage;
  active: boolean;
  onClick: () => void;
  merc?: boolean;
}) {
  return (
    <UsageRow
      icon={<ItemIcon item={item}
        size={24} />}
      name={item.name}
      nameClassName={qualityText(item.quality)}
      usage={item}
      active={active}
      onClick={onClick}
      trailing={
        <span className="flex w-[74px] shrink-0 items-center justify-end gap-0.5">
          <PriceChip hr={item.priceHr} />
          <ItemActionsMenu item={item}
            merc={merc} />
        </span>
      }
    />
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-busy
      className="space-y-1.5 p-1">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i}
          className="h-7 w-full" />
      ))}
    </div>
  );
}

// ───────────────────────────── core kit ─────────────────────────────

function CoreKit({
  query,
  filters,
  onToggleItem,
}: {
  query: BuildsQuery<ShoppingListResponse>;
  filters: BuildsFilters;
  onToggleItem: (key: string) => void;
}) {
  const data = query.data;
  const total = data ? coreKitTotal(data.items) : 0;
  return (
    <Section icon={<ShoppingBag />}
      title="Core kit"
      bodyClassName="px-0 py-1">
      {query.error ? (
        <QueryError query={query}
          className="m-2"
          compact />
      ) : !data ? (
        <ListSkeleton rows={6} />
      ) : data.items.length === 0 ? (
        <p className="p-2 text-center text-xs text-muted-foreground">No priced uniques, sets or runewords here.</p>
      ) : (
        <div className={cn('transition-opacity duration-(--dur-med)', query.stale && 'opacity-60')}>
          {data.items.map((item) => (
            <UsageRow
              key={item.key}
              icon={<ItemIcon item={item}
                size={24} />}
              name={item.name}
              nameClassName={qualityText(item.quality)}
              usage={item}
              active={filters.items.includes(item.key)}
              onClick={() => onToggleItem(item.key)}
              trailing={
                <span className="flex w-[66px] shrink-0 items-center justify-end gap-0.5">
                  <PriceChip hr={item.priceHr} />
                  <SearchMarketButton item={item} />
                </span>
              }
            />
          ))}
          <p className="mt-1 flex items-center justify-between border-t border-border/50 px-3 pt-1.5 pb-0.5 text-xs">
            {data.items.some((i) => i.pct >= CORE_SHARE) ? (
              <>
                <span
                  className="text-muted-foreground"
                  title={`Items worn by ${CORE_SHARE}% or more of these characters`}
                >
                  Core kit (worn by {CORE_SHARE}%+)
                </span>
                <span className="font-semibold text-q-gold tabular-nums">
                  {total > 0 ? `≈ ${fmtHr(total)} HR` : 'Unpriced'}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">No item is worn by {CORE_SHARE}%+. Filter to a build.</span>
            )}
          </p>
        </div>
      )}
    </Section>
  );
}

// ───────────────────────────── characters ─────────────────────────────

function CharacterList({
  query,
  page,
  sort,
  dir,
  onPage,
  onSort,
}: {
  query: BuildsQuery<CharacterListResponse>;
  page: number;
  sort: CharacterSort;
  dir: 'asc' | 'desc';
  onPage: (page: number) => void;
  onSort: (sort: CharacterSort, dir: 'asc' | 'desc') => void;
}) {
  const data = query.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  return (
    <Section
      className="flex min-h-0 flex-1 flex-col"
      bodyClassName="min-h-0 flex-1 overflow-y-auto p-0"
      icon={<Users />}
      title={
        data ? (
          <span>
            {data.total.toLocaleString()} <span className="font-normal text-muted-foreground">characters</span>
          </span>
        ) : (
          'Characters'
        )
      }
      action={
        <div className="flex items-center gap-1">
          <Segmented
            label="Sort by"
            layoutId="builds-sort"
            className="h-6"
            value={sort}
            options={SORTS}
            onChange={(s) => onSort(s, 'desc')}
          />
          <Button
            variant="ghost"
            size="sm"
            className="size-6 p-0"
            aria-label={dir === 'desc' ? 'Descending (click for ascending)' : 'Ascending (click for descending)'}
            title={dir === 'desc' ? 'Highest first' : 'Lowest first'}
            onClick={() => onSort(sort, dir === 'desc' ? 'asc' : 'desc')}
          >
            {dir === 'desc' ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />}
          </Button>
        </div>
      }
    >
      {query.error ? (
        <QueryError query={query}
          className="m-3" />
      ) : !data ? (
        <div aria-busy
          className="space-y-1 p-2">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i}
              className="h-11 w-full" />
          ))}
        </div>
      ) : data.characters.length === 0 ? (
        <p className="p-6 text-center text-xs text-muted-foreground">
          No characters match. Remove a filter or raise the gear budget.
        </p>
      ) : (
        <ul
          className={cn(
            'divide-y divide-border/40 transition-opacity duration-(--dur-med)',
            query.stale && 'opacity-60',
          )}
        >
          {data.characters.map((c) => (
            <CharacterRow key={c.name}
              character={c} />
          ))}
        </ul>
      )}
      {data && pages > 1 && (
        <div className="sticky bottom-0 flex items-center justify-center gap-2 border-t border-border/50 bg-surface/95 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            className="size-6 p-0"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="tabular-nums">
            Page {page} of {pages.toLocaleString()}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="size-6 p-0"
            aria-label="Next page"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}
    </Section>
  );
}

function CharacterRow({ character: c }: { character: CharacterListEntry }) {
  const { openCharacter, mode } = useBuildsActions();
  const meta = classMeta(c.className);
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => openCharacter(c.name, mode)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openCharacter(c.name, mode);
          }
        }}
        className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 outline-none transition-colors duration-(--dur-fast) hover:bg-accent/40 focus-visible:bg-accent/50"
      >
        <ClassEmblem className={c.className}
          size={30} />
        <div className="w-44 min-w-0 shrink-0">
          <div className="flex items-center gap-1">
            <span className="truncate text-xs font-medium text-foreground">{c.name}</span>
            {c.isDead && mode === 'hardcore' && (
              <Skull className="size-3 shrink-0 text-destructive"
                aria-label="Dead" />
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            <span className="tabular-nums">Lv {c.level}</span> · <span style={{ color: meta.color }}>{meta.name}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {c.topSkills.slice(0, 3).map((s) => (
            <Tooltip key={s.name}>
              <TooltipTrigger asChild>
                <span>
                  <SkillIcon name={s.name}
                    size={22} />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {s.name} <span className="text-muted-foreground">· level {s.total}</span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <span className="ml-auto flex w-24 shrink-0 flex-col items-end">
          <PriceChip hr={c.gearValueHr}
            unpriced />
          <span className="text-[10px] text-muted-foreground">{timeAgo(c.lastUpdated)}</span>
        </span>
      </div>
    </li>
  );
}
