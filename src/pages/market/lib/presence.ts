/**
 * Seller presence pop-in: rows render from the market service with the last-seen times it stored or looked up;
 * PD2's current times (looked up by listing id, see useListingPresence) are merged in when they arrive.
 */
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { isUserOnlineIngame } from '@/lib/user-online-status';
import type { ListingPresence } from './types';

/** The later of two last-seen times; a missing or unreadable one never replaces a known one. */
function latest(current: string | undefined, next: string | null): string | undefined {
  if (!next) return current;
  const nextTime = new Date(next).getTime();
  if (!Number.isFinite(nextTime)) return current;
  return current && new Date(current).getTime() >= nextTime ? current : next;
}

/**
 * `listing` with `presence` merged in: each last-seen time keeps the newer of the two (a lookup never makes a seller
 * look longer gone), and the service's `online` / `in_game` flags follow. The same object when nothing changes.
 */
export function withPresence(listing: MarketListingEntry, presence: ListingPresence | undefined): MarketListingEntry {
  if (!presence) return listing;
  const lastOnline = latest(listing.user_last_online, presence.user_last_online);
  const lastIngame = latest(listing.user_last_ingame, presence.user_last_ingame);
  if (lastOnline === listing.user_last_online && lastIngame === listing.user_last_ingame) return listing;
  return {
    ...listing,
    user_last_online: lastOnline,
    user_last_ingame: lastIngame,
    ...('online' in listing && { online: isUserOnlineIngame(lastOnline) }),
    ...('in_game' in listing && { in_game: isUserOnlineIngame(lastIngame) }),
  };
}

/** `rows` (same order) with presence merged into their listings; the same array when nothing changes. */
export function withRowPresence<T extends { listing: MarketListingEntry }>(
  rows: T[],
  presence: ReadonlyMap<string, ListingPresence>,
): T[] {
  if (presence.size === 0) return rows;
  let changed = false;
  const merged = rows.map((row) => {
    const listing = withPresence(row.listing, presence.get(row.listing._id));
    if (listing === row.listing) return row;
    changed = true;
    return { ...row, listing };
  });
  return changed ? merged : rows;
}
