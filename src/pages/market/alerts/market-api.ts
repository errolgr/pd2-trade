/**
 * Client for the pd2trader.com market endpoints Watch uses (anonymous): the live search stream of the watched
 * searches (`GET /api/market/search/live?q=…`), the newest listings of one search (`GET /api/market/search/{q}`)
 * and the public listing lookup alerts link to. Plus the one call left to the deprecated saved searches: their
 * list, read once to import them locally (`Bearer <PD2 access token>`).
 *
 * `q` = base64url (RFC 4648 §5, no padding) of the UTF-8 JSON of the `filters` of `POST /api/market/search`.
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { marketSearchBody } from '@/lib/market-search-api';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketFilters } from '@/pages/market/lib/types';

/** Compact listing of a `market.match` (the server's MarketListingSummary). */
export interface MarketListingSummary {
  id: string;
  isLadder: boolean;
  isHardcore: boolean;
  name: string | null;
  baseName: string | null;
  baseCode: string | null;
  typeCode: string | null;
  quality: string | null;
  price: string | null;
  hrPrice: number | null;
  bumpedAt: string | null;
  seller: string | null;
  status: string;
  soldHr: number | null;
}

/** `event: market.match` on the live stream: a new or updated listing matching the search `q`. */
export interface MarketMatch extends MarketListingSummary {
  matchedAt: string;
  /** The `q` (as sent) the listing matched. */
  q: string;
}

/** A listing that matched a watched search, as the overlay shows it (toast, notification log, card glow). */
export interface MarketAlert {
  /** `<search id>:<listing id>`: one alert per listing and search. */
  id: string;
  /** The local saved search watching. */
  savedSearchId: string;
  savedSearchName: string;
  listingId: string;
  listing: MarketListingSummary;
  matchedAt: string;
}

export class MarketApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** From a 429/503 `Retry-After` header. */
    public readonly retryAfterMs: number | null = null,
    /** The `rule` a 400 names (buy requests: what the request lacks, see `postBlocker`). */
    public readonly rule: string | null = null,
    /** The `nextBumpAt` a buy request bump's 429 names (still cooling down). */
    public readonly nextBumpAt: string | null = null,
  ) {
    super(message);
    this.name = 'MarketApiError';
  }
}

/** A non-2xx reply as a MarketApiError: the server's `{ message, rule? }` and any Retry-After. */
export async function errorFrom(response: Response): Promise<MarketApiError> {
  let message = `Market API ${response.status}`;
  let rule: string | null = null;
  let nextBumpAt: string | null = null;
  try {
    const body = await response.json();
    if (body?.message) message = Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
    if (typeof body?.rule === 'string') rule = body.rule;
    if (typeof body?.nextBumpAt === 'string') nextBumpAt = body.nextBumpAt;
  } catch {
    // non-JSON error body
  }
  const retryAfter = Number(response.headers?.get('retry-after'));
  return new MarketApiError(
    message,
    response.status,
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null,
    rule,
    nextBumpAt,
  );
}

/** Longest `q` the server takes (414 beyond). */
export const MAX_MARKET_QUERY_LENGTH = 4096;
/** Searches one live stream carries. */
export const MAX_LIVE_QUERIES = 10;

/** `filters` (any JSON object) → `q`. */
export function encodeMarketQuery(filters: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(filters));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * The `q` a watch streams and catches up with: the market's request filters, sorted newest bump first (the
 * catch-up reads the newest listings; the live match ignores the sort). Stored filters may miss fields.
 */
export function watchQuery(filters: MarketFilters): string {
  const sorted: MarketFilters = {
    ...filters,
    requirements: filters.requirements ?? {},
    stats: filters.stats ?? [],
    sort: { by: 'bumped', dir: 'desc' },
  };
  return encodeMarketQuery(marketSearchBody(sorted, 0, 1).filters);
}

/**
 * Opens the live stream of `queries` (0-10 distinct `q`; none only with `token`); `token` (the user's PD2 token)
 * also brings the responses to their buy requests (`wtb.response`). `text/event-stream`; throws MarketApiError on a
 * non-2xx (401: the token expired).
 */
export async function openLiveSearchStream(
  queries: readonly string[],
  signal: AbortSignal,
  token?: string | null,
): Promise<Response> {
  const params = new URLSearchParams();
  for (const q of queries) params.append('q', q);
  const response = await fetch(`${BACKEND_URL}/api/market/search/live?${params}`, {
    headers: { Accept: 'text/event-stream', ...(token && { Authorization: `Bearer ${token}` }) },
    signal,
  });
  if (!response.ok) throw await errorFrom(response);
  return response;
}

const text = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);

/** A search result listing in the stream's compact shape. */
export function listingSummary(listing: MarketListingEntry): MarketListingSummary {
  const item = listing.item;
  const hr = typeof listing.hr_price === 'number' && listing.hr_price > 0 ? listing.hr_price : null;
  return {
    id: listing._id,
    isLadder: listing.is_ladder === true,
    isHardcore: listing.is_hardcore === true,
    name: text(item?.name),
    baseName: text(item?.base?.name),
    baseCode: text(item?.base_code),
    typeCode: text(item?.base?.type_code),
    quality: text(item?.quality?.name),
    price: typeof listing.price === 'string' ? listing.price : null,
    hrPrice: hr,
    bumpedAt: text(listing.bumped_at),
    seller: text(listing.user?.username),
    status: 'active',
    soldHr: null,
  };
}

/** The newest `limit` listings of the search `q` (a `watchQuery`: newest bump first). */
export async function fetchNewestListings(q: string, limit = 25): Promise<MarketListingSummary[]> {
  const response = await fetch(`${BACKEND_URL}/api/market/search/${q}?limit=${limit}`);
  if (!response.ok) throw await errorFrom(response);
  const body = (await response.json()) as { items?: { listing?: MarketListingEntry }[] };
  return (body.items ?? []).flatMap((row) => (row?.listing?._id ? [listingSummary(row.listing)] : []));
}

/** A saved search as the deprecated `GET /api/market/saved-searches` lists it. */
export interface ServerSavedSearch {
  id: string;
  name: string;
  filters: MarketFilters;
  alert: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * The user's saved searches still kept on pd2trader.com (deprecated endpoint): read once, to import them locally.
 */
export async function listServerSavedSearches(token: string): Promise<ServerSavedSearch[]> {
  const response = await fetch(`${BACKEND_URL}/api/market/saved-searches`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await errorFrom(response);
  const body = (await response.json()) as { items?: ServerSavedSearch[] };
  return Array.isArray(body.items) ? body.items : [];
}

/** Whether a looked-up listing is still for sale. */
export type MarketListingStatus = 'active' | 'sold' | 'removed';

/** `GET /api/market/listing/:id`: the listing and whether it is still for sale. */
export interface MarketListingDetail {
  listing: MarketListingEntry;
  status: MarketListingStatus;
}

/**
 * One listing by its PD2 id from pd2trader.com (also sold/removed ones, kept 30 days); null when unknown or
 * when it has no item (nothing to show).
 */
export async function fetchMarketListing(id: string): Promise<MarketListingDetail | null> {
  const response = await fetch(`${BACKEND_URL}/api/market/listing/${encodeURIComponent(id)}`);
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw await errorFrom(response);
  const body = (await response.json()) as { listing?: MarketListingEntry; status?: MarketListingStatus };
  return body.listing?.item ? { listing: body.listing, status: body.status ?? 'active' } : null;
}
