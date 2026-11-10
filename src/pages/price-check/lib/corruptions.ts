import { cubeCorruptions } from '@/assets/cube-corruptions';
import type { Item } from './interfaces';
import { StatId } from './stat-mappings';

/**
 * The `item.corruptions` names the market records for each cube corruption stat (the `stat` of an entry in
 * cube-corruptions.ts). pd2trader groups corruption prices by exactly these names, so they must match the site:
 * mostly modifier names, plus markers like `dmg%` and `transform_dye`. Checked against live corruption prices.
 */
const CORRUPTION_NAMES_BY_STAT: Record<string, readonly string[]> = {
  sock: ['item_numsockets'],
  'dmg%': ['dmg%', 'maxdamage_percent'],
  'dmg-min': ['dmg-min'],
  'dmg-max': ['dmg-max'],
  att: ['tohit'],
  'att-demon': ['item_demon_tohit'],
  'att-undead': ['item_undead_tohit'],
  'dmg-demon': ['item_demondamage_percent'],
  'dmg-undead': ['item_undeaddamage_percent'],
  'heal-hit': ['item_healafterhit'],
  'heal-kill': ['item_healafterkill'],
  'mana-kill': ['item_manaafterkill'],
  ease: ['item_req_percent'],
  'mag%': ['item_magicbonus'],
  'gold%': ['item_goldbonus'],
  cast1: ['item_fastercastrate'],
  cast2: ['item_fastercastrate'],
  swing1: ['item_fasterattackrate'],
  swing2: ['item_fasterattackrate'],
  balance1: ['item_fastergethitrate'],
  balance2: ['item_fastergethitrate'],
  block: ['toblock'],
  block1: ['item_fasterblockrate'],
  block2: ['item_fasterblockrate'],
  move1: ['item_fastermovevelocity'],
  'pierce-fire': ['passive_fire_pierce'],
  'pierce-ltng': ['passive_ltng_pierce'],
  'pierce-cold': ['passive_cold_pierce'],
  'pierce-pois': ['passive_pois_pierce'],
  'extra-fire': ['passive_fire_mastery'],
  'extra-cold': ['passive_cold_mastery'],
  'extra-ltng': ['passive_ltng_mastery'],
  'extra-pois': ['passive_pois_mastery'],
  lifesteal: ['lifedrainmindam'],
  manasteal: ['manadrainmindam'],
  deadly: ['item_deadlystrike'],
  crush: ['item_crushingblow'],
  pierce: ['item_pierce'],
  'ignore-ac': ['item_ignoretargetac'],
  'reduce-ac': ['item_fractionaltargetac'],
  'dmg-ac': ['item_damagetargetac'],
  allskills: ['item_allskills'],
  str: ['strength'],
  dex: ['dexterity'],
  vit: ['vitality'],
  enr: ['energy'],
  'all-stats': ['strength', 'dexterity', 'vitality', 'energy'],
  hp: ['maxhp'],
  'hp%': ['item_maxhp_percent'],
  mana: ['maxmana'],
  regen: ['hpregen'],
  'regen-mana': ['manarecoverybonus'],
  'ac%': ['item_armor_percent'],
  'res-fire': ['fireresist'],
  'res-cold': ['coldresist'],
  'res-ltng': ['lightresist'],
  'res-pois': ['poisonresist'],
  'res-all': ['all_resist', 'fireresist', 'coldresist', 'lightresist', 'poisonresist'],
  'res-fire-max': ['maxfireresist'],
  'res-cold-max': ['maxcoldresist'],
  'res-ltng-max': ['maxlightresist'],
  'res-pois-max': ['maxpoisonresist'],
  'res-all-max': ['maxfireresist', 'maxcoldresist', 'maxlightresist', 'maxpoisonresist'],
  'red-dmg': ['normal_damage_reduction'],
  'red-dmg%': ['damageresist'],
  'red-mag': ['magic_damage_reduction'],
  'curse-res': ['curse_resistance'],
  'curse-effectiveness': ['curse_effectiveness'],
  'thorns/lvl': ['item_thorns_perlevel'],
  nofreeze: ['item_cannotbefrozen'],
  indestruct: ['indestruct'],
  light: ['item_lightradius'],
  addxp: ['item_addexperience'],
  dye: ['transform_dye'],
};

/**
 * The sorted `item.corruptions` names of the cube corruption rolled on an item (the value of stat 360), as the
 * market and pd2trader's corruption prices key them; null for an unknown roll or one with an unmapped stat.
 */
export function corruptionNamesForRoll(roll: number): string[] | null {
  const corruption = cubeCorruptions.find((c) => c.key === roll);
  if (!corruption) return null;
  const names = new Set<string>();
  for (const { stat } of corruption.stats) {
    const mapped = CORRUPTION_NAMES_BY_STAT[stat];
    if (!mapped) return null;
    for (const name of mapped) names.add(name);
  }
  return [...names].sort();
}

/** Whether two corruption name lists hold the same names, in any order. */
export function sameCorruptionNames(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedB = [...b].sort();
  return [...a].sort().every((name, i) => name === sortedB[i]);
}

const FLAT_DAMAGE_REDUCTION = 34;
const PERCENT_DAMAGE_REDUCTION = 36;

/**
 * BH's Ctrl+C export merges stats by name: flat (34) and % (36) damage reduction are both "Physical Damage Taken
 * Reduced by", so an item with both exports one stat 34 entry holding the larger value (fixed upstream in
 * Project-Diablo-2/BH#117). When that value came from a % damage reduction corruption, the entry is flagged
 * corrupted: it is the % roll, so it gets id 36 back. The other roll is lost either way.
 */
export function repairMergedDamageReduction(item: Item): Item {
  const roll = item.stats?.find((s) => s.stat_id === StatId.Corrupted)?.value;
  const corruption = roll === undefined ? undefined : cubeCorruptions.find((c) => c.key === roll);
  if (!corruption?.stats.some(({ stat }) => stat === 'red-dmg%')) return item;
  if (!item.stats.some((s) => s.stat_id === FLAT_DAMAGE_REDUCTION && s.corrupted)) return item;
  return {
    ...item,
    stats: item.stats.map((s) =>
      s.stat_id === FLAT_DAMAGE_REDUCTION && s.corrupted ? { ...s, stat_id: PERCENT_DAMAGE_REDUCTION } : s,
    ),
  };
}
