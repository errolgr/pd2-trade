import { Stat } from './interfaces';
import { itemTypes } from '@/common/item-types';
import { ItemCharmMap, ItemQuality } from '@/common/types/Item';

/**
 * Cleans item type strings by removing color codes and special formatting characters.
 * Handles patterns like "Catalyst Shardÿc\/" -> "Catalyst Shard"
 */
export function cleanItemType(type: string): string {
  // Remove color codes and special characters (ÿc followed by characters, \/, etc.)
  return (
    type
      // eslint-disable-next-line no-control-regex
      .replace(/ÿc[^\x00-\x7F]*/g, '') // Remove ÿc and any non-ASCII characters that follow
      // eslint-disable-next-line no-useless-escape
      .replace(/[\/\\]+/g, '') // Remove forward/back slashes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  );
}

/** A type/base value as a query value: the item-types `{"$in": [...]}` group strings become their `$in` object. */
export function parseCodeValue(value: string): string | object {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.includes('$in')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

type ItemTypeEntry = (typeof itemTypes)[number];

/**
 * The site's Type list entry and base for a base name (`Phase Blade`), case-insensitive. A name can be listed twice:
 * PD2's variant bases are their base's code plus `2` (the site's `2H Crystal Sword` type holds a `7cr2` Phase Blade
 * beside the Sword type's one-handed `7cr`), and a price checked item is never the variant, so a code whose
 * unsuffixed code is listed under the same name loses.
 */
export function findItemType(
  baseName: string,
): { type: ItemTypeEntry; base: ItemTypeEntry['bases'][number] } | undefined {
  const name = baseName.toLowerCase();
  const matches = itemTypes.flatMap((type) =>
    type.bases.filter((b) => b.label.toLowerCase() === name).map((base) => ({ type, base })),
  );
  const codes = new Set(matches.map((m) => m.base.value));
  return matches.find((m) => !(m.base.value.endsWith('2') && codes.has(m.base.value.slice(0, -1)))) ?? matches[0];
}

// parseTypeValue: If true, will parse typeValue as JSON if it contains $in. This is needed for query objects (e.g., buildGetMarketListingQuery),
// but should be left false for URL string building (e.g., buildTradeUrl), which expects a string.
export function getTypeFromBaseType(
  baseType: string,
  parseTypeValue: boolean = false,
): { type: string | object; base: string | object; label: string } | undefined {
  // Clean the type string to remove color codes and special characters
  const match = findItemType(cleanItemType(baseType));
  if (!match) return;
  const { type: matchedType, base } = match;
  return {
    type: parseTypeValue ? parseCodeValue(matchedType.typeValue) : matchedType.typeValue,
    base: parseTypeValue ? parseCodeValue(base.value) : base.value,
    label: base.label,
  };
}

/** Stat key prefix of pseudo rows (`pseudo:pseudo_total_res`). */
export const PSEUDO_KEY_PREFIX = 'pseudo:';

/** The min / max inputs of a stat row (damage pairs use all four). */
export const RANGE_FIELDS = ['min', 'max', 'maxMin', 'maxMax'] as const;

/**
 * A stat row's key, unique among an item's rows: it names the row for React and the selection/filter state.
 * Skill-parameterised rows (auras, chance to cast, charges) are keyed by stat and skill; BH lines left without a
 * stat id are keyed by their line, which tells them apart ("15% Chance to cast level 20 Fire Ball on attack").
 */
export function getStatKey(stat: Stat): string {
  if (stat.pseudo) return `${PSEUDO_KEY_PREFIX}${stat.pseudo}`;
  if (stat.skillParam) return `id:${stat.stat_id}:${stat.skillParam.name.toLowerCase()}`;
  if ('skill' in stat && stat.skill) return `skill:${stat.skill.toLowerCase()}`;
  if (stat.stat_id === undefined) return `line:${stat.name}`;
  return `id:${stat.stat_id}`;
}
