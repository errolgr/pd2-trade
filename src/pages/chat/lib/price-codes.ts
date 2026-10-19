import type { ItemDetail } from '@/common/types/pd2-website/GetMarketListingsResponse';

/** Uber ingredients, currency and keys the crawler ingests under the listing's own base_code. */
const BASE_CODE_ITEMS: Record<string, true> = Object.fromEntries(
  [
    'fed',
    'luca',
    'tes',
    'bet',
    'dcho',
    'cwss',
    'dcbl',
    'dcso',
    'rtmo',
    'rtmv',
    'ubaa',
    'ubab',
    'ubac',
    'lucb',
    'lucc',
    'lucd',
    'cm2f',
    'lbox',
    'lpp',
    'imrn',
    'iwss',
  ].map((code) => [code, true]),
);

/** Uniques priced per variant (damage type, class, ...); a name lookup would mix them, so they're skipped. */
const VARIANT_PRICED: Record<string, true> = { 'rainbow facet': true, 'hellfire torch': true, 'spirit ward': true };

/**
 * The price crawler's `baseCode` for a market listing's item, mirroring the server's extraction
 * (pd2-price-crawler `src/item-price/item-extraction.ts`), or null when the crawler doesn't price it.
 */
export function listingPriceCode(item: ItemDetail): string | null {
  // Stacked runes carry an 's' suffix (r30s); the crawler prices them as the single rune.
  const runeCode = (item.base?.id || item.base_code || '').replace(/s$/, '');
  if (/^r\d{2}$/.test(runeCode)) return runeCode;

  if (item.base_code && (BASE_CODE_ITEMS[item.base_code] || item.base?.type_code === 't5m')) return item.base_code;

  const quality = item.quality?.name;
  if ((quality !== 'Unique' && quality !== 'Set') || item.is_runeword || !item.name) return null;
  const name = item.name.toLowerCase();
  // Unidentified, or one of PD2's first-row uniques named after their base (The Gnasher as "Hand Axe"):
  // the server renames those from its static tables, which the overlay doesn't carry.
  if (item.is_identified === false || name === item.base?.name?.toLowerCase()) return null;
  if (VARIANT_PRICED[name]) return null;
  // The server only prices unique jewels through variant rules (Rainbow Facet).
  if (item.base?.type_code === 'jew' || item.base?.type_code === 'jewl') return null;
  // The server's normalizeItemName: every non-alphanumeric becomes '_'.
  return name.replace(/[^a-z0-9]/g, '_');
}
