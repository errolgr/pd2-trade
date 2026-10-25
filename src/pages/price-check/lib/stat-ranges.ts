/**
 * Stat ranges exactly as PD2's item tooltip draws them when stat ranges are shown (BH.dll,
 * `BHOnPropertyBuild` in BH/Modules/Item/Item.cpp, with GetItemsTxtStatByMod / GetAllStatModifier /
 * GetMaxElemStatFromMin). Quirks of that code are kept on purpose so the price check never disagrees
 * with the game:
 * - unique / set / runeword: the item's own table row (+ an all-res / all-stats mod on top);
 * - magic / rare / crafted: the smallest min and largest max over every affix that could roll this stat
 *   on this item (not the tier that rolled);
 * - no range for chance-to-cast / charges, or when min == max.
 */
import { STAT_RANGE_DATA } from '@/assets/stat-ranges.data';
import { skillNameToIdMap } from '@/assets/character-skills';
import { runeWords } from '@/assets/items';
import { getTypeFromBaseType } from './utils';
import type { Item, Range, Stat } from './interfaces';
import { StatId, statRemapByName } from './stat-mappings';

/** [prop code, par, min, max] (ItemsTxtStat). */
export type TxtMod = [string, number, number, number];
/** A row's mod slots in column order; null = an empty slot (BH stops scanning the row there). */
export type TxtSlots = Array<TxtMod | null>;
/**
 * [automagic, version, level, spawnable, rare, itypes, etypes, mods, name, levelreq, classlevelreq]
 * (MagicSuffix/MagicPrefix/AutoMagic row).
 */
export type TxtAffix = [0 | 1, number, number, 0 | 1, 0 | 1, string[], string[], TxtSlots, string, number, number];

export interface StatRangeData {
  source: { pd2dataMd5: string };
  /** Properties.txt: code → [stat ids (7, -1 = none), funcs (7)]. */
  props: Record<string, [number[], number[]]>;
  /** ItemTypes.txt: code → Equiv1/Equiv2. */
  itemTypes: Record<string, string[]>;
  /** Base item code (Armor/Weapons/Misc) → [item type, has an AutoMagic group]. */
  bases: Record<string, [string, 0 | 1]>;
  affixes: TxtAffix[];
  uniques: Record<string, TxtSlots>;
  /** SetItems.txt: the item's 9 props, then its 10 partial set bonus props. */
  sets: Record<string, TxtSlots>;
  /** Runes.txt row name (Runeword47) → its rows as [itypes, etypes, mods] (one per item class, e.g. Fortitude). */
  runewords: Record<string, Array<[string[], string[], TxtSlots]>>;
}

const S = {
  enhancedMaxDamage: 17,
  enhancedMinDamage: 18,
  minDamage: 21,
  maxDamage: 22,
  secondaryMinDamage: 23,
  secondaryMaxDamage: 24,
  enhancedDamage: 25,
  fireResist: 39,
  lightResist: 41,
  coldResist: 43,
  poisonResist: 45,
  minFire: 48,
  maxFire: 49,
  minLight: 50,
  maxLight: 51,
  minMagic: 52,
  maxMagic: 53,
  minCold: 54,
  maxCold: 55,
  minPoison: 57,
  maxPoison: 58,
  classSkills: 83,
  nonClassSkill: 97,
  singleSkill: 107,
  aura: 151,
  skillTab: 188,
  skillOnStriking: 195,
  skillOnKill: 196,
  skillOnDeath: 197,
  skillOnHit: 198,
  skillOnLevelUp: 199,
  skillWhenStruck: 201,
  charged: 204,
  defensePerLevel: 214,
  maxDamagePerLevel: 218,
  maxEnhancedDamagePerLevel: 219,
  findGemsPerLevel: 251,
  maxDamagePerTime: 272,
  maxEnhancedDamagePerTime: 273,
} as const;

const NO_RANGE_STATS = new Set<number>([
  S.skillOnKill,
  S.skillOnHit,
  S.skillOnStriking,
  S.skillOnDeath,
  S.skillOnLevelUp,
  S.skillWhenStruck,
  S.charged,
]);
const ENHANCED_DAMAGE_STATS = new Set<number>([
  S.enhancedDamage,
  S.enhancedMinDamage,
  S.enhancedMaxDamage,
  S.maxEnhancedDamagePerTime,
  S.maxEnhancedDamagePerLevel,
]);
const MAX_DAMAGE_STATS = new Set<number>([S.maxDamage, S.secondaryMaxDamage, S.maxDamagePerTime, S.maxDamagePerLevel]);
const MIN_DAMAGE_STATS = new Set<number>([S.minDamage, S.secondaryMinDamage]);
/** Min elemental/physical damage stat → the max stat its "to" range comes from. */
const MAX_ELEM_OF: Record<number, number> = {
  [S.minFire]: S.maxFire,
  [S.minCold]: S.maxCold,
  [S.minLight]: S.maxLight,
  [S.minPoison]: S.maxPoison,
  [S.minMagic]: S.maxMagic,
  [S.minDamage]: S.maxDamage,
};
const RESISTS = new Set<number>([S.fireResist, S.coldResist, S.lightResist, S.poisonResist]);
const RES_ALL = 'res-all';
const DMG_MAX = 'dmg-max';
const EMPTY = 0xffff;

/** What BH appends to one tooltip line, or null when it draws no range. */
export interface StatRange extends Range {
  min: number;
  max: number;
  /** Elemental / physical damage lines: the max damage's range ("[a - b to c - d]"). */
  to?: { min: number; max: number };
  /** Per-level stats: shown divided by 8 with up to 3 decimals. */
  perLevel?: boolean;
}

const stats = (code: string) => STAT_RANGE_DATA.props[code]?.[0] ?? [];
const funcs = (code: string) => STAT_RANGE_DATA.props[code]?.[1] ?? [];

/** GetItemsTxtStatByMod: the mod that sets `nStat` (with `param`), or null. */
function modFor(mods: TxtSlots, nStat: number, param: number): TxtMod | null {
  if (NO_RANGE_STATS.has(nStat)) return null;
  for (const mod of mods) {
    if (!mod || !(mod[0] in STAT_RANGE_DATA.props)) break;
    const st = stats(mod[0]);
    const fn = funcs(mod[0]);
    const noStat = (st[0] ?? -1) < 0;
    if (noStat && fn[0] === 7 && ENHANCED_DAMAGE_STATS.has(nStat)) return mod;
    if (noStat && fn[0] === 6 && MAX_DAMAGE_STATS.has(nStat)) return mod;
    if (noStat && fn[0] === 5 && MIN_DAMAGE_STATS.has(nStat)) return mod;
    if (fn[0] === 17 && nStat === S.maxEnhancedDamagePerLevel) return mod;
    for (let j = 0; j < 7; j++) {
      if ((st[j] ?? -1) < 0) break;
      if ((nStat === S.skillTab || nStat === S.classSkills) && st[j] === nStat && fn[j] !== 36) return mod;
      if (st[j] === nStat && mod[1] === param && fn[j] !== 15 && fn[j] !== 16) return mod;
    }
  }
  return null;
}

/** GetAllStatModifier: another mod that also sets `nStat` (res-all on a single resist, all-stats on Strength). */
function allStatMod(mods: TxtSlots, nStat: number, origin: TxtMod): TxtMod | null {
  for (const mod of mods) {
    if (!mod || !(mod[0] in STAT_RANGE_DATA.props)) break;
    if (mod[0] === origin[0]) continue;
    const st = stats(mod[0]);
    for (let j = 0; j < 7; j++) {
      if ((st[j] ?? -1) < 0) break;
      if (st[j] === nStat) return mod;
    }
  }
  return null;
}

/** GetMaxElemStatFromMin: the mod holding the max damage that pairs with a min damage line. */
function maxElemMod(mods: TxtSlots, nStat: number, origin: TxtMod): TxtMod | null {
  const wanted = MAX_ELEM_OF[nStat];
  if (wanted === undefined && nStat !== S.secondaryMinDamage) return null;
  for (const mod of mods) {
    if (!mod || !(mod[0] in STAT_RANGE_DATA.props)) break;
    if (mod[0] === origin[0]) continue;
    const st = stats(mod[0]);
    for (let j = 0; j < 7; j++) {
      if (mod[0] !== DMG_MAX && (st[j] ?? EMPTY) < 0) break;
      if (nStat === S.secondaryMinDamage) {
        if (mod[0] === DMG_MAX) return mod;
      } else if (st[j] === wanted) {
        return mod;
      }
    }
  }
  return null;
}

function rangeFrom(min: number, max: number, elem: TxtMod | null, nStat: number): StatRange | null {
  if (!(min < max || elem)) return null;
  if (nStat >= S.defensePerLevel && nStat <= S.findGemsPerLevel) return { min: min / 8, max: max / 8, perLevel: true };
  if (!elem) return { min, max };
  if (min < max && elem[2] < elem[3]) return { min, max, to: { min: elem[2], max: elem[3] } };
  if (elem[2] < elem[3]) return { min, max: min, to: { min: elem[2], max: elem[3] } };
  return null;
}

/** Fixed item (unique / set / runeword) branch. */
function fixedRange(mods: TxtSlots, nStat: number, param: number): StatRange | null {
  const mod = modFor(mods, nStat, param);
  if (!mod) return null;
  const all = allStatMod(mods, nStat, mod);
  const elem = maxElemMod(mods, nStat, mod);
  return rangeFrom(mod[2] + (all?.[2] ?? 0), mod[3] + (all?.[3] ?? 0), elem, nStat);
}

/** An item type and every Equiv parent ("swor" → swor, mele, weap, …). */
export function typeChain(type: string): Set<string> {
  const out = new Set<string>();
  const walk = (t: string) => {
    if (!t || out.has(t)) return;
    out.add(t);
    for (const p of STAT_RANGE_DATA.itemTypes[t] ?? []) walk(p);
  };
  walk(type);
  return out;
}

const QUALITY_RANK: Record<string, number> = { Magic: 4, Rare: 6, Crafted: 8 };

/** The item's base row and its item type chain (type + every Equiv parent), or null for an unknown base. */
function baseOf(item: Item): { base: [string, 0 | 1]; types: Set<string> } | null {
  const code = getTypeFromBaseType(item.type)?.base;
  const base = typeof code === 'string' ? STAT_RANGE_DATA.bases[code] : undefined;
  return base ? { base, types: typeChain(base[0]) } : null;
}

/** Magic / rare / crafted branch: min/max over every affix this item could roll. */
function affixRange(item: Item, nStat: number, param: number): StatRange | null {
  const found = baseOf(item);
  if (!found) return null;
  const { base, types } = found;
  const quality = QUALITY_RANK[item.quality];
  const iLvl = item.iLevel ?? 0;

  // All-res bookkeeping over the item's own resist stats, in stat-list (stat id) order.
  let hasFire = false;
  let hasCold = false;
  let hasLight = false;
  let hasPois = false;
  let isSingleRes = false;
  let allResVal = 0;
  let minResVal = Number.MAX_SAFE_INTEGER;
  let currentResVal = 0;
  const own = [...(item.stats ?? [])].filter((s) => RESISTS.has(s.stat_id)).sort((a, b) => a.stat_id - b.stat_id);
  for (const s of own) {
    const resVal = s.value ?? 0;
    if (s.stat_id === S.fireResist) hasFire = true;
    else if (s.stat_id === S.coldResist) hasCold = true;
    else if (s.stat_id === S.lightResist) hasLight = true;
    else hasPois = true;
    if (allResVal === 0) {
      allResVal = resVal;
      if (s.stat_id === nStat) {
        isSingleRes = true;
        currentResVal = resVal;
      }
    } else if (resVal > allResVal) {
      if (s.stat_id === nStat) {
        isSingleRes = true;
        currentResVal = resVal;
      } else {
        isSingleRes = false;
      }
    } else if (resVal < minResVal) {
      minResVal = resVal;
    }
  }
  const hasAllRes = hasFire && hasCold && hasLight && hasPois;
  const statIsRes = RESISTS.has(nStat);
  if (isSingleRes && currentResVal <= minResVal) isSingleRes = false;

  let min = 0;
  let max = 0;
  let allResMin = 0;
  let allResMax = 0;
  let elem: TxtMod | null = null;
  for (const affix of STAT_RANGE_DATA.affixes) {
    const [auto, version, level, spawnable, rare, itypes, etypes, mods] = affix;
    if (auto && !base[1]) break; // AutoMagic rows only for bases with an auto prefix group
    if (version === 0) continue; // expansion character: expansion affixes only
    if (level > 99 || level > iLvl) continue;
    if (quality < 8 && !spawnable) continue;
    if (quality >= 6 && !rare) continue;
    if (etypes.some((t) => types.has(t))) continue;
    if (!itypes.some((t) => types.has(t))) continue;
    const mod = modFor(mods, nStat, param);
    if (!mod) continue;
    elem = maxElemMod(mods, nStat, mod);
    if (mod[0] === RES_ALL) {
      allResMin = allResMin === 0 ? mod[2] : Math.min(mod[2], allResMin);
      allResMax = Math.max(mod[3], allResMax);
    }
    if (statIsRes && !isSingleRes && hasAllRes && nStat && mod[0] !== RES_ALL) continue;
    min = min === 0 ? mod[2] : Math.min(mod[2], min);
    max = Math.max(mod[3], max);
  }
  if (isSingleRes && hasAllRes) {
    min += allResMin;
    max += allResMax;
  }
  return rangeFrom(min, max, elem, nStat);
}

/** The table row of a unique / set / runeword (runewords: the row for this item class), or null. */
export function fixedMods(item: Item): TxtSlots | null {
  if (item.isRuneword) {
    const key = runeWords.find((rw) => rw.name === item.runeword)?.key;
    const rows = key ? STAT_RANGE_DATA.runewords[key] : undefined;
    const types = baseOf(item)?.types;
    const row =
      rows && rows.length > 1 && types
        ? rows.find(([itypes, etypes]) => itypes.some((t) => types.has(t)) && !etypes.some((t) => types.has(t)))
        : rows?.[0];
    return row?.[2] ?? null;
  }
  if (!item.name) return null;
  if (item.quality === 'Unique') return STAT_RANGE_DATA.uniques[item.name] ?? null;
  if (item.quality === 'Set') return STAT_RANGE_DATA.sets[item.name] ?? null;
  return null;
}

/**
 * The range PD2 draws on the tooltip line of `nStat` (ItemStatCost id; `param` = the stat layer, e.g. the
 * skill id of a +skill), or null when it draws none.
 */
export function bhStatRange(item: Item, nStat: number, param = 0): StatRange | null {
  if (!item.isRuneword && (item.quality === 'Magic' || item.quality === 'Rare' || item.quality === 'Crafted')) {
    return affixRange(item, nStat, param);
  }
  const mods = fixedMods(item);
  return mods ? fixedRange(mods, nStat, param) : null;
}

/** Skill id of a clipboard skill name ("Teleport", "Teleport (Sorceress)"). */
function skillId(skill: string): number | undefined {
  const name = skill.replace(/\s*\([^)]*\)\s*$/, '').toLowerCase();
  return skillNameToIdMap[name]?.id;
}

/** The class a skill belongs to ("Fire Mastery" → "Sorceress"), null for non-class skills. */
export function skillClass(skill: string): string | null {
  return skillNameToIdMap[skill.toLowerCase()]?.class ?? null;
}

/**
 * Whether a +skill stat is an o-skill (stat 97: no "(Class Only)" on the line). The Ctrl+C export doesn't
 * say, so the item's own table row decides: an o-skill mod for that skill there.
 */
export function isOSkill(item: Item, stat: Stat): boolean {
  if (stat.stat_id === S.nonClassSkill) return true;
  if (stat.stat_id === S.singleSkill || !stat.skill) return false;
  const id = skillId(stat.skill);
  const mods = fixedMods(item);
  return id !== undefined && !!mods && modFor(mods, S.nonClassSkill, id) !== null;
}

const CLASS_NAMES: Record<string, true> = {
  amazon: true,
  sorceress: true,
  necromancer: true,
  paladin: true,
  barbarian: true,
  druid: true,
  assassin: true,
};

/** The tooltip line a clipboard stat (or price check row) stands for: [nStat, param], or null when BH never ranges it. */
function lineOf(stat: Stat): [number, number] | null {
  switch (stat.stat_id) {
    case StatId.Socket:
    case StatId.Ethereal:
    case StatId.Corrupted:
      return null;
    case 998: // "% Enhanced Damage": BH builds it from the min ED stat
      return [S.enhancedMinDamage, 0];
    case StatId.AllResistances:
      return [S.fireResist, 0];
    case StatId.AllAttributes:
      return [0, 0];
  }
  // BH's Ctrl+C export leaves stat_id off skill stats; `skill` says which kind ("Amazon Skills" = class skills,
  // "Martial Arts (Assassin)" = a skill tab, otherwise one skill).
  if (stat.skill && (stat.stat_id === undefined || stat.stat_id === S.singleSkill || stat.stat_id === S.nonClassSkill)) {
    if (CLASS_NAMES[stat.skill.toLowerCase().replace(/ skills$/, '')]) return [S.classSkills, 0];
    const id = skillId(stat.skill);
    return id === undefined ? [S.skillTab, 0] : [S.singleSkill, id];
  }
  // Auras come as the formatted line ("Level 10 Sanctuary Aura When Equipped") without a stat_id.
  const aura = stat.stat_id === undefined ? /^Level \d+ (.+) Aura When Equipped$/.exec(stat.name ?? '') : null;
  if (aura) {
    const id = skillId(aura[1]);
    return id === undefined ? null : [S.aura, id];
  }
  if (stat.stat_id === undefined && stat.name in statRemapByName) return [statRemapByName[stat.name].stat_id, 0];
  return stat.stat_id === undefined ? null : [stat.stat_id, 0];
}

/** Max damage stat → its min stat: the game draws one "Adds a-b" line, BH puts the max range after "to". */
const MIN_OF_MAX: Record<number, number> = Object.fromEntries(Object.entries(MAX_ELEM_OF).map(([min, max]) => [max, Number(min)]));

/** BH range of the tooltip line for one clipboard stat (skills try the class-skill and the o-skill stat). */
export function statLineRange(item: Item, stat: Stat): StatRange | null {
  const line = lineOf(stat);
  if (!line) return null;
  const [nStat, param] = line;
  if (nStat === S.singleSkill) return bhStatRange(item, S.singleSkill, param) ?? bhStatRange(item, S.nonClassSkill, param);
  return bhStatRange(item, nStat, param);
}

/**
 * Range of a price check row. Rows keep min and max damage apart, so a max damage row gets the "to"
 * part of its line's range and a min damage row the rest.
 */
export function statRowRange(item: Item, stat: Stat): Range | null {
  const min = MIN_OF_MAX[stat.stat_id];
  if (min !== undefined) return bhStatRange(item, min)?.to ?? null;
  const range = statLineRange(item, stat);
  if (!range) return null;
  const { to: _to, ...row } = range;
  return row.min < row.max ? row : null;
}

const trimDecimals = (n: number) => String(Number(n.toFixed(3)));

/** The bracket text BH appends, e.g. "[25 - 50]", "[10 - 15 to 30 - 40]", "[0.5 - 1.25]". */
export function formatStatRange(range: StatRange): string {
  if (range.perLevel) return `[${trimDecimals(range.min)} - ${trimDecimals(range.max)}]`;
  if (range.to) {
    return range.min < range.max
      ? `[${range.min} - ${range.max} to ${range.to.min} - ${range.to.max}]`
      : `[${range.min} to ${range.to.min} - ${range.to.max}]`;
  }
  return `[${range.min} - ${range.max}]`;
}
