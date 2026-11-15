/**
 * Weapon groups: every weapon, by class (melee / ranged), by hands, and by both ("2H Melee"), for the price check's
 * widest search scopes and the market's Type select. Unlike the type groups (type-groups.ts) they overlap each other
 * and the type groups, and neither the market service nor PD2 knows them: a group travels as the `{"$in": [...]}` of
 * its type codes, plus the `$in` of its base codes when it takes only some bases of a type.
 *
 * Hand count belongs to a base, not a type: swords, axes and hammers come one- and two-handed. The hands below were
 * checked against PD2's own base data (`item.base.damage.one_handed` / `two_handed` of listed items, every weapon base
 * but four seen): a base with two-handed damage is two-handed, even when a Barbarian can swing it in one hand.
 */
import { t } from '@/i18n';
import { SITE_ITEM_TYPES } from './catalog.data';

export type WeaponGroupId = 'weapons' | '1h' | '2h' | 'melee' | '2h-melee' | 'ranged' | '1h-ranged' | '2h-ranged';

export interface WeaponGroup {
  id: WeaponGroupId;
  /** `weapons:<id>`: the group's option in the market's Type select (never sent anywhere). */
  code: string;
  /** Raw `item.base.type_code`s of its weapons. */
  types: readonly string[];
  /** Its base codes when it takes only some bases of a type (the hand groups), else undefined (whole types). */
  bases?: readonly string[];
}

export const WEAPON_GROUP_PREFIX = 'weapons:';

/** Bows and crossbows: the game's missile weapons. */
const MISSILE_TYPES = ['bow', 'abow', 'xbow'];
/**
 * Javelins, throwing knives and throwing axes: the game's combo weapons, thrown (Lightning Fury, Plague Javelin) and
 * swung (Jab, Charged Strike, Fend), so both Ranged and Melee.
 */
const THROWING_TYPES = ['jave', 'ajav', 'taxe', 'tkni'];

/** Every weapon type, in the site's Type list order (by label). */
const WEAPON_TYPES = [
  '2hcs',
  'abow',
  'ajav',
  'aspe',
  'axe',
  'bow',
  'club',
  'xbow',
  'knif',
  'h2h',
  'h2h2',
  'hamm',
  'jave',
  'mace',
  'pole',
  'scep',
  'sc9',
  'orb',
  'spea',
  'staf',
  'swor',
  'taxe',
  'tkni',
  'wand',
];

/** Types whose every base is two-handed. */
const TWO_HANDED_TYPES = ['2hcs', 'abow', 'aspe', 'bow', 'xbow', 'pole', 'sc9', 'spea', 'staf'];
/** Types with one- and two-handed bases. */
const MIXED_TYPES = ['swor', 'axe', 'hamm'];
/** The two-handed bases of MIXED_TYPES (two-handed swords, axes and hammers); their other bases are one-handed. */
const TWO_HANDED_BASES = new Set([
  // Swords
  '2hs',
  'clm',
  'gis',
  'bsw',
  'flb',
  'gsd',
  '92h',
  '9cm',
  '9gs',
  '9b9',
  '9fb',
  '9gd',
  '72h',
  '7cm',
  '7gs',
  '7b7',
  '7fb',
  '7gd',
  // Axes
  'lax',
  'bax',
  'btx',
  'gax',
  'gix',
  '9la',
  '9ba',
  '9bt',
  '9ga',
  '9gi',
  '7la',
  '7ba',
  '7bt',
  '7ga',
  '7gi',
  // Hammers
  'mau',
  'gma',
  '9m9',
  '9gm',
  '7m7',
  '7gm',
]);

/** The raw codes of a site select value: the code, or the string members of its `{"$in": [...]}`. */
function siteCodes(code: string): string[] {
  if (!code.startsWith('{')) return [code];
  const parsed: unknown = JSON.parse(code);
  const members = parsed && typeof parsed === 'object' && '$in' in parsed ? parsed.$in : [];
  return Array.isArray(members) ? members.filter((c): c is string => typeof c === 'string') : [];
}

const SITE_TYPES = SITE_ITEM_TYPES.map((type) => ({
  codes: siteCodes(type.code),
  bases: type.bases.flatMap((b) => siteCodes(b.code)),
}));

/**
 * Every base code of raw type codes, in the site's order: the bases of each site type holding one of them (the site
 * lists Fist Weapon's `h2h` and `h2h2` bases together).
 */
export function basesOfTypes(types: Iterable<string>): string[] {
  const wanted = new Set(types);
  return [...new Set(SITE_TYPES.filter((s) => s.codes.some((c) => wanted.has(c))).flatMap((s) => s.bases))];
}

/** A group of `types` (`hands` keeps only their bases of that hand count); whole types need no bases. */
function group(id: WeaponGroupId, types: readonly string[], hands?: 1 | 2): WeaponGroup {
  const code = `${WEAPON_GROUP_PREFIX}${id}`;
  if (!hands || !types.some((type) => MIXED_TYPES.includes(type))) return { id, code, types };
  const bases = basesOfTypes(types).filter((b) => (hands === 2) === isTwoHandedBase(b, types));
  return { id, code, types, bases };
}

/** Whether a base of one of `types` is two-handed. */
function isTwoHandedBase(base: string, types: readonly string[]): boolean {
  if (TWO_HANDED_BASES.has(base)) return true;
  const type = SITE_TYPES.find((s) => s.bases.includes(base))?.codes.find((c) => types.includes(c));
  return !!type && TWO_HANDED_TYPES.includes(type);
}

const MELEE_TYPES = WEAPON_TYPES.filter((type) => !MISSILE_TYPES.includes(type));
const RANGED_TYPES = WEAPON_TYPES.filter((type) => MISSILE_TYPES.includes(type) || THROWING_TYPES.includes(type));
const TWO_HANDED = WEAPON_TYPES.filter((type) => TWO_HANDED_TYPES.includes(type) || MIXED_TYPES.includes(type));
const ONE_HANDED = WEAPON_TYPES.filter((type) => !TWO_HANDED_TYPES.includes(type));

/**
 * In the market's Type select order. There is no "1H Melee": every one-handed weapon is a melee weapon (throwing
 * weapons are both), so it would be 1H.
 */
export const WEAPON_GROUPS: readonly WeaponGroup[] = [
  group('weapons', WEAPON_TYPES),
  group('1h', ONE_HANDED, 1),
  group('2h', TWO_HANDED, 2),
  group('melee', MELEE_TYPES),
  group(
    '2h-melee',
    TWO_HANDED.filter((type) => MELEE_TYPES.includes(type)),
    2,
  ),
  group('ranged', RANGED_TYPES),
  group(
    '1h-ranged',
    ONE_HANDED.filter((type) => RANGED_TYPES.includes(type)),
    1,
  ),
  group(
    '2h-ranged',
    TWO_HANDED.filter((type) => RANGED_TYPES.includes(type)),
    2,
  ),
];

const byId = (id: WeaponGroupId) => WEAPON_GROUPS.find((g) => g.id === id)!;

/** Whether `code` is a weapon group code (known or not). */
export const isWeaponGroupCode = (code: string | undefined): code is string =>
  !!code && code.startsWith(WEAPON_GROUP_PREFIX);

/** The weapon group of a `weapons:<id>` code; undefined for an unknown id or any other code. */
export function weaponGroupByCode(code: string | undefined): WeaponGroup | undefined {
  return isWeaponGroupCode(code) ? WEAPON_GROUPS.find((g) => g.code === code) : undefined;
}

/** Every base code a weapon group stands for. */
export const weaponGroupBases = (g: WeaponGroup): string[] => (g.bases ? [...g.bases] : basesOfTypes(g.types));

/** A weapon group's name in the app's language. */
export const weaponGroupLabel = (g: WeaponGroup): string => t(`market:weaponGroups.${g.id}`);

/**
 * The weapon groups an item widens to, narrowest first: its hand count within its class (2H Melee, 1H Ranged; a
 * one-handed melee weapon's is 1H), its class (Ranged for bows, crossbows and throwing weapons, else Melee), then
 * Weapons. Empty for anything but a weapon. `typeCode`: its raw type code; `baseCode`: its base.
 */
export function weaponGroupsOf(typeCode: string, baseCode: string | undefined): WeaponGroup[] {
  if (!WEAPON_TYPES.includes(typeCode)) return [];
  const ranged = RANGED_TYPES.includes(typeCode);
  const twoHanded = TWO_HANDED_TYPES.includes(typeCode) || (!!baseCode && TWO_HANDED_BASES.has(baseCode));
  const hands = ranged ? (twoHanded ? '2h-ranged' : '1h-ranged') : twoHanded ? '2h-melee' : '1h';
  return [byId(hands), byId(ranged ? 'ranged' : 'melee'), byId('weapons')];
}
