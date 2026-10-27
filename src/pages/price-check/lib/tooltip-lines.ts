import { modifiers } from '@/assets/modifiers';
import { STAT_RANGE_DATA } from '@/assets/stat-ranges.data';
import { TOOLTIP_DATA } from '@/assets/tooltip.data';
import type { Item, Socketed, Stat } from './interfaces';
import { DAMAGE_PAIRS, damagePairText, damagePairValues, StatId, statRemapByName } from './stat-mappings';
import {
  bhStatRange,
  fixedMods,
  formatStatRange,
  isOSkill,
  skillClass,
  statLineRange,
  type StatRange,
} from './stat-ranges';
import {
  type BaseDamage,
  type BaseInfo,
  type BaseRow,
  baseRow,
  gemRow,
  S,
  socketCount,
  type TooltipStat,
  tooltipStats,
} from './tooltip-stats';

/** In-game tooltip colours (D2 palette). */
export type TooltipColor = 'white' | 'gray' | 'magic' | 'rare' | 'set' | 'unique' | 'crafted' | 'red';

export interface TooltipLine {
  text: string;
  color: TooltipColor;
  /** The stat range PD2 appends in dark green when ranges are shown, e.g. "[25 - 50]". */
  range?: string;
  /** BH's red "*" after a line a corruption changed. */
  star?: boolean;
}

/** The item's tooltip as PD2 draws it for an inventory item, top to bottom. */
export interface TooltipLines {
  /** Name and base lines. */
  title: TooltipLine[];
  /** Rune string, defense, damage, requirements, weapon class: the lines between the base and the properties. */
  header: TooltipLine[];
  /** Properties (with Corrupted), in the game's order. */
  stats: TooltipLine[];
  /** Ethereal / sockets. */
  footer: TooltipLine[];
  /** Set items: set name and its items, drawn after a blank line. */
  set: TooltipLine[];
}

/**
 * Not drawn on purpose (null beats wrong):
 * - Durability: the clipboard has no current durability;
 * - Chance to Block: the game's value depends on the character's class and level;
 * - Required Level of rare and crafted items: it comes from the affixes that rolled, which the clipboard
 *   doesn't name;
 * - Item Level: the game doesn't draw it;
 * - current charges of runeword charges: not in the clipboard;
 * - weapon damage when a per-level or a missing rolled damage mod feeds it.
 */

interface Description {
  function?: number;
  value?: number;
  label?: { positive?: string; secondary?: string };
}

const descriptions = new Map<number, Description>();
const descriptionsByLabel = new Map<string, Description>();
const descriptionsByName = new Map<string, Description>();
for (const m of modifiers as unknown as ReadonlyArray<{ id: number; name: string; description?: Description }>) {
  if (!m.description) continue;
  descriptions.set(m.id, m.description);
  descriptionsByName.set(m.name, m.description);
  const label = m.description.label?.positive;
  if (label && !descriptionsByLabel.has(label)) descriptionsByLabel.set(label, m.description);
}

const STAT = {
  classSkills: 83,
  skillTab: 188,
  charged: 204,
  repairs: 252,
  corrupted: StatId.Corrupted,
  perLevelMaxDamage: 218,
  perLevelMaxEd: 219,
} as const;

const RESIST_IDS = [39, 41, 43, 45];
const ATTRIBUTE_IDS = [0, 1, 2, 3];
/** App-made price check rows (sockets, ethereal, merged lines): never on the item itself. */
const PSEUDO_IDS = new Set<number>([
  StatId.Socket,
  StatId.Ethereal,
  StatId.AllResistances,
  StatId.AllAttributes,
  ...DAMAGE_PAIRS.map((p) => p.id),
]);

/**
 * BH's CorruptionMods (Constants.h): corruption outcome (Corrupted stat value - 2) → the stats BH stars.
 * 194 = sockets (starred on the "Socketed (n)" line).
 */
// prettier-ignore
const CORRUPTION_STATS: number[][] = [
  [18], [19], [424], [123, 121], [91], [80], [86], [138], [9], [99], [333], [334], [335], [336], [105], [60, 18],
  [19], [141], [93], [136], [93, 18], [93, 136], [115, 18], [141, 18], [19, 18], [127], [329, 105], [331, 105],
  [330, 105], [332, 105], [194], [16], [74], [99], [39], [43], [41], [45], [27], [238], [105], [76], [96], [153],
  [34], [35], [152, 16], [109], [127], [39, 43, 41, 45], [36], [40, 39], [44, 43], [42, 41], [46, 45], [60], [62],
  [19, 89], [79], [7], [504], [156], [102], [0, 2, 3, 1], [116], [20], [0], [2], [3], [1], [40, 44, 42, 46],
  [20, 102], [21], [22], [115], [124, 122], [449, 372, 373], [450, 405, 373, 372], [451, 452, 372, 375],
  [456, 372, 375], [451, 452, 457, 372, 375], [370, 371, 375], [372], [374, 372], [375], [418, 420, 419, 421, 372, 375],
  [494], [85], [3, 1], [120],
];

// PD2 colour codes (ÿc1 etc.) can leak into clipboard strings.
const COLOR_CODE_RE = /ÿc./g;
const clean = (text: unknown): string =>
  typeof text === 'string' ? text.replace(COLOR_CODE_RE, '').replace(/\s+/g, ' ').trim() : '';
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const signed = (n: number) => (n < 0 ? `${n}` : `+${n}`);

/**
 * BH's Ctrl+C skill tab names (StashExport SKILL_TABS) → the tab text the game draws; tabs missing here
 * already match ("Martial Arts", "Fire Skills").
 */
const SKILL_TAB_TEXT: Record<string, string> = {
  'Javalin and Spear Skills': 'Javelin and Spear Skills',
  'Curses Skills': 'Curses',
  Summoning: 'Summoning Skills',
  Shapeshifting: 'Shape Shifting Skills',
  Elemental: 'Elemental Skills',
  'Shadow Desciplines': 'Shadow Disciplines',
};

/** "Martial Arts (Assassin)" → ["Martial Arts", "Assassin"]. */
function splitClass(skill: string): [string, string | null] {
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(skill);
  return m ? [m[1], m[2]] : [skill, null];
}

/** ItemStatCost descfunc → how the tooltip prints the value, `#` standing for it. */
const DESC_FORMAT: Partial<Record<number, string>> = {
  1: '+#',
  6: '+#',
  12: '+#',
  13: '+#',
  2: '#%',
  7: '#%',
  18: '#%',
  3: '#',
  9: '#',
  17: '#',
  4: '+#%',
  8: '+#%',
  5: '#%',
  10: '#%',
  20: '-#%',
  21: '-#',
};

/** ItemStatCost descfunc → the value as the tooltip prints it. */
function descValue(fn: number, n: number): string | null {
  const format = DESC_FORMAT[fn];
  if (format === undefined) return null;
  // descfunc 5 / 10 store 128ths
  const v = fn === 5 || fn === 10 ? Math.floor((n * 100) / 128) : n;
  const shown = format.startsWith('+') ? signed(v) : format.startsWith('-') ? `${-v}` : `${v}`;
  return format.endsWith('%') ? `${shown}%` : shown;
}

/**
 * A stat's tooltip line by its ItemStatCost name, `#` standing for the value: "+#% Faster Cast Rate",
 * "Fire Resist +#%", "Cannot Be Frozen". Null for lines one value doesn't fill (skills, chance to cast, charges)
 * and printf-style labels.
 */
export function statTemplate(statName: string): string | null {
  const desc = descriptionsByName.get(statName);
  const label = clean(desc?.label?.positive);
  const fn = desc?.function ?? 1;
  const format = DESC_FORMAT[fn];
  if (!desc || !label || format === undefined || label.includes('%')) return null;
  const secondary = fn >= 6 && fn <= 10 && desc.label?.secondary ? ` ${desc.label.secondary}` : '';
  if (desc.value === 0) return `${label}${secondary}`;
  return desc.value === 2 ? `${label} ${format}${secondary}` : `${format} ${label}${secondary}`;
}

/** One clipboard stat as its tooltip line (D2 descfunc/descval rules), null when it has no visible text. */
export function statText(stat: Stat, item?: Item): string | null {
  const name = clean(stat.name);
  const skill = clean(stat.skill);
  const value = finite(stat.value) ? stat.value : undefined;
  const level = finite(stat.level) ? stat.level : undefined;
  const chance = finite(stat.chance) ? stat.chance : undefined;
  const amount = value ?? level;

  if (skill && (stat.stat_id === STAT.skillTab || /^\+?%d to .+ Skills$/.test(name))) {
    const [tab, cls] = splitClass(skill);
    return `${signed(amount ?? 0)} to ${SKILL_TAB_TEXT[tab] ?? tab}${cls ? ` (${cls} Only)` : ''}`;
  }
  if (stat.stat_id === STAT.classSkills || /Skill Levels$/.test(name)) {
    const cls = skill ? splitClass(skill)[0].replace(/ Skills$/, '') : (/to (\w+) Skill Levels/.exec(name)?.[1] ?? '');
    return `${signed(amount ?? 0)} to ${cls} Skill Levels`;
  }
  if (stat.stat_id === STAT.charged) {
    const charges = value ?? 0;
    const max = finite(stat.range?.max) ? stat.range.max : charges;
    return `Level ${level ?? 0} ${skill} (${charges}/${max} Charges)`;
  }
  // BH exports item charges as { level, skill, charges: "(25/31 Charges)" } without a name.
  const charges = clean(stat.charges);
  if (charges && skill) return `Level ${level ?? 0} ${skill} ${charges}`;
  // descfunc 11: the stat is repairs per 100 seconds.
  if (stat.stat_id === STAT.repairs && value) return `Repairs 1 durability in ${Math.floor(100 / value)} seconds`;
  // BH exports chance-to-cast lines already worded ("18% Chance to cast level 35 Lightning on attack").
  if (chance !== undefined && !/%[+-]?d|%s/.test(name)) return name;
  if (/%[+-]?d|%s/.test(name)) {
    // printf-style description: %d in order takes chance, level, value; %s the skill.
    const fills = [chance, level, value].filter((n): n is number => n !== undefined);
    return name
      .replace(/%%/g, '%')
      .replace(/%\+d/g, () => signed(fills.shift() ?? 0))
      .replace(/%-?d|%s/g, (token) => (token === '%s' ? splitClass(skill)[0] : `${fills.shift() ?? 0}`));
  }
  if (skill) {
    // Single skills and o-skills ("to Teleport", "+3 to Battle Orders"): the amount and skill rebuild the line.
    // The game adds "(Class Only)" to class skills (stat 107), not to o-skills (stat 97, e.g. Enigma's Teleport).
    const [skillName, clipboardClass] = splitClass(skill);
    const cls = clipboardClass ?? (item && !isOSkill(item, stat) ? skillClass(skillName) : null);
    return `${signed(amount ?? 0)} to ${skillName}${cls ? ` (${cls} Only)` : ''}`;
  }
  if (!name) return null;
  if (amount === undefined) return name;

  // A literal leading "%" ("% Faster Cast Rate") belongs to the value.
  if (name.startsWith('%')) return `${signed(amount)}${name}`;

  const desc =
    (stat.stat_id !== undefined ? descriptions.get(stat.stat_id) : undefined) ?? descriptionsByLabel.get(name);
  const fn = desc?.function ?? 1;
  const shown = descValue(fn, amount);
  const secondary = fn >= 6 && fn <= 10 && desc?.label?.secondary ? ` ${desc.label.secondary}` : '';
  if (shown === null || desc?.value === 0) return `${name}${secondary}`;
  return desc?.value === 2 ? `${name} ${shown}${secondary}` : `${shown} ${name}${secondary}`;
}

const CHANCE_TO_CAST: Array<[RegExp, number]> = [
  [/ on attack$/, 195],
  [/ when you Kill an Enemy$/, 196],
  [/ when you Die$/, 197],
  [/ on striking$/, 198],
  [/ when you Level-Up$/, 199],
  [/ on casting$/, 200],
  [/ when struck$/, 201],
];
const CLASS_SKILL_NAMES = new Set(['amazon', 'sorceress', 'necromancer', 'paladin', 'barbarian', 'druid', 'assassin']);
const SKILL_STAT_IDS = new Set<number>([S.nonClassSkill, S.singleSkill, STAT.classSkills, STAT.skillTab]);

/** The ItemStatCost row whose descpriority places the stat's line (BH exports some stats without an id). */
function descStat(item: Item, s: Stat): number | undefined {
  if (finite(s.stat_id)) return s.stat_id;
  const skill = clean(s.skill);
  const name = clean(s.name);
  if (s.charges) return STAT.charged;
  if (/^Level \d+ .+ Aura When Equipped$/.test(name)) return S.aura;
  if (/^\d+% Chance to cast level /.test(name)) return CHANCE_TO_CAST.find(([re]) => re.test(name))?.[1];
  if (!skill) return undefined;
  if (/^\+?%d to .+ Skills$/.test(name)) return STAT.skillTab;
  if (CLASS_SKILL_NAMES.has(skill.toLowerCase().replace(/ skills$/, ''))) return STAT.classSkills;
  const [skillName] = splitClass(skill);
  if (!skillClass(skillName) && !isOSkill(item, s)) return STAT.skillTab;
  return isOSkill(item, s) ? S.nonClassSkill : S.singleSkill;
}

const priorityOf = (id: number | undefined) => (id === undefined ? 0 : (TOOLTIP_DATA.priority[id] ?? 0));

/** Where a property comes from; equal priorities keep the item's own stats first. */
const ORIGIN_RANK = { item: 0, runeword: 1, socket: 2 } as const;

interface Placed {
  line: TooltipLine;
  priority: number;
  origin: number;
  id: number;
}

/** The properties in the game's order: ItemStatCost descpriority, highest first. */
function propertyLines(item: Item, stats: TooltipStat[], starred: Set<number>): TooltipLine[] {
  // BH ranges a line from the stats the item has (socket fillers included, like on the live item).
  const rangeItem: Item = { ...item, stats };
  const placed: Placed[] = [];
  const used = new Set<Stat>();
  const byId = new Map<number, TooltipStat>();
  for (const s of stats) if (finite(s.stat_id) && !byId.has(s.stat_id)) byId.set(s.stat_id, s);
  const num = (id: number) => {
    const v = byId.get(id)?.value;
    return finite(v) ? v : undefined;
  };
  const push = (
    text: string,
    sources: TooltipStat[],
    ids: number[],
    range: StatRange | null,
    color: TooltipColor = 'magic',
  ) => {
    sources.forEach((s) => used.add(s));
    placed.push({
      line: {
        text,
        color,
        ...(range && { range: formatStatRange(range) }),
        ...(ids.some((id) => starred.has(id)) && { star: true }),
      },
      // A group or pair line sits where its highest-priority stat would.
      priority: Math.max(0, ...ids.map(priorityOf)),
      origin: Math.min(...sources.map((s) => ORIGIN_RANK[s.origin])),
      id: Math.min(Infinity, ...ids),
    });
  };

  const corrupted = stats.find((s) => s.stat_id === STAT.corrupted);
  if (corrupted) push('Corrupted', [corrupted], [STAT.corrupted], null, 'red');
  for (const pair of DAMAGE_PAIRS) {
    const v = damagePairValues(stats, pair);
    if (!v) continue;
    push(
      damagePairText(pair, v),
      v.sources as TooltipStat[],
      [pair.min, pair.max],
      bhStatRange(rangeItem, pair.rangeStat),
    );
  }
  // The game draws a group line when every stat of the group has the same value (ItemStatCost dgrp).
  for (const [ids, format] of [
    [RESIST_IDS, (n: number) => `All Resistances ${signed(n)}`],
    [ATTRIBUTE_IDS, (n: number) => `${signed(n)} to all Attributes`],
  ] as const) {
    const values = ids.map(num);
    if (values.some((v) => v === undefined) || new Set(values).size !== 1) continue;
    // BH ranges a group line through its first stat (Fire Resist / Strength).
    push(
      format(values[0]!),
      ids.map((id) => byId.get(id)!),
      [...ids],
      bhStatRange(rangeItem, ids[0]),
    );
  }
  for (const s of stats) {
    if (used.has(s) || (finite(s.stat_id) && PSEUDO_IDS.has(s.stat_id))) continue;
    const ids = s.stat_id === S.enhancedDamage ? [S.maxEd, S.minEd] : [descStat(item, s)].filter(finite);
    // Stats without a description (cold/poison length, sockets, "an evil force") draw no line.
    if (finite(s.stat_id) && s.stat_id !== S.enhancedDamage && !(s.stat_id in TOOLTIP_DATA.priority)) continue;
    const text = s.stat_id === S.reanimate ? reanimateText(item, s) : statText(s, item);
    if (!text || /an evil force/i.test(text)) continue;
    push(text, [s], ids, statLineRange(rangeItem, s));
  }
  // Blunt weapons draw their built-in bonus to undead last.
  const blunt = baseRow(item)?.types.has('blun') ? [{ text: '+50% Damage to Undead', color: 'magic' as const }] : [];
  // Equal priorities: the item's own stats before runeword and socket ones, then ascending stat id. That matches
  // every tie in the S14 capture but one (Gheed's Fortune: Reduces all Vendor Prices before Magic Find, both 8).
  placed.sort((a, b) => b.priority - a.priority || a.origin - b.origin || a.id - b.id);
  return [...placed.map((p) => p.line), ...blunt];
}

/** "5% Reanimate as: Returned": the monster is the param of the item row's reanimate mod. */
function reanimateText(item: Item, s: Stat): string | null {
  const mod = fixedMods(item)?.find((m) => m?.[0] === 'reanimate');
  const monster = mod ? TOOLTIP_DATA.monsters[mod[1]] : undefined;
  return monster && finite(s.value) ? `${s.value}% Reanimate as: ${monster}` : null;
}

const value = (stats: Stat[], id: number) => {
  const v = stats.find((s) => s.stat_id === id)?.value;
  return finite(v) ? v : undefined;
};

/** The stats a Properties code sets (dmg-min/dmg-max/dmg% have no stat column: min/max damage, Enhanced Damage). */
function propStats(code: string): number[] {
  const [ids, funcs] = STAT_RANGE_DATA.props[code] ?? [[], []];
  const byFunc: Record<number, number> = { 5: S.minDamage, 6: S.maxDamage, 7: S.enhancedDamage };
  return funcs.flatMap((fn, j) => (fn in byFunc ? [byFunc[fn]] : ids[j] >= 0 ? [ids[j]] : []));
}

/** Whether the item's unique/set/runeword row puts one of `ids` on it that the stats don't have. */
function rowMissing(item: Item, stats: Stat[], ids: number[]): boolean {
  return (fixedMods(item) ?? []).some((mod) =>
    propStats(mod?.[0] ?? '').some(
      (id) =>
        ids.includes(id) &&
        value(stats, id) === undefined &&
        !(id === S.enhancedDamage && value(stats, S.minEd) !== undefined),
    ),
  );
}

/**
 * Weapon damage lines: base damage (ethereal +25% in PD2) × (100 + enhanced damage)% + flat min/max damage,
 * socket fillers included. Null when a per-level or an unexported damage mod feeds it.
 */
function damageLines(item: Item, stats: Stat[], row: BaseRow, ethereal: boolean): TooltipLine[] | null {
  if (value(stats, STAT.perLevelMaxDamage) !== undefined || value(stats, STAT.perLevelMaxEd) !== undefined) return null;
  const feeds = [
    S.minDamage,
    S.maxDamage,
    S.enhancedDamage,
    S.maxEd,
    S.minEd,
    STAT.perLevelMaxDamage,
    STAT.perLevelMaxEd,
  ];
  if (rowMissing(item, stats, feeds)) return null;
  const ed = value(stats, S.enhancedDamage);
  const minEd = ed ?? value(stats, S.minEd) ?? 0;
  const maxEd = ed ?? value(stats, S.maxEd) ?? 0;
  const flatMin = value(stats, S.minDamage) ?? 0;
  const flatMax = value(stats, S.maxDamage) ?? 0;
  const line = (label: string, dmg: BaseDamage): TooltipLine[] => {
    if (!dmg) return [];
    const [lo, hi] = ethereal ? dmg.map((d) => Math.floor((d * 125) / 100)) : dmg;
    const min = Math.floor((lo * (100 + minEd)) / 100) + flatMin;
    let max = Math.floor((hi * (100 + maxEd)) / 100) + flatMax;
    if (max <= min) max = min + 1;
    return [{ text: `${label}: ${min} to ${max}`, color: 'white' }];
  };
  const [, , , , oneHand, twoHand, thrown] = row;
  // Two-handed swords usable in one hand show "One-Hand Damage" to Barbarians only; the two-hand line is right
  // for every class.
  return [
    ...line('Throw Damage', thrown),
    ...(twoHand ? line('Two-Hand Damage', twoHand) : line('One-Hand Damage', oneHand)),
  ];
}

/** Item type → the weapon class the game names ("Sword Class"); first match in the item's type chain. */
const WEAPON_CLASS: Array<[string, string]> = [
  ['h2h', 'Claw'],
  ['knif', 'Dagger'],
  ['jave', 'Javelin'],
  ['spea', 'Spear'],
  ['pole', 'Polearm'],
  ['xbow', 'Crossbow'],
  ['bow', 'Bow'],
  ['axe', 'Axe'],
  ['swor', 'Sword'],
  ['orb', 'Staff'],
  ['staf', 'Staff'],
  ['wand', 'Staff'],
  ['blun', 'Mace'],
];

/**
 * "Sword Class - Very Fast Attack Speed". The speed band is the base speed less the item's IAS; two-handed
 * weapons sit one step faster. The bands are fitted to the S14 client capture (observed speeds -65 to 10).
 */
function weaponClassLine(stats: Stat[], found: BaseInfo): TooltipLine | null {
  const cls = WEAPON_CLASS.find(([type]) => found.types.has(type))?.[1];
  if (!cls) return null;
  const speed = found.row[3] - (value(stats, S.ias) ?? 0) - (found.row[5] ? 10 : 0);
  const band =
    speed <= -20 ? 'Very Fast' : speed <= 0 ? 'Fast' : speed <= 10 ? 'Normal' : speed <= 20 ? 'Slow' : 'Very Slow';
  return { text: `${cls} Class - ${band} Attack Speed`, color: 'white' };
}

const CLASS_ONLY: Record<string, string> = {
  ama: 'Amazon',
  sor: 'Sorceress',
  nec: 'Necromancer',
  pal: 'Paladin',
  bar: 'Barbarian',
  dru: 'Druid',
  ass: 'Assassin',
};

/**
 * A magic item's Required Level: its prefix and suffix rows (looked up by the names in the item name, on this
 * base, holding the rolled values). Null when a name matches rows with different requirements, or a class
 * requirement applies.
 */
function magicLevelReq(item: Pick<Item, 'name' | 'type' | 'iLevel' | 'stats'>, types: Set<string>): number | null {
  const name = clean(item.name);
  const type = clean(item.type);
  const at = name.indexOf(type);
  if (!type || at < 0) return null;
  const stats = (item.stats ?? []).map((s) =>
    s.stat_id === undefined && s.name in statRemapByName ? { ...s, ...statRemapByName[s.name] } : s,
  );
  let req = 0;
  for (const affix of [name.slice(0, at).trim(), name.slice(at + type.length).trim()]) {
    if (!affix) continue;
    const reqs = new Set<number>();
    for (const [
      auto,
      version,
      level,
      spawnable,
      ,
      itypes,
      etypes,
      mods,
      rowName,
      levelreq,
      classreq,
    ] of STAT_RANGE_DATA.affixes) {
      if (rowName !== affix || auto || version === 0 || !spawnable || level > (item.iLevel ?? 99)) continue;
      if (!itypes.some((t) => types.has(t)) || etypes.some((t) => types.has(t))) continue;
      const rolled = mods.every((mod) => {
        const id = mod ? propStats(mod[0])[0] : undefined;
        if (!mod || id === undefined || SKILL_STAT_IDS.has(id)) return true;
        const v = id === S.enhancedDamage ? (value(stats, id) ?? value(stats, S.minEd)) : value(stats, id);
        return v !== undefined && v >= mod[2] && v <= mod[3];
      });
      if (!rolled) continue;
      if (classreq) return null;
      reqs.add(levelreq);
    }
    if (reqs.size !== 1) return null;
    req = Math.max(req, [...reqs][0]);
  }
  return req;
}

/** Required Level of a socket filler: runes and gems from Misc.txt, unique jewels, magic jewels by affix. */
function fillerLevelReq(socketed: Socketed): number | null {
  const gem = gemRow(socketed);
  if (gem) return gem[1];
  if (socketed.quality === 'Unique' && socketed.name) return TOOLTIP_DATA.uniques[socketed.name]?.[1] ?? null;
  if (socketed.quality !== 'Magic') return null;
  const found = baseRow(socketed);
  return found ? magicLevelReq({ ...socketed, stats: socketed.stats ?? [] }, found.types) : null;
}

/** The game's Required Level, or null when the clipboard can't tell (rare/crafted affixes, unknown rows). */
function levelReq(item: Item, found: BaseInfo | null): number | null {
  const base = found?.row[0] ?? 0;
  let req: number | null = base;
  // Socket fillers raise the requirement (below), which is all a runeword adds: its requirement is its highest
  // rune's. Unique and set items take their row's requirement or the base's, whichever is higher.
  const quality = item.isRuneword ? 'Runeword' : item.quality;
  if (quality === 'Unique' || quality === 'Set') {
    const row = quality === 'Unique' ? TOOLTIP_DATA.uniques[clean(item.name)] : TOOLTIP_DATA.setItems[clean(item.name)];
    req = row ? Math.max(base, row[1]) : null;
  } else if (quality === 'Magic') {
    const affixes = found ? magicLevelReq(item, found.types) : null;
    req = affixes === null ? null : Math.max(base, affixes);
  } else if (quality === 'Rare' || quality === 'Crafted') {
    return null;
  }
  for (const socketed of item.socketed ?? []) {
    const filler = fillerLevelReq(socketed);
    req = req === null || filler === null ? null : Math.max(req, filler);
  }
  return req;
}

/** Strength/Dexterity requirement: base, then "Requirements -x%", then ethereal -10. */
function attributeReq(base: number, stats: Stat[], ethereal: boolean): number {
  if (base <= 0) return 0;
  const pct = value(stats, S.requirements) ?? 0;
  return base + Math.trunc((base * pct) / 100) - (ethereal ? 10 : 0);
}

const TITLE_COLORS: Record<string, TooltipColor> = {
  Unique: 'unique',
  Set: 'set',
  Rare: 'rare',
  Crafted: 'crafted',
  Magic: 'magic',
};

function titleLines(item: Item, ethereal: boolean, sockets: number): TooltipLine[] {
  const type = clean(item.type);
  const name = clean(item.name);
  if (item.isRuneword) {
    const rw = clean(item.runeword);
    return rw
      ? [{ text: rw, color: 'unique' }, ...(type ? [{ text: type, color: 'gray' as const }] : [])]
      : [{ text: type, color: 'gray' }];
  }
  const color = TITLE_COLORS[item.quality];
  if (!color) {
    // Normal / superior / low quality: one line, grey when ethereal or socketed. Low quality items carry a
    // random "Crude"/"Cracked"/"Damaged"/"Low Quality" prefix the clipboard doesn't export, so they show the base.
    const prefix =
      item.quality === 'Superior' ? 'Superior ' : item.socketed?.length && item.quality === 'Normal' ? 'Gemmed ' : '';
    return [{ text: `${prefix}${type}`, color: ethereal || sockets > 0 ? 'gray' : 'white' }];
  }
  if (color === 'magic') return [{ text: name || type, color }];
  // Ctrl+C names uniques and set items by their table row; the game shows the string table name.
  const shown =
    (item.quality === 'Unique'
      ? TOOLTIP_DATA.uniques[name]?.[0]
      : item.quality === 'Set'
        ? TOOLTIP_DATA.setItems[name]?.[0]
        : null) ?? name;
  return [...(shown ? [{ text: shown, color }] : []), ...(type && type !== shown ? [{ text: type, color }] : [])];
}

/** The item's tooltip as PD2 draws it for an inventory item. */
export function tooltipLines(item: Item): TooltipLines {
  const stats = tooltipStats(item);
  const found = baseRow(item);
  const sockets = socketCount(item);
  const ethereal = item.isEthereal === true || (item.stats ?? []).some((s) => s.stat_id === StatId.Ethereal);
  const corruption = value(stats, STAT.corrupted);
  const starred = new Set(corruption === undefined ? [] : (CORRUPTION_STATS[corruption - 2] ?? []));

  const header: TooltipLine[] = [];
  const runes = (item.socketed ?? []).map((s) => gemRow(s)?.[0] ?? '').join('');
  if (runes) header.push({ text: `'${runes}'`, color: 'unique' });
  // Per-level defense (Stormshield, crafted gloves) adds to the drawn Defense by the wearer's level.
  const perLevelDefense = stats.some((s) => s.stat_id === S.defensePerLevel || s.stat_id === S.defensePercentPerLevel);
  if (finite(item.defense) && item.defense > 0 && !perLevelDefense) {
    header.push({ text: `Defense: ${item.defense}`, color: 'white' });
  }
  const classLine = found && (found.row[4] || found.row[5] || found.row[6]) ? weaponClassLine(stats, found) : null;
  if (found) header.push(...(damageLines(item, stats, found.row, ethereal) ?? []));
  // Set weapons draw the weapon class right under the damage.
  if (classLine && item.quality === 'Set') header.push(classLine);
  const restricted = found ? [...found.types].map((t) => TOOLTIP_DATA.typeClass[t]).find(Boolean) : undefined;
  if (restricted && CLASS_ONLY[restricted]) header.push({ text: `(${CLASS_ONLY[restricted]} Only)`, color: 'red' });
  // PD2 draws this on large and grand charms, not on small ones.
  if (found?.types.has('mcha') || found?.types.has('lcha')) {
    header.push({ text: 'Only Active in Charm Inventory', color: 'red' });
  }
  if (found?.types.has('sock')) header.push({ text: 'Can be Inserted into Socketed Items', color: 'white' });
  const reqDex = found ? attributeReq(found.row[2], stats, ethereal) : 0;
  const reqStr = found ? attributeReq(found.row[1], stats, ethereal) : 0;
  if (reqDex > 0) header.push({ text: `Required Dexterity: ${reqDex}`, color: 'white' });
  if (reqStr > 0) header.push({ text: `Required Strength: ${reqStr}`, color: 'white' });
  const req = levelReq(item, found);
  if (req !== null && req > 1) header.push({ text: `Required Level: ${req}`, color: 'white' });
  if (classLine && item.quality !== 'Set') header.push(classLine);

  const footer: TooltipLine[] = [];
  const tags = [ethereal && 'Ethereal (Cannot be Repaired)', sockets > 0 && `Socketed (${sockets})`].filter(Boolean);
  if (tags.length) {
    const star = sockets > 0 && starred.has(S.numSockets);
    footer.push({ text: tags.join(', '), color: 'magic', ...(star && { star }) });
  }

  // The set's items as an inventory tooltip lists them: this item green, the others red (not worn).
  const set: TooltipLine[] = [];
  const setName = item.quality === 'Set' ? clean(item.set) : '';
  const members = setName ? TOOLTIP_DATA.sets[setName] : undefined;
  if (members) {
    const own = TOOLTIP_DATA.setItems[clean(item.name)]?.[0] ?? clean(item.name);
    set.push(
      { text: setName, color: 'unique' },
      ...members.map((m) => ({ text: m, color: m === own ? ('set' as const) : ('red' as const) })),
    );
  }

  return {
    title: titleLines(item, ethereal, sockets),
    header,
    stats: propertyLines(item, stats, starred),
    footer,
    set,
  };
}
