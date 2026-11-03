import type { MarketColumn, MarketFilter, MarketQuery, MarketRow, MarketSort, PluginItemStat, Tone } from '@pd2-trader/plugin-sdk';
import type { MarketFilters, ScoredListing } from '@/pages/market/lib/types';
import { statIdToProperty } from '@/pages/price-check/lib/stat-mappings';
import { isUserOnlineIngame } from '@/lib/user-online-status';

/** Plain JSON views of market rows for `market.*` slots, and the pure application of plugin filters/sorts. */

/** Slot outputs cap row ids at 500; a page never sends more rows than a plugin may answer for. */
export const MAX_PLUGIN_ROWS = 500;

let statIdByProperty: Map<string, number> | null = null;

/** Market modifier name (a PD2 property, e.g. `maxhp`) → game stat id; -1 for properties with no stat id. */
function statIdOf(property: string): number {
  if (!statIdByProperty) {
    statIdByProperty = new Map();
    for (const [id, name] of Object.entries(statIdToProperty))
      if (!statIdByProperty.has(name)) statIdByProperty.set(name, Number(id));
  }
  return statIdByProperty.get(property) ?? -1;
}

export function toMarketRow(row: ScoredListing): MarketRow {
  const { listing } = row;
  const { item } = listing;
  const stats = (item.modifiers ?? [])
    .filter((m) => m.label && m.name !== 'corrupted')
    .sort((a, b) => b.priority - a.priority)
    .map(
      (m): PluginItemStat => ({
        id: statIdOf(m.name),
        text: m.label,
        ...(Number.isFinite(m.values?.[0]) && { value: m.values[0] }),
        ...(m.corrupted && { corrupted: true }),
      }),
    );
  return {
    id: listing._id,
    name: item.name || item.base?.name || '',
    base: item.base?.name ?? '',
    quality: (item.quality?.name ?? '').toLowerCase(),
    priceHr: listing.hr_price > 0 ? listing.hr_price : null,
    priceText: listing.price ?? '',
    seller: listing.user?.username ?? '',
    online: isUserOnlineIngame(listing.user_last_ingame),
    listedAt: row.listedAt || listing.created_at || '',
    stats,
  };
}

export function toMarketQuery(filters: MarketFilters): MarketQuery {
  return {
    ladder: filters.ladder,
    hardcore: filters.hardcore,
    source: filters.source,
    ...(filters.itemName && { itemName: filters.itemName }),
  };
}

/** Rows a page sends to plugins (the first MAX_PLUGIN_ROWS). */
export function pluginRows(rows: ScoredListing[]): MarketRow[] {
  return rows.slice(0, MAX_PLUGIN_ROWS).map(toMarketRow);
}

/** Slot re-run key of a results page: its row ids. */
export function rowsKey(rows: ScoredListing[]): string {
  return rows
    .slice(0, MAX_PLUGIN_ROWS)
    .map((r) => r.listing._id)
    .join(',');
}

/** One plugin's cell of a row, for the row/card renderers. */
export interface PluginCell {
  pluginId: string;
  title: string;
  text: string;
  tone?: Tone;
}

/** Row id → that row's plugin cells, in plugin order (rows without a cell are absent). */
export function cellsByRow(columns: Array<{ pluginId: string; column: MarketColumn }>): Map<string, PluginCell[]> {
  const out = new Map<string, PluginCell[]>();
  for (const { pluginId, column } of columns) {
    for (const [rowId, cell] of Object.entries(column.cells)) {
      if (!cell.text) continue;
      const list = out.get(rowId) ?? [];
      list.push({ pluginId, title: column.title, text: cell.text, ...(cell.tone && { tone: cell.tone }) });
      out.set(rowId, list);
    }
  }
  return out;
}

/**
 * Applies the user's active plugin filters (a row stays only if every active filter keeps it) and the chosen
 * plugin sort (score desc, stable; rows without a score last). Returns `rows` itself when nothing applies.
 */
export function applyPluginView(
  rows: ScoredListing[],
  filters: MarketFilter[],
  sort: MarketSort | null,
): ScoredListing[] {
  let out = rows;
  if (filters.length) {
    const keeps = filters.map((f) => new Set(f.keep));
    out = out.filter((r) => keeps.every((keep) => keep.has(r.listing._id)));
  }
  if (sort) {
    const { scores } = sort;
    const scored = out.map((row, index) => ({ row, index, score: scores[row.listing._id] }));
    scored.sort((a, b) => {
      const sa = Number.isFinite(a.score) ? a.score : null;
      const sb = Number.isFinite(b.score) ? b.score : null;
      if (sa === null || sb === null) return sa === sb ? a.index - b.index : sa === null ? 1 : -1;
      return sb - sa || a.index - b.index;
    });
    out = scored.map((s) => s.row);
  }
  return out;
}
