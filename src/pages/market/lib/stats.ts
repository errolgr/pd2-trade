import type { Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { PSEUDO_STATS } from './pseudo';
import { SITE_STAT_OPTIONS } from './stat-options.data';
import type { CorruptionOption, PseudoDef, StatOption } from './types';

/** A stat picker entry: a property, a pseudo stat or a cube corruption. */
export type StatChoice = StatOption | PseudoDef | CorruptionOption;

/** A constrained `values[index]` of a stat key: equal to one of `values`, or within `min`..`max`. */
export interface ParamPin {
  index: number;
  /** Any of these values (`{98|123}`; one for a plain `{98}`). */
  values?: number[];
  min?: number;
  max?: number;
}

export interface ParsedStatKey {
  /** Modifier names to match (more than one for `a|b` alternatives). */
  names: string[];
  /** Constrained leading values (`name{p0,p1}`); unpinned `*` slots are left out. */
  pins: ParamPin[];
  /** Index into `values` that min/max (and scoring) read. */
  valueIndex: number;
}

/**
 * Virtual key of physical flat damage ("Adds 4-14 Damage"), shared with the market service: PD2 lists it as a
 * min-damage line and a max-damage line, resolved as one `[min, max]` pair like `firedam`. `damage{4..}` pins the
 * min line's value (slot 0); the row's min/max and the roll read the max line.
 */
export const DAMAGE_KEY = 'damage';
/** Modifier names of the physical min / max damage lines (the site's `a|b` alternatives). */
export const MIN_DAMAGE_NAMES: readonly string[] = [
  'min_damage',
  'mindamage',
  'secondary_mindamage',
  'item_throw_mindamage',
];
export const MAX_DAMAGE_NAMES: readonly string[] = [
  'max_damage',
  'maxdamage',
  'secondary_maxdamage',
  'item_throw_maxdamage',
];

/** Whether a parsed key's names are the physical damage pair (`damage`, `damage{4..}`). */
export const isDamagePair = (names: readonly string[]) => names.length === 1 && names[0] === DAMAGE_KEY;

const INT = '\\d{1,6}';
/** `*` (any), `N` or `N|M|…` (any of), `N..M` / `N..` / `..M` (range). */
const SLOT = `\\*|${INT}(?:\\|${INT}){0,7}|(?:${INT})?\\.\\.(?:${INT})?`;
const KEY = new RegExp(`^([\\w]+(?:\\|[\\w]+)*)(?:\\{((?:${SLOT})(?:,(?:${SLOT})){0,3})\\})?(?:\\[([0-4])\\])?$`);

/** A `{…}` slot as a pin; null for `*`. */
function slotPin(slot: string, index: number): ParamPin | null {
  if (slot === '*') return null;
  if (!slot.includes('..')) return { index, values: slot.split('|').map((v) => parseInt(v, 10)) };
  const [lo, hi] = slot.split('..');
  return { index, ...(lo ? { min: parseInt(lo, 10) } : {}), ...(hi ? { max: parseInt(hi, 10) } : {}) };
}

/**
 * The market service's property-key grammar (its `filters/stats.ts`): `name` or `a|b|c` (any of these names), then
 * optionally `{s0,s1,…}` constraining the leading values, each slot `N`, `N|M` (any of), `N..M` / `N..` / `..M` or
 * `*` (unconstrained), then optionally `[i]`, the value min/max and scoring read. Without `[i]` the roll follows
 * the slots (`item_singleskill{54}` → `values.1`); without slots `item_elemskill_*` rolls live in `values.1`,
 * everything else in `values.0`. E.g. `item_skillongethit{*,44}[0]`, `item_aura{98|123}`, `item_splashonhit[2]`,
 * `firedam|firemindam{4..}[1]`, `damage{4..}` (the physical pair, see `DAMAGE_KEY`). A key outside the grammar
 * reads as unpinned `a|b` names.
 */
export function parseStatKey(key: string): ParsedStatKey {
  const match = KEY.exec(key);
  const names = match ? match[1].split('|') : key.split('|');
  const slots = match?.[2]?.split(',') ?? [];
  const pins = slots.flatMap((slot, i) => slotPin(slot, i) ?? []);
  // Pairs read as `[min, max]` roll their max: `item_elemskill_*` (values.1 as on the site) and `damage`
  const pairRoll = names[0].includes('item_elemskill_') || isDamagePair(names);
  const valueIndex = match?.[3] !== undefined ? Number(match[3]) : slots.length || (pairRoll ? 1 : 0);
  return { names, pins, valueIndex };
}

/** Whether a modifier line's values satisfy a key's pins. */
export function pinsMatch(values: readonly unknown[] | undefined, pins: readonly ParamPin[]): boolean {
  return pins.every(({ index, values: anyOf, min, max }) => {
    const value = values?.[index];
    if (typeof value !== 'number') return false;
    if (anyOf) return anyOf.includes(value);
    return (min === undefined || value >= min) && (max === undefined || value <= max);
  });
}

/**
 * The stat's roll on these modifiers (largest when several lines match), or null when the item lacks it. The
 * physical pair (`damage{…}`) needs a min-damage line within the pins and rolls the largest max-damage line.
 */
export function readStatValue(mods: Modifier[] | undefined, key: string): number | null {
  if (!mods?.length) return null;
  const { names, pins, valueIndex } = parseStatKey(key);
  if (isDamagePair(names)) {
    if (!mods.some((m) => MIN_DAMAGE_NAMES.includes(m.name) && pinsMatch(m.values, pins))) return null;
    return readStatValue(mods, MAX_DAMAGE_NAMES.join('|'));
  }
  let best: number | null = null;
  for (const mod of mods) {
    if (!names.includes(mod.name) || !pinsMatch(mod.values, pins)) continue;
    const value = mod.values?.[valueIndex];
    if (typeof value !== 'number') continue;
    if (best === null || value > best) best = value;
  }
  return best;
}

/** Display group for a property key (picker sections). */
export function statGroup(key: string): string {
  const name = parseStatKey(key).names[0];
  if (/^(corrupted|desecrated|desecrator|corruptor)$/.test(name)) return 'Corruption';
  if (
    /^item_(addclassskills|addskill_tab|singleskill|nonclassskill|allskills|elemskill_|aura|skillon|charged_skill)/.test(
      name,
    )
  ) {
    return 'Skills';
  }
  if (
    /^passive_\w+_(mastery|pierce)$|fastercastrate|maxmana|manarecovery|mana_perlevel|manaafterkill|damagetomana/.test(
      name,
    )
  ) {
    return 'Caster';
  }
  if (/resist|absorb/.test(name)) return 'Resists';
  if (/^(strength|dexterity|vitality|energy|all_attributes)$|^item_(strength|dexterity|vitality|energy)_/.test(name)) {
    return 'Attributes';
  }
  if (
    /armor|armorclass|block|damage_reduction|damageresist|maxhp|hpregen|hp_perlevel|fastergethit|cannotbefrozen|halffreeze|poisonlength|curse|thorns|attackertakes/.test(
      name,
    )
  ) {
    return 'Defense';
  }
  if (
    /dam|damage|tohit|attack|crushing|deadly|openwounds|deep_wounds|crit|pierce|drain|targetac|demon|undead|knockback|slow|freeze|splash|howl|preventheal|reanimate/.test(
      name,
    )
  ) {
    return 'Offense';
  }
  if (
    /magicbonus|goldbonus|find_|fastermove|lightradius|req_percent|experience|stamina|durability|indesctructible|replenish|ethereal|socket/.test(
      name,
    )
  ) {
    return 'Utility';
  }
  return 'Charm/Misc';
}

/** The physical damage pair's picker entry (not a site property: the market service resolves `DAMAGE_KEY`). */
const DAMAGE_OPTION: StatOption = { key: DAMAGE_KEY, label: 'Adds {X}-{Y} Damage', group: 'Offense' };

/**
 * The site's elemental Minimum / Maximum Damage entries (`firemindam`, `firemaxdam`) as one entry per element, the
 * line PD2 sends: "Adds X-Y" `firedam [min, max]` (cold: `[min, max, chill frames]`), or the same pair named
 * `firemindam`. Lone min / max lines don't occur on listings, so the site's keys match nothing. Like `damage`, the
 * entry rolls the max (`values.1`); the price check's `firedam|firemindam{4..}` pins the min on top. Poison reads
 * "+X Poison Damage over N Seconds" (`[min, max, seconds]`, min = max).
 */
const ELEMENTAL_DAMAGE: ReadonlyMap<string, StatOption | null> = new Map(
  (
    [
      ['fire', 'Adds {X}-{Y} Fire Damage'],
      ['light', 'Adds {X}-{Y} Lightning Damage'],
      ['magic', 'Adds {X}-{Y} Magic Damage'],
      ['cold', 'Adds {X}-{Y} Cold Damage'],
      ['poison', '+{X} Poison Damage'],
    ] as const
  ).flatMap(([e, label]) => [
    [`${e}mindam`, { key: `${e}dam|${e}mindam[1]`, label, group: 'Offense' }],
    [`${e}maxdam`, null],
  ]),
);

/**
 * The site's Properties list (labels are `{X}` templates), in site order, with display groups; the physical
 * damage pair ahead of its max/min lines, each element's min / max entries as its one pair entry.
 */
export const STAT_OPTIONS: StatOption[] = SITE_STAT_OPTIONS.flatMap(([key, label]) => {
  const elemental = ELEMENTAL_DAMAGE.get(key);
  if (elemental !== undefined) return elemental ? [elemental] : [];
  const option = { key, label, group: statGroup(key) };
  return key.startsWith(`${MAX_DAMAGE_NAMES[0]}|`) ? [DAMAGE_OPTION, option] : [option];
});

const OPTION_BY_KEY = new Map(STAT_OPTIONS.map((o) => [o.key, o]));
const PSEUDO_BY_ID = new Map(PSEUDO_STATS.map((p) => [p.id, p]));
/** Unpinned options by their names, for keys the list lacks over the same names (`firedam|firemindam{4..}`). */
const OPTION_BY_NAMES = new Map(
  STAT_OPTIONS.flatMap((o) => {
    const { names, pins } = parseStatKey(o.key);
    return pins.length === 0 ? [[names.join('|'), o] as const] : [];
  }),
);

/**
 * Label template for a property key or pseudo id; a key the site list lacks takes the label of the unpinned
 * option over the same names (`firedam|firemindam{4..}` → Adds {X}-{Y} Fire Damage), else of its first known name
 * (`a|b` alternatives, extended slots); the key itself when unknown.
 */
export function statLabel(key: string): string {
  const known = OPTION_BY_KEY.get(key) ?? PSEUDO_BY_ID.get(key);
  if (known) return known.label;
  const { names } = parseStatKey(key);
  const sameNames = OPTION_BY_NAMES.get(names.join('|'));
  if (sameNames) return sameNames.label;
  for (const name of names) {
    const option = OPTION_BY_KEY.get(name);
    if (option) return option.label;
  }
  return key;
}

/** True for pseudo entries returned by searchStats. */
export function isPseudo(option: StatChoice): option is PseudoDef {
  return 'compute' in option;
}

/** True for corruption entries returned by searchStats. */
export function isCorruption(option: StatChoice): option is CorruptionOption {
  return 'rolled' in option;
}

/** Shorthands players type, expanded before matching. */
const ALIASES: Record<string, string> = {
  fcr: 'faster cast rate',
  fhr: 'faster hit recovery',
  fbr: 'faster block rate',
  ias: 'increased attack speed',
  frw: 'faster run/walk',
  mf: 'magic items',
  gf: 'extra gold',
  ed: 'enhanced',
  ar: 'attack rating',
  str: 'strength',
  dex: 'dexterity',
  vit: 'vitality',
  ene: 'energy',
  ll: 'life stolen',
  ml: 'mana stolen',
  cb: 'crushing blow',
  ds: 'deadly strike',
  ow: 'open wounds',
  dr: 'damage taken reduced',
  pdr: 'physical damage taken reduced',
  res: 'resist',
  hp: 'life',
  // "flat damage" → "Adds {X}-{Y} Damage"
  flat: 'adds',
};

function normalize(text: string): string {
  return text
    .replace(/\{X\}(?:-\{Y\})?/g, ' ')
    .replace(/[+%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** A normalized label without filler: leading "to " / "total ", trailing "(…)" notes ("+{X} to Life" → "life"). */
function coreName(label: string): string {
  return label
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/^(to|total) /, '')
    .trim();
}

/** Whole-name match ("life" → "+{X} to Life") beats any partial match. */
const EXACT_BONUS = 5;
/** Per character of the core name: shorter names win close calls ("Life" over "Life stolen per hit"). */
const LENGTH_WEIGHT = 1 / 25;

function scoreMatch(haystack: string, tokens: string[]): number | null {
  let score = 0;
  for (const token of tokens) {
    const at = haystack.indexOf(token);
    if (at < 0) return null;
    // Earlier and word-initial hits rank higher
    score += at === 0 ? 0 : haystack[at - 1] === ' ' ? 1 : 3;
    score += at / 100;
  }
  // Whole name: the same number of words, each equal to its query word or, from 4 letters, starting with it
  // ("cold res" → "cold resist" ≈ "Cold Resistance"; "def" ≠ "Defiance")
  const words = coreName(haystack).split(' ');
  const whole =
    words.length === tokens.length &&
    words.every((w, i) => w === tokens[i] || (tokens[i].length >= 4 && w.startsWith(tokens[i])));
  return score + words.join(' ').length * LENGTH_WEIGHT - (whole ? EXACT_BONUS : 0);
}

/** Query words asking for corruptions ("corrupt", "corrupted", "corruption"). */
const CORRUPT_WORD = /^corrupt/;

/**
 * Picker search: every query word (aliases like `fcr`, `res`, `mf` expanded) must appear in the label. Pseudo
 * stats rank ahead of plain properties on equal relevance, corruptions after them unless the query says
 * "corrupt…" (then they lead, and that word needn't appear in their label). Empty query → pseudos then all
 * properties.
 */
export function searchStats(query: string, limit = 50, corruptions: readonly CorruptionOption[] = []): StatChoice[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...PSEUDO_STATS, ...STAT_OPTIONS].slice(0, limit);
  const tokens = words.flatMap((w) => normalize(ALIASES[w] ?? w).split(' '));
  const hits: { option: StatChoice; score: number }[] = [];
  for (const pseudo of PSEUDO_STATS) {
    // "Total …" frames the pseudo, so rank on the rest; still match when the user typed "total"
    const label = normalize(pseudo.label);
    const score = scoreMatch(label.replace(/^total /, ''), tokens) ?? scoreMatch(label, tokens);
    if (score !== null) hits.push({ option: pseudo, score: score - 0.5 });
  }
  for (const option of STAT_OPTIONS) {
    const score = scoreMatch(normalize(option.label), tokens) ?? scoreMatch(option.key.toLowerCase(), words);
    if (score !== null) hits.push({ option, score });
  }
  const wantsCorruption = words.some((w) => CORRUPT_WORD.test(w));
  const corruptionTokens = tokens.filter((t) => !CORRUPT_WORD.test(t));
  for (const option of corruptions) {
    const score =
      scoreMatch(normalize(option.label), corruptionTokens) ?? scoreMatch(option.value.toLowerCase(), corruptionTokens);
    if (score !== null) hits.push({ option, score: score + (wantsCorruption ? -1 : 0.25) });
  }
  return hits
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((h) => h.option);
}
