import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Flame,
  RotateCcw,
  Search,
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
import { currentLocale, Trans, useTranslation } from '@/i18n';

export const BUDGET_STEPS = [0.5, 1, 2, 3, 5, 8, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500];
const LEVEL_PRESETS = [
  { value: 'any', label: '80+', min: null },
  { value: '90', label: '90+', min: 90 },
  { value: '95', label: '95+', min: 95 },
  { value: '99', label: '99', min: 99 },
] as const;
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
  const { t } = useTranslation('builds');
  const total = breakdown ? Object.values(breakdown).reduce((a, b) => a + b, 0) : 0;
  // Most played first (ties and the loading state keep the game's class order)
  const classes = BUILD_CLASSES.map((name) => ({ name, count: breakdown?.[name] ?? 0 })).sort(
    (a, b) => b.count - a.count,
  );
  return (
    <div className="flex shrink-0 gap-0.5 border-b border-border/50 p-0.5"
      role="group"
      aria-label={t('meta.classes')}>
      {classes.map(({ name, count }) => {
        const meta = classMeta(name);
        const active = selected.includes(name);
        const dim = selected.length > 0 && !active;
        const pct = total ? (count / total) * 100 : 0;
        const tint = (percent: number) => `color-mix(in srgb, ${meta.color} ${percent}%, transparent)`;
        return (
          <button
            key={name}
            type="button"
            aria-pressed={active}
            title={
              active
                ? t('meta.classTitleActive', { name, count, formatted: count.toLocaleString(currentLocale()) })
                : t('meta.classTitle', { name, count, formatted: count.toLocaleString(currentLocale()) })
            }
            onClick={() => onToggle(name)}
            // A tile as wide as the class's share of the characters; the floor width keeps its text whole
            style={{
              flex: `${breakdown ? pct : 1} 1 0%`,
              background: tint(active ? 30 : 14),
              boxShadow: active ? `inset 0 0 0 1px ${meta.color}` : undefined,
            }}
            className={cn(
              'flex min-w-[128px] items-center gap-2 px-2.5 py-2 text-left outline-none transition-[opacity,background-color,box-shadow,flex-grow] duration-(--dur-fast) hover:brightness-125 focus-visible:brightness-125',
              dim && 'opacity-45 hover:opacity-90',
            )}
          >
            <ClassEmblem className={name}
              size={28} />
            <span className="min-w-0 flex-1 whitespace-nowrap">
              <span className="block text-xs font-semibold"
                style={{ color: meta.color }}>
                {meta.name}
              </span>
              <span className="block text-xs tabular-nums">
                {breakdown ? (
                  <>
                    <span className="font-bold text-foreground">{fmtPct(pct)}</span>{' '}
                    <span className="text-muted-foreground">{count.toLocaleString(currentLocale())}</span>
                  </>
                ) : (
                  <Skeleton className="mt-0.5 h-2.5 w-12" />
                )}
              </span>
            </span>
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
  const { t } = useTranslation(['builds', 'common']);
  const chips: { key: string; label: React.ReactNode; remove: () => void }[] = [];
  const listChip = (list: ListKey, value: string, label: React.ReactNode) =>
    chips.push({ key: `${list}:${value}`, label, remove: () => onChange(toggleListFilter(filters, list, value)) });
  for (const c of filters.classes) listChip('classes', c, <span style={{ color: classMeta(c).color }}>{c}</span>);
  for (const s of filters.skills) listChip('skills', s, skillLabel(s));
  for (const i of filters.items) listChip('items', i, itemNames.get(i) ?? keyLabel(i));
  for (const m of filters.mercTypes) listChip('mercTypes', m, t('meta.mercChip', { name: m }));
  for (const i of filters.mercItems)
    listChip('mercItems', i, t('meta.mercChip', { name: itemNames.get(i) ?? keyLabel(i) }));
  if (filters.minLevel || filters.maxLevel) {
    const label =
      filters.minLevel && filters.maxLevel
        ? t('meta.levelRange', { min: filters.minLevel, max: filters.maxLevel })
        : filters.minLevel
          ? t('meta.levelMin', { min: filters.minLevel })
          : t('meta.levelMax', { max: filters.maxLevel });
    chips.push({ key: 'level', label, remove: () => onChange({ ...filters, minLevel: null, maxLevel: null }) });
  }
  if (filters.maxCostHr != null) {
    chips.push({
      key: 'budget',
      label: t('meta.gearMax', { value: fmtHr(filters.maxCostHr) }),
      remove: () => onChange({ ...filters, maxCostHr: null }),
    });
  }

  const levelPreset = !filters.maxLevel && LEVEL_PRESETS.find((p) => p.min === (filters.minLevel ?? null))?.value;

  return (
    <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-1.5">
      <Segmented
        label={t('timeline.level')}
        layoutId="builds-level"
        value={levelPreset || ('' as string)}
        options={LEVEL_PRESETS.map((p) => ({
          value: p.value,
          label: p.label,
          title: t('meta.levelPresetTitle', { level: p.label }),
        }))}
        onChange={(v) =>
          onChange({ ...filters, minLevel: LEVEL_PRESETS.find((p) => p.value === v)?.min ?? null, maxLevel: null })
        }
      />
      <BudgetControl value={filters.maxCostHr ?? null}
        onChange={(maxCostHr) => onChange({ ...filters, maxCostHr })} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
        aria-label={t('meta.activeFilters')}>
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex h-6 items-center gap-1 rounded-full border border-border bg-muted/40 pr-0.5 pl-2.5 text-[11px]"
          >
            {chip.label}
            <button
              type="button"
              aria-label={t('meta.removeFilter')}
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
            <RotateCcw className="size-3" /> {t('common:actions.reset')}
          </Button>
        )}
        {chips.length === 0 && <span className="text-[11px] text-muted-foreground">{t('meta.filterHint')}</span>}
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
  const { t } = useTranslation('builds');
  const [drag, setDrag] = useState<number | null>(null);
  const index = drag ?? indexOf(value);
  const any = index >= BUDGET_STEPS.length;
  return (
    <div className="flex items-center gap-2"
      title={t('meta.maxGearValue')}>
      <span className="text-[11px] text-muted-foreground">{t('meta.gear')}</span>
      <Slider
        aria-label={t('meta.maxGearValue')}
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
        {any ? t('meta.any') : t('meta.atMostHr', { value: fmtHr(BUDGET_STEPS[index]) })}
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
  const { t } = useTranslation('builds');
  const [view, setView] = useState<UsageView>('skills');
  const [search, setSearch] = useState('');
  const data = usage.data;
  const needle = search.trim().toLowerCase();
  const matches = <T extends { name: string }>(rows: T[], limit: number) =>
    needle ? rows.filter((r) => r.name.toLowerCase().includes(needle)) : rows.slice(0, limit);
  const skills = data ? matches(data.skills, 30) : [];
  const items = data ? matches(data.items, 40) : [];
  const mercTypes = data ? matches(data.mercTypes, Infinity) : [];
  const mercItems = data ? matches(data.mercItems, 25) : [];
  const empty =
    view === 'skills'
      ? skills.length === 0
      : view === 'items'
        ? items.length === 0
        : mercTypes.length + mercItems.length === 0;
  return (
    <Section
      className="flex min-h-0 flex-1 flex-col"
      bodyClassName="min-h-0 flex-1 overflow-y-auto px-0 py-1"
      icon={<Flame />}
      title={t('meta.usage')}
      action={
        <Segmented
          label={t('meta.usage')}
          layoutId="builds-usage-view"
          className="h-6"
          value={view}
          onChange={setView}
          options={[
            { value: 'skills', label: t('character.skills') },
            { value: 'items', label: t('meta.items') },
            { value: 'merc', label: t('gearUp.merc') },
          ]}
        />
      }
    >
      <div className="sticky top-0 z-10 bg-surface/95 px-2 pt-1 pb-1.5 backdrop-blur-sm">
        <Search className="pointer-events-none absolute top-[calc(50%-1px)] left-4 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            view === 'skills' ? t('meta.searchSkills') : view === 'items' ? t('meta.searchItems') : t('meta.searchMerc')
          }
          aria-label={
            view === 'skills'
              ? t('meta.searchSkillsLabel')
              : view === 'items'
                ? t('meta.searchItemsLabel')
                : t('meta.searchMercLabel')
          }
          spellCheck={false}
          autoComplete="off"
          className="h-7 w-full rounded-md border border-input bg-background/60 pr-2 pl-7 text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      {usage.error ? (
        <QueryError query={usage}
          className="m-2"
          compact />
      ) : !data ? (
        <ListSkeleton rows={12} />
      ) : data.total === 0 ? (
        <p className="p-3 text-center text-xs text-muted-foreground">{t('meta.noMatchFilters')}</p>
      ) : (
        <div className={cn('transition-opacity duration-(--dur-med)', usage.stale && 'opacity-60')}>
          {needle && empty && (
            <p className="p-3 text-center text-xs text-muted-foreground">
              {t('meta.nothingMatches', { search: search.trim() })}
            </p>
          )}
          {view === 'skills' && (
            <>
              {skills.length > 0 && (
                <p className="px-3 pt-1 pb-1 text-[10px] tracking-wide text-muted-foreground uppercase">
                  {t('meta.maxedSkills')}
                </p>
              )}
              {skills.map((s) => (
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
            items.map((item) => (
              <ItemUsageRow
                key={item.key}
                item={item}
                active={filters.items.includes(item.key)}
                onClick={() => onToggle('items', item.key)}
              />
            ))}
          {view === 'merc' && (
            <>
              {mercTypes.length > 0 && (
                <p className="px-3 pt-1 pb-1 text-[10px] tracking-wide text-muted-foreground uppercase">
                  {t('meta.mercTypes')}
                </p>
              )}
              {mercTypes.map((m) => (
                <UsageRow
                  key={m.name}
                  icon={<Users className="size-4 text-muted-foreground" />}
                  name={m.name}
                  usage={m}
                  active={filters.mercTypes.includes(m.name)}
                  onClick={() => onToggle('mercTypes', m.name)}
                />
              ))}
              {mercItems.length > 0 && (
                <p className="mt-1 border-t border-border/50 px-3 pt-2 pb-1 text-[10px] tracking-wide text-muted-foreground uppercase">
                  {t('meta.mercItems')}
                </p>
              )}
              {mercItems.map((item) => (
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
  const { t } = useTranslation('builds');
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
        title={active ? t('meta.removeFilterName', { name }) : t('meta.filterBy', { name })}
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {icon}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className={cn('min-w-0 flex-1 truncate text-xs', nameClassName)}>{name}</span>
            <span
              className="shrink-0 text-[11px] text-muted-foreground tabular-nums"
              title={t('meta.usageCount', {
                count: usage.count,
                formatted: usage.count.toLocaleString(currentLocale()),
              })}
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
  const { t } = useTranslation('builds');
  const total = data ? coreKitTotal(data.items) : 0;
  return (
    <Section icon={<ShoppingBag />}
      title={t('meta.coreKit')}
      bodyClassName="px-0 py-1">
      {query.error ? (
        <QueryError query={query}
          className="m-2"
          compact />
      ) : !data ? (
        <ListSkeleton rows={6} />
      ) : data.items.length === 0 ? (
        <p className="p-2 text-center text-xs text-muted-foreground">{t('meta.noPricedItems')}</p>
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
                <span className="text-muted-foreground"
                  title={t('meta.coreKitTitle', { share: CORE_SHARE })}>
                  {t('meta.coreKitShare', { share: CORE_SHARE })}
                </span>
                <span className="font-semibold text-q-gold tabular-nums">
                  {total > 0 ? t('gearUp.approxHr', { value: fmtHr(total) }) : t('gearUp.unpriced')}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{t('meta.noCoreItem', { share: CORE_SHARE })}</span>
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
  const { t } = useTranslation('builds');
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  return (
    <Section
      className="flex min-h-0 flex-1 flex-col"
      bodyClassName="min-h-0 flex-1 overflow-y-auto p-0"
      icon={<Users />}
      title={
        data ? (
          <span>
            <Trans
              t={t}
              i18nKey="meta.characterCount"
              count={data.total}
              values={{ count: data.total, formatted: data.total.toLocaleString(currentLocale()) }}
              components={{ muted: <span className="font-normal text-muted-foreground" /> }}
            />
          </span>
        ) : (
          t('page.tabs.characters')
        )
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
        <p className="p-6 text-center text-xs text-muted-foreground">{t('meta.noCharactersMatch')}</p>
      ) : (
        <>
          <div
            role="row"
            className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-border/50 bg-surface/95 px-3 py-1 text-[10px] tracking-wide text-muted-foreground uppercase backdrop-blur-sm"
          >
            <SortHeader
              className="w-[216px]"
              label={t('meta.columns.character')}
              by="level"
              sort={sort}
              dir={dir}
              onSort={onSort}
            />
            <span role="columnheader"
              className="w-[74px] shrink-0">
              {t('character.skills')}
            </span>
            <SortHeader className="w-14 justify-end"
              label="Life"
              by="life"
              sort={sort}
              dir={dir}
              onSort={onSort} />
            <SortHeader
              className="ml-auto w-20 justify-end"
              label={t('meta.gear')}
              by="gearValueHr"
              sort={sort}
              dir={dir}
              onSort={onSort}
            />
            <SortHeader
              className="w-16 justify-end"
              label={t('meta.columns.updated')}
              by="lastUpdated"
              sort={sort}
              dir={dir}
              onSort={onSort}
            />
          </div>
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
        </>
      )}
      {data && pages > 1 && (
        <div className="sticky bottom-0 flex items-center justify-center gap-2 border-t border-border/50 bg-surface/95 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            className="size-6 p-0"
            aria-label={t('meta.previousPage')}
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="tabular-nums">
            {t('meta.pageOf', {
              page: page.toLocaleString(currentLocale()),
              pages: pages.toLocaleString(currentLocale()),
            })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="size-6 p-0"
            aria-label={t('meta.nextPage')}
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

/** A column header that sorts the list by `by`: highest first, or the other way when it already does. */
function SortHeader({
  label,
  by,
  sort,
  dir,
  onSort,
  className,
}: {
  label: string;
  by: CharacterSort;
  sort: CharacterSort;
  dir: 'asc' | 'desc';
  onSort: (sort: CharacterSort, dir: 'asc' | 'desc') => void;
  className?: string;
}) {
  const { t } = useTranslation('builds');
  const active = sort === by;
  const Arrow = dir === 'desc' ? ArrowDown : ArrowUp;
  return (
    <button
      type="button"
      role="columnheader"
      aria-sort={active ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'}
      title={active ? (dir === 'desc' ? t('meta.sortHighest') : t('meta.sortLowest')) : t('meta.sortBy', { label })}
      onClick={() => onSort(by, active && dir === 'desc' ? 'asc' : 'desc')}
      className={cn(
        'flex shrink-0 items-center gap-0.5 rounded-sm uppercase outline-none transition-colors duration-(--dur-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
        active && 'text-foreground',
        className,
      )}
    >
      {label}
      {active && <Arrow className="size-3" />}
    </button>
  );
}

function CharacterRow({ character: c }: { character: CharacterListEntry }) {
  const { t } = useTranslation('builds');
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
                aria-label={t('characters.dead')} />
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            <span className="tabular-nums">{t('meta.lv', { level: c.level })}</span> ·{' '}
            <span style={{ color: meta.color }}>{meta.name}</span>
          </div>
        </div>
        <div className="flex w-[74px] shrink-0 gap-1">
          {c.topSkills.slice(0, 3).map((s) => (
            <Tooltip key={s.name}>
              <TooltipTrigger asChild>
                <span>
                  <SkillIcon name={s.name}
                    size={22} />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {s.name} <span className="text-muted-foreground">{t('meta.skillLevel', { level: s.total })}</span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <span className="w-14 shrink-0 text-right text-xs text-destructive/90 tabular-nums">
          {c.life.toLocaleString(currentLocale())}
        </span>
        <span className="ml-auto flex w-20 shrink-0 justify-end">
          <PriceChip hr={c.gearValueHr}
            unpriced />
        </span>
        <span className="w-16 shrink-0 text-right text-[10px] text-muted-foreground">{timeAgo(c.lastUpdated)}</span>
      </div>
    </li>
  );
}
