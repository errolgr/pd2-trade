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

/** Windows-1252 characters at bytes 0x80-0x9F (the rest of the code page is Latin-1). */
const CP1252_HIGH: Record<string, number> = {
  '€': 0x80,
  '‚': 0x82,
  ƒ: 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  ˆ: 0x88,
  '‰': 0x89,
  Š: 0x8a,
  '‹': 0x8b,
  Œ: 0x8c,
  Ž: 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  š: 0x9a,
  '›': 0x9b,
  œ: 0x9c,
  ž: 0x9e,
  Ÿ: 0x9f,
};
/** A UTF-8 lead byte read as Windows-1252, followed by a continuation byte read the same way. */
const MOJIBAKE_RE =
  /[\u00c2-\u00f4][\u0080-\u00bf\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/;

/**
 * Undoes UTF-8 text that was decoded as Windows-1252: the game puts its item JSON on the Windows clipboard as
 * ANSI text, so its UTF-8 colour codes arrive as "Ã¿c0Monster Density:Ã¿c3" instead of "ÿc0…ÿc3". Text that
 * isn't such mojibake (or doesn't decode as UTF-8 once re-encoded) is returned unchanged.
 */
export function repairClipboardText(text: string): string {
  if (!MOJIBAKE_RE.test(text)) return text;
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const byte = code <= 0xff ? code : CP1252_HIGH[text[i]];
    if (byte === undefined) return text;
    bytes[i] = byte;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return text;
  }
}

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
      // getTypeFromBaseType will clean the type string internally
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

/** Modifier names of an item's corruption rolls. PD2 doesn't always send `corruptions` as an array. */
export const itemCorruptions = (item: { corruptions?: unknown }): readonly string[] =>
  Array.isArray(item.corruptions) ? item.corruptions : [];

export { sleep };
