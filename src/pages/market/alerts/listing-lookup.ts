/**
 * Alert listings looked up once per toast: the toast's hover tooltip and the listing drawer share the answer, so
 * hovering shows the item at once and Details opens without a second request.
 */
import { useEffect, useState } from 'react';
import { fetchMarketListing, type MarketListingDetail } from './saved-search-api';

/** A lookup is reused this long (the drawer's offer and whisper re-check the listing themselves). */
const TTL_MS = 2 * 60_000;
const MAX_ENTRIES = 50;
const cache = new Map<string, { at: number; promise: Promise<MarketListingDetail | null> }>();

/** The listing and its status, from cache when looked up in the last TTL_MS; failed lookups are not kept. */
export function lookupListing(id: string): Promise<MarketListingDetail | null> {
  const now = Date.now();
  const hit = cache.get(id);
  if (hit && now - hit.at < TTL_MS) return hit.promise;
  const promise = fetchMarketListing(id);
  promise.catch(() => {
    if (cache.get(id)?.promise === promise) cache.delete(id);
  });
  cache.delete(id);
  cache.set(id, { at: now, promise });
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  return promise;
}

export type ListingLookup =
  | { state: 'loading' }
  | { state: 'ready'; detail: MarketListingDetail }
  /** Unknown to pd2trader.com (never ingested, or sold/removed more than 30 days ago). */
  | { state: 'missing' }
  | { state: 'error' };

const LOADING: ListingLookup = { state: 'loading' };

/** lookupListing as state; starts the lookup on mount (undefined: nothing to look up). */
export function useListingLookup(id: string | undefined): ListingLookup {
  const [result, setResult] = useState<{ id: string; lookup: ListingLookup } | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    lookupListing(id).then(
      (detail) => {
        if (live) setResult({ id, lookup: detail ? { state: 'ready', detail } : { state: 'missing' } });
      },
      () => {
        if (live) setResult({ id, lookup: { state: 'error' } });
      },
    );
    return () => {
      live = false;
    };
  }, [id]);
  return result?.id === id ? result.lookup : LOADING;
}
