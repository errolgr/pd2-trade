/**
 * The search scopes the price check's header cycles through for a base-quality item, narrowest first (the
 * `searchMode` numbers): 0 its base, 1 its type, 2 its type group (Bows), then for weapons 3 its hand count within
 * its class (2H Melee, 1H Ranged; 1H for a one-handed melee weapon), 4 its class (Melee / Ranged), 5 Weapons.
 */
import { optionCodes } from '@/pages/market/lib/catalog';
import { typeGroupOf } from '@/pages/market/lib/type-groups';
import { basesOfTypes, type WeaponGroup, weaponGroupBases, weaponGroupsOf } from '@/pages/market/lib/weapon-groups';
import { getTypeFromBaseType } from './utils';

/** The item's entry in the site's Type list (`itemTypes`): its type and bases. */
export interface MatchedItemType {
  typeLabel: string;
  typeValue: string;
  bases: Array<{ label: string; value: string }>;
}

/** First search mode of the weapon groups (`weaponGroupsOf` order). */
const FIRST_WEAPON_MODE = 3;

/** The item's base codes (`item.type` is its base name): one, or a grouped base's (`glv`, `glvs`); empty when unknown. */
function itemBases(itemType: string): string[] {
  const base = getTypeFromBaseType(itemType)?.base;
  return typeof base === 'string' && base !== 'Any' ? optionCodes(base) : [];
}

/** The weapon group search mode `mode` (3–5) searches for an item; undefined for other modes and non-weapons. */
export function searchModeWeaponGroup(
  mode: number,
  itemType: string,
  matchedItemType: MatchedItemType | null | undefined,
): WeaponGroup | undefined {
  if (mode < FIRST_WEAPON_MODE || !matchedItemType) return undefined;
  const [typeCode] = optionCodes(matchedItemType.typeValue);
  return weaponGroupsOf(typeCode, itemBases(itemType)[0])[mode - FIRST_WEAPON_MODE];
}

/**
 * The modes the header cycles through for an item, in order: its base, then each wider scope it has that searches
 * more bases than the one before (a type of one base adds nothing to its base).
 */
export function availableSearchModes(itemType: string, matchedItemType: MatchedItemType | null | undefined): number[] {
  const modes = [0];
  if (!matchedItemType) return modes;
  const types = optionCodes(matchedItemType.typeValue);
  const family = typeGroupOf(matchedItemType.typeValue);
  const [typeCode] = types;
  const scopes: (string[] | undefined)[] = [
    itemBases(itemType),
    basesOfTypes(types),
    family && basesOfTypes(family.members),
    ...weaponGroupsOf(typeCode, itemBases(itemType)[0]).map(weaponGroupBases),
  ];
  let previous = scopes[0]!;
  for (let mode = 1; mode < scopes.length; mode++) {
    const bases = scopes[mode];
    if (!bases) continue;
    // Scopes only widen, so the same count is the same bases
    if (bases.length !== previous.length) modes.push(mode);
    previous = bases;
  }
  return modes;
}
