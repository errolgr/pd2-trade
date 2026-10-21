import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookmarkPlus, ChevronDown, Sigma, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { newStatFilter } from '../lib/defaults';
import { isPseudo, searchStats } from '../lib/stats';
import type { PseudoDef, StatFilter, StatOption, StatPreset } from '../lib/types';
import { Autocomplete, NumberInput, fieldInputClass } from './controls';
import { statName, templateName } from './stat-text';

const MAX_SUGGESTIONS = 40;

type StatChoice = StatOption | PseudoDef;
const choiceKey = (choice: StatChoice) => (isPseudo(choice) ? choice.id : choice.key);

/** "Min [  ]" — a stat bound/weight input with its caption inside the row's second line. */
function StatNumber({
  label,
  name,
  value,
  onChange,
  step,
  muted,
  title,
}: {
  label: string;
  name: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: number;
  muted?: boolean;
  title?: string;
}) {
  return (
    <label className="flex min-w-0 items-center gap-1"
      title={title}>
      <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <NumberInput
        ariaLabel={`${name} ${label === 'Wt' ? 'weight' : label.toLowerCase()}`}
        value={value}
        step={step}
        onChange={onChange}
        className={cn('h-6 px-1 text-center', muted && 'text-muted-foreground')}
      />
    </label>
  );
}

export interface StatFiltersProps {
  stats: StatFilter[];
  onChange: (stats: StatFilter[]) => void;
  builtInPresets: StatPreset[];
  userPresets: StatPreset[];
  onApplyPreset: (preset: StatPreset) => void;
  onSavePreset: (name: string) => void;
  onRemovePreset: (preset: StatPreset) => void;
  /** User's remembered weight per stat key, used for newly added rows. */
  defaultWeight: (key: string) => number | undefined;
  /** Weights only matter for score/value sorts; rows say so otherwise. */
  weighted: boolean;
  searchRef?: React.Ref<HTMLInputElement>;
  /** Remember a weight the user typed as the default for that stat. */
  onWeightChange?: (key: string, weight: number | undefined) => void;
  /** A row just added/updated from a mod menu: scrolled into view and highlighted (`nonce`: each request). */
  highlight?: { id: string; nonce: number } | null;
}

/** Stats section: one search over mods + pseudo stats, rows with min/max/weight/enable, presets. */
export function StatFilters({
  stats,
  onChange,
  builtInPresets,
  userPresets,
  onApplyPreset,
  onSavePreset,
  onRemovePreset,
  defaultWeight,
  weighted,
  searchRef,
  onWeightChange,
  highlight,
}: StatFiltersProps) {
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (!highlight) return;
    listRef.current
      ?.querySelector(`[data-stat-id="${CSS.escape(highlight.id)}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlight]);
  const suggestions = useMemo(() => (query.trim() ? searchStats(query, MAX_SUGGESTIONS) : []), [query]);

  const add = (choice: StatChoice) => {
    const key = choiceKey(choice);
    setQuery('');
    onChange([...stats, newStatFilter({ kind: isPseudo(choice) ? 'pseudo' : 'mod', key, weight: defaultWeight(key) })]);
  };
  const update = (id: string, changes: Partial<StatFilter>) =>
    onChange(stats.map((s) => (s.id === id ? { ...s, ...changes } : s)));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Autocomplete<StatChoice>
          inputRef={searchRef}
          ariaLabel="Add a stat filter"
          placeholder="Add stat…  ( / )"
          value={query}
          onQuery={setQuery}
          options={suggestions}
          optionKey={choiceKey}
          onPick={add}
          className="flex-1"
          renderOption={(choice) => (
            <span className="flex items-center gap-1.5">
              {isPseudo(choice) ? (
                <Sigma className="size-3 shrink-0 text-info"
                  aria-label="Pseudo stat" />
              ) : (
                <span className="size-3 shrink-0" />
              )}
              <span className="min-w-0 flex-1 truncate">{templateName(choice.label)}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{choice.group}</span>
            </span>
          )}
        />
        <PresetMenu builtIn={builtInPresets}
          user={userPresets}
          onApply={onApplyPreset}
          onRemove={onRemovePreset} />
        <SavePresetButton disabled={stats.length === 0}
          onSave={onSavePreset} />
      </div>

      {stats.length > 0 && (
        <ul ref={listRef}
          className="divide-y divide-border/50 overflow-hidden rounded-md border border-border/60">
          {stats.map((s) => {
            const name = statName(s.key);
            return (
              <li
                key={s.id}
                data-stat-id={s.id}
                className={cn(
                  'space-y-1 px-1.5 py-1 transition-colors duration-(--dur-med)',
                  !s.enabled && 'opacity-55',
                  highlight?.id === s.id && 'bg-primary/10 ring-1 ring-inset ring-primary/40',
                )}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <Checkbox
                    checked={s.enabled}
                    aria-label={`${s.enabled ? 'Disable' : 'Enable'} ${name}`}
                    onCheckedChange={(v) => update(s.id, { enabled: v === true })}
                    className="size-3.5"
                  />
                  {s.kind === 'pseudo' && <Sigma className="size-3 shrink-0 text-info"
                    aria-label="Pseudo stat" />}
                  <span className="min-w-0 flex-1 truncate text-xs"
                    title={name}>
                    {name}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    onClick={() => onChange(stats.filter((x) => x.id !== s.id))}
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <X className="size-3" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1 pl-5">
                  <StatNumber label="Min"
                    name={name}
                    value={s.min}
                    onChange={(min) => update(s.id, { min })} />
                  <StatNumber label="Max"
                    name={name}
                    value={s.max}
                    onChange={(max) => update(s.id, { max })} />
                  <StatNumber
                    label="Wt"
                    title={
                      weighted ? 'Weight: score = Σ weight × value' : 'Weight (used when sorting by Score or Value)'
                    }
                    name={name}
                    value={s.weight}
                    step={0.5}
                    muted={!weighted}
                    onChange={(weight) => {
                      update(s.id, { weight });
                      onWeightChange?.(s.key, weight);
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {stats.length === 0 && (
        <p className="px-0.5 text-[11px] leading-snug text-muted-foreground">
          Search mods or <Sigma className="inline size-3 text-info" /> pseudo stats (total resists, total life…), or
          start from a preset.
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
}: {
  builtIn: StatPreset[];
  user: StatPreset[];
  onApply: (preset: StatPreset) => void;
  onRemove: (preset: StatPreset) => void;
}) {
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
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Your presets
            </DropdownMenuLabel>
            {user.map((p) => (
              <DropdownMenuItem key={p.id}
                onSelect={() => onApply(p)}
                className="group text-xs">
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="text-[10px] text-muted-foreground">{p.stats.length}</span>
                <button
                  type="button"
                  aria-label={`Delete preset ${p.name}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove(p);
                  }}
                  className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                >
                  <Trash2 className="size-3" />
                </button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Built-in
        </DropdownMenuLabel>
        {builtIn.map((p) => (
          <DropdownMenuItem key={p.id}
            onSelect={() => onApply(p)}
            className="text-xs">
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            <span className="text-[10px] text-muted-foreground">{p.stats.length}</span>
          </DropdownMenuItem>
        ))}
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
