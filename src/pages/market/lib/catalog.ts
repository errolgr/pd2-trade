import { runeWords, setItems, uniqueItems } from '@/assets/items';
import { modifierByName } from '@/assets/modifiers';
import { SITE_BASE_NAMES, SITE_ITEM_TYPES } from './catalog.data';
import { statLabel } from './stats';
import type { CharClass, CorruptionOption, Rarity } from './types';

export interface CatalogOption {
  /** Query value: a type/base code, or the site's JSON `{"$in": [...]}` string for grouped entries. */
  code: string;
  label: string;
}

/** The site's Type select (without "Any"), sorted by label. */
export const ITEM_TYPES: CatalogOption[] = SITE_ITEM_TYPES.map(({ code, label }) => ({ code, label }));

const BASES_BY_TYPE = new Map(SITE_ITEM_TYPES.map((t) => [t.code, t.bases]));

/** A `{"$in": [...]}` select value, written as the site writes its grouped entries. */
const inCodes = (codes: string[]) => `{"$in": [${codes.map((c) => `"${c}"`).join(', ')}]}`;

/**
 * A Base option of ours that stands for a family of bases the site lists one by one ("any pgem", "any key"), with
 * the words the item-name box finds it by. Picking it searches its Type with every base of the family.
 */
export interface BaseGroup extends CatalogOption {
  typeCode: string;
  aliases: string[];
}

const typeCodeOf = (label: string) => SITE_ITEM_TYPES.find((t) => t.label === label)?.code ?? '';
const UBER = typeCodeOf('Uber Ingredient');

export const BASE_GROUPS: BaseGroup[] = [
  {
    typeCode: typeCodeOf('Gem'),
    label: 'Any Perfect Gem',
    // Gem bases come plain and stacked (`gpv`, `gpvs`)
    code: inCodes(['gpv', 'gpw', 'gpg', 'gpr', 'gpb', 'skz', 'gpy'].flatMap((c) => [c, `${c}s`])),
    aliases: ['pgem', 'pgems', 'perfect gems', 'perfect skull'],
  },
  {
    typeCode: UBER,
    label: 'Any Pandemonium Key',
    code: inCodes(['pk1', 'pk2', 'pk3']),
    aliases: ['keys', 'pandemonium keys', 'uber keys', 'key of terror', 'key of hate', 'key of destruction'],
  },
  {
    typeCode: UBER,
    label: 'Any Corrupted Ear',
    code: inCodes(['ivez', 'ivea', 'iveb', 'ived', 'iven', 'ivep', 'ives']),
    aliases: ['ears', 'corrupted ears'],
  },
  {
    typeCode: UBER,
    label: 'Any Essence',
    code: inCodes(['tes', 'ceh', 'bet', 'fed']),
    aliases: ['essences', 'twisted essence', 'charged essence', 'burning essence', 'festering essence'],
  },
  {
    typeCode: UBER,
    label: 'Any Uber Organ',
    code: inCodes(['mbr', 'dhn', 'bey']),
    aliases: ['organs', "mephisto's brain", "diablo's horn", "baal's eye"],
  },
];

/** The site's Base select for a Type (sorted by label), after our base groups for it; empty for an unknown type. */
export function basesForType(typeCode: string | undefined): CatalogOption[] {
  if (!typeCode) return [];
  const groups = BASE_GROUPS.filter((g) => g.typeCode === typeCode).map(({ code, label }) => ({ code, label }));
  return [...groups, ...(BASES_BY_TYPE.get(typeCode) ?? [])];
}

/** Base groups the item-name box offers for `query` (three letters or more of its label or one of its words). */
export function baseGroupMatches(query: string): BaseGroup[] {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];
  return BASE_GROUPS.filter((g) => [g.label, ...g.aliases].some((term) => term.toLowerCase().includes(q)));
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

/**
 * Corruptions without a `corrupted` modifier line of their own, so nothing to bound (the market service rejects
 * min/max on them): sockets, the `dmg%` / `dmg-max` markers, dye and indestructible.
 */
const UNROLLED_CORRUPTIONS = new Set(['item_numsockets', 'dmg%', 'dmg-max', 'transform_dye', 'indestruct']);

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

export const CORRUPTION_OPTIONS: CorruptionOption[] = [...CORRUPTION_KEYS, 'transform_dye', 'indestruct'].map(
  (value) => ({ value, label: corruptionLabel(value), rolled: !UNROLLED_CORRUPTIONS.has(value) }),
);

const CORRUPTION_BY_VALUE = new Map(CORRUPTION_OPTIONS.map((o) => [o.value, o]));

/** The picker entry of a corruption name; unknown names (older saved searches) are labelled by the name. */
export function corruptionOption(value: string): CorruptionOption {
  return CORRUPTION_BY_VALUE.get(value) ?? { value, label: value, rolled: !UNROLLED_CORRUPTIONS.has(value) };
}

export interface ItemNameOption {
  name: string;
  quality: 'Unique' | 'Set' | 'Runeword' | 'Base';
  /** Equipment slot / type for the suggestion ("Helm", "Ring", "Bow"); absent for runewords and unknown bases. */
  slot?: string;
}

/** Catalog types named by their member base instead ("Ring" rather than "Jewelry"). */
const SLOT_BY_BASE_NAME: Record<string, true> = { Jewelry: true };
const SLOT_RENAMES: Record<string, string> = { Armor: 'Body Armor' };

/** Base code and base name → slot label, from the site's Type/Base catalog. */
const SLOTS: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const type of SITE_ITEM_TYPES) {
    for (const base of type.bases) {
      const slot = SLOT_BY_BASE_NAME[type.label] ? base.label : (SLOT_RENAMES[type.label] ?? type.label);
      for (const code of optionCodes(base.code)) if (!map.has(code)) map.set(code, slot);
      if (!map.has(base.label)) map.set(base.label, slot);
    }
  }
  return map;
})();

/** Slot label, or undefined when it would only repeat the name ("Ring" for Ring). */
function slotFor(key: string | undefined, name: string): string | undefined {
  const slot = key ? SLOTS.get(key) : undefined;
  return slot && slot !== name ? slot : undefined;
}

/** The site's item-name autocomplete: uniques, sets, runewords, then bases and a few misc items. */
const ITEM_NAMES: ItemNameOption[] = (() => {
  const seen = new Set<string>();
  const out: ItemNameOption[] = [];
  const add = (name: string | undefined, quality: ItemNameOption['quality'], slot?: string) => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    out.push(slot ? { name, quality, slot } : { name, quality });
  };
  for (const item of uniqueItems) add(item.name, 'Unique', slotFor(item.base_code, item.name));
  for (const item of setItems) add(item.name, 'Set', slotFor(item.base_code, item.name));
  for (const item of runeWords) add(item.name, 'Runeword');
  for (const name of SITE_BASE_NAMES) add(name, 'Base', slotFor(name, name));
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

const ITEM_NAMES_BY_NAME = new Map(ITEM_NAMES.map((o) => [o.name.toLowerCase(), o]));

/** The autocomplete entry for an exact item name (case-insensitive); undefined when the site doesn't list it. */
export function itemNameOption(name: string): ItemNameOption | undefined {
  return ITEM_NAMES_BY_NAME.get(name.trim().toLowerCase());
}

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
