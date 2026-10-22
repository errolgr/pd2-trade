import type { ItemDetail, MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { allItems } from '@/assets/items';
import type { ItemType } from '@/assets/itemFuzzySearch';
import { listingArtUrl } from '@/pages/chat/lib/listing-art';

/** The listing's page on projectdiablo2.com (the format the site's own share/"I'm interested" links use). */
export function listingUrl(listing: Pick<MarketListingEntry, '_id'>): string {
  return `https://projectdiablo2.com/market/listing/${encodeURIComponent(listing._id)}`;
}

/** Compact age of the last bump (else update): `now`, `5m`, `3h`, `2d`, `5w`; empty when unknown. */
export function listingAge(
  listing: Pick<MarketListingEntry, 'bumped_at' | 'updated_at'>,
  now: Date = new Date(),
): string {
  const at = Date.parse(listing.bumped_at || listing.updated_at || '');
  if (Number.isNaN(at)) return '';
  const minutes = Math.max(0, Math.floor((now.getTime() - at) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 14 ? `${days}d` : `${Math.floor(days / 7)}w`;
}

/**
 * The in-game account `/w *account` reaches: the one the seller is playing on (resolved by the listing query),
 * else the account holding the item, else their first linked account. Null when the listing names none.
 */
export function sellerAccount(listing: Pick<MarketListingEntry, 'user' | 'item'>): string | null {
  return listing.user?.in_game_account || listing.item?.account_id || listing.user?.game?.accounts?.[0] || null;
}

/** Name as the site's listing card titles it: rares/magic/crafted by quality + base, everything else by name. */
export function itemDisplayName(item: Pick<ItemDetail, 'name' | 'quality' | 'base'>): string {
  const quality = item.quality?.name;
  const baseName = item.base?.name;
  if ((quality === 'Rare' || quality === 'Magic' || quality === 'Crafted') && baseName && item.name === baseName) {
    return `${quality} ${baseName}`;
  }
  return item.name || baseName || 'Item';
}

let itemsByName: Record<string, ItemType> | null = null;

/** Thumbnail URL (unique/set art, rune/currency art, else the base's art); null when nothing matches. */
export function itemArtUrl(item: Pick<ItemDetail, 'name' | 'quality' | 'base'>): string | null {
  if (!itemsByName) {
    itemsByName = {};
    // Listings carry display names; keys (different for a few renamed uniques) are the fallback
    for (const entry of allItems) itemsByName[entry.name] ??= entry;
    for (const entry of allItems) itemsByName[entry.key] ??= entry;
  }
  return listingArtUrl(item, itemsByName);
}
