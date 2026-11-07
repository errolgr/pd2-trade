import { newStatFilter } from './defaults';
import type { StatFilter, Tri } from './types';

/** PD2's modifier on 5th Anniversary Edition items (the alternative skin), "5th Anniversary Edition" in its tooltip. */
export const ANNIVERSARY_KEY = 'item_shiny_appearance';

/**
 * The Properties "Anniversary skin" choice, read off the stat rows it is stored as (so saved searches, alerts and
 * the market service need nothing new): an enabled required row = yes, an enabled `not` row = no. A row in an
 * any-of block, or disabled, doesn't decide it.
 */
export function anniversaryTri(stats: readonly StatFilter[]): Tri {
  const rows = stats.filter((s) => s.kind === 'mod' && s.key === ANNIVERSARY_KEY && s.enabled && s.or === undefined);
  if (rows.some((s) => !s.not)) return 'yes';
  if (rows.some((s) => s.not)) return 'no';
  return 'any';
}

/** `stats` with the anniversary choice set to `value`: its rows replaced by one required (yes) or `not` (no) row. */
export function withAnniversary(stats: readonly StatFilter[], value: Tri): StatFilter[] {
  const rest = stats.filter((s) => !(s.kind === 'mod' && s.key === ANNIVERSARY_KEY));
  if (value === 'any') return rest;
  return [...rest, newStatFilter({ kind: 'mod', key: ANNIVERSARY_KEY, ...(value === 'no' ? { not: true } : {}) })];
}
