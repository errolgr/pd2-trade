import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookmarkPlus, ChevronDown, GripVertical, RotateCcw, Sigma, Sparkles, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DUR, EASE_OUT } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CORRUPTION_OPTIONS, corruptionOption } from '../lib/catalog';
import { newStatFilter } from '../lib/defaults';
import { MAX_OR_BLOCKS, compactBlocks, groupOf, moveToGroup, orBlockNumbers, type StatGroup } from '../lib/stat-groups';
import { isCorruption, isPseudo, searchStats, type StatChoice } from '../lib/stats';
import type { StatFilter, StatPreset } from '../lib/types';
import { Autocomplete, NumberInput, fieldInputClass } from './controls';
import { choiceText, filterName } from './stat-text';
import { Trans, useTranslation } from '@/i18n';

const MAX_SUGGESTIONS = 40;

const choiceKey = (choice: StatChoice) =>
  isPseudo(choice) ? choice.id : isCorruption(choice) ? `corruption:${choice.value}` : choice.key;

/** "Min [  ]" — a stat bound input with its caption inside the row's second line. */
function StatNumber({
  label,
  name,
  value,
  onChange,
}: {
  label: 'Min' | 'Max';
  name: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const { t } = useTranslation('market');
  return (
    <label className="flex min-w-0 items-center gap-1">
      <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label === 'Min' ? t('stats.min') : t('stats.max')}
      </span>
      <NumberInput
        ariaLabel={label === 'Min' ? t('controls.minLabel', { label: name }) : t('controls.maxLabel', { label: name })}
        value={value}
        onChange={onChange}
        className="h-6 px-1 text-center"
      />
    </label>
  );
}

/** Marks a corruption row / picker entry. */
function CorruptionBadge() {
  const { t } = useTranslation('market');
  return (
    <span
      title={t('stats.cubeCorruption')}
      className="shrink-0 rounded-sm border border-q-corrupted/40 bg-q-corrupted/10 px-1 text-[9px] leading-4 font-semibold tracking-wide text-q-corrupted uppercase"
    >
      {t('stats.corrBadge')}
    </span>
  );
}

export interface StatFiltersProps {
  stats: StatFilter[];
  onChange: (stats: StatFilter[]) => void;
  builtInPresets: StatPreset[];
  userPresets: StatPreset[];
  onApplyPreset: (preset: StatPreset) => void;
  onSavePreset: (name: string) => void;
  /** Deletes a user preset, or hides a built-in one. */
  onRemovePreset: (preset: StatPreset) => void;
  /** Brings deleted built-in presets back; absent while none is deleted. */
  onRestorePresets?: () => void;
  searchRef?: React.Ref<HTMLInputElement>;
  /** A row just added/updated from a mod menu: scrolled into view and highlighted (`nonce`: each request). */
  highlight?: { id: string; nonce: number } | null;
}

/** Picker tabs: what kind of filter a suggestion adds. */
type StatTab = 'mod' | 'pseudo' | 'corruption';
const TABS: { id: StatTab; labelKey: string }[] = [
  { id: 'mod', labelKey: 'stats.tabs.mods' },
  { id: 'pseudo', labelKey: 'stats.tabs.pseudo' },
  { id: 'corruption', labelKey: 'stats.tabs.corruptions' },
];
const tabOf = (choice: StatChoice): StatTab =>
  isPseudo(choice) ? 'pseudo' : isCorruption(choice) ? 'corruption' : 'mod';

/** Corruption rows after the stat rows (stable otherwise), so the two kinds don't interleave. */
const statsFirst = (rows: StatFilter[]) =>
  [...rows].sort((a, b) => Number(a.kind === 'corruption') - Number(b.kind === 'corruption'));

/** Where a dragged row can land: a group, or `new` (another any-of block). */
type DropTarget = StatGroup | 'new';
const DROP_ATTR = 'data-stat-drop';
/** Pointer travel (px) before a press on a row's grip becomes a drag. */
const DRAG_THRESHOLD_PX = 4;

const dropTargetAt = (x: number, y: number): DropTarget | null => {
  const value = document.elementFromPoint(x, y)?.closest(`[${DROP_ATTR}]`)?.getAttribute(DROP_ATTR);
  if (!value) return null;
  return value === 'and' || value === 'not' || value === 'new' ? value : Number(value);
};

interface RowDrag {
  id: string;
  name: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  /** Past DRAG_THRESHOLD_PX: drop zones and the ghost show. */
  moved: boolean;
  over: DropTarget | null;
}

/**
 * Stats section: one search over mods, pseudo stats and cube corruptions, split into tabs (Tab / Shift+Tab
 * switch; the tab of the best match opens first); rows with min/max, enable and a group: required (AND), one of
 * up to MAX_OR_BLOCKS "any of" blocks (OR) or the "none of" group (NOT). Rows move between groups from their
 * group menu or by dragging their grip. Corruption rows sort last with a red edge; presets.
 */
export function StatFilters({
  stats,
  onChange,
  builtInPresets,
  userPresets,
  onApplyPreset,
  onSavePreset,
  onRemovePreset,
  onRestorePresets,
  searchRef,
  highlight,
}: StatFiltersProps) {
  const { t: tr } = useTranslation('market');
  const [query, setQuery] = useState('');
  // The tab the user picked, and the tab on screen: both hold while they have matches, so typing on doesn't
  // flip the list between tabs whenever the best match changes kind
  const [pickedTab, setPickedTab] = useState<StatTab | null>(null);
  const [shownTab, setShownTab] = useState<StatTab | null>(null);
  const [drag, setDrag] = useState<RowDrag | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(searchRef, () => inputRef.current as HTMLInputElement);
  useEffect(() => {
    if (!highlight) return;
    listRef.current
      ?.querySelector(`[data-stat-id="${CSS.escape(highlight.id)}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlight]);
  // Escape drops a drag where it started
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setDrag(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [dragging]);
  const matches = useMemo(
    () => (query.trim() ? searchStats(query, MAX_SUGGESTIONS * 3, CORRUPTION_OPTIONS) : []),
    [query],
  );
  const counts = useMemo(() => {
    const c: Record<StatTab, number> = { mod: 0, pseudo: 0, corruption: 0 };
    for (const m of matches) c[tabOf(m)] += 1;
    return c;
  }, [matches]);
  const tab: StatTab =
    [pickedTab, shownTab].find((t): t is StatTab => !!t && counts[t] > 0) ?? (matches[0] ? tabOf(matches[0]) : 'mod');
  if (matches.length > 0 && tab !== shownTab) setShownTab(tab);
  const suggestions = useMemo(() => matches.filter((m) => tabOf(m) === tab).slice(0, MAX_SUGGESTIONS), [matches, tab]);
  // The list keeps the tallest tab's height, so switching tabs doesn't resize the dropdown
  const listRows = Math.max(...TABS.map((t) => Math.min(counts[t.id], MAX_SUGGESTIONS)));
  const cycleTab = (step: 1 | -1) => {
    const open = TABS.filter((t) => counts[t.id] > 0);
    if (open.length < 2) return;
    const at = open.findIndex((t) => t.id === tab);
    setPickedTab(open[(at + step + open.length) % open.length].id);
  };

  const add = (choice: StatChoice) => {
    // A pick clears the search (focus stays) so the next stat can be typed right away
    setQuery('');
    setPickedTab(null);
    setShownTab(null);
    inputRef.current?.focus();
    const row = isPseudo(choice)
      ? { kind: 'pseudo' as const, key: choice.id }
      : isCorruption(choice)
        ? { kind: 'corruption' as const, key: choice.value }
        : { kind: 'mod' as const, key: choice.key };
    onChange([...stats, newStatFilter(row)]);
  };
  const update = (id: string, changes: Partial<StatFilter>) =>
    onChange(stats.map((s) => (s.id === id ? { ...s, ...changes } : s)));
  const move = (id: string, target: DropTarget) => {
    const next = moveToGroup(stats, id, target);
    if (next !== stats) onChange(next);
  };

  const blocks = orBlockNumbers(stats);
  const required = statsFirst(stats.filter((s) => groupOf(s) === 'and'));
  const excluded = statsFirst(stats.filter((s) => s.not));
  const blockRows = (n: number) => statsFirst(stats.filter((s) => !s.not && s.or === n));
  /** `new` can open a block: fewer than MAX_OR_BLOCKS, and the row isn't a block of its own already. */
  const canOpenBlock = (s: StatFilter) =>
    blocks.length < MAX_OR_BLOCKS && !(s.or !== undefined && !s.not && blockRows(s.or).length === 1);

  const gripHandlers = (s: StatFilter, name: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      // Keep receiving moves while the pointer is over other rows / outside the section
      e.currentTarget.setPointerCapture(e.pointerId);
      const at = { x: e.clientX, y: e.clientY };
      setDrag({ id: s.id, name, startX: at.x, startY: at.y, ...at, moved: false, over: groupOf(s) });
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const { clientX: x, clientY: y } = e;
      setDrag((d) => {
        if (!d || d.id !== s.id) return d;
        const moved = d.moved || Math.hypot(x - d.startX, y - d.startY) >= DRAG_THRESHOLD_PX;
        return { ...d, x, y, moved, over: moved ? dropTargetAt(x, y) : d.over };
      });
    },
    onPointerUp: () => {
      if (drag?.id === s.id && drag.moved && drag.over !== null) move(s.id, drag.over);
      setDrag(null);
    },
    onPointerCancel: () => setDrag(null),
  });

  const activeDrag = drag?.moved ? drag : null;
  const dropProps = (target: DropTarget) => ({
    [DROP_ATTR]: String(target),
    'data-drop-over': activeDrag?.over === target ? '' : undefined,
  });
  /** Ring on the group under a dragged row. */
  const overClass = 'data-[drop-over]:ring-2 data-[drop-over]:ring-primary/70';

  const renderRow = (s: StatFilter) => {
    const name = filterName(s);
    const corruption = s.kind === 'corruption';
    const bounded = !corruption || corruptionOption(s.key).rolled;
    return (
      <motion.li
        key={s.id}
        data-stat-id={s.id}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: activeDrag?.id === s.id ? 0.35 : s.enabled ? 1 : 0.55, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: DUR.med, ease: EASE_OUT }}
        className="relative overflow-hidden"
      >
        {/* A row just added/updated from a mod menu pulses once */}
        {highlight?.id === s.id && (
          <motion.span
            key={highlight.nonce}
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-primary/15 ring-1 ring-inset ring-primary/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.4, times: [0, 0.15, 0.6, 1], ease: 'easeOut' }}
          />
        )}
        {corruption && <span aria-hidden
          className="absolute inset-y-0 left-0 w-0.5 bg-q-corrupted" />}
        <div className="relative space-y-1 py-1 pr-0.5 pl-1">
          <div className="flex min-w-0 items-center gap-1">
            <span
              aria-hidden
              title={tr('stats.dragHint')}
              data-stat-grip={s.id}
              className="inline-flex h-5 w-3 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground/60 transition-colors duration-(--dur-fast) hover:text-foreground active:cursor-grabbing"
              {...gripHandlers(s, name)}
            >
              <GripVertical className="size-3" />
            </span>
            <Checkbox
              checked={s.enabled}
              aria-label={s.enabled ? tr('stats.disable', { name }) : tr('stats.enable', { name })}
              onCheckedChange={(v) => update(s.id, { enabled: v === true })}
              className="size-3.5"
            />
            {s.kind === 'pseudo' && <Sigma className="size-3 shrink-0 text-info"
              aria-label={tr('stats.pseudoStat')} />}
            {corruption && <CorruptionBadge />}
            <span className="min-w-0 flex-1 truncate text-xs"
              title={name}>
              {name}
            </span>
            <GroupMenu
              name={name}
              group={groupOf(s)}
              blocks={blocks}
              canOpenBlock={canOpenBlock(s)}
              onMove={(target) => move(s.id, target)}
            />
            <button
              type="button"
              aria-label={tr('stats.removeName', { name })}
              title={tr('common:actions.remove')}
              onClick={() => onChange(compactBlocks(stats.filter((x) => x.id !== s.id)))}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:bg-destructive/15 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <X className="size-3.5" />
            </button>
          </div>
          {bounded ? (
            <div className="grid grid-cols-2 gap-1 pr-7 pl-9">
              <StatNumber label="Min"
                name={name}
                value={s.min}
                onChange={(min) => update(s.id, { min })} />
              <StatNumber label="Max"
                name={name}
                value={s.max}
                onChange={(max) => update(s.id, { max })} />
            </div>
          ) : (
            <p className="pl-9 text-[10px] text-muted-foreground">{tr('stats.hasCorruption')}</p>
          )}
        </div>
      </motion.li>
    );
  };

  /** A dashed zone for a group that has no rows yet, shown while a row is dragged. */
  const dropZone = (target: DropTarget, label: string, tone: string) => (
    <div
      {...dropProps(target)}
      className={cn(
        'rounded-md border border-dashed px-1.5 py-1.5 text-center text-[10px] font-semibold tracking-wider uppercase',
        tone,
        overClass,
      )}
    >
      {label}
    </div>
  );
  const dragged = activeDrag ? stats.find((s) => s.id === activeDrag.id) : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Autocomplete<StatChoice>
          inputRef={inputRef}
          ariaLabel={tr('stats.addLabel')}
          placeholder={tr('stats.addPlaceholder')}
          value={query}
          onQuery={(q) => {
            if (!q.trim()) {
              setPickedTab(null);
              setShownTab(null);
            }
            setQuery(q);
          }}
          options={suggestions}
          listKey={tab}
          minRows={listRows}
          optionKey={choiceKey}
          onPick={add}
          className="flex-1"
          contentClassName="min-w-80"
          onKeyDown={(e) => {
            if (e.key === 'Tab' && matches.length > 0) {
              e.preventDefault();
              cycleTab(e.shiftKey ? -1 : 1);
            }
          }}
          header={
            <div
              role="tablist"
              aria-label={tr('stats.filterKind')}
              className="mb-1 flex gap-0.5 border-b border-border pb-1"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  disabled={counts[t.id] === 0}
                  onClick={() => setPickedTab(t.id)}
                  className={cn(
                    'flex-1 rounded px-1.5 py-0.5 text-[11px] outline-none transition-colors disabled:opacity-40',
                    tab === t.id
                      ? t.id === 'corruption'
                        ? 'bg-q-corrupted/15 text-q-corrupted'
                        : 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tr(t.labelKey)}
                  {counts[t.id] > 0 && <span className="ml-1 tabular-nums opacity-70">{counts[t.id]}</span>}
                </button>
              ))}
            </div>
          }
          renderOption={(choice) => (
            <span className="flex items-center gap-1.5">
              {/* Pseudo marker stays (Σ also tags pseudo rows); the Corruptions tab needs no per-row badge */}
              {isPseudo(choice) ? (
                <Sigma className="size-3 shrink-0 text-info"
                  aria-label={tr('stats.pseudoStat')} />
              ) : (
                <span className="size-3 shrink-0" />
              )}
              <span
                className={cn('min-w-0 flex-1 truncate', isCorruption(choice) && 'text-q-corrupted')}
                title={choiceText(choice)}
              >
                {choiceText(choice)}
              </span>
              {/* The tab already says pseudo / corruption; mods keep their group */}
              {!isPseudo(choice) && !isCorruption(choice) && (
                <span className="shrink-0 text-[10px] text-muted-foreground">{choice.group}</span>
              )}
            </span>
          )}
        />
        <PresetMenu
          builtIn={builtInPresets}
          user={userPresets}
          onApply={onApplyPreset}
          onRemove={onRemovePreset}
          onRestore={onRestorePresets}
        />
        <SavePresetButton disabled={stats.length === 0}
          onSave={onSavePreset} />
      </div>

      {stats.length > 0 && (
        <div ref={listRef}
          className={cn('space-y-1.5', activeDrag && 'select-none')}>
          {required.length > 0 ? (
            <ul
              {...dropProps('and')}
              aria-label={tr('stats.groups.allOf')}
              className={cn('divide-y divide-border/50 overflow-hidden rounded-md border border-border/60', overClass)}
            >
              <AnimatePresence initial={false}>{required.map(renderRow)}</AnimatePresence>
            </ul>
          ) : (
            activeDrag && dropZone('and', tr('stats.groups.requiredDrop'), 'border-border text-muted-foreground')
          )}
          {blocks.map((n) => {
            const rows = blockRows(n);
            const enabled = rows.filter((s) => s.enabled).length;
            const label = blocks.length > 1 ? tr('stats.groups.anyOfN', { n }) : tr('stats.groups.anyOf');
            return (
              <section
                key={n}
                {...dropProps(n)}
                aria-label={label}
                className={cn('overflow-hidden rounded-md border border-info/40 bg-info/5', overClass)}
              >
                <header className="flex items-baseline justify-between gap-2 border-b border-info/20 px-1.5 py-0.5">
                  <span className="text-[10px] font-semibold tracking-wider text-info uppercase">{label}</span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {enabled > 1 ? tr('stats.groups.atLeastOne', { count: enabled }) : tr('stats.groups.addAnother')}
                  </span>
                </header>
                <ul className="divide-y divide-border/50">
                  <AnimatePresence initial={false}>{rows.map(renderRow)}</AnimatePresence>
                </ul>
              </section>
            );
          })}
          {activeDrag &&
            dragged &&
            canOpenBlock(dragged) &&
            dropZone(
              'new',
              blocks.length ? tr('stats.groups.newBlockDrop') : tr('stats.groups.anyOfDrop'),
              'border-info/50 text-info',
            )}
          {excluded.length > 0 ? (
            <section
              {...dropProps('not')}
              aria-label={tr('stats.groups.noneOf')}
              className={cn('overflow-hidden rounded-md border border-destructive/40 bg-destructive/5', overClass)}
            >
              <header className="flex items-baseline justify-between gap-2 border-b border-destructive/20 px-1.5 py-0.5">
                <span className="text-[10px] font-semibold tracking-wider text-destructive uppercase">
                  {tr('stats.groups.noneOf')}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {excluded.length > 1 ? tr('stats.groups.hiddenMany') : tr('stats.groups.hiddenOne')}
                </span>
              </header>
              <ul className="divide-y divide-border/50">
                <AnimatePresence initial={false}>{excluded.map(renderRow)}</AnimatePresence>
              </ul>
            </section>
          ) : (
            activeDrag && dropZone('not', tr('stats.groups.excludeDrop'), 'border-destructive/50 text-destructive')
          )}
        </div>
      )}
      {stats.length === 0 && (
        <p className="px-0.5 text-[11px] leading-snug text-muted-foreground">
          <Trans
            t={tr}
            i18nKey="stats.emptyHint"
            components={{ sigma: <Sigma className="inline size-3 text-info" /> }}
          />
        </p>
      )}
      {activeDrag &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed z-[1000] max-w-56 truncate rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-lg"
            style={{ left: activeDrag.x + 12, top: activeDrag.y + 8 }}
          >
            {activeDrag.name}
          </div>,
          document.body,
        )}
    </div>
  );
}

/** AND / OR n / NOT chip, coloured by group (the group button and its menu entries). */
function GroupBadge({ group, text, className }: { group: StatGroup; text: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-8 shrink-0 items-center justify-center rounded border px-1 text-[10px] font-semibold tracking-wide whitespace-nowrap',
        group === 'and'
          ? 'border-border text-muted-foreground'
          : group === 'not'
            ? 'border-destructive/50 bg-destructive/15 text-destructive'
            : 'border-info/50 bg-info/15 text-info',
        className,
      )}
    >
      {text}
    </span>
  );
}

/** A row's group: AND / OR n / NOT, as a menu that moves the row. */
function GroupMenu({
  name,
  group,
  blocks,
  canOpenBlock,
  onMove,
}: {
  name: string;
  group: StatGroup;
  blocks: number[];
  canOpenBlock: boolean;
  onMove: (target: DropTarget) => void;
}) {
  const { t } = useTranslation('market');
  const description =
    group === 'and'
      ? t('stats.groups.requiredDescription')
      : group === 'not'
        ? t('stats.groups.excludedDescription')
        : t('stats.groups.blockDescription', { n: group });
  // Badges number the blocks once there are several (a new block makes several when one exists)
  const options: { target: DropTarget; group: StatGroup; badge: string; label: string }[] = [
    { target: 'and', group: 'and', badge: 'AND', label: t('stats.groups.required') },
    ...blocks.map((n) => ({
      target: n,
      group: n,
      badge: blocks.length > 1 ? `OR ${n}` : 'OR',
      label: blocks.length > 1 ? t('stats.groups.anyOfN', { n }) : t('stats.groups.anyOf'),
    })),
    ...(canOpenBlock
      ? [
          {
            target: 'new' as const,
            group: blocks.length + 1,
            badge: blocks.length ? `OR ${blocks.length + 1}` : 'OR',
            label: blocks.length ? t('stats.groups.newBlock') : t('stats.groups.anyOf'),
          },
        ]
      : []),
    { target: 'not', group: 'not', badge: 'NOT', label: t('stats.groups.exclude') },
  ];
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('stats.groups.rowLabel', { name, description })}
          title={t('stats.groups.badgeHint')}
          className="shrink-0 rounded outline-none transition-[filter] duration-(--dur-fast) hover:brightness-125 focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <GroupBadge
            group={group}
            text={group === 'and' ? 'AND' : group === 'not' ? 'NOT' : blocks.length > 1 ? `OR ${group}` : 'OR'}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end"
        className="min-w-44">
        <DropdownMenuLabel className="text-xs">{t('stats.groups.moveTo')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={String(group)}
          onValueChange={(v) => onMove(options.find((o) => String(o.target) === v)?.target ?? group)}
        >
          {options.map((o) => (
            <DropdownMenuRadioItem key={String(o.target)}
              value={String(o.target)}
              className="text-xs">
              <span className="flex-1">{o.label}</span>
              <GroupBadge group={o.group}
                text={o.badge}
                className="ml-3" />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PresetMenu({
  builtIn,
  user,
  onApply,
  onRemove,
  onRestore,
}: {
  builtIn: StatPreset[];
  user: StatPreset[];
  onApply: (preset: StatPreset) => void;
  onRemove: (preset: StatPreset) => void;
  onRestore?: () => void;
}) {
  const { t } = useTranslation('market');
  /** Built-in presets show a translated name; user presets keep theirs. */
  const presetName = (p: StatPreset) => {
    if (!p.builtIn) return p.name;
    switch (p.id) {
      case 'builtin-caster-amulet':
        return t('presets.builtInNames.casterAmulet');
      case 'builtin-skiller-gc':
        return t('presets.builtInNames.skillerGc');
      case 'builtin-mf-gear':
        return t('presets.builtInNames.mfGear');
      default:
        return p.name;
    }
  };
  const item = (p: StatPreset) => (
    <DropdownMenuItem
      key={p.id}
      onSelect={() => onApply(p)}
      // The delete button isn't reachable by arrow keys: Delete/Backspace on the item deletes it
      onKeyDown={(e) => {
        if (e.key !== 'Delete' && e.key !== 'Backspace') return;
        e.preventDefault();
        onRemove(p);
      }}
      className="group text-xs"
    >
      <span className="min-w-0 flex-1 truncate">{presetName(p)}</span>
      <span className="text-[10px] text-muted-foreground">{p.stats.length}</span>
      <button
        type="button"
        tabIndex={-1}
        aria-label={t('presets.deleteLabel', { name: presetName(p) })}
        title={t('presets.deleteTitle')}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(p);
        }}
        className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground/70 transition-colors hover:bg-destructive/15 hover:text-destructive group-data-[highlighted]:text-muted-foreground"
      >
        <Trash2 className="size-3" />
      </button>
    </DropdownMenuItem>
  );
  const sectionLabel = 'text-[10px] uppercase tracking-wider text-muted-foreground';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          aria-label={t('presets.menuLabel')}>
          <Sparkles className="size-3.5" />
          {t('presets.button')}
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end"
        className="max-h-80 w-64 overflow-y-auto">
        {user.length > 0 && (
          <>
            <DropdownMenuLabel className={sectionLabel}>{t('presets.yours')}</DropdownMenuLabel>
            {user.map(item)}
          </>
        )}
        {user.length > 0 && builtIn.length > 0 && <DropdownMenuSeparator />}
        {builtIn.length > 0 && (
          <>
            <DropdownMenuLabel className={sectionLabel}>{t('presets.builtIn')}</DropdownMenuLabel>
            {builtIn.map(item)}
          </>
        )}
        {user.length === 0 && builtIn.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">{t('presets.empty')}</p>
        )}
        {onRestore && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onRestore}
              className="text-xs text-muted-foreground">
              <RotateCcw className="size-3.5" />
              {t('presets.restore')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SavePresetButton({ disabled, onSave }: { disabled: boolean; onSave: (name: string) => void }) {
  const { t } = useTranslation(['market', 'common']);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
    setOpen(false);
  };
  return (
    <Popover open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="size-7 p-0"
          aria-label={t('presets.save')}
          title={t('presets.save')}
        >
          <BookmarkPlus className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end"
        className="w-60 p-2">
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            autoFocus
            aria-label={t('presets.name')}
            placeholder={t('presets.name')}
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldInputClass}
          />
          <Button type="submit"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={!name.trim()}>
            {t('common:actions.save')}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
