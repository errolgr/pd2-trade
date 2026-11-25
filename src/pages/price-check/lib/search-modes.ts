/**
 * The search scopes the price check's header offers for a base-quality item, narrowest first (the
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

/** How much a scope searches, for its row in the header's scope menu: this base, N bases or N types. */
export type ScopeSize = { unit: 'base' } | { unit: 'bases' | 'types'; count: number };

/** A search scope the header offers: its `searchMode` and what it searches. */
export interface SearchScope {
  mode: number;
  size: ScopeSize;
}

/**
 * The scopes the header offers for an item, narrowest first: its base, then each wider scope it has that searches
 * more bases than the one before (a type of one base adds nothing to its base).
 */
export function searchScopes(itemType: string, matchedItemType: MatchedItemType | null | undefined): SearchScope[] {
  const result: SearchScope[] = [{ mode: 0, size: { unit: 'base' } }];
  if (!matchedItemType) return result;
  const types = optionCodes(matchedItemType.typeValue);
  const family = typeGroupOf(matchedItemType.typeValue);
  const [typeCode] = types;
  const typeBases = basesOfTypes(types);
  const scopes: ({ bases: string[]; size: ScopeSize } | undefined)[] = [
    { bases: itemBases(itemType), size: { unit: 'base' } },
    { bases: typeBases, size: { unit: 'bases', count: typeBases.length } },
    family && { bases: basesOfTypes(family.members), size: { unit: 'types', count: family.members.length } },
    ...weaponGroupsOf(typeCode, itemBases(itemType)[0]).map((g) => {
      const bases = weaponGroupBases(g);
      // A hand group takes some bases of its types: counted in bases
      const size: ScopeSize = g.bases
        ? { unit: 'bases', count: bases.length }
        : { unit: 'types', count: g.types.length };
      return { bases, size };
    }),
  ];
  let previous = scopes[0]!.bases;
  for (let mode = 1; mode < scopes.length; mode++) {
    const scope = scopes[mode];
    if (!scope) continue;
    // Scopes only widen, so the same count is the same bases
    if (scope.bases.length !== previous.length) result.push({ mode, size: scope.size });
    previous = scope.bases;
  }
  return result;
}
