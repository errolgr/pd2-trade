import { cubeCorruptions } from '@/assets/cube-corruptions';
import { modifierByName } from '@/assets/modifiers';

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

/** Labels of corruption names whose modifier has none of its own (the rest use their modifier label). */
const EXTRA_LABELS: Record<string, string> = {
  maxdamage_percent: 'Enhanced Damage',
  'dmg-min': 'to Minimum Damage',
  'dmg-max': 'to Maximum Damage',
  indestruct: 'Indestructible',
};

/** Names sharing a label, told apart by whether their line is a percentage. */
const PERCENT_LINE: Record<string, boolean> = { damageresist: true, normal_damage_reduction: false };

/** A display line's words: rolls, signs and `%` dropped, lower case (`+1 to All Skills` → `to all skills`). */
const lineWords = (line: string): string =>
  line
    .toLowerCase()
    .replace(/%d|[+-]?\d+(\.\d+)?|[+%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** The distinct corruption outcomes an item can roll, as sorted market names. */
const ITEM_OUTCOMES: string[][] = (() => {
  const byKey = new Map<string, string[]>();
  for (const { key } of cubeCorruptions) {
    const names = corruptionNamesForRoll(key);
    if (names) byKey.set(names.join(','), names);
  }
  return [...byKey.values()];
})();

/** Line words → the corruption names displayed with them (own labels, then group lines like All Resistances). */
const NAMES_BY_LINE: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  const add = (label: string | undefined, name: string) => {
    if (!label) return;
    const words = lineWords(label);
    const names = map.get(words) ?? [];
    if (!names.includes(name)) map.set(words, [...names, name]);
  };
  for (const name of new Set(ITEM_OUTCOMES.flat())) {
    const label = modifierByName[name]?.description?.label as
      | { positive?: string; negative?: string; secondary?: string; group?: { positive?: string } }
      | undefined;
    add(EXTRA_LABELS[name], name);
    add(label?.positive, name);
    add(label?.negative, name);
    if (label?.positive && label.secondary) add(`${label.positive} ${label.secondary}`, name);
    add(label?.group?.positive, name);
  }
  // A grouped line stands for the whole group, the market's `all_resist` marker included
  const allRes = map.get('all resistances');
  if (allRes) map.set('all resistances', [...allRes, 'all_resist']);
  return map;
})();

/** Names that show a line of their own when rolled (not `dmg%`, the `all_resist` marker or dye). */
const LINE_NAMES = new Set([...NAMES_BY_LINE.values()].flat().filter((name) => name !== 'all_resist')).add(
  'item_numsockets',
);

/** The corruption names one corrupted line may show; empty when nothing displays that way. */
function namesForLine(line: string): string[] {
  if (/^socketed \(\d+\)$/i.test(line.trim())) return ['item_numsockets'];
  const names = NAMES_BY_LINE.get(lineWords(line)) ?? [];
  const percent = line.includes('%');
  return names.filter((name) => PERCENT_LINE[name] === undefined || PERCENT_LINE[name] === percent);
}

/**
 * The corruption outcome (sorted market names, as `corruptionNamesForRoll`) behind the lines a corruption changed
 * on an item (`Socketed (N)` for sockets), e.g. a build item's `corruptedMods`. The outcome must explain every
 * line, and every line-bearing name of it must show; null when no line was changed, a line is unknown, or more
 * than one outcome fits.
 */
export function corruptionNamesForLines(lines: readonly string[]): string[] | null {
  if (!lines.length) return null;
  const perLine = lines.map(namesForLine);
  if (perLine.some((names) => !names.length)) return null;
  const shown = new Set(perLine.flat());
  const fits = ITEM_OUTCOMES.filter(
    (outcome) =>
      // A line's names all belong to the outcome (a grouped line like All Resistances shows each of its names)
      perLine.every((names) => names.every((name) => outcome.includes(name))) &&
      outcome.every((name) => shown.has(name) || !LINE_NAMES.has(name)),
  );
  return fits.length === 1 ? fits[0] : null;
}
