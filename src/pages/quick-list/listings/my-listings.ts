import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { Deal } from '@/pages/market/enrich/useDealIndicators';
import type { ListingOffers } from '@/pages/market/lib/listing-offers';

/** PD2 lets a listing be bumped once every 12 hours. */
export const BUMP_COOLDOWN_MS = 12 * 60 * 60 * 1000;

/** When the listing can be bumped again (ms epoch); 0 when it never was. */
export function bumpReadyAt(listing: Pick<MarketListingEntry, 'bumped_at'>): number {
  const bumped = listing.bumped_at ? Date.parse(listing.bumped_at) : NaN;
  return Number.isNaN(bumped) ? 0 : bumped + BUMP_COOLDOWN_MS;
}

export const canBump = (listing: Pick<MarketListingEntry, 'bumped_at'>, now: number) => bumpReadyAt(listing) <= now;

/** The price fields a listing is saved with: an HR price above 0 makes it an exact listing, else a note-only one. */
export function listingPriceFields(
  price: string | number | null | undefined,
  note: string | null | undefined,
): { hr_price: number; price: string } {
  const numeric = price === null || price === undefined || String(price).trim() === '' ? NaN : Number(price);
  return { hr_price: Number.isFinite(numeric) && numeric > 0 ? numeric : 0, price: note?.trim() ?? '' };
}

export type ListingsSortKey = 'attention' | 'bumped' | 'price' | 'listed' | 'deal' | 'name';
export type SortDir = 'asc' | 'desc';
export interface ListingsSort {
  key: ListingsSortKey;
  dir: SortDir;
}

export const SORT_KEYS: readonly ListingsSortKey[] = ['attention', 'bumped', 'price', 'listed', 'deal', 'name'];

/** The direction a sort starts in when picked: most useful first (newest, priciest, best deal, A–Z). */
export const DEFAULT_SORT_DIR: Record<ListingsSortKey, SortDir> = {
  attention: 'asc',
  bumped: 'desc',
  price: 'desc',
  listed: 'desc',
  deal: 'asc',
  name: 'asc',
};

export const DEFAULT_LISTINGS_SORT: ListingsSort = { key: 'attention', dir: 'asc' };

export type ListingsFilter = 'ready' | 'offers';

export interface ListingContext {
  now: number;
  offers: ReadonlyMap<string, ListingOffers>;
  deals: ReadonlyMap<string, Deal>;
}

export const receivedOffers = (listing: MarketListingEntry, ctx: ListingContext) =>
  ctx.offers.get(listing._id)?.received.length ?? 0;

/** Needs-attention order: offers to answer, then bumps to take, then the rest. */
function attentionRank(listing: MarketListingEntry, ctx: ListingContext): number {
  if (receivedOffers(listing, ctx) > 0) return 0;
  if (canBump(listing, ctx.now)) return 1;
  return 2;
}

const time = (iso: string | undefined) => (iso ? Date.parse(iso) || 0 : 0);

/**
 * Sort value per key, ascending; `null` (no HR price, no market estimate) always sorts last whatever the
 * direction. Attention ties fall back to the oldest bump first (it has waited longest).
 */
function sortValue(listing: MarketListingEntry, key: ListingsSortKey, ctx: ListingContext): number | string | null {
  switch (key) {
    case 'attention':
      return attentionRank(listing, ctx);
    case 'bumped':
      return time(listing.bumped_at);
    case 'price':
      return listing.hr_price > 0 ? listing.hr_price : null;
    case 'listed':
      return time(listing.created_at);
    case 'deal':
      return ctx.deals.get(listing._id)?.ratio ?? null;
    case 'name':
      return listing.item?.name?.toLowerCase() ?? '';
  }
}

export function sortListings(
  listings: readonly MarketListingEntry[],
  sort: ListingsSort,
  ctx: ListingContext,
): MarketListingEntry[] {
  const sign = sort.dir === 'asc' ? 1 : -1;
  return [...listings].sort((a, b) => {
    const va = sortValue(a, sort.key, ctx);
    const vb = sortValue(b, sort.key, ctx);
    if (va === null || vb === null) {
      if (va !== vb) return va === null ? 1 : -1;
    } else if (va !== vb) {
      return (va < vb ? -1 : 1) * sign;
    }
    // Ties: the listing whose bump came first
    return time(a.bumped_at) - time(b.bumped_at);
  });
}

export function matchesFilter(
  listing: MarketListingEntry,
  filter: ListingsFilter | null,
  ctx: ListingContext,
): boolean {
  if (filter === 'ready') return canBump(listing, ctx.now);
  if (filter === 'offers') return receivedOffers(listing, ctx) > 0;
  return true;
}
