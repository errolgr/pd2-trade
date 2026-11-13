/**
 * Σ totals on the price check's stat rows: a resist row's Σ chip offers the market's resistance pseudo stats
 * (`pseudo_*_res`, see market/lib/pseudo.ts) that row feeds, and a fire / cold / lightning "Adds X-Y" row the
 * elemental damage total (`pseudo_elemental_max_damage`, low end in the key's pin). Picking one folds the rows the
 * total fully covers into a single Σ row (stat_id StatId.Pseudo), searched on the market service; unfolding brings
 * them back.
 */
import type { Stat } from './interfaces';
import { StatId } from './stat-mappings';
import { getStatKey } from './utils';

export interface PseudoOption {
  /** Market pseudo stat id, e.g. `pseudo_total_res`. */
  id: string;
  name: string;
  value: number;
  /** A damage pair total's high end (`value` is its low end): the Σ row gets both ranges, like the rows it folds. */
  maxValue?: number;
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

/** The "Adds X-Y" rows the market's elemental damage total adds up (not poison or magic, as the service). */
const ELEMENTAL_DAMAGE_IDS: readonly number[] = [StatId.FireDamage, StatId.ColdDamage, StatId.LightningDamage];
/** The flat damage total's rows: physical and every element but poison (damage over time). */
const FLAT_DAMAGE_IDS: readonly number[] = [...ELEMENTAL_DAMAGE_IDS, StatId.MagicDamage, StatId.Damage];

/**
 * The Σ totals for an item's rows (buildStatRows output): resist totals, all-resist line counted into every
 * element, as the market service computes them (element totals cover only their own line: All Resistances also
 * feeds the other elements), and the elemental and flat damage totals of its "Adds X-Y" rows.
 */
export function pseudoOptions(rows: Stat[]): PseudoOption[] {
  return [
    ...resistOptions(rows),
    ...damageTotal(rows, ELEMENTAL_DAMAGE_IDS, 'pseudo_elemental_max_damage', 'Total Elemental Damage'),
    ...damageTotal(rows, FLAT_DAMAGE_IDS, 'pseudo_flat_max_damage', 'Total Flat Damage'),
  ];
}

function resistOptions(rows: Stat[]): PseudoOption[] {
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

/** The "Adds X-Y" rows of `ids` summed per end (Adds 4-20 fire + 1-114 lightning = 5-134); none without such rows. */
function damageTotal(rows: Stat[], ids: readonly number[], id: string, name: string): PseudoOption[] {
  const damage = rows.filter((s) => ids.includes(s.stat_id) && s.maxValue !== undefined);
  if (damage.length === 0) return [];
  return [
    {
      id,
      name,
      value: damage.reduce((n, s) => n + (s.value ?? 0), 0),
      maxValue: damage.reduce((n, s) => n + (s.maxValue ?? 0), 0),
      covers: [...new Set(damage.map(getStatKey))],
    },
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
      ...(option.maxValue !== undefined && { maxValue: option.maxValue }),
      folded: rows.filter((r) => option.covers.includes(getStatKey(r))),
    });
  }
  return out;
}
