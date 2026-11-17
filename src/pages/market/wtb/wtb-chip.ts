/**
 * The price check's (and list item tab's) buyers chip: "{n} buyers · up to {offer}" beside the item name, the exact
 * matches with the stats the item meets, and the requests one stat away. Pure: no React.
 */
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { itemNameOption } from '../lib/catalog';
import { defaultFilters } from '../lib/defaults';
import { parseStatKey } from '../lib/stats';
import type { MarketFilters, StatFilter } from '../lib/types';
import { byBestOffer, formatOffer, requiredRows, wtbStatRows, type WtbItemMatch, type WtbRequest } from '../lib/wtb';
import { summaryRowText } from './wtb-text';

export interface BuyerChipModel {
  /** Requests the item exactly fills. */
  count: number;
  /** The best of their offers ("1 Ber"). */
  bestOffer: string;
}

/** The chip for the item's exact matches; null (no chip) without one. */
export function buyerChipModel(matches: readonly WtbItemMatch[]): BuyerChipModel | null {
  if (matches.length === 0) return null;
  const best = [...matches].sort(byBestOffer)[0];
  return { count: matches.length, bestOffer: formatOffer(best.request.offer) };
}

/** The item's value for a request's stat row, null when it has none (see statValueOf / itemRowValue). */
export type RowValue = (row: StatFilter) => number | null;

/** The item's value per stat key, from the price check's stat rows as market filters (`min` = the item's roll). */
export function itemStatValues(rows: readonly Pick<StatFilter, 'key' | 'min'>[]): ReadonlyMap<string, number> {
  return new Map(rows.flatMap((r) => (r.min !== undefined ? [[r.key, r.min] as const] : [])));
}

/** The item's value for a key: the same key, else a key sharing a name with it (`a|b` aliases). */
export function valueFor(key: string, values: ReadonlyMap<string, number>): number | null {
  const exact = values.get(key);
  if (exact !== undefined) return exact;
  const names = new Set(parseStatKey(key).names);
  for (const [k, v] of values) if (parseStatKey(k).names.some((n) => names.has(n))) return v;
  return null;
}

/** A RowValue over the price check's values by key. */
export const statValueOf =
  (values: ReadonlyMap<string, number>): RowValue =>
  (row) =>
    valueFor(row.key, values);

/** Whether the item's value meets a row's bounds (no value: not met). */
function meets(row: StatFilter, valueOf: RowValue): boolean {
  const v = valueOf(row);
  return v !== null && (row.min === undefined || v >= row.min) && (row.max === undefined || v <= row.max);
}

/** One stat a request wants, with the item's value. */
export interface MetStat {
  text: string;
  value: number | null;
}

/** The stat rows an exact match's item meets (every required one, nice-to-have ones `/match` says it has). */
export function metStats(match: WtbItemMatch, valueOf: RowValue): MetStat[] {
  const nice = new Map(match.niceToHave.map((n) => [n.id, n.met]));
  const required = new Set(requiredRows(match.request.filters, match.request.niceToHaveIds).map((r) => r.id));
  return wtbStatRows(match.request.filters)
    .filter((row) => required.has(row.id) || nice.get(row.id) === true)
    .map((row) => ({ text: summaryRowText(row), value: valueOf(row) }));
}

/** A request the item misses by exactly one required stat. */
export interface NearMiss {
  request: WtbRequest;
  /** The stat it needs ("+20 Faster Cast Rate"). */
  needs: string;
  /** The item's value for it, null when it has none. */
  yourValue: number | null;
}

/**
 * The overlapping requests (best offer first) the item misses by exactly one required stat, leaving out its exact
 * matches; requests missing two or more, or none (those are exact), don't count.
 */
export function nearMisses(
  requests: readonly WtbRequest[],
  valueOf: RowValue,
  exactIds: ReadonlySet<string>,
): NearMiss[] {
  return requests.flatMap((request) => {
    if (exactIds.has(request.id)) return [];
    const missing = requiredRows(request.filters, request.niceToHaveIds).filter((row) => !meets(row, valueOf));
    if (missing.length !== 1) return [];
    const [row] = missing;
    return [{ request, needs: summaryRowText(row), yourValue: valueOf(row) }];
  });
}

/**
 * A stash item's search scope for overlapping requests (the list item tab's "Almost"): its unique / set / runeword
 * name, else its base, in `realm`.
 */
export function stashItemSearch(
  item: Pick<GameStashItem, 'name' | 'base_code'>,
  realm: { ladder: boolean; hardcore: boolean },
): MarketFilters {
  const named = itemNameOption(item.name)?.quality;
  return {
    ...defaultFilters(realm),
    ...(named && named !== 'Base' ? { itemName: item.name } : { baseCode: item.base_code }),
  };
}
