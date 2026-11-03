import type { BuildsMode } from '@/lib/builds-api';
import type { MarketFilters, Rarity } from '@/pages/market/lib/types';

const RARITIES: readonly string[] = ['Normal', 'Superior', 'Magic', 'Rare', 'Crafted', 'Set', 'Unique', 'Runeword'];

/** What a market search needs to know about a worn / listed item. */
export interface MarketItemRef {
  key: string;
  name: string;
  quality: string | null;
  runeword?: boolean;
  baseCode?: string;
}

/**
 * Market filters for an item seen in a build (ladder; the build's mode). Uniques, sets, runewords, runes and
 * catalog items search by name; others by base and quality (`base:<code>:<quality>` keys carry both).
 * null when the item names nothing searchable.
 */
export function marketFiltersFor(item: MarketItemRef, mode: BuildsMode): Partial<MarketFilters> | null {
  const realm = { hardcore: mode === 'hardcore', ladder: true };
  const [kind, code, keyQuality] = item.key.split(':');
  if (kind !== 'base') return item.name ? { ...realm, itemName: item.name } : null;
  const baseCode = item.baseCode || code;
  if (!baseCode) return null;
  const quality = item.quality ?? keyQuality ?? '';
  const rarity = RARITIES.find((r) => r.toLowerCase() === quality.toLowerCase()) as Rarity | undefined;
  return { ...realm, baseCode, rarity: rarity ? [rarity] : [] };
}
