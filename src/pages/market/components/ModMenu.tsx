import React, { createContext, useContext, useMemo, useState } from 'react';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Filter, ListFilter, Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ItemDetail, Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { coveringPseudos, modStatValue, modToStatKey, modsAsFilters } from '../lib/mod-keys';
import { computePseudo } from '../lib/pseudo';
import { readStatValue } from '../lib/stats';
import type { StatFilter } from '../lib/types';
import { formatStat, statName, templateName } from './stat-text';

/** Filter row to merge (by kind + key) into the current search. */
export type StatFilterRow = Omit<StatFilter, 'id' | 'enabled'>;

/** What the mod-line menus and "add all mods" act on; provided by the market page. */
export interface ModActionsApi {
  /** Merge rows into the stat filters (update by key), toast "Added filter: …" with Undo, highlight the row. */
  addFilters: (rows: StatFilterRow[], description: string) => void;
  /** Sort the results by this stat (`sort: { by: 'stat', key, dir }`). */
  sortByStat: (key: string, dir: 'asc' | 'desc') => void;
  /** Price-check fill settings ("add all mods": min = value − margin). */
  fill: { amount: number; unit: 'percent' | 'flat'; leaveMinEmpty?: boolean };
}

const ModActionsContext = createContext<ModActionsApi | null>(null);
export const ModActionsProvider = ModActionsContext.Provider;

/** Most pseudo stats a menu offers for one line. */
const MAX_PSEUDO_ITEMS = 3;

/**
 * A mod line that opens the filter/sort menu on click, right-click or Enter. `item` is the listed item (pseudo
 * totals come from it). `socketLine`: the line belongs to a socketed item, so "Filter ≥" uses the listed item's
 * merged total for that stat (what the server filters on) and range/exact are not offered. Lines the site can't
 * filter, or outside the market page, render as they are.
 */
export function ModMenu({
  mod,
  item,
  socketLine = false,
  className,
  children,
}: {
  mod: Modifier;
  item: Pick<ItemDetail, 'modifiers'>;
  socketLine?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const actions = useContext(ModActionsContext);
  const [open, setOpen] = useState(false);
  const key = useMemo(() => modToStatKey(mod), [mod]);
  const pseudos = useMemo(() => coveringPseudos(mod).slice(0, MAX_PSEUDO_ITEMS), [mod]);
  if (!actions || (!key && pseudos.length === 0)) return <div className={className}>{children}</div>;

  const value = !key ? null : socketLine ? readStatValue(item.modifiers, key) : modStatValue(mod, key);
  const name = key ? statName(key) : templateName(mod.label);
  const ranged = !socketLine && typeof mod.min === 'number' && typeof mod.max === 'number' && mod.min !== mod.max;
  const lo = ranged ? Math.min(mod.min as number, mod.max as number) : 0;
  const hi = ranged ? Math.max(mod.min as number, mod.max as number) : 0;
  const pseudoTotals = pseudos.length ? computePseudo(item) : {};

  return (
    <DropdownMenu open={open}
      onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div
          tabIndex={0}
          title="Filter or sort by this stat"
          onContextMenu={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
          className={cn(
            'cursor-pointer outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-muted/60',
            className,
          )}
        >
          {children}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start"
        className="w-72 text-xs"
        onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="truncate text-[11px] text-muted-foreground">{name}</DropdownMenuLabel>
        {key && value !== null && (
          <>
            <DropdownMenuItem
              onSelect={() => actions.addFilters([{ kind: 'mod', key, min: value }], `${name} ≥ ${formatStat(value)}`)}
            >
              <Filter className="size-3.5" />
              {socketLine ? `Filter ${name} ≥ ${formatStat(value)} (item total)` : `Filter ≥ ${formatStat(value)}`}
            </DropdownMenuItem>
            {ranged && (
              <DropdownMenuItem
                onSelect={() => actions.addFilters([{ kind: 'mod', key, min: lo, max: hi }], `${name} ${lo}–${hi}`)}
              >
                <Filter className="size-3.5" />
                {`Filter ${lo}–${hi} range`}
              </DropdownMenuItem>
            )}
            {!socketLine && (
              <DropdownMenuItem
                onSelect={() =>
                  actions.addFilters([{ kind: 'mod', key, min: value, max: value }], `${name} = ${formatStat(value)}`)
                }
              >
                <Filter className="size-3.5" />
                {`Filter exactly ${formatStat(value)}`}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        {key && (
          <>
            <DropdownMenuItem onSelect={() => actions.sortByStat(key, 'desc')}>
              <ArrowDownWideNarrow className="size-3.5" />
              Sort by this ↓
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => actions.sortByStat(key, 'asc')}>
              <ArrowUpNarrowWide className="size-3.5" />
              Sort by this ↑
            </DropdownMenuItem>
          </>
        )}
        {pseudos.length > 0 && (
          <>
            {key && <DropdownMenuSeparator />}
            {pseudos.map((p) => {
              const total = pseudoTotals[p.id] ?? 0;
              const pseudoName = templateName(p.label);
              return (
                <DropdownMenuItem
                  key={p.id}
                  onSelect={() =>
                    actions.addFilters(
                      [{ kind: 'pseudo', key: p.id, min: total }],
                      `${pseudoName} ≥ ${formatStat(total)}`,
                    )
                  }
                >
                  <Sigma className="size-3.5 text-info" />
                  <span className="min-w-0">{`Filter ${pseudoName} ≥ ${formatStat(total)}`}</span>
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "Add all mods as filters": one ≥ row per filterable line (price-check fill margin), merged by key. */
export function AddAllModsButton({
  item,
  className,
  label,
}: {
  item: Pick<ItemDetail, 'name' | 'modifiers'>;
  className?: string;
  /** Text next to the icon (icon-only without). */
  label?: string;
}) {
  const actions = useContext(ModActionsContext);
  if (!actions) return null;
  const rows = modsAsFilters(item.modifiers ?? [], actions.fill);
  if (rows.length === 0) return null;
  return (
    <button
      type="button"
      className={className}
      title={`Add all ${rows.length} mods as stat filters`}
      aria-label="Add all mods as filters"
      onClick={(e) => {
        e.stopPropagation();
        actions.addFilters(rows, `${rows.length} stats from ${item.name}`);
      }}
    >
      <ListFilter className="size-3" />
      {label}
    </button>
  );
}
