import * as Sentry from '@sentry/react';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { ListingPresence, MarketApi } from '@/pages/market/lib/types';

/** Presence looked up this recently isn't asked for again, by any list showing the listing. */
export const PRESENCE_TTL_MS = 60_000;
/** Ids per `_id[$in]` lookup: one page (`$limit` = the ids) with a short query string. */
export const PRESENCE_BATCH_SIZE = 50;

/** App-wide: listing id → PD2's presence (null: PD2 no longer lists it) and when it was looked up. */
const cache = new Map<string, { presence: ListingPresence | null; at: number }>();
const inFlight = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

function publish() {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Listings PD2 itself just answered with: their presence is current, so the pop-in doesn't ask again. */
export function rememberListingPresence(listings: readonly MarketListingEntry[]) {
  if (listings.length === 0) return;
  const at = Date.now();
  for (const l of listings) {
    cache.set(l._id, {
      presence: { user_last_online: l.user_last_online ?? null, user_last_ingame: l.user_last_ingame ?? null },
      at,
    });
  }
  publish();
}

/** Drops every looked-up presence (tests). */
export function clearListingPresenceCache() {
  cache.clear();
  inFlight.clear();
  publish();
}

/**
 * PD2's current seller presence for `listingIds` (the rows a list shows), by listing id, for `withRowPresence`.
 * Rows render first; ids not looked up in the last PRESENCE_TTL_MS are asked for in batches of
 * PRESENCE_BATCH_SIZE and pop in when PD2 answers. `api: null` (signed out) asks nothing. A failed lookup leaves
 * those rows as they are (a Sentry breadcrumb, nothing else); the next change of `listingIds` retries them.
 */
export function useListingPresence(
  api: Pick<MarketApi, 'getListingPresence'> | null,
  listingIds: readonly string[],
): ReadonlyMap<string, ListingPresence> {
  const idsKey = [...new Set(listingIds)].join(',');
  const cacheVersion = useSyncExternalStore(subscribe, () => version);

  useEffect(() => {
    if (!api || !idsKey) return;
    const now = Date.now();
    const stale = idsKey.split(',').filter((id) => {
      const hit = cache.get(id);
      return !inFlight.has(id) && (!hit || now - hit.at >= PRESENCE_TTL_MS);
    });
    for (let i = 0; i < stale.length; i += PRESENCE_BATCH_SIZE) {
      const batch = stale.slice(i, i + PRESENCE_BATCH_SIZE);
      for (const id of batch) inFlight.add(id);
      void api
        .getListingPresence(batch)
        .then(
          (found) => {
            const at = Date.now();
            for (const id of batch) cache.set(id, { presence: found.get(id) ?? null, at });
          },
          (error: unknown) => {
            Sentry.addBreadcrumb({
              category: 'market.presence',
              level: 'warning',
              message: 'Listing presence lookup failed',
              data: { ids: batch.length, error: error instanceof Error ? error.message : String(error) },
            });
          },
        )
        .finally(() => {
          for (const id of batch) inFlight.delete(id);
          publish();
        });
    }
  }, [api, idsKey]);

  return useMemo(() => {
    const presence = new Map<string, ListingPresence>();
    if (!idsKey) return presence;
    for (const id of idsKey.split(',')) {
      const hit = cache.get(id)?.presence;
      if (hit) presence.set(id, hit);
    }
    return presence;
    // cacheVersion: the cache is module state; a settled lookup must recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, cacheVersion]);
}
