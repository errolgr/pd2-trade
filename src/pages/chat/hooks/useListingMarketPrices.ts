import { useEffect, useMemo, useState } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { getSeasonDateConfig } from '@/lib/seasons';
import { DEFAULT_PRICE_WINDOW_HOURS, priceWindowNote, windowLabel } from '@/lib/price-window';
import { fetchMultipleItemPrices, type PriceApiConfig } from '@/pages/currency/lib/price-api';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { listingPriceCode } from '../lib/price-codes';

/** Crawler market price of an item, in HR, and the window it was computed over ('7d', 'season'...). */
export interface ListingMarketPrice {
  hr: number;
  window: string;
  /** True when the server fell back to a longer window than the one asked for (rarely traded). */
  fellBack: boolean;
  /** Listings the price is based on. */
  samples: number;
  /** Change over the last 7 days, in percent, when the server reports it. */
  changePercent?: number;
}

/** Market prices drift slowly; refetch after this long, showing the cached price meanwhile. */
const CACHE_TTL_MS = 10 * 60_000;

/** App-lifetime cache keyed by `${configKey}|${baseCode}`. A null price: the crawler has no data for it. */
const cache = new Map<string, { price: ListingMarketPrice | null; at: number }>();
/** Requests in flight per cache key, so re-renders and other callers join them instead of refetching. */
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
      const note = priceWindowNote(data?.priceWindow, requestedWindow);
      const price: ListingMarketPrice | null =
        data && hr > 0
          ? {
              hr,
              window: note?.label ?? requestedWindow,
              fellBack: !!note,
              samples: data.sampleCount,
              ...(data.priceChange7Days ? { changePercent: data.priceChange7Days.changePercent } : {}),
            }
          : null;
      cache.set(`${configKey}|${code}`, { price, at });
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

/** One item to price: `id` keys the result, `code` is the crawler baseCode, priced in its realm. */
export interface MarketPriceItem {
  id: string;
  code: string;
  isLadder: boolean;
  isHardcore: boolean;
}

interface PriceRequest {
  id: string;
  configKey: string;
  code: string;
}

/**
 * Crawler market prices keyed by item id, over the user's price window and season (as the price check does):
 * a price, `null` when the crawler has none, absent while loading. Every caller in the same tick shares one
 * batch request per realm.
 */
export function useMarketPrices(items: readonly MarketPriceItem[]): ReadonlyMap<string, ListingMarketPrice | null> {
  const { settings } = useOptions();
  const { startDate, endDate } = getSeasonDateConfig(settings.selectedSeasonId);
  const hours = settings.priceWindowHours ?? DEFAULT_PRICE_WINDOW_HOURS;
  // A past season prices its whole date range; otherwise a rolling window clamped to the season start.
  const requestedWindow = endDate ? 'season' : windowLabel(hours);

  const requests: PriceRequest[] = items.map(({ id, code, isLadder, isHardcore }) => {
    const config: PriceApiConfig = {
      isLadder,
      isHardcore,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : { hours }),
    };
    return { id, configKey: JSON.stringify(config), code };
  });
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
    const prices = new Map<string, ListingMarketPrice | null>();
    for (const { id, configKey, code } of JSON.parse(requestsKey) as PriceRequest[]) {
      const hit = cache.get(`${configKey}|${code}`);
      if (hit) prices.set(id, hit.price);
    }
    return prices;
    // settledCount: the cache is module state; a settled request must recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestsKey, settledCount]);
}

/**
 * Crawler market prices for listings, keyed by listing id; unpriced or still-loading listings are absent.
 * Each listing is priced in its own realm (its ladder/hardcore flags).
 */
export function useListingMarketPrices(
  listings: readonly MarketListingEntry[],
): ReadonlyMap<string, ListingMarketPrice> {
  const items: MarketPriceItem[] = [];
  for (const listing of listings) {
    const code = listingPriceCode(listing.item);
    if (code) items.push({ id: listing._id, code, isLadder: listing.is_ladder, isHardcore: listing.is_hardcore });
  }
  const prices = useMarketPrices(items);
  return useMemo(() => {
    const priced = new Map<string, ListingMarketPrice>();
    for (const [id, price] of prices) if (price) priced.set(id, price);
    return priced;
  }, [prices]);
}
