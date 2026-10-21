import type { MarketListingEntry, MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { computePseudo } from './pseudo';
import { buildListingQuery, isPoolMode } from './query';
import { rateLimitDelayMs } from './rate-limit';
import { scoreListing } from './scoring';
import type { MarketApi, MarketFilters, ScoredListing, SearchOptions, SearchResult } from './types';

/** PD2 caps `$limit` at 250 on market/listing and market/listingArchive (larger values are clamped). */
export const MAX_PAGE_SIZE = 250;
/** Listings ranked client-side in pool mode. */
export const DEFAULT_POOL_SIZE = 200;
/** The site's page size. */
export const DEFAULT_PAGE_SIZE = 10;
/** 429 retries per request before giving up. */
export const MAX_RATE_LIMIT_RETRIES = 5;
const MAX_BACKOFF_MS = 60_000;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.floor(n)));

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('The search was aborted', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError(signal);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError(signal));
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError(signal));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * One listings request. A 429 waits for Retry-After (at least an exponential 1 s, 2 s, 4 s… step, capped at a
 * minute) and retries up to MAX_RATE_LIMIT_RETRIES times; other errors propagate. A null result (the API
 * layer's 401 convention, after it has started re-authentication) becomes an error.
 */
async function fetchPage(
  fetcher: (query: Record<string, unknown>) => Promise<MarketListingResult>,
  query: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<MarketListingResult> {
  for (let attempt = 0; ; attempt++) {
    throwIfAborted(signal);
    let result: MarketListingResult;
    try {
      result = await fetcher(query);
    } catch (err) {
      const delay = rateLimitDelayMs(err);
      if (delay === null || attempt >= MAX_RATE_LIMIT_RETRIES) throw err;
      await sleep(Math.min(MAX_BACKOFF_MS, Math.max(delay, 1000 * 2 ** attempt)), signal);
      continue;
    }
    throwIfAborted(signal);
    if (!result) throw new Error('Your PD2 session expired. Sign in again to search the market.');
    return result;
  }
}

/** Pseudo stats, score and value for each listing (no filtering, order kept). */
export function scoreListings(listings: MarketListingEntry[], f: MarketFilters): ScoredListing[] {
  return listings.map((listing) => {
    const pseudo = computePseudo(listing.item);
    return { listing, pseudo, ...scoreListing(listing, f.stats, pseudo) };
  });
}

/** The filters the server can't apply: enabled pseudo rows with a min and/or max. */
export function matchesClientFilters(scored: ScoredListing, f: MarketFilters): boolean {
  for (const stat of f.stats) {
    if (!stat.enabled || stat.kind !== 'pseudo') continue;
    const value = scored.pseudo[stat.key] ?? 0;
    if (typeof stat.min === 'number' && value < stat.min) return false;
    if (typeof stat.max === 'number' && value > stat.max) return false;
  }
  return true;
}

const bumpedAt = (s: ScoredListing) => Date.parse(s.listing.bumped_at ?? '') || 0;

/** Client sort for score/value (unscored last either way, newest bump breaks ties); server sorts keep order. */
export function sortScored(items: ScoredListing[], sort: MarketFilters['sort']): ScoredListing[] {
  if (sort.by !== 'score' && sort.by !== 'value') return items;
  const key = sort.by;
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === null || bv === null) {
      if (av !== bv) return av === null ? 1 : -1;
    } else if (av !== bv) return (av - bv) * dir;
    return bumpedAt(b) - bumpedAt(a);
  });
}

/**
 * Run a market search.
 *
 * - Server mode (no pseudo filter, server sort): one page (`page`, `pageSize`, default 10) exactly as the site
 *   pages it; `items` are scored but not filtered.
 * - Pool mode (`isPoolMode`): pages the server query serially, `pageSize` (default and max 250) at a time, up to
 *   `poolSize` (default 200) listings, then applies pseudo filters, scores and sorts the pool. `onProgress`
 *   reports (fetched, target) where target = min(server total, poolSize).
 *
 * Abort with `signal` (rejects with its reason / an AbortError). 429s back off and retry; see fetchPage.
 */
export async function runSearch(api: MarketApi, f: MarketFilters, opts: SearchOptions = {}): Promise<SearchResult> {
  const fetcher = f.source === 'archive' ? api.getMarketListingsArchive : api.getMarketListings;
  const { signal, onProgress } = opts;

  if (!isPoolMode(f)) {
    const pageSize = clamp(opts.pageSize ?? DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
    const skip = Math.max(0, Math.floor(opts.page ?? 0)) * pageSize;
    const result = await fetchPage(fetcher, buildListingQuery(f, { limit: pageSize, skip }), signal);
    const data = result.data ?? [];
    onProgress?.(data.length, result.total);
    return {
      items: scoreListings(data, f),
      total: result.total,
      fetched: data.length,
      truncated: false,
      mode: 'server',
    };
  }

  const poolSize = Math.max(1, Math.floor(opts.poolSize ?? DEFAULT_POOL_SIZE));
  const pageSize = clamp(opts.pageSize ?? MAX_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  // One time window for every page, so paging doesn't drift while listings are bumped
  const now = new Date();
  const seen = new Set<string>();
  const listings: MarketListingEntry[] = [];
  let total = 0;
  let fetched = 0;
  while (fetched < poolSize) {
    const limit = Math.min(pageSize, poolSize - fetched);
    const result = await fetchPage(fetcher, buildListingQuery(f, { limit, skip: fetched }, now), signal);
    const data = result.data ?? [];
    total = result.total;
    fetched += data.length;
    // A bump between pages can shift a listing onto the next page too
    for (const listing of data) {
      if (seen.has(listing._id)) continue;
      seen.add(listing._id);
      listings.push(listing);
    }
    onProgress?.(fetched, Math.min(total, poolSize));
    if (data.length < limit || fetched >= total) break;
  }

  const items = sortScored(
    scoreListings(listings, f).filter((s) => matchesClientFilters(s, f)),
    f.sort,
  );
  return { items, total, fetched, truncated: fetched < total, mode: 'pool' };
}
