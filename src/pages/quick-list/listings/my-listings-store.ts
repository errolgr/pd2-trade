/**
 * The signed-in user's market listings in the current realm, as the Manage tab last loaded them, and the listing
 * actions its buttons run. Module level (like the chat feed) so the command palette lists and acts on the same
 * listings while the tab is unmounted, and either one's bump or delete shows in the other.
 */
import { useSyncExternalStore } from 'react';
import type { MarketListingEntry, MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketListingFindQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { subscribeListingDeleted } from '@/hooks/pd2website/listing-events';
import { t } from '@/i18n';
import { showToast } from '@/overlay';
import { trackMeasurement } from '@/lib/telemetry';
import { buildGetAllUserMarketListingsQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { TRADE_LISTINGS_LIMIT } from '@/pages/delist/trade-match';

export interface MyListingsState {
  /** Whose listings and where (listingsRealm); null before the first load. */
  realm: string | null;
  /** null until loaded. */
  listings: MarketListingEntry[] | null;
}

/** The key of a user's listings in one realm. */
export const listingsRealm = (userId: string, hardcore: boolean, ladder: boolean) =>
  `${userId}:${hardcore ? 'hc' : 'sc'}:${ladder ? 'ladder' : 'non-ladder'}`;

const EMPTY: MyListingsState = { realm: null, listings: null };
let state = EMPTY;
const listeners = new Set<() => void>();

function setState(next: MyListingsState) {
  if (next === state) return;
  state = next;
  listeners.forEach((listener) => listener());
}

export const getMyListings = (): MyListingsState => state;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useMyListings = (): MyListingsState => useSyncExternalStore(subscribe, getMyListings);

/** Replaces the listings (of `realm`). */
export function setMyListings(realm: string, listings: MarketListingEntry[]): void {
  setState({ realm, listings });
}

/** Updates the loaded listings in place (nothing before the first load). */
export function updateMyListings(update: (listings: MarketListingEntry[]) => MarketListingEntry[]): void {
  if (state.listings) setState({ ...state, listings: update(state.listings) });
}

export function patchMyListing(id: string, patch: Partial<MarketListingEntry>): void {
  updateMyListings((listings) => listings.map((l) => (l._id === id ? { ...l, ...patch } : l)));
}

// A listing removed anywhere (the Manage tab, the palette, Ctrl+U, auto-delist, chat) leaves the list
subscribeListingDeleted((id) => updateMyListings((listings) => listings.filter((l) => l._id !== id)));

/** Fetches every listing of the user in the realm (PD2 caps it at 50) and stores them. Throws on failure. */
export async function loadMyListings(
  getMarketListings: (query: MarketListingFindQuery) => Promise<MarketListingResult>,
  userId: string,
  hardcore: boolean,
  ladder: boolean,
): Promise<MarketListingEntry[]> {
  const result = await getMarketListings(
    buildGetAllUserMarketListingsQuery(userId, hardcore, ladder, TRADE_LISTINGS_LIMIT, 0),
  );
  setMyListings(listingsRealm(userId, hardcore, ladder), result.data);
  return result.data;
}

export interface ListingActionsApi {
  updateMarketListing: (id: string, update: Record<string, unknown>) => Promise<unknown>;
  updateItemByHash: (hash: string, update: Record<string, unknown>) => unknown;
  deleteMarketListing: (id: string) => Promise<void>;
}

/** Bump to the top (the Bump button): saved on PD2 and in the stash cache, toasted. Resolves whether it worked. */
export async function bumpListing(
  api: ListingActionsApi,
  listing: MarketListingEntry,
  source: string,
): Promise<boolean> {
  const started = performance.now();
  try {
    const bumped_at = new Date().toISOString();
    await api.updateMarketListing(listing._id, { bumped_at });
    api.updateItemByHash(listing.item.hash, { bumped_at });
    patchMyListing(listing._id, { bumped_at });
    trackMeasurement('listed_items_bump', { duration_ms: performance.now() - started }, { outcome: 'success', source });
    showToast(t('quickList:toasts.bumpSuccess'));
    return true;
  } catch (err) {
    trackMeasurement('listed_items_bump', { duration_ms: performance.now() - started }, { outcome: 'error', source });
    console.error('Failed to bump item:', err);
    showToast(t('quickList:toasts.bumpFailed'));
    return false;
  }
}

/** Remove from the market (the Remove button); the listing leaves the list through the listing-deleted event. */
export async function deleteListing(api: ListingActionsApi, listing: MarketListingEntry): Promise<boolean> {
  const started = performance.now();
  try {
    await api.deleteMarketListing(listing._id);
    trackMeasurement('listed_items_delete', { duration_ms: performance.now() - started }, { outcome: 'success' });
    showToast(t('quickList:toasts.removedMarketListing', { name: listing.item.name }));
    return true;
  } catch (err) {
    trackMeasurement('listed_items_delete', { duration_ms: performance.now() - started }, { outcome: 'error' });
    console.error('Failed to delete listing:', err);
    showToast(t('quickList:toasts.deleteFailed'));
    return false;
  }
}

/** Tests: back to nothing loaded. */
export function resetMyListings(): void {
  state = EMPTY;
}
