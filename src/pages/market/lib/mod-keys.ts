import type { Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { PSEUDO_STATS } from './pseudo';
import { parseStatKey, STAT_OPTIONS } from './stats';
import type { PseudoDef, StatFilter } from './types';

/*
 * Item mod line → the site's property key (the inverse of `parseStatKey` / `modMatchesStatKey`), so any mod on a
 * card can become a stat filter or a sort key. Only keys the site's property list knows are returned: the server
 * can only filter on those.
 */

/** Option keys by every modifier name they cover (`a|b` alternatives listed under each name). */
let keysByName: Map<string, string[]> | null = null;

function optionKeysFor(name: string): string[] {
  if (!keysByName) {
    keysByName = new Map();
    for (const { key } of STAT_OPTIONS) {
      for (const n of parseStatKey(key).names) {
        const list = keysByName.get(n);
        if (list) list.push(key);
        else keysByName.set(n, [key]);
      }
    }
  }
  return keysByName.get(name) ?? [];
}

/**
 * The property key selecting this mod line, e.g. `item_fastercastrate`, `item_singleskill{54}` (params pinned),
 * `max_damage|maxdamage|…` (the alternatives option that lists the name); null when the site can't filter it.
 * With several matches the most specific (most pinned params) wins.
 */
export function modToStatKey(mod: Pick<Modifier, 'name' | 'values'>): string | null {
  let best: { key: string; params: number } | null = null;
  for (const key of optionKeysFor(mod.name)) {
    const { params, valueIndex } = parseStatKey(key);
    if (params.some((p, i) => mod.values?.[i] !== p)) continue;
    if (typeof mod.values?.[valueIndex] !== 'number') continue;
    if (!best || params.length > best.params) best = { key, params: params.length };
  }
  return best?.key ?? null;
}

/** The value a filter on `key` reads from this mod line (the roll after any pinned params). */
export function modStatValue(mod: Pick<Modifier, 'values'>, key: string): number | null {
  const value = mod.values?.[parseStatKey(key).valueIndex];
  return typeof value === 'number' ? value : null;
}

/** Pseudo stats this mod line feeds (fire resist → Total Resistances, Total Fire Resistance…). */
export function coveringPseudos(mod: Modifier): PseudoDef[] {
  return PSEUDO_STATS.filter((p) => p.compute([mod]) !== 0);
}

/**
 * Add `row` to `stats`, or update the row already filtering the same stat (same kind + key) in place; returns
 * the new list and the id of the touched row.
 */
export function mergeStatFilter(
  stats: StatFilter[],
  row: Omit<StatFilter, 'id' | 'enabled'> & { enabled?: boolean },
  newId: () => string = () => crypto.randomUUID(),
): { stats: StatFilter[]; id: string } {
  const existing = stats.find((s) => s.kind === row.kind && s.key === row.key);
  if (existing) {
    const updated: StatFilter = { ...existing, ...row, id: existing.id, enabled: row.enabled ?? true };
    return { stats: stats.map((s) => (s.id === existing.id ? updated : s)), id: existing.id };
  }
  const id = newId();
  return { stats: [...stats, { ...row, id, enabled: row.enabled ?? true }], id };
}

/** Fill margin as the price check applies it (Settings → stat fill): percent of the value, or flat. */
export function fillMargin(value: number, fill: { amount: number; unit: 'percent' | 'flat' }): number {
  if (fill.unit === 'flat') return fill.amount;
  return Math.ceil(Math.abs(value) * (fill.amount / 100));
}

/** Skill procs and charges: a level/chance on a skill, not a stat worth a minimum. */
const PROC_MODS = /^item_(skillon\w+|charged_skill)$/;

/**
 * Is this line useful as an "add all" filter? No for flags (Knockback, Cannot Be Frozen, Indestructible: their
 * label carries no number), skill procs/charges and per-character-level lines.
 */
export function isUsefulFilterLine(mod: Pick<Modifier, 'name' | 'label'>): boolean {
  if (mod.name === 'corrupted' || PROC_MODS.test(mod.name)) return false;
  if (/_perlevel$/.test(mod.name) || /Based on Character Level/i.test(mod.label)) return false;
  return /\d/.test(mod.label);
}

/**
 * One `≥` filter row per useful, filterable mod line of an item ("add all mods as filters"): min = value − fill
 * margin, kept inside the roll range; flags, procs, per-level lines, unfilterable lines and duplicates are skipped.
 */
export function modsAsFilters(
  mods: Modifier[],
  fill: { amount: number; unit: 'percent' | 'flat'; leaveMinEmpty?: boolean },
): Omit<StatFilter, 'id' | 'enabled'>[] {
  const rows: Omit<StatFilter, 'id' | 'enabled'>[] = [];
  const seen = new Set<string>();
  for (const mod of mods) {
    if (!isUsefulFilterLine(mod)) continue;
    const key = modToStatKey(mod);
    if (!key || seen.has(key)) continue;
    const value = modStatValue(mod, key);
    if (value === null) continue;
    seen.add(key);
    // Negative lines (requirements −15%) are "better when lower": a min bound would be wrong
    if (value <= 0 || fill.leaveMinEmpty) {
      rows.push({ kind: 'mod', key });
      continue;
    }
    let min = value - fillMargin(value, fill);
    if (typeof mod.min === 'number' && typeof mod.max === 'number') min = Math.max(min, Math.min(mod.min, mod.max));
    rows.push({ kind: 'mod', key, min: Math.max(0, min) });
  }
  return rows;
}
