import { useMemo, useState } from 'react';
import type { CallableSlotId, MarketFilter, MarketInput, MarketSort, SlotOutput } from '@pd2-trader/plugin-sdk';
import { type SlotResult, usePluginSlot } from '@/plugins/ui/hooks';
import {
  applyPluginView,
  cellsByRow,
  type PluginCell,
  pluginRows,
  rowsKey,
  toMarketQuery,
} from '@/plugins/adapters/market';
import type { MarketFilters, ScoredListing } from '../lib/types';

type MarketSlot = 'market.column' | 'market.filter' | 'market.sort';

export interface PluginSlotFailure {
  key: string;
  pluginName: string;
  error: string;
  retry: () => void;
}

export interface MarketPlugins {
  /** The results page with the active plugin filters and sort applied (`rows` itself when none apply). */
  rows: ScoredListing[];
  /** Row id → plugin cells (`market.column`). */
  cells: ReadonlyMap<string, PluginCell[]>;
  filters: Array<{ pluginId: string; label: string; active: boolean }>;
  toggleFilter: (pluginId: string) => void;
  sorts: Array<{ pluginId: string; label: string }>;
  /** The chosen plugin sort, or null for the search's own order. */
  sortId: string | null;
  setSortId: (pluginId: string | null) => void;
  failures: PluginSlotFailure[];
}

const NO_CELLS: ReadonlyMap<string, PluginCell[]> = new Map();

type Settled<S extends MarketSlot> = Array<{ pluginId: string; value: NonNullable<SlotOutput<S>> }>;

/** Ok values of `results`; plugins still loading keep their value from `prev`. */
function settle<S extends MarketSlot>(results: SlotResult<S>[], prev: Settled<S>): Settled<S> {
  const out: Settled<S> = [];
  for (const r of results) {
    if (r.state === 'ok') {
      if (r.value) out.push({ pluginId: r.pluginId, value: r.value as NonNullable<SlotOutput<S>> });
    } else if (r.state === 'loading') {
      const last = prev.find((p) => p.pluginId === r.pluginId);
      if (last) out.push(last);
    }
  }
  return out.length === 0 && prev.length === 0 ? prev : out;
}

/**
 * Last settled value per plugin: a slot re-running for an appended page keeps its previous output until the new
 * one lands, so active filters and columns don't flicker off for the 300 ms budget.
 */
function useSettled<S extends MarketSlot>(results: SlotResult<S>[]): Settled<S> {
  const [settled, setSettled] = useState(() => ({ from: results, values: settle(results, []) }));
  if (settled.from === results) return settled.values;
  // Adjusted during render (React's "store info from previous renders" pattern)
  const next = { from: results, values: settle(results, settled.values) };
  setSettled(next);
  return next.values;
}

function failuresOf<S extends CallableSlotId>(
  slot: S,
  results: SlotResult<S>[],
  retry: () => void,
): PluginSlotFailure[] {
  return results.flatMap((r) =>
    r.state === 'error' ? [{ key: `${slot}:${r.pluginId}`, pluginName: r.pluginName, error: r.error, retry }] : [],
  );
}

/**
 * `market.column` / `market.filter` / `market.sort` for one results page: each slot is called once per page (the
 * loaded rows, keyed by their ids), never per row, and not at all while no running plugin implements it.
 */
export function useMarketPlugins(rows: ScoredListing[], query: MarketFilters | null): MarketPlugins {
  const input = useMemo<(() => MarketInput) | null>(
    () => (rows.length && query ? () => ({ rows: pluginRows(rows), query: toMarketQuery(query) }) : null),
    [rows, query],
  );
  const rowIds = useMemo(() => rowsKey(rows), [rows]);
  const queryKey = query ? `${query.source}|${query.ladder}|${query.hardcore}|${query.itemName ?? ''}` : '';
  const slotKey = `${queryKey}#${rowIds}`;

  const column = usePluginSlot('market.column', input, slotKey);
  const filter = usePluginSlot('market.filter', input, slotKey);
  const sort = usePluginSlot('market.sort', input, slotKey);
  const columns = useSettled(column.results);
  const filterValues = useSettled(filter.results);
  const sortValues = useSettled(sort.results);

  const [activeFilters, setActiveFilters] = useState<ReadonlySet<string>>(() => new Set());
  const [sortId, setSortId] = useState<string | null>(null);

  const cells = useMemo(
    () => (columns.length ? cellsByRow(columns.map((c) => ({ pluginId: c.pluginId, column: c.value }))) : NO_CELLS),
    [columns],
  );
  const applied = useMemo(() => {
    const on: MarketFilter[] = filterValues.filter((f) => activeFilters.has(f.pluginId)).map((f) => f.value);
    const chosen: MarketSort | null = sortValues.find((s) => s.pluginId === sortId)?.value ?? null;
    return applyPluginView(rows, on, chosen);
  }, [rows, filterValues, sortValues, activeFilters, sortId]);

  const failures = useMemo(
    () => [
      ...failuresOf('market.column', column.results, column.retry),
      ...failuresOf('market.filter', filter.results, filter.retry),
      ...failuresOf('market.sort', sort.results, sort.retry),
    ],
    [column.results, column.retry, filter.results, filter.retry, sort.results, sort.retry],
  );

  return {
    rows: applied,
    cells,
    filters: filterValues.map((f) => ({
      pluginId: f.pluginId,
      label: f.value.label,
      active: activeFilters.has(f.pluginId),
    })),
    toggleFilter: (pluginId) =>
      setActiveFilters((prev) => {
        const next = new Set(prev);
        if (!next.delete(pluginId)) next.add(pluginId);
        return next;
      }),
    sorts: sortValues.map((s) => ({ pluginId: s.pluginId, label: s.value.label })),
    sortId: sortValues.some((s) => s.pluginId === sortId) ? sortId : null,
    setSortId,
    failures,
  };
}
