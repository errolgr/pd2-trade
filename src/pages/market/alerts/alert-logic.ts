/**
 * Saved-search alerts, the pure part: which searches poll, what counts as a new match (seeded silently on the
 * first poll, deduped by listing id), the backoff after rate limits and the toast text. `useMarketAlerts` runs it.
 */
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketFilters, SavedSearch } from '@/pages/market/lib/types';
import { MAX_ALERT_SEARCHES, type MarketPrefs } from '@/pages/market/store/useMarketStore';

export const ALERT_POLL_MS = 15_000;
/** Newest listings fetched per search and poll (room for client-side pseudo filters to find matches). */
export const ALERT_PAGE_SIZE = 50;
/** Listing ids remembered per search; older ones fall off (they are long past the first page by then). */
export const SEEN_CAP = 500;
export const MAX_BACKOFF_MS = 5 * 60_000;

export interface SeenState {
  /** The filters the ids were seen under; a changed search seeds again instead of alerting on everything. */
  fingerprint: string;
  ids: Set<string>;
}

/** The searches that poll: alerting ones, at most MAX_ALERT_SEARCHES, none while alerts are off. */
export function alertingSearches(prefs: Pick<MarketPrefs, 'savedSearches' | 'alertsEnabled'>): SavedSearch[] {
  if (!prefs.alertsEnabled) return [];
  return prefs.savedSearches.filter((s) => s.alert).slice(0, MAX_ALERT_SEARCHES);
}

/** Stable identity of a search's filters (stat row ids excluded: they don't change what matches). */
export function filtersFingerprint(filters: MarketFilters): string {
  return JSON.stringify({ ...filters, stats: filters.stats.map(({ id: _id, ...rest }) => rest) });
}

/**
 * The listings of this poll that are new matches. The first poll of a search (or after its filters changed)
 * only records what is already listed. Every fetched id is remembered, matching or not, so nothing alerts twice.
 */
export function diffListings(
  prev: SeenState | undefined,
  fingerprint: string,
  listings: readonly MarketListingEntry[],
  matches: (listing: MarketListingEntry) => boolean,
): { next: SeenState; fresh: MarketListingEntry[] } {
  if (!prev || prev.fingerprint !== fingerprint) {
    return { next: { fingerprint, ids: capIds(new Set(listings.map((l) => l._id))) }, fresh: [] };
  }
  const fresh = listings.filter((l) => !prev.ids.has(l._id) && matches(l));
  if (listings.every((l) => prev.ids.has(l._id))) return { next: prev, fresh };
  const ids = new Set(prev.ids);
  // Re-insert so the newest listings are the last to fall off the cap
  for (const listing of [...listings].reverse()) {
    ids.delete(listing._id);
    ids.add(listing._id);
  }
  return { next: { fingerprint, ids: capIds(ids) }, fresh };
}

function capIds(ids: Set<string>): Set<string> {
  if (ids.size <= SEEN_CAP) return ids;
  return new Set([...ids].slice(ids.size - SEEN_CAP));
}

/**
 * Wait before the next poll after a rate limit: the server's retry-after or double the previous wait
 * (from the poll interval), whichever is longer, capped at MAX_BACKOFF_MS.
 */
export function rateLimitBackoff(previousMs: number, retryAfterMs: number): number {
  return Math.min(MAX_BACKOFF_MS, Math.max(retryAfterMs, Math.max(previousMs, ALERT_POLL_MS) * 2));
}

/** "2 new: Shako search — Harlequin Crest 1.5 HR" (the newest match). Listing text is shown as plain text. */
export function alertToastText(
  search: SavedSearch,
  fresh: readonly MarketListingEntry[],
): {
  title: string;
  description: string;
} {
  const newest = fresh[0];
  const item = newest.item?.name || newest.item?.base?.name || 'Item';
  const price = newest.hr_price > 0 ? `${newest.hr_price} HR` : (newest.price ?? '').trim().slice(0, 40);
  return {
    title: 'Market alert',
    description: `${fresh.length} new: ${search.name} — ${item}${price ? ` ${price}` : ''}`,
  };
}
