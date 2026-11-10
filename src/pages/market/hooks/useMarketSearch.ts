import { useCallback, useEffect, useRef, useState } from 'react';
import { MarketBackendError } from '@/lib/market-search-api';
import { runSearch } from '../lib/search';
import { BROWSER_FACETS, wantsFacets, type MarketFacets } from '../lib/facets';
import type { MarketApi, MarketFilters, ScoredListing, SearchResult } from '../lib/types';
import { t } from '@/i18n';
import { reportApiError } from '@/lib/error-reporting';
import { trackMeasurement } from '@/lib/telemetry';

/** Rows per page unless Settings → Market picks another — the list loads the next page when scrolled to the end. */
export const MARKET_PAGE_SIZE = 25;
/** Page sizes Settings → Market offers (the service caps a page at 100); anything else uses MARKET_PAGE_SIZE. */
const PAGE_SIZES: readonly number[] = [25, 50, 100];
const DEFAULT_DEBOUNCE_MS = 350;
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 30;

export type MarketSearchStatus = 'idle' | 'loading' | 'ready' | 'error' | 'auth';

export interface MarketSearchState {
  status: MarketSearchStatus;
  /** Every row loaded so far (pages appended). */
  items: ScoredListing[];
  total: number;
  /** False when `total` is a lower bound or an estimate; see SearchResult.totalExact. */
  totalExact: boolean;
  /** The filters `items` were searched with (set once ready); compare with the current filters. */
  filters: MarketFilters | null;
  /** The filters of the last search that actually ran (fetched or served from cache). */
  ranFilters: MarketFilters | null;
  error: string | null;
  /** A next page is being fetched. */
  loadingMore: boolean;
  hasMore: boolean;
  /**
   * The last next-page fetch failed. Automatic loading (scrolling to the end) stops until `retryLoadMore`, a
   * refresh or a filter change, so a failing service isn't hammered.
   */
  loadMoreError: string | null;
  /** Rate limited: `retryLoadMore` does nothing before this time (epoch ms). */
  loadMoreRetryAt: number | null;
  /**
   * Facet counts of the first page's search (filter sidebar counts and price histogram); kept from the previous
   * search while the next one loads, null before the first or after an error.
   */
  facets: MarketFacets | null;
}

const IDLE: MarketSearchState = {
  status: 'idle',
  items: [],
  total: 0,
  totalExact: true,
  error: null,
  loadingMore: false,
  hasMore: false,
  loadMoreError: null,
  loadMoreRetryAt: null,
  filters: null,
  ranFilters: null,
  facets: null,
};

/** Recent results by query; module-level so reopening the panel or flipping tabs back is instant. */
const cache = new Map<string, { at: number; result: SearchResult }>();

function cacheGet(key: string): SearchResult | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  // LRU: re-insert as newest
  cache.delete(key);
  cache.set(key, hit);
  return hit.result;
}

function cacheSet(key: string, result: SearchResult) {
  cache.set(key, { at: Date.now(), result });
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
}

/** Drop cached results (manual refresh). */
export function clearMarketSearchCache() {
  cache.clear();
}

function queryKey(f: MarketFilters, page: number, pageSize: number): string {
  return `${JSON.stringify({ ...f, sellerName: undefined, stats: f.stats.map(({ id: _id, ...rest }) => rest) })}#${page}x${pageSize}`;
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

const SEARCH_MEASUREMENT = 'market_browser_search';

/** The shape of a search for telemetry: flags and counts only, never the item name, seller or price text. */
function searchContext(f: MarketFilters, page: number, pageSize: number) {
  return {
    source: f.source,
    history: !!f.status?.length,
    sort_by: f.sort.by,
    item_name: !!f.itemName,
    stat_filters: f.stats.length,
    seller: !!(f.sellerUserId || f.sellerName),
    page,
    page_size: pageSize,
  };
}

/** A page the service answered (cache hits aren't recorded). */
function recordSearchSuccess(f: MarketFilters, page: number, pageSize: number, startedAt: number, r: SearchResult) {
  trackMeasurement(
    SEARCH_MEASUREMENT,
    {
      duration_ms: performance.now() - startedAt,
      returned_items: r.items.length,
      total_items: page === 0 ? r.total : undefined,
    },
    { outcome: 'success', total_exact: r.totalExact, ...searchContext(f, page, pageSize) },
  );
}

/** A page that failed (aborted searches aren't failures); 5xx also go to Sentry. */
function recordSearchFailure(f: MarketFilters, page: number, pageSize: number, startedAt: number, e: unknown) {
  const backend = e instanceof MarketBackendError ? e : null;
  trackMeasurement(
    SEARCH_MEASUREMENT,
    { duration_ms: performance.now() - startedAt },
    {
      outcome: 'error',
      error_kind: backend?.kind ?? 'unexpected',
      status: backend?.status,
      ...searchContext(f, page, pageSize),
    },
  );
  if (backend) {
    reportApiError(backend, 'market-service', '/api/market/search', backend.status, {
      kind: backend.kind,
      page,
      origin: 'market-browser',
    });
  }
}

/** What the results pane says when a search fails; retry is the pane's refresh. */
export function searchErrorMessage(e: unknown): string {
  if (e instanceof MarketBackendError) {
    if (e.kind === 'rate-limited') return t('market:search.rateLimited');
    if (e.kind === 'invalid') return t('market:search.invalid', { message: e.message });
    return t('market:search.unavailable');
  }
  return e instanceof Error ? e.message.split('\n')[0] : t('market:results.searchFailed');
}

/**
 * The results pane's count for a ready search. A count that isn't exact is the service's cap (`1,000+`) unless
 * a Seller online filter is set, where the service estimates it (`~312`).
 */
export function searchCountText({
  total,
  totalExact,
  filters,
}: Pick<MarketSearchState, 'total' | 'totalExact' | 'filters'>): string {
  if (totalExact) return t('market:search.count', { count: total });
  const sellerOnline = !!filters && (filters.userOnlineSite !== 'all' || filters.userOnlineGame !== 'all');
  if (sellerOnline) return t('market:search.countEstimate', { count: total });
  return t('market:search.countCapped', { count: total });
}

/** Wait before retrying a page when a 429 named no Retry-After. */
const DEFAULT_RETRY_AFTER_MS = 5000;

export interface MarketSearch extends MarketSearchState {
  /** Append the next page; does nothing while `loadMoreError` is set. */
  loadMore: () => Promise<void>;
  /** The footer's Retry: clears `loadMoreError` and fetches the next page (once `loadMoreRetryAt` passed). */
  retryLoadMore: () => Promise<void>;
  /** Refetch now, bypassing the cache. */
  refresh: () => void;
}

/**
 * Debounced market search: every `filters` change aborts the in-flight search and runs `runSearch` after
 * `debounceMs`. The market service filters and ranks (weights and stat sorts included), so any change refetches;
 * results are cached per query (60 s). `filters: null` keeps the hook idle. `pageSize`: 25, 50 or 100 rows
 * (Settings → Market), else MARKET_PAGE_SIZE.
 */
export function useMarketSearch(
  api: MarketApi | null,
  filters: MarketFilters | null,
  {
    signedIn,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    pageSize: requestedPageSize,
  }: { signedIn: boolean; debounceMs?: number; pageSize?: number },
): MarketSearch {
  const pageSize =
    requestedPageSize !== undefined && PAGE_SIZES.includes(requestedPageSize) ? requestedPageSize : MARKET_PAGE_SIZE;
  const [state, setState] = useState<MarketSearchState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);
  const pageRef = useRef(0);
  const [reloadToken, setReloadToken] = useState(0);
  const forceRef = useRef(false);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (!filters || !api) {
      setState(IDLE);
      return;
    }
    if (!signedIn) {
      setState({ ...IDLE, status: 'auth' });
      return;
    }

    const force = forceRef.current;
    forceRef.current = false;
    const show = (result: SearchResult) => {
      pageRef.current = 0;
      setState({
        ...IDLE,
        status: 'ready',
        filters,
        ranFilters: filters,
        items: result.items,
        total: result.total,
        totalExact: result.totalExact,
        facets: result.facets ?? null,
        hasMore: result.fetched < result.total,
      });
    };

    const cached = force ? null : cacheGet(queryKey(filters, 0, pageSize));
    if (cached) {
      show(cached);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setState((s) => ({ ...IDLE, status: 'loading', items: s.items, facets: s.facets }));
    const timer = window.setTimeout(
      async () => {
        const startedAt = performance.now();
        try {
          const result = await runSearch(api, filters, {
            page: 0,
            pageSize,
            facets: wantsFacets(filters) ? BROWSER_FACETS : undefined,
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          recordSearchSuccess(filters, 0, pageSize, startedAt, result);
          cacheSet(queryKey(filters, 0, pageSize), result);
          show(result);
        } catch (e) {
          if (controller.signal.aborted || isAbort(e)) return;
          recordSearchFailure(filters, 0, pageSize, startedAt, e);
          setState({ ...IDLE, status: 'error', error: searchErrorMessage(e) });
        }
      },
      force ? 0 : debounceMs,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [api, filters, signedIn, debounceMs, reloadToken, pageSize]);

  const fetchMore = useCallback(
    async (retry: boolean) => {
      if (!api || !filters || !state.hasMore || state.loadingMore) return;
      if (state.loadMoreError && (!retry || (state.loadMoreRetryAt ?? 0) > Date.now())) return;
      const page = pageRef.current + 1;
      const controller = abortRef.current ?? new AbortController();
      abortRef.current = controller;
      setState((s) => ({ ...s, loadingMore: true, loadMoreError: null, loadMoreRetryAt: null }));
      const startedAt = performance.now();
      try {
        const key = queryKey(filters, page, pageSize);
        const cached = cacheGet(key);
        const result = cached ?? (await runSearch(api, filters, { page, pageSize, signal: controller.signal }));
        if (controller.signal.aborted) return;
        if (!cached) recordSearchSuccess(filters, page, pageSize, startedAt, result);
        cacheSet(key, result);
        pageRef.current = page;
        setState((s) => {
          // A bump between pages can move a listing onto the next page too
          const seen = new Set(s.items.map((row) => row.listing._id));
          const items = [...s.items, ...result.items.filter((row) => !seen.has(row.listing._id))];
          return {
            ...s,
            items,
            total: result.total,
            totalExact: result.totalExact,
            loadingMore: false,
            // Rows, not `items` (a page can hold item-less rows that never show), decide whether more follow
            hasMore: result.fetched > 0 && page * pageSize + result.fetched < result.total,
          };
        });
      } catch (e) {
        if (controller.signal.aborted || isAbort(e)) return;
        recordSearchFailure(filters, page, pageSize, startedAt, e);
        const retryAfterMs =
          e instanceof MarketBackendError && e.kind === 'rate-limited'
            ? (e.retryAfterMs ?? DEFAULT_RETRY_AFTER_MS)
            : null;
        setState((s) => ({
          ...s,
          loadingMore: false,
          loadMoreError: searchErrorMessage(e),
          loadMoreRetryAt: retryAfterMs === null ? null : Date.now() + retryAfterMs,
        }));
      }
    },
    [api, filters, pageSize, state.hasMore, state.loadingMore, state.loadMoreError, state.loadMoreRetryAt],
  );
  const loadMore = useCallback(() => fetchMore(false), [fetchMore]);
  const retryLoadMore = useCallback(() => fetchMore(true), [fetchMore]);

  const refresh = useCallback(() => {
    forceRef.current = true;
    setReloadToken((t) => t + 1);
  }, []);

  return { ...state, loadMore, retryLoadMore, refresh };
}
