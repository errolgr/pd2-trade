import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookmarkPlus, ChevronDown, Sigma, Sparkles, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { newStatFilter } from '../lib/defaults';
import { isPseudo, searchStats } from '../lib/stats';
import type { PseudoDef, StatFilter, StatOption, StatPreset } from '../lib/types';
import { Autocomplete, NumberInput, fieldInputClass } from './controls';
import { statName, templateName } from './stat-text';

const MAX_SUGGESTIONS = 40;

type StatChoice = StatOption | PseudoDef;
const choiceKey = (choice: StatChoice) => (isPseudo(choice) ? choice.id : choice.key);

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

export interface StatFiltersProps {
  stats: StatFilter[];
  onChange: (stats: StatFilter[]) => void;
  builtInPresets: StatPreset[];
  userPresets: StatPreset[];
  onApplyPreset: (preset: StatPreset) => void;
  onSavePreset: (name: string) => void;
  onRemovePreset: (preset: StatPreset) => void;
  searchRef?: React.Ref<HTMLInputElement>;
  /** A row just added/updated from a mod menu: scrolled into view and highlighted (`nonce`: each request). */
  highlight?: { id: string; nonce: number } | null;
}

/** Stats section: one search over mods + pseudo stats, rows with min/max/enable, presets. */
export function StatFilters({
  stats,
  onChange,
  builtInPresets,
  userPresets,
  onApplyPreset,
  onSavePreset,
  onRemovePreset,
  searchRef,
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
    onChange([...stats, newStatFilter({ kind: isPseudo(choice) ? 'pseudo' : 'mod', key })]);
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
          <AnimatePresence initial={false}>
            {stats.map((s) => {
              const name = statName(s.key);
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
                  <div className="relative space-y-1 px-1.5 py-1">
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
                    <div className="grid grid-cols-2 gap-1 pl-5">
                      <StatNumber label="Min"
                        name={name}
                        value={s.min}
                        onChange={(min) => update(s.id, { min })} />
                      <StatNumber label="Max"
                        name={name}
                        value={s.max}
                        onChange={(max) => update(s.id, { max })} />
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
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
