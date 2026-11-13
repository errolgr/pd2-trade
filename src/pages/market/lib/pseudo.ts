import type { ItemDetail, Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { PseudoDef } from './types';

/** Sum of `values[index]` over every line named `name` (corruptions can add a second line of the same mod). */
function sum(mods: Modifier[], name: string, index = 0): number {
  let total = 0;
  for (const mod of mods) {
    if (mod.name !== name) continue;
    const value = mod.values?.[index];
    if (typeof value === 'number') total += value;
  }
  return total;
}

/** Largest `values[index]` among lines named `name`; 0 when absent. */
function max(mods: Modifier[], name: string, index: number): number {
  let best = 0;
  for (const mod of mods) {
    if (mod.name !== name) continue;
    const value = mod.values?.[index];
    if (typeof value === 'number' && value > best) best = value;
  }
  return best;
}

/** PD2 collapses four equal resistances into one `all_resist` line; each resist is its own line plus that. */
const res = (mods: Modifier[], name: string) => sum(mods, name) + sum(mods, 'all_resist');
const fireRes = (m: Modifier[]) => res(m, 'fireresist');
const coldRes = (m: Modifier[]) => res(m, 'coldresist');
const lightRes = (m: Modifier[]) => res(m, 'lightresist');
const poisonRes = (m: Modifier[]) => res(m, 'poisonresist');

/** `all_attributes` likewise stands in for four equal attribute lines. */
const attr = (mods: Modifier[], name: string) => sum(mods, name) + sum(mods, 'all_attributes');

/**
 * Life per vitality and mana per energy for the caster classes (Sorceress, Necromancer, Druid); the other
 * classes get as much or more life per vitality, so the pseudo never overstates life.
 */
const LIFE_PER_VIT = 2;
const MANA_PER_ENERGY = 2;

const ELEMENTS = ['fire', 'cold', 'ltng', 'pois', 'mag'] as const;

/** Fire, cold and lightning "Adds X-Y" lines (`firedam`) and their lone-end forms (`firemindam`, `firemaxdam`). */
const ELEMENTAL_DAMAGE_LINE = /^(fire|cold|light)(min|max)?dam$/;

/**
 * Added fire, cold and lightning damage summed per end: Σ min and Σ max over every "Adds X-Y" line. PD2 sends the
 * line as `firedam [min, max]` (cold: `[min, max, chill frames]`); `firemindam [min, max]` is the same pair under
 * another name, and lone `firemindam [min]` / `firemaxdam [max]` lines add to their end.
 */
function addedElementalDamage(mods: Modifier[]): { min: number; max: number } {
  let min = 0;
  let max = 0;
  for (const mod of mods) {
    const line = ELEMENTAL_DAMAGE_LINE.exec(mod.name);
    const first = mod.values?.[0];
    if (!line || typeof first !== 'number') continue;
    if (line[2] === 'max') {
      max += first;
      continue;
    }
    min += first;
    const second = mod.values?.[1];
    if (typeof second === 'number') max += second;
  }
  return { min, max };
}

/**
 * Computed stats over a listing's modifiers, the same definitions the market service filters and sorts on
 * (computed here for favorites and deep links). Every compute returns 0 when the item has none of the inputs.
 */
export const PSEUDO_STATS: PseudoDef[] = [
  {
    id: 'pseudo_total_res',
    label: '+{X}% Total Resistances (sum of all elements)',
    group: 'Pseudo',
    compute: (m) => fireRes(m) + coldRes(m) + lightRes(m) + poisonRes(m),
  },
  {
    id: 'pseudo_all_res',
    label: '+{X}% All Resistances (lowest of the four)',
    group: 'Pseudo',
    compute: (m) => Math.min(fireRes(m), coldRes(m), lightRes(m), poisonRes(m)),
  },
  { id: 'pseudo_fire_res', label: '+{X}% Total Fire Resistance', group: 'Pseudo', compute: fireRes },
  { id: 'pseudo_cold_res', label: '+{X}% Total Cold Resistance', group: 'Pseudo', compute: coldRes },
  { id: 'pseudo_light_res', label: '+{X}% Total Lightning Resistance', group: 'Pseudo', compute: lightRes },
  { id: 'pseudo_poison_res', label: '+{X}% Total Poison Resistance', group: 'Pseudo', compute: poisonRes },
  {
    id: 'pseudo_life',
    label: `+{X} Total Life (incl. ${LIFE_PER_VIT} per Vitality)`,
    group: 'Pseudo',
    compute: (m) => sum(m, 'maxhp') + LIFE_PER_VIT * attr(m, 'vitality'),
  },
  {
    id: 'pseudo_mana',
    label: `+{X} Total Mana (incl. ${MANA_PER_ENERGY} per Energy)`,
    group: 'Pseudo',
    compute: (m) => sum(m, 'maxmana') + MANA_PER_ENERGY * attr(m, 'energy'),
  },
  {
    id: 'pseudo_total_attributes',
    label: '+{X} Total Attributes',
    group: 'Pseudo',
    compute: (m) => attr(m, 'strength') + attr(m, 'dexterity') + attr(m, 'vitality') + attr(m, 'energy'),
  },
  { id: 'pseudo_strength', label: '+{X} Total Strength', group: 'Pseudo', compute: (m) => attr(m, 'strength') },
  { id: 'pseudo_dexterity', label: '+{X} Total Dexterity', group: 'Pseudo', compute: (m) => attr(m, 'dexterity') },
  { id: 'pseudo_vitality', label: '+{X} Total Vitality', group: 'Pseudo', compute: (m) => attr(m, 'vitality') },
  { id: 'pseudo_energy', label: '+{X} Total Energy', group: 'Pseudo', compute: (m) => attr(m, 'energy') },
  {
    id: 'pseudo_all_skills',
    label: '+{X} Total Skills (All + Class)',
    group: 'Pseudo',
    // item_addclassskills = [classId, level]; an item only rolls one class
    compute: (m) => sum(m, 'item_allskills') + max(m, 'item_addclassskills', 1),
  },
  {
    id: 'pseudo_skill_tab',
    label: '+{X} to any Skill Tab',
    group: 'Pseudo',
    // item_addskill_tab = [tabId, level]
    compute: (m) => max(m, 'item_addskill_tab', 1),
  },
  {
    id: 'pseudo_skill_damage',
    label: '+{X}% to Elemental Skill Damage (best element)',
    group: 'Pseudo',
    compute: (m) => Math.max(...ELEMENTS.map((e) => sum(m, `passive_${e}_mastery`))),
  },
  {
    id: 'pseudo_enemy_res',
    label: '-{X}% to Enemy Resistance (best element)',
    group: 'Pseudo',
    compute: (m) => Math.max(...ELEMENTS.map((e) => sum(m, `passive_${e}_pierce`))),
  },
  {
    id: 'pseudo_fcr',
    label: '+{X}% Total Faster Cast Rate',
    group: 'Pseudo',
    compute: (m) => sum(m, 'item_fastercastrate'),
  },
  {
    id: 'pseudo_fhr',
    label: '+{X}% Total Faster Hit Recovery',
    group: 'Pseudo',
    compute: (m) => sum(m, 'item_fastergethitrate'),
  },
  {
    id: 'pseudo_ias',
    label: '+{X}% Total Increased Attack Speed',
    group: 'Pseudo',
    compute: (m) => sum(m, 'item_fasterattackrate'),
  },
  {
    id: 'pseudo_frw',
    label: '+{X}% Total Faster Run/Walk',
    group: 'Pseudo',
    compute: (m) => sum(m, 'item_fastermovevelocity'),
  },
  { id: 'pseudo_mf', label: '+{X}% Total Magic Find', group: 'Pseudo', compute: (m) => sum(m, 'item_magicbonus') },
  { id: 'pseudo_gf', label: '+{X}% Total Gold Find', group: 'Pseudo', compute: (m) => sum(m, 'item_goldbonus') },
  {
    id: 'pseudo_enhanced_defense',
    label: '+{X}% Total Enhanced Defense',
    group: 'Pseudo',
    compute: (m) => sum(m, 'item_armor_percent'),
  },
  {
    id: 'pseudo_enhanced_damage',
    label: '+{X}% Total Enhanced Damage',
    group: 'Pseudo',
    compute: (m) => sum(m, 'maxdamage_percent'),
  },
  {
    id: 'pseudo_elemental_damage',
    // Σ (min + max) / 2 over fire, cold and lightning "Adds X-Y" lines
    label: '+{X} Average Elemental Damage',
    group: 'Pseudo',
    compute: (m) => {
      const { min, max } = addedElementalDamage(m);
      return (min + max) / 2;
    },
  },
  {
    // Fire, cold and lightning "Adds X-Y" lines summed; rolls the max, like the `damage` stat. Its low end is
    // `pseudo_elemental_min_damage`, bounded through the key's pin (`pseudo_elemental_max_damage{4..10}`)
    id: 'pseudo_elemental_max_damage',
    label: 'Adds {X}-{Y} Total Elemental Damage',
    group: 'Pseudo',
    compute: (m) => addedElementalDamage(m).max,
  },
  {
    id: 'pseudo_elemental_min_damage',
    label: 'Adds {X}-{Y} Total Elemental Damage (low end)',
    group: 'Pseudo',
    compute: (m) => addedElementalDamage(m).min,
    lowEndOf: 'pseudo_elemental_max_damage',
  },
  {
    id: 'pseudo_life_leech',
    label: '+{X}% Total Life Stolen per Hit',
    group: 'Pseudo',
    compute: (m) => sum(m, 'lifedrainmindam'),
  },
  {
    id: 'pseudo_mana_leech',
    label: '+{X}% Total Mana Stolen per Hit',
    group: 'Pseudo',
    compute: (m) => sum(m, 'manadrainmindam'),
  },
];

/** Every pseudo stat for an item, keyed by pseudo id. */
export function computePseudo(item: Pick<ItemDetail, 'modifiers'> | undefined | null): Record<string, number> {
  const mods = item?.modifiers ?? [];
  const out: Record<string, number> = {};
  for (const def of PSEUDO_STATS) out[def.id] = def.compute(mods);
  return out;
}

/** Pair pseudo stats whose row bounds the low end too: the rolled (high end) id → the low end's id. */
export const PSEUDO_LOW_ENDS: Readonly<Record<string, string>> = Object.fromEntries(
  PSEUDO_STATS.flatMap((p) => (p.lowEndOf ? [[p.lowEndOf, p.id]] : [])),
);
