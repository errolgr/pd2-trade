import _ from 'lodash';
import { ItemQuality } from '@/common/types/Item';
import { getTypeFromBaseType } from '@/pages/price-check/lib/utils';
import type { ItemType } from '@/assets/itemFuzzySearch';
import { ItemLocation } from '@/common/types/Location';

/**
 * Creates a map of items keyed by their 'key' field using lodash.
 * This allows O(1) lookup instead of iterating through the list.
 * @param items Array of items to convert to a map
 * @returns Map with item keys as keys and items as values
 */
export function createItemsMapByKey(items: ItemType[]): Record<string, ItemType> {
  return _.keyBy(items, 'key');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const escapeUnicode = (str: string): string => {
  return unescape(encodeURIComponent(str));
};

export const encodeItem = (raw: string): string => {
  return encodeURIComponent(btoa(escapeUnicode(raw)));
};

export const encodeItemForQuickList = (raw: string): string => {
  return btoa(escapeUnicode(raw));
};

export const clipboardContainsValidItem = (jsonString: string): boolean => {
  try {
    const item = JSON.parse(jsonString);
    if (typeof item !== 'object' || item === null) return false;

    // Basic validation
    if (typeof item.quality !== 'string' || typeof item.type !== 'string' || typeof item.iLevel !== 'number') {
      return false;
    }

    // Check if item has no stats (or empty stats array)
    const hasNoStats =
      !item.stats ||
      (Array.isArray(item.stats) && item.stats.length === 0) ||
      item.stats === null ||
      item.stats === undefined;

    // If item has no stats, validate it's a base item (Normal or Superior quality)
    if (hasNoStats) {
      const isBaseQuality = item.quality === ItemQuality.Normal || item.quality === ItemQuality.Superior;

      if (!isBaseQuality) {
        return false;
      }

      // Validate that the type exists in the base item types
      const baseTypeResult = getTypeFromBaseType(item.type, false);
      if (!baseTypeResult) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
};

export const isStashItem = (itemOrJson: string | any): boolean => {
  try {
    const item = typeof itemOrJson === 'string' ? JSON.parse(itemOrJson) : itemOrJson;
    return item?.location === ItemLocation.STASH;
  } catch {
    return false;
  }
};

export { sleep };
