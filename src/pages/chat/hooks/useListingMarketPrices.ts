import { useEffect, useMemo, useState } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { getSeasonDateConfig } from '@/lib/seasons';
import { DEFAULT_PRICE_WINDOW_HOURS, priceWindowNote, windowLabel } from '@/lib/price-window';
import { fetchMultipleItemPrices, type PriceApiConfig } from '@/pages/currency/lib/price-api';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { listingPriceCode } from '../lib/price-codes';

/** Crawler market price for a listing's item, in HR, and the window it was computed over ('7d', 'season'...). */
export interface ListingMarketPrice {
  hr: number;
  window: string;
}

/** Market prices drift slowly; refetch after this long, showing the cached price meanwhile. */
const CACHE_TTL_MS = 10 * 60_000;

/** App-lifetime cache keyed by `${configKey}|${baseCode}`. A null price: the crawler has no data for it. */
const cache = new Map<string, { price: ListingMarketPrice | null; at: number }>();
/** Requests in flight per cache key, so re-renders and other pills join them instead of refetching. */
const inflight = new Map<string, Promise<void>>();
/** Codes requested this tick, per price config; flushed as one batch request per config in a microtask. */
const pending = new Map<string, { codes: Set<string>; done: Promise<void> }>();

function flush(configKey: string, codes: Set<string>, requestedWindow: string): Promise<void> {
  const config = JSON.parse(configKey) as PriceApiConfig;
  return fetchMultipleItemPrices(
    [...codes].map((baseCode) => ({ baseCode })),
    config,
  ).then((prices) => {
    // A failed request stays uncached so a later open retries; codes a successful batch omits have no data.
    if (!prices) return;
    const at = Date.now();
    for (const code of codes) {
      const data = prices.get(code);
      // The price check's headline figure: the 7-day moving average for the 7-day window and past seasons,
      // otherwise the mean over the chosen window.
      const hr = !data
        ? 0
        : requestedWindow === '7d' || requestedWindow === 'season'
          ? (data.movingAverage7Days ?? data.medianPrice)
          : data.averagePrice;
      const window = priceWindowNote(data?.priceWindow, requestedWindow)?.label ?? requestedWindow;
      cache.set(`${configKey}|${code}`, { price: hr > 0 ? { hr, window } : null, at });
    }
  });
}

/** Queues `code` into this tick's batch for `configKey`, or joins the request already fetching it. */
function request(configKey: string, code: string, requestedWindow: string): Promise<void> {
  const key = `${configKey}|${code}`;
  const running = inflight.get(key);
  if (running) return running;
  let batch = pending.get(configKey);
  if (!batch) {
    const codes = new Set<string>();
    const done = new Promise<void>((resolve) => queueMicrotask(resolve)).then(() => {
      pending.delete(configKey);
      return flush(configKey, codes, requestedWindow);
    });
    batch = { codes, done };
    pending.set(configKey, batch);
  }
  batch.codes.add(code);
  const done = batch.done.finally(() => inflight.delete(key));
  inflight.set(key, done);
  return done;
}

interface PriceRequest {
  listingId: string;
  configKey: string;
  code: string;
}
/**
 * Crawler market prices for chat-linked listings, keyed by listing id; unpriced listings are absent.
 * Each listing is priced in its own realm (its ladder/hardcore flags) over the user's price window and season,
 * as the price check does. Every caller in the same tick shares one batch request per realm.
 */
export function useListingMarketPrices(
  listings: readonly MarketListingEntry[],
): ReadonlyMap<string, ListingMarketPrice> {
  const { settings } = useOptions();
  const { startDate, endDate } = getSeasonDateConfig(settings.selectedSeasonId);
  const hours = settings.priceWindowHours ?? DEFAULT_PRICE_WINDOW_HOURS;
  // A past season prices its whole date range; otherwise a rolling window clamped to the season start.
  const requestedWindow = endDate ? 'season' : windowLabel(hours);

  const requests: PriceRequest[] = [];
  for (const listing of listings) {
    const code = listingPriceCode(listing.item);
    if (!code) continue;
    const config: PriceApiConfig = {
      isLadder: listing.is_ladder,
      isHardcore: listing.is_hardcore,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : { hours }),
    };
    requests.push({ listingId: listing._id, configKey: JSON.stringify(config), code });
  }
  const requestsKey = JSON.stringify(requests);
  const [settledCount, setSettledCount] = useState(0);

  useEffect(() => {
    const parsed = JSON.parse(requestsKey) as PriceRequest[];
    const now = Date.now();
    const stale = parsed.filter(({ configKey, code }) => {
      const hit = cache.get(`${configKey}|${code}`);
      return !hit || now - hit.at >= CACHE_TTL_MS;
    });
    if (stale.length === 0) return;
    let cancelled = false;
    void Promise.all(stale.map((r) => request(r.configKey, r.code, requestedWindow))).then(() => {
      if (!cancelled) setSettledCount((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [requestsKey, requestedWindow]);

  return useMemo(() => {
    const prices = new Map<string, ListingMarketPrice>();
    for (const { listingId, configKey, code } of JSON.parse(requestsKey) as PriceRequest[]) {
      const price = cache.get(`${configKey}|${code}`)?.price;
      if (price) prices.set(listingId, price);
    }
    return prices;
    // settledCount: the cache is module state; a settled request must recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestsKey, settledCount]);
}
