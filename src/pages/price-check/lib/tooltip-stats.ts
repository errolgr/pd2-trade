/**
 * The properties an item's tooltip lists, as the game holds them: the Ctrl+C stats, the runeword mods BH's
 * export leaves out, and what socketed runes, gems and jewels add.
 */
import { characterSkillMap } from '@/assets/character-skills';
import { modifiers } from '@/assets/modifiers';
import { STAT_RANGE_DATA } from '@/assets/stat-ranges.data';
import { TOOLTIP_DATA } from '@/assets/tooltip.data';
import { itemTypes } from '@/common/item-types';
import type { Item, Socketed, Stat } from './interfaces';
import { StatId, statRemapByName } from './stat-mappings';
import { fixedMods, typeChain, type TxtMod } from './stat-ranges';
import { cleanItemType } from './utils';

/** Base damage [min, max], 0 when the base has none of that kind. */
export type BaseDamage = [number, number] | 0;
/** [levelreq, reqstr, reqdex, speed, one-hand damage, two-hand damage, throw damage]. */
export type BaseRow = [number, number, number, number, BaseDamage, BaseDamage, BaseDamage];
/** [rune letter ('' for gems), levelreq, weapon mods, helm/armor mods, shield mods] (Gems.txt). */
export type GemRow = [string, number, TxtMod[], TxtMod[], TxtMod[]];

export interface TooltipData {
  source: { pd2dataMd5: string };
  /** ItemStatCost descpriority by stat id: the tooltip lists properties highest first. */
  priority: Record<number, number>;
  /** Armor/Weapons/Misc by base code. */
  bases: Record<string, BaseRow>;
  /** ItemTypes Class: item type → the class the item is restricted to ("ama"). */
  typeClass: Record<string, string>;
  /** Socket fillers by the name the game shows ("Tal Rune", "Perfect Ruby"). */
  gems: Record<string, GemRow>;
  /** UniqueItems row name (what Ctrl+C exports) → [name the game shows, lvl req]. */
  uniques: Record<string, [string, number]>;
  /** SetItems row name → [name the game shows, lvl req]. */
  setItems: Record<string, [string, number]>;
  /** Set name the game shows → its items in the order the tooltip lists them. */
  sets: Record<string, string[]>;
  /** "Reanimate as:" monster (MonStats hcIdx) → its name. */
  monsters: Record<number, string>;
}

/** The item's base: its code, Weapons/Armor/Misc row and item type chain. */
export interface BaseInfo {
  code: string;
  row: BaseRow;
  types: Set<string>;
}

/** Where a property comes from; equal priorities keep the item's own stats first. */
export type StatOrigin = 'item' | 'runeword' | 'socket';
export type TooltipStat = Stat & { origin: StatOrigin };

export const S = {
  maxEd: 17,
  minEd: 18,
  minDamage: 21,
  maxDamage: 22,
  requirements: 91,
  ias: 93,
  nonClassSkill: 97,
  singleSkill: 107,
  aura: 151,
  indestructible: 152,
  reanimate: 155,
  skillTab: 188,
  numSockets: 194,
  defensePerLevel: 214,
  defensePercentPerLevel: 215,
  corruptor: 361,
  /** "% Enhanced Damage" (BH exports it besides, or instead of, the 17/18 pair). */
  enhancedDamage: 998,
} as const;

/** Chance-to-cast stat → when it fires, as the game words it. */
const CHANCE_TO_CAST: Record<number, string> = {
  195: 'on attack',
  196: 'when you Kill an Enemy',
  197: 'when you Die',
  198: 'on striking',
  199: 'when you Level-Up',
  200: 'on casting',
  201: 'when struck',
};
const SKILL_STATS = new Set<number>([S.nonClassSkill, S.singleSkill, 83, S.skillTab]);
const MAGIC_DAMAGE = [52, 53] as const;
const AURA_RE = /^Level \d+ .+ Aura When Equipped$/;

const labels = new Map<number, string>();
for (const m of modifiers as unknown as ReadonlyArray<{
  id: number;
  description?: { label?: { positive?: string } };
}>) {
  const label = m.description?.label?.positive;
  if (label) labels.set(m.id, label);
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * The item's base. Some display names belong to more than one base (Phase Blade: the sword and the paladin-only
 * 2H Phase Blade); the clipboard can't tell them apart, so the one without a class restriction wins.
 */
export function baseRow(item: Pick<Item, 'type'>): BaseInfo | null {
  const label = cleanItemType(item.type ?? '').toLowerCase();
  const found: BaseInfo[] = [];
  for (const type of itemTypes) {
    for (const base of type.bases) {
      const row = base.label.toLowerCase() === label ? TOOLTIP_DATA.bases[base.value] : undefined;
      const txt = row ? STAT_RANGE_DATA.bases[base.value] : undefined;
      if (row && txt) found.push({ code: base.value, row, types: typeChain(txt[0]) });
    }
  }
  return found.find((b) => ![...b.types].some((t) => t in TOOLTIP_DATA.typeClass)) ?? found[0] ?? null;
}

/** The Gems.txt row of a socketed rune or gem (jewels have none: their stats come with the clipboard). */
export function gemRow(socketed: Pick<Socketed, 'type'>): GemRow | null {
  return TOOLTIP_DATA.gems[socketed.type] ?? null;
}

/** Ctrl+C stats without the app's pseudo rows, "to Strength" with its id, one "% Enhanced Damage". */
function normalize(stats: Stat[], origin: StatOrigin): TooltipStat[] {
  const out: TooltipStat[] = [];
  for (const raw of stats) {
    if (raw._injected || raw.stat_id === S.corruptor) continue;
    out.push({
      ...(raw.stat_id === undefined && raw.name in statRemapByName ? { ...raw, ...statRemapByName[raw.name] } : raw),
      origin,
    });
  }
  // BH exports Enhanced Damage as "% Enhanced Damage" and/or the min/max pair; the game draws one line.
  const ed = out.find((s) => s.stat_id === S.enhancedDamage);
  const max = out.find((s) => s.stat_id === S.maxEd);
  const min = out.find((s) => s.stat_id === S.minEd);
  if (ed) return out.filter((s) => s !== max && s !== min);
  if (max && min && max.value === min.value) {
    return out.flatMap((s) =>
      s === max ? [{ ...max, stat_id: S.enhancedDamage, name: '% Enhanced Damage' }] : s === min ? [] : [s],
    );
  }
  return out;
}

interface Contribution {
  stat: Stat;
  /** Whether the table row fixes the value (min = max, or a parameter-only mod). */
  fixed: boolean;
}

/** What one table mod (Properties code) puts on the item, as stats; rolled values are the row minimum. */
function modStats([code, par, min, max]: TxtMod): Contribution[] {
  const [ids, funcs] = STAT_RANGE_DATA.props[code] ?? [[], []];
  const fixed = min === max;
  const out: Contribution[] = [];
  const add = (id: number, value: number | undefined, isFixed: boolean, extra: Partial<Stat> = {}) =>
    out.push({ stat: { stat_id: id, name: labels.get(id) ?? '', value, ...extra }, fixed: isFixed });
  for (let j = 0; j < funcs.length; j++) {
    const fn = funcs[j];
    const id = ids[j];
    if (!fn) break;
    if (fn === 5) add(S.minDamage, min, fixed);
    else if (fn === 6) add(S.maxDamage, min, fixed);
    else if (fn === 7) add(S.enhancedDamage, min, fixed, { name: '% Enhanced Damage' });
    else if (fn === 20) add(S.indestructible, 1, true);
    else if (id < 0) break;
    else if (fn === 11) {
      // Chance to cast: min = chance, max = skill level, par = skill.
      const name = `%d%% Chance to cast level %d %s ${CHANCE_TO_CAST[id] ?? 'on striking'}`;
      add(id, undefined, true, { name, chance: min, level: max, skill: characterSkillMap[par]?.name ?? '' });
    } else if (fn === 19) {
      // Charges: the current charges aren't in the clipboard; the line is left out rather than guessed.
      return [];
    } else if (fn === 22) add(id, min, fixed, { skill: characterSkillMap[par]?.name ?? '' });
    else if (fn === 16) add(id, max, fixed);
    else if (fn === 17) add(id, par, true);
    else add(id, min, fixed);
  }
  return out;
}

/** Whether the stats already have a line for `id` (any +skill counts for the skill stats). */
function has(stats: Stat[], id: number): boolean {
  if (id === S.enhancedDamage) {
    return stats.some((s) => s.stat_id === S.enhancedDamage || s.stat_id === S.maxEd || s.stat_id === S.minEd);
  }
  if (SKILL_STATS.has(id))
    return stats.some((s) => SKILL_STATS.has(s.stat_id) || (s.stat_id === undefined && !!s.skill));
  if (id in CHANCE_TO_CAST) return stats.some((s) => s.stat_id === id || (s.stat_id === undefined && !!s.chance));
  if (id === S.aura) return stats.some((s) => s.stat_id === id || AURA_RE.test(s.name ?? ''));
  return stats.some((s) => s.stat_id === id);
}

/**
 * Runeword mods missing from the Ctrl+C export (chance to cast, flat damage, …: BH only exports what it finds
 * in the item's own stat list). Only mods whose value the row fixes come back; a rolled one (Grief's max
 * damage) stays missing, with its min/max partner.
 */
function runewordStats(item: Item, stats: Stat[]): TooltipStat[] {
  if (!item.isRuneword) return [];
  const missing = (fixedMods(item) ?? [])
    .filter((m): m is TxtMod => m !== null)
    .map(modStats)
    .filter((parts) => parts.length && !parts.some((p) => has(stats, p.stat.stat_id)));
  const isDamage = (p: Contribution) => p.stat.stat_id === S.minDamage || p.stat.stat_id === S.maxDamage;
  const rolledDamage = missing.some((parts) => parts.some((p) => !p.fixed && isDamage(p)));
  return missing
    .filter((parts) => parts.every((p) => p.fixed) && !(rolledDamage && parts.some(isDamage)))
    .flatMap((parts) => parts.map((p) => ({ ...p.stat, origin: 'runeword' as const })));
}

/** What the item's socketed runes, gems (Gems.txt: weapon, shield or helm/armor mods) and jewels add. */
function socketStats(item: Item): TooltipStat[] {
  const base = baseRow(item);
  const out: TooltipStat[] = [];
  for (const socketed of item.socketed ?? []) {
    const gem = gemRow(socketed);
    if (!gem) {
      out.push(...normalize(socketed.stats ?? [], 'socket'));
      continue;
    }
    if (!base) continue;
    const mods = base.row[4] || base.row[5] || base.row[6] ? gem[2] : base.types.has('shld') ? gem[4] : gem[3];
    for (const mod of mods) for (const p of modStats(mod)) out.push({ ...p.stat, origin: 'socket' });
  }
  return out;
}

/**
 * The item's properties as the game sums them: a socket stat adds to the item's own stat of the same id (the
 * line keeps the item's range source), otherwise it is a line of its own.
 */
export function tooltipStats(item: Item): TooltipStat[] {
  const own = normalize(item.stats ?? [], 'item');
  // BH merges Ctrl+C stats that share a name, keeping the larger value: min and max magic damage are both
  // "+%d magic damage", so the min arrives as the max. A unique/set/runeword row fixes both.
  const minMagic = own.find((s) => s.stat_id === MAGIC_DAMAGE[0]);
  const maxMagic = own.find((s) => s.stat_id === MAGIC_DAMAGE[1]);
  const magicMod = fixedMods(item)?.find((m) => m && STAT_RANGE_DATA.props[m[0]]?.[0][0] === MAGIC_DAMAGE[0]);
  if (minMagic && maxMagic && minMagic.value === maxMagic.value && magicMod) {
    own[own.indexOf(minMagic)] = { ...minMagic, value: magicMod[2] };
  }
  const stats = [...own, ...runewordStats(item, own)];
  for (const extra of socketStats(item)) {
    const sums =
      finite(extra.stat_id) &&
      !SKILL_STATS.has(extra.stat_id) &&
      !(extra.stat_id in CHANCE_TO_CAST) &&
      extra.stat_id !== S.aura;
    const i = sums ? stats.findIndex((s) => s.stat_id === extra.stat_id) : -1;
    if (i < 0) stats.push(extra);
    else stats[i] = { ...stats[i], value: (stats[i].value ?? 0) + (extra.value ?? 0) };
  }
  return stats;
}

/** Sockets the tooltip reports: the app's Sockets row, or the Ctrl+C count. */
export function socketCount(item: Item): number {
  const row = (item.stats ?? []).find((s) => s.stat_id === StatId.Socket);
  if (finite(row?.value)) return row.value;
  return finite(item.sockets) ? item.sockets : 0;
}
