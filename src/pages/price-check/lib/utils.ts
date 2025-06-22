import { Stat } from "./interfaces";
import { itemTypes } from "@/common/item-types";
import { ItemCharmMap, ItemQuality } from "@/common/types/Item";

export function getTypeFromBaseType(baseType: string): { type: string, base: string } | undefined {
  const baseName = baseType.toLowerCase();

  const matchedType = itemTypes.find(type =>
    type.bases.some(b => b.label.toLowerCase() === baseName)
  );

  if (!matchedType) return;

  const base = matchedType.bases.find(b => b.label.toLowerCase() === baseName);
  
  return {type: matchedType.typeValue, base: base.value};
}

export function getStatKey(stat: Stat): string {
  if ('skill' in stat && stat.skill) return `skill:${stat.skill.toLowerCase()}`;
  return `id:${stat.stat_id}`;
} 