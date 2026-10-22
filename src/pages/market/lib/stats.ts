import type { Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { PSEUDO_STATS } from './pseudo';
import { SITE_STAT_OPTIONS } from './stat-options.data';
import type { CorruptionOption, PseudoDef, StatOption } from './types';

/** A stat picker entry: a property, a pseudo stat or a cube corruption. */
export type StatChoice = StatOption | PseudoDef | CorruptionOption;

export interface ParsedStatKey {
  /** Modifier names to match (more than one for `a|b` alternatives). */
  names: string[];
  /** Leading `values[i]` that must equal these params (`name{p0,p1}`). */
  params: number[];
  /** Index into `values` that min/max (and scoring) read. */
  valueIndex: number;
}

const PARAM_KEY = /^([\w_]+)\{([\d,]+)\}$/;

/**
 * The site's property-key grammar: `name`, `name{p0,p1}` (params pinned to `values.0`, `values.1`… and the roll
 * read after them) or `a|b|c` (any of these names). `item_elemskill_*` rolls live in `values.1`.
 */
export function parseStatKey(key: string): ParsedStatKey {
  const match = PARAM_KEY.exec(key);
  if (match) {
    const params = match[2].split(',').map((p) => parseInt(p, 10));
    return { names: [match[1]], params, valueIndex: params.length };
  }
  const names = key.split('|');
  return { names, params: [], valueIndex: names[0].includes('item_elemskill_') ? 1 : 0 };
}

/** The stat's roll on these modifiers (largest when several lines match), or null when the item lacks it. */
export function readStatValue(mods: Modifier[] | undefined, key: string): number | null {
  if (!mods?.length) return null;
  const { names, params, valueIndex } = parseStatKey(key);
  let best: number | null = null;
  for (const mod of mods) {
    if (!names.includes(mod.name)) continue;
    if (params.some((p, i) => mod.values?.[i] !== p)) continue;
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

/** The site's Properties list (labels are `{X}` templates), in site order, with display groups. */
export const STAT_OPTIONS: StatOption[] = SITE_STAT_OPTIONS.map(([key, label]) => ({
  key,
  label,
  group: statGroup(key),
}));

const OPTION_BY_KEY = new Map(STAT_OPTIONS.map((o) => [o.key, o]));
const PSEUDO_BY_ID = new Map(PSEUDO_STATS.map((p) => [p.id, p]));

/** Label template for a property key or pseudo id; the key itself when unknown. */
export function statLabel(key: string): string {
  return OPTION_BY_KEY.get(key)?.label ?? PSEUDO_BY_ID.get(key)?.label ?? key;
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
};

function normalize(text: string): string {
  return text.replace(/\{X\}/g, ' ').replace(/[+%]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function scoreMatch(haystack: string, tokens: string[]): number | null {
  let score = 0;
  for (const token of tokens) {
    const at = haystack.indexOf(token);
    if (at < 0) return null;
    // Earlier and word-initial hits rank higher
    score += at === 0 ? 0 : haystack[at - 1] === ' ' ? 1 : 3;
    score += at / 100;
  }
  return score + haystack.length / 1000;
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
