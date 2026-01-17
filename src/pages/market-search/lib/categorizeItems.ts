import { itemTypes } from '@/common/item-types';
import { uniqueItems } from '@/assets/items';

export type ItemCategory = 'Weapons' | 'Armor' | 'Accessories' | 'Class Specific' | 'Other';

export interface CategorizedItemType {
  typeLabel: string;
  typeValue: string | { $in: string[] };
  category: ItemCategory;
}

export interface CategorizedUniqueItem {
  id: number;
  key: string;
  name: string;
  base_code: string;
  base: string;
  level: number;
  category: ItemCategory;
}

export interface CategorizedItems {
  itemTypes: CategorizedItemType[];
  uniqueItems: CategorizedUniqueItem[];
}

/**
 * Determines the category for an item type based on its label
 */
function categorizeItemType(typeLabel: string): ItemCategory {
  const label = typeLabel.toLowerCase();

  // Weapons
  if (
    label.includes('axe') ||
    label.includes('bow') ||
    label.includes('sword') ||
    label.includes('dagger') ||
    label.includes('knife') ||
    label.includes('mace') ||
    label.includes('hammer') ||
    label.includes('polearm') ||
    label.includes('spear') ||
    label.includes('javelin') ||
    label.includes('scepter') ||
    label.includes('staff') ||
    label.includes('wand') ||
    label.includes('club') ||
    label.includes('scythe') ||
    label.includes('crossbow') ||
    label.includes('throwing')
  ) {
    return 'Weapons';
  }

  // Armor
  if (
    label.includes('armor') ||
    label.includes('helm') ||
    label.includes('boot') ||
    label.includes('glove') ||
    label.includes('belt') ||
    label.includes('shield')
  ) {
    return 'Armor';
  }

  // Accessories
  if (
    label.includes('jewelry') ||
    label.includes('amulet') ||
    label.includes('ring') ||
    label.includes('charm') ||
    label.includes('jewel')
  ) {
    return 'Accessories';
  }

  // Class Specific
  if (
    label.includes('amazon') ||
    label.includes('barbarian') ||
    label.includes('druid') ||
    label.includes('paladin') ||
    label.includes('sorceress') ||
    label.includes('necromancer') ||
    label.includes('assassin') ||
    label.includes('fist weapon') ||
    label.includes('shrunken head') ||
    label.includes('orb') ||
    label.includes('pelt')
  ) {
    return 'Class Specific';
  }

  // Default to Other
  return 'Other';
}

/**
 * Determines the category for a unique item by matching its base_code to item types
 */
function categorizeUniqueItem(baseCode: string): ItemCategory {
  // Find matching item type
  const matchingType = itemTypes.find((type) => {
    const typeValue = typeof type.typeValue === 'string' ? type.typeValue : JSON.stringify(type.typeValue);

    // Check if base_code matches the typeValue directly
    if (typeValue === baseCode) {
      return true;
    }

    // Check if base_code matches any base in the type
    return type.bases.some((base) => base.value === baseCode);
  });

  if (matchingType) {
    return categorizeItemType(matchingType.typeLabel);
  }

  // Fallback: try to infer from base_code patterns
  if (
    baseCode.includes('axe') ||
    baseCode.includes('bow') ||
    baseCode.includes('sword') ||
    baseCode.includes('dagger') ||
    baseCode.includes('mace') ||
    baseCode.includes('hammer') ||
    baseCode.includes('spear') ||
    baseCode.includes('staff') ||
    baseCode.includes('wand')
  ) {
    return 'Weapons';
  }

  if (
    baseCode.includes('armor') ||
    baseCode.includes('helm') ||
    baseCode.includes('boot') ||
    baseCode.includes('glove') ||
    baseCode.includes('belt') ||
    baseCode.includes('shield')
  ) {
    return 'Armor';
  }

  return 'Other';
}

/**
 * Categorizes all item types
 */
export function categorizeItemTypes(): CategorizedItemType[] {
  return itemTypes.map((type) => ({
    typeLabel: type.typeLabel,
    typeValue: type.typeValue,
    category: categorizeItemType(type.typeLabel),
  }));
}

/**
 * Categorizes all unique items
 */
export function categorizeUniqueItems(): CategorizedUniqueItem[] {
  return uniqueItems.map((item) => ({
    id: item.id,
    key: item.key,
    name: item.name,
    base_code: item.base_code,
    base: item.base,
    level: item.level,
    category: categorizeUniqueItem(item.base_code),
  }));
}

/**
 * Gets all categorized items grouped by category
 */
export function getCategorizedItems(): Record<
  ItemCategory,
  { itemTypes: CategorizedItemType[]; uniqueItems: CategorizedUniqueItem[] }
> {
  const categorizedTypes = categorizeItemTypes();
  const categorizedUniques = categorizeUniqueItems();

  const result: Record<ItemCategory, { itemTypes: CategorizedItemType[]; uniqueItems: CategorizedUniqueItem[] }> = {
    Weapons: { itemTypes: [], uniqueItems: [] },
    Armor: { itemTypes: [], uniqueItems: [] },
    Accessories: { itemTypes: [], uniqueItems: [] },
    'Class Specific': { itemTypes: [], uniqueItems: [] },
    Other: { itemTypes: [], uniqueItems: [] },
  };

  categorizedTypes.forEach((item) => {
    result[item.category].itemTypes.push(item);
  });

  categorizedUniques.forEach((item) => {
    result[item.category].uniqueItems.push(item);
  });

  return result;
}
