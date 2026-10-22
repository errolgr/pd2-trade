import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookmarkPlus, ChevronDown, RotateCcw, Sigma, Sparkles, Trash2, X } from 'lucide-react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CORRUPTION_OPTIONS, corruptionOption } from '../lib/catalog';
import { newStatFilter } from '../lib/defaults';
import { isCorruption, isPseudo, searchStats, type StatChoice } from '../lib/stats';
import type { StatFilter, StatPreset } from '../lib/types';
import { Autocomplete, NumberInput, fieldInputClass } from './controls';
import { filterName, templateName } from './stat-text';

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
  return (
    <label className="flex min-w-0 items-center gap-1">
      <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <NumberInput
        ariaLabel={`${name} ${label.toLowerCase()}`}
        value={value}
        onChange={onChange}
        className="h-6 px-1 text-center"
      />
    </label>
  );
}

/** Marks a corruption row / picker entry. */
function CorruptionBadge() {
  return (
    <span
      title="Cube corruption"
      className="shrink-0 rounded-sm border border-q-corrupted/40 bg-q-corrupted/10 px-1 text-[9px] leading-4 font-semibold tracking-wide text-q-corrupted uppercase"
    >
      Corr
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
const TABS: { id: StatTab; label: string }[] = [
  { id: 'mod', label: 'Mods' },
  { id: 'pseudo', label: 'Pseudo' },
  { id: 'corruption', label: 'Corruptions' },
];
const tabOf = (choice: StatChoice): StatTab => (isPseudo(choice) ? 'pseudo' : isCorruption(choice) ? 'corruption' : 'mod');

/** Corruption rows after the stat rows (stable otherwise), so the two kinds don't interleave. */
const statsFirst = (rows: StatFilter[]) =>
  [...rows].sort((a, b) => Number(a.kind === 'corruption') - Number(b.kind === 'corruption'));

/**
 * Stats section: one search over mods, pseudo stats and cube corruptions, split into tabs (Tab / Shift+Tab
 * switch; the tab of the best match opens first); rows with min/max, enable and AND/OR (the OR rows form one
 * "any of" group), corruption rows last with a red edge; presets.
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
  const [query, setQuery] = useState('');
  const [pickedTab, setPickedTab] = useState<StatTab | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!highlight) return;
    listRef.current
      ?.querySelector(`[data-stat-id="${CSS.escape(highlight.id)}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlight]);
  const matches = useMemo(
    () => (query.trim() ? searchStats(query, MAX_SUGGESTIONS * 3, CORRUPTION_OPTIONS) : []),
    [query],
  );
  const counts = useMemo(() => {
    const c: Record<StatTab, number> = { mod: 0, pseudo: 0, corruption: 0 };
    for (const m of matches) c[tabOf(m)] += 1;
    return c;
  }, [matches]);
  // The tab the user picked while it has matches, else the best match's tab
  const tab: StatTab = pickedTab && counts[pickedTab] > 0 ? pickedTab : matches[0] ? tabOf(matches[0]) : 'mod';
  const suggestions = useMemo(
    () => matches.filter((m) => tabOf(m) === tab).slice(0, MAX_SUGGESTIONS),
    [matches, tab],
  );
  const cycleTab = (step: 1 | -1) => {
    const open = TABS.filter((t) => counts[t.id] > 0);
    if (open.length < 2) return;
    const at = open.findIndex((t) => t.id === tab);
    setPickedTab(open[(at + step + open.length) % open.length].id);
  };

  const add = (choice: StatChoice) => {
    setQuery('');
    setPickedTab(null);
    const row = isPseudo(choice)
      ? { kind: 'pseudo' as const, key: choice.id }
      : isCorruption(choice)
        ? { kind: 'corruption' as const, key: choice.value }
        : { kind: 'mod' as const, key: choice.key };
    onChange([...stats, newStatFilter(row)]);
  };
  const update = (id: string, changes: Partial<StatFilter>) =>
    onChange(stats.map((s) => (s.id === id ? { ...s, ...changes } : s)));

  const required = statsFirst(stats.filter((s) => !s.or));
  const anyOf = statsFirst(stats.filter((s) => s.or));
  const enabledAnyOf = anyOf.filter((s) => s.enabled).length;

  const renderRow = (s: StatFilter) => {
    const name = filterName(s);
    const corruption = s.kind === 'corruption';
    const bounded = !corruption || corruptionOption(s.key).rolled;
    return (
      <motion.li
        key={s.id}
        data-stat-id={s.id}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: s.enabled ? 1 : 0.55, height: 'auto' }}
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
        {corruption && (
          <span aria-hidden
            className="absolute inset-y-0 left-0 w-0.5 bg-q-corrupted" />
        )}
        <div className="relative space-y-1 py-1 pr-0.5 pl-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <Checkbox
              checked={s.enabled}
              aria-label={`${s.enabled ? 'Disable' : 'Enable'} ${name}`}
              onCheckedChange={(v) => update(s.id, { enabled: v === true })}
              className="size-3.5"
            />
            {s.kind === 'pseudo' && <Sigma className="size-3 shrink-0 text-info"
              aria-label="Pseudo stat" />}
            {corruption && <CorruptionBadge />}
            <span className="min-w-0 flex-1 truncate text-xs"
              title={name}>
              {name}
            </span>
            <button
              type="button"
              aria-pressed={!!s.or}
              aria-label={`${name}: ${s.or ? 'one of the any-of group (OR)' : 'required (AND)'}`}
              title={
                s.or
                  ? 'OR: at least one "Any of" row must match. Click to require this one (AND).'
                  : 'AND: required. Click to make it an alternative (OR).'
              }
              onClick={() => update(s.id, { or: s.or ? undefined : true })}
              className={cn(
                'inline-flex h-5 w-8 shrink-0 items-center justify-center rounded border text-[10px] font-semibold tracking-wide outline-none transition-colors duration-(--dur-fast) focus-visible:ring-2 focus-visible:ring-ring/60',
                s.or
                  ? 'border-info/50 bg-info/15 text-info hover:bg-info/25'
                  : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
              )}
            >
              {s.or ? 'OR' : 'AND'}
            </button>
            <button
              type="button"
              aria-label={`Remove ${name}`}
              title="Remove"
              onClick={() => onChange(stats.filter((x) => x.id !== s.id))}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:bg-destructive/15 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <X className="size-3.5" />
            </button>
          </div>
          {bounded ? (
            <div className="grid grid-cols-2 gap-1 pr-7 pl-5">
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
            <p className="pl-5 text-[10px] text-muted-foreground">Item has this corruption</p>
          )}
        </div>
      </motion.li>
    );
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Autocomplete<StatChoice>
          inputRef={searchRef}
          ariaLabel="Add a stat filter"
          placeholder="Add stat…  ( ? )"
          value={query}
          onQuery={(q) => {
            setQuery(q);
            if (!q.trim()) setPickedTab(null);
          }}
          options={suggestions}
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
            <div role="tablist"
              aria-label="Filter kind"
              className="mb-1 flex gap-0.5 border-b border-border pb-1">
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
                  {t.label}
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
                  aria-label="Pseudo stat" />
              ) : (
                <span className="size-3 shrink-0" />
              )}
              <span
                className={cn('min-w-0 flex-1 truncate', isCorruption(choice) && 'text-q-corrupted')}
                title={templateName(choice.label)}
              >
                {templateName(choice.label)}
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
          className="space-y-1.5">
          {required.length > 0 && (
            <ul className="divide-y divide-border/50 overflow-hidden rounded-md border border-border/60">
              <AnimatePresence initial={false}>{required.map(renderRow)}</AnimatePresence>
            </ul>
          )}
          {anyOf.length > 0 && (
            <section aria-label="Any of"
              className="overflow-hidden rounded-md border border-info/40 bg-info/5">
              <header className="flex items-baseline justify-between gap-2 border-b border-info/20 px-1.5 py-0.5">
                <span className="text-[10px] font-semibold tracking-wider text-info uppercase">Any of</span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {enabledAnyOf > 1 ? `at least 1 of ${enabledAnyOf} must match` : 'add another OR row'}
                </span>
              </header>
              <ul className="divide-y divide-border/50">
                <AnimatePresence initial={false}>{anyOf.map(renderRow)}</AnimatePresence>
              </ul>
            </section>
          )}
        </div>
      )}
      {stats.length === 0 && (
        <p className="px-0.5 text-[11px] leading-snug text-muted-foreground">
          Search mods, <Sigma className="inline size-3 text-info" /> pseudo stats (total resists, total life…) or
          corruptions, or start from a preset.
        </p>
      )}
    </div>
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
      <span className="min-w-0 flex-1 truncate">{p.name}</span>
      <span className="text-[10px] text-muted-foreground">{p.stats.length}</span>
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Delete preset ${p.name}`}
        title="Delete preset (Del)"
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
          aria-label="Stat presets">
          <Sparkles className="size-3.5" />
          Presets
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end"
        className="max-h-80 w-64 overflow-y-auto">
        {user.length > 0 && (
          <>
            <DropdownMenuLabel className={sectionLabel}>Your presets</DropdownMenuLabel>
            {user.map(item)}
          </>
        )}
        {user.length > 0 && builtIn.length > 0 && <DropdownMenuSeparator />}
        {builtIn.length > 0 && (
          <>
            <DropdownMenuLabel className={sectionLabel}>Built-in</DropdownMenuLabel>
            {builtIn.map(item)}
          </>
        )}
        {user.length === 0 && builtIn.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            No presets. Save the current stats with the bookmark.
          </p>
        )}
        {onRestore && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onRestore}
              className="text-xs text-muted-foreground">
              <RotateCcw className="size-3.5" />
              Restore default presets
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SavePresetButton({ disabled, onSave }: { disabled: boolean; onSave: (name: string) => void }) {
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
          aria-label="Save stats as preset"
          title="Save stats as preset"
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
            aria-label="Preset name"
            placeholder="Preset name"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldInputClass}
          />
          <Button type="submit"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={!name.trim()}>
            Save
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
