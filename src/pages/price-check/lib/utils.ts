import { Stat } from "./interfaces";
import { itemTypes } from "@/common/item-types";
import { ItemCharmMap, ItemQuality } from "@/common/types/Item";

// parseTypeValue: If true, will parse typeValue as JSON if it contains $in. This is needed for query objects (e.g., buildGetMarketListingQuery),
// but should be left false for URL string building (e.g., buildTradeUrl), which expects a string.
export function getTypeFromBaseType(baseType: string, parseTypeValue: boolean = false): { type: string | object, base: string } | undefined {
  const baseName = baseType.toLowerCase();

  const matchedType = itemTypes.find(type =>
    type.bases.some(b => b.label.toLowerCase() === baseName)
  );

  if (!matchedType) return;

  const base = matchedType.bases.find(b => b.label.toLowerCase() === baseName);
  let typeValue: string | object = matchedType.typeValue;
  if (parseTypeValue && typeof typeValue === 'string' && typeValue.trim().startsWith('{') && typeValue.includes('$in')) {
    try {
      typeValue = JSON.parse(typeValue);
    } catch (e) {
      // fallback to string if parsing fails
    }
  }
  return {type: typeValue, base: base.value};
}

export function getStatKey(stat: Stat): string {
  if ('skill' in stat && stat.skill) return `skill:${stat.skill.toLowerCase()}`;
  return `id:${stat.stat_id}`;
} 