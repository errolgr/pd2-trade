import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { computePseudo } from './pseudo';
import { scoreListing } from './scoring';
import type { MarketApi, MarketFilters, ScoredListing, SearchOptions, SearchResult } from './types';

/** Results per page; the list loads the next page when scrolled to the end. */
export const DEFAULT_PAGE_SIZE = 25;
/** The market service's page size cap. */
export const MAX_PAGE_SIZE = 100;

/**
 * Pseudo stats, score and value computed locally for listings that didn't come from a search (favorites, a deep
 * linked listing), so they render like search rows.
 */
export function scoreListings(listings: MarketListingEntry[], f: MarketFilters): ScoredListing[] {
  return listings.map((listing) => {
    const pseudo = computePseudo(listing.item);
    return { listing, pseudo, ...scoreListing(listing, f.stats, pseudo) };
  });
}

/**
 * One page of a market search. The market service applies every filter (pseudo stats included) and every sort
 * (score, value, stat) over all matching listings, live or sold, so paging is plain `page` × `pageSize`.
 * Rejects with the service's MarketBackendError, or the abort reason when `signal` aborts.
 */
export async function runSearch(api: MarketApi, f: MarketFilters, opts: SearchOptions = {}): Promise<SearchResult> {
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(opts.pageSize ?? DEFAULT_PAGE_SIZE)));
  const page = Math.max(0, Math.floor(opts.page ?? 0));
  const { items, total } = await api.searchListings(f, { page, limit, signal: opts.signal });
  return { items, total, fetched: items.length, mode: 'server' };
}
