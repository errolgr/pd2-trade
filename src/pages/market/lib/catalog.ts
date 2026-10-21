import { runeWords, setItems, uniqueItems } from '@/assets/items';
import { modifierByName } from '@/assets/modifiers';
import { SITE_BASE_NAMES, SITE_ITEM_TYPES } from './catalog.data';
import { statLabel } from './stats';
import type { CharClass, Rarity } from './types';

export interface CatalogOption {
  /** Query value: a type/base code, or the site's JSON `{"$in": [...]}` string for grouped entries. */
  code: string;
  label: string;
}

/** The site's Type select (without "Any"), sorted by label. */
export const ITEM_TYPES: CatalogOption[] = SITE_ITEM_TYPES.map(({ code, label }) => ({ code, label }));

const BASES_BY_TYPE = new Map(SITE_ITEM_TYPES.map((t) => [t.code, t.bases]));

/** The site's Base select for a Type (sorted by label); empty for an unknown type. */
export function basesForType(typeCode: string | undefined): CatalogOption[] {
  return typeCode ? [...(BASES_BY_TYPE.get(typeCode) ?? [])] : [];
}

/** Codes a type/base option stands for: its own code, or every member of a `{"$in": [...]}` group. */
export function optionCodes(code: string): string[] {
  if (!code.startsWith('{')) return [code];
  try {
    const parsed = JSON.parse(code) as { $in?: unknown };
    return Array.isArray(parsed.$in) ? parsed.$in.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * The Type and Base select values for an item base (`item.base_code`, e.g. `uap` → Helm / Shako's base), so
 * "Open in market" can preselect them. Null when the site doesn't offer the base.
 */
export function findBaseOption(baseCode: string): { typeCode: string; baseCode: string } | null {
  for (const type of SITE_ITEM_TYPES) {
    const base = type.bases.find((b) => b.code === baseCode || optionCodes(b.code).includes(baseCode));
    if (base) return { typeCode: type.code, baseCode: base.code };
  }
  return null;
}

/** Type option for a raw `item.base.type_code` (grouped types such as Jewelry/Charm resolve to the group). */
export function findTypeOption(typeCode: string): CatalogOption | null {
  return ITEM_TYPES.find((t) => t.code === typeCode || optionCodes(t.code).includes(typeCode)) ?? null;
}

const groupCode = (label: string) => ITEM_TYPES.find((t) => t.label === label)?.code ?? '';

/** Grouped type codes presets and callers refer to by name. */
export const TYPE_CODES = {
  jewelry: groupCode('Jewelry'),
  charm: groupCode('Charm'),
  jewel: 'jewl',
  circlet: 'circ',
  boots: 'boot',
  gloves: 'glov',
  belt: groupCode('Belt'),
  helm: 'helm',
  armor: 'tors',
  shield: 'shie',
} as const;

export const RARITIES: Rarity[] = ['Normal', 'Superior', 'Magic', 'Rare', 'Crafted', 'Set', 'Unique', 'Runeword'];

export const CLASSES: { value: CharClass; label: string }[] = [
  { value: 'amazon', label: 'Amazon' },
  { value: 'assassin', label: 'Assassin' },
  { value: 'barbarian', label: 'Barbarian' },
  { value: 'druid', label: 'Druid' },
  { value: 'necromancer', label: 'Necromancer' },
  { value: 'paladin', label: 'Paladin' },
  { value: 'sorceress', label: 'Sorceress' },
];

/**
 * Values seen in live `item.corruptions` (modifier names of the corruption roll), most common first. Labels
 * are the property templates without the roll. `dmg%` is left out: it always comes with `maxdamage_percent`.
 */
const CORRUPTION_KEYS = [
  'item_numsockets',
  'maxdamage_percent',
  'item_fastercastrate',
  'item_allskills',
  'all_resist',
  'fireresist',
  'coldresist',
  'lightresist',
  'poisonresist',
  'maxfireresist',
  'maxcoldresist',
  'maxlightresist',
  'maxpoisonresist',
  'item_fasterattackrate',
  'item_fastergethitrate',
  'item_fastermovevelocity',
  'item_magicbonus',
  'item_goldbonus',
  'item_deadlystrike',
  'item_crushingblow',
  'item_manaafterkill',
  'item_healafterkill',
  'item_healafterhit',
  'lifedrainmindam',
  'manadrainmindam',
  'tohit',
  'strength',
  'dexterity',
  'vitality',
  'energy',
  'maxhp',
  'item_maxhp_percent',
  'item_armor_percent',
  'damageresist',
  'normal_damage_reduction',
  'magic_damage_reduction',
  'toblock',
  'item_fasterblockrate',
  'item_cannotbefrozen',
  'item_pierce',
  'item_ignoretargetac',
  'passive_fire_pierce',
  'passive_cold_pierce',
  'passive_ltng_pierce',
  'passive_pois_pierce',
  'hpregen',
  'manarecoverybonus',
  'curse_resistance',
  'item_req_percent',
  'item_lightradius',
  'dmg-max',
  'curse_effectiveness',
  'item_thorns_perlevel',
  'passive_fire_mastery',
  'passive_cold_mastery',
  'passive_ltng_mastery',
  'passive_pois_mastery',
  'item_demon_tohit',
  'item_demondamage_percent',
  'item_undead_tohit',
  'item_undeaddamage_percent',
  'item_fractionaltargetac',
  'item_damagetargetac',
  'maxmana',
  'item_addexperience',
];

const CORRUPTION_LABELS: Record<string, string> = {
  item_numsockets: 'Sockets',
  transform_dye: 'Dye',
  indestruct: 'Indestructible',
};

/** Corruption values that aren't property keys, mapped to the property they roll. */
const CORRUPTION_PROPERTY: Record<string, string> = {
  'dmg-max': 'max_damage|maxdamage|secondary_maxdamage|item_throw_maxdamage',
};

/** The property's label template (else the modifier's own label) without the roll. */
function corruptionLabel(value: string): string {
  if (CORRUPTION_LABELS[value]) return CORRUPTION_LABELS[value];
  const key = CORRUPTION_PROPERTY[value] ?? value;
  const template = statLabel(key);
  const modLabel = modifierByName[key]?.description?.label;
  const own = modLabel && 'positive' in modLabel ? modLabel.positive : undefined;
  const text = template !== key ? template : (own ?? key);
  return text
    .replace(/[+-]?\{X\}%?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const CORRUPTION_OPTIONS: { value: string; label: string }[] = [
  ...CORRUPTION_KEYS,
  'transform_dye',
  'indestruct',
].map((value) => ({ value, label: corruptionLabel(value) }));

export interface ItemNameOption {
  name: string;
  quality: 'Unique' | 'Set' | 'Runeword' | 'Base';
}

/** The site's item-name autocomplete: uniques, sets, runewords, then bases and a few misc items. */
const ITEM_NAMES: ItemNameOption[] = (() => {
  const seen = new Set<string>();
  const out: ItemNameOption[] = [];
  const add = (name: string | undefined, quality: ItemNameOption['quality']) => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    out.push({ name, quality });
  };
  for (const item of uniqueItems) add(item.name, 'Unique');
  for (const item of setItems) add(item.name, 'Set');
  for (const item of runeWords) add(item.name, 'Runeword');
  for (const name of SITE_BASE_NAMES) add(name, 'Base');
  for (const name of [
    'Horadric Navigator',
    'Horadric Almanac',
    'Skeleton Key',
    'Full Rejuvenation Potion',
    'Standard of Heroes',
  ]) {
    add(name, 'Base');
  }
  return out;
})();

/**
 * Item names matching `query` (case-insensitive): prefix matches, then word-start matches, then substring
 * matches; alphabetical within each.
 */
export function itemNameOptions(query: string, limit = 30): ItemNameOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const ranked: { option: ItemNameOption; rank: number }[] = [];
  for (const option of ITEM_NAMES) {
    const name = option.name.toLowerCase();
    const at = name.indexOf(q);
    if (at < 0) continue;
    ranked.push({ option, rank: at === 0 ? 0 : /[\s'-]/.test(name[at - 1]) ? 1 : 2 });
  }
  return ranked
    .sort((a, b) => a.rank - b.rank || a.option.name.localeCompare(b.option.name))
    .slice(0, limit)
    .map((r) => r.option);
}
