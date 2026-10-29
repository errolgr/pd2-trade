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

// parseTypeValue: If true, will parse typeValue as JSON if it contains $in. This is needed for query objects (e.g., buildGetMarketListingQuery),
// but should be left false for URL string building (e.g., buildTradeUrl), which expects a string.
export function getTypeFromBaseType(
  baseType: string,
  parseTypeValue: boolean = false,
): { type: string | object; base: string | object; label: string } | undefined {
  // Clean the type string to remove color codes and special characters
  const cleanedType = cleanItemType(baseType);
  const baseName = cleanedType.toLowerCase();

  const matchedType = itemTypes.find((type) => type.bases.some((b) => b.label.toLowerCase() === baseName));

  if (!matchedType) return;

  const base = matchedType.bases.find((b) => b.label.toLowerCase() === baseName);
  return {
    type: parseTypeValue ? parseCodeValue(matchedType.typeValue) : matchedType.typeValue,
    base: parseTypeValue ? parseCodeValue(base.value) : base.value,
    label: base.label,
  };
}

/** Stat key prefix of pseudo rows (`pseudo:pseudo_total_res`). */
export const PSEUDO_KEY_PREFIX = 'pseudo:';

/**
 * A stat row's key, unique among an item's rows: it names the row for React and the selection/filter state.
 * BH exports chance-to-cast and aura lines without a stat id, so those are keyed by their line, which tells
 * them apart ("15% Chance to cast level 20 Fire Ball on attack").
 */
export function getStatKey(stat: Stat): string {
  if (stat.pseudo) return `${PSEUDO_KEY_PREFIX}${stat.pseudo}`;
  if ('skill' in stat && stat.skill) return `skill:${stat.skill.toLowerCase()}`;
  if (stat.stat_id === undefined) return `line:${stat.name}`;
  return `id:${stat.stat_id}`;
}
