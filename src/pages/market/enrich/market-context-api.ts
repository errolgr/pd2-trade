/**
 * pd2trader.com market context for one listing's item (uniques, sets, runes and the other items the crawler
 * prices by baseCode): the estimate for the listing's own condition (`POST /api/price-check`) and the item's
 * live PD2 listings (`GET /api/market/:baseCode/live`). Cached app-wide; failed requests are not kept.
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';

export interface ConditionEstimate {
  /** 25th / 50th / 75th percentile of comparable asks, in HR. */
  lowHr: number;
  midHr: number;
  highHr: number;
  confidence: 'high' | 'medium' | 'low';
  /** 'exact': listings matching every condition; 'similar': similarity-weighted near matches (too few exact). */
  basis: 'exact' | 'similar';
  sampleSize: number;
  /** What was matched, e.g. ["Ethereal only", "Not corrupted"]. */
  matched: string[];
}

/** One live PD2 listing of the item (`LiveListing`; no seller fields: open it by id for those). */
export interface LiveListing {
  listingId: string;
  price: string;
  priceHr: number | null;
  ethereal: boolean;
  sockets: number;
  corrupted: boolean;
  /** Corruption labels. */
  corruptions: string[];
  itemLevel: number | null;
  stats: string[];
  listedAt: string;
  bumpedAt: string;
}

export interface LiveListings {
  /** Listings PD2 reports for the item; more than `listings` when `truncated`. */
  pd2Total: number;
  /** Only the newest listings were checked. */
  truncated: boolean;
  listings: LiveListing[];
}

/** Gear qualities whose condition (ethereal, sockets, corruption) moves the price. */
const isGear = (listing: MarketListingEntry) => {
  const quality = listing.item.quality?.name;
  return quality === 'Unique' || quality === 'Set';
};

/** `POST /api/price-check` body: the item and, for gear, its condition. */
export interface ConditionRequest {
  item: string;
  stats: [];
  isLadder: boolean;
  isHardcore: boolean;
  hours: number;
  ethereal?: boolean;
  corrupted?: boolean;
  sockets?: number;
  /** Corruption modifier names, comma separated. */
  corruption?: string;
}

/** The price-check body for the listing's item in its own condition. */
export function conditionRequest(listing: MarketListingEntry, code: string, hours: number): ConditionRequest {
  const { item } = listing;
  const realm = { isLadder: listing.is_ladder, isHardcore: listing.is_hardcore };
  if (!isGear(listing)) return { item: code, stats: [], ...realm, hours };
  const corruptions = item.corrupted ? (item.corruptions ?? []) : [];
  return {
    item: code,
    stats: [],
    ...realm,
    hours,
    ethereal: !!item.is_ethereal,
    corrupted: !!item.corrupted,
    sockets: item.socket_count ?? 0,
    ...(corruptions.length > 0 ? { corruption: corruptions.join(',') } : {}),
  };
}

/**
 * Other live listings worth comparing against `listing`, cheapest first: priced, and for gear in the same condition
 * (ethereal, corrupted, sockets). A priced listing gets only the cheaper ones; a note-only listing (no HR price)
 * gets all of them, to compare its note against.
 */
export function cheaperListings(listing: MarketListingEntry, live: readonly LiveListing[]): LiveListing[] {
  const { item } = listing;
  const asking = listing.hr_price > 0 ? listing.hr_price : Infinity;
  return live
    .filter(
      (l) =>
        l.listingId !== listing._id &&
        l.priceHr !== null &&
        l.priceHr > 0 &&
        l.priceHr < asking &&
        (!isGear(listing) ||
          (l.ethereal === !!item.is_ethereal &&
            l.corrupted === !!item.corrupted &&
            l.sockets === (item.socket_count ?? 0))),
    )
    .sort((a, b) => (a.priceHr ?? 0) - (b.priceHr ?? 0));
}

const ESTIMATE_TTL_MS = 10 * 60_000;
/** The server caches live listings for about this long too. */
const LIVE_TTL_MS = 60_000;

const estimates = new Map<string, { at: number; promise: Promise<ConditionEstimate | null> }>();
const lives = new Map<string, { at: number; promise: Promise<LiveListings | null> }>();

function cached<T>(
  cache: Map<string, { at: number; promise: Promise<T> }>,
  key: string,
  ttl: number,
  load: () => Promise<T>,
) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < ttl) return hit.promise;
  const promise = load();
  promise.catch(() => {
    if (cache.get(key)?.promise === promise) cache.delete(key);
  });
  cache.set(key, { at: now, promise });
  return promise;
}

interface PriceCheckBody {
  estimateHr: { low: number; mid: number; high: number } | null;
  confidence: ConditionEstimate['confidence'];
  basis: ConditionEstimate['basis'];
  sampleSize: number;
  appliedFilters?: { description: string }[];
}

/** The estimate for the listing's condition; null when there are no comparable listings or the item is unknown. */
export function fetchConditionEstimate(body: ConditionRequest): Promise<ConditionEstimate | null> {
  const key = JSON.stringify(body);
  return cached(estimates, key, ESTIMATE_TTL_MS, async () => {
    const response = await fetch(`${BACKEND_URL}/api/price-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: key,
    });
    // 400: an item the price check doesn't know (nothing to show, not an error)
    if (response.status === 400) return null;
    if (!response.ok) throw new Error(`Price check API error: ${response.status}`);
    const data = (await response.json()) as PriceCheckBody;
    if (!data.estimateHr || !(data.estimateHr.mid > 0)) return null;
    return {
      lowHr: data.estimateHr.low,
      midHr: data.estimateHr.mid,
      highHr: data.estimateHr.high,
      confidence: data.confidence,
      basis: data.basis,
      sampleSize: data.sampleSize,
      matched: (data.appliedFilters ?? []).map((f) => f.description),
    };
  });
}

/** The item's live PD2 listings, newest first as the server checked them; null for an unknown item. */
export function fetchLiveListings(
  code: string,
  realm: { isLadder: boolean; isHardcore: boolean },
): Promise<LiveListings | null> {
  const params = new URLSearchParams({ isLadder: String(realm.isLadder), isHardcore: String(realm.isHardcore) });
  const url = `${BACKEND_URL}/api/market/${encodeURIComponent(code)}/live?${params}`;
  return cached(lives, url, LIVE_TTL_MS, async () => {
    const response = await fetch(url);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Live listings API error: ${response.status}`);
    const data = (await response.json()) as Partial<LiveListings>;
    return { pd2Total: data.pd2Total ?? 0, truncated: !!data.truncated, listings: data.listings ?? [] };
  });
}

/** Test hook. */
export function clearMarketContext() {
  estimates.clear();
  lives.clear();
}
