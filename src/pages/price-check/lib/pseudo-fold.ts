/**
 * Σ totals on the price check's stat rows: a resist row's Σ chip offers the market's resistance pseudo stats
 * (`pseudo_*_res`, see market/lib/pseudo.ts) that row feeds. Picking one folds the rows the total fully covers
 * into a single Σ row (stat_id StatId.Pseudo), searched on the market service; unfolding brings them back.
 */
import type { Stat } from './interfaces';
import { StatId } from './stat-mappings';
import { getStatKey } from './utils';

export interface PseudoOption {
  /** Market pseudo stat id, e.g. `pseudo_total_res`. */
  id: string;
  name: string;
  value: number;
  /** Row keys the total fully covers: folded into the Σ row. */
  covers: string[];
}

const ELEMENTS = [
  { id: 'pseudo_fire_res', name: 'Total Fire Resist', statId: 39 },
  { id: 'pseudo_cold_res', name: 'Total Cold Resist', statId: 43 },
  { id: 'pseudo_light_res', name: 'Total Lightning Resist', statId: 41 },
  { id: 'pseudo_poison_res', name: 'Total Poison Resist', statId: 45 },
] as const;

const ALL_RES_KEY = `id:${StatId.AllResistances}`;

/**
 * The Σ totals for an item's rows (buildStatRows output), all-resist line counted into every element, as the
 * market service computes them. Element totals cover only their own line: All Resistances also feeds the other
 * elements. None for an item without resists.
 */
export function pseudoOptions(rows: Stat[]): PseudoOption[] {
  const allRes = rows.find((s) => s.stat_id === StatId.AllResistances)?.value ?? 0;
  const elements = ELEMENTS.map((e) => ({
    ...e,
    value: allRes + rows.reduce((n, s) => (s.stat_id === e.statId ? n + (s.value ?? 0) : n), 0),
  }));
  const resistKeys = [...new Set(rows.map(getStatKey))].filter(
    (key) => key === ALL_RES_KEY || ELEMENTS.some((e) => key === `id:${e.statId}`),
  );
  if (resistKeys.length === 0) return [];
  return [
    {
      id: 'pseudo_total_res',
      name: 'Total Resistances',
      value: elements.reduce((n, e) => n + e.value, 0),
      covers: resistKeys,
    },
    {
      id: 'pseudo_all_res',
      name: 'All Resistances (lowest)',
      value: Math.min(...elements.map((e) => e.value)),
      covers: resistKeys,
    },
    ...elements
      .filter((e) => resistKeys.includes(`id:${e.statId}`))
      .map((e) => ({ id: e.id, name: e.name, value: e.value, covers: [`id:${e.statId}`] })),
  ];
}

/** The rows with each active total in place of the rows it covers (at the first one), folded rows attached. */
export function foldRows(rows: Stat[], options: PseudoOption[], active: string[]): Stat[] {
  const out: Stat[] = [];
  const placed = new Set<string>();
  for (const row of rows) {
    const key = getStatKey(row);
    const option = options.find((o) => active.includes(o.id) && o.covers.includes(key));
    if (!option) {
      out.push(row);
      continue;
    }
    if (placed.has(option.id)) continue;
    placed.add(option.id);
    out.push({
      stat_id: StatId.Pseudo,
      pseudo: option.id,
      name: option.name,
      value: option.value,
      folded: rows.filter((r) => option.covers.includes(getStatKey(r))),
    });
  }
  return out;
}
