import { useCallback, useEffect, useRef, useState } from 'react';
import { MarketBackendError } from '@/lib/market-search-api';
import { runSearch } from '../lib/search';
import type { MarketApi, MarketFilters, ScoredListing, SearchResult } from '../lib/types';
import { t } from '@/i18n';

/** Rows per page — the list loads the next page when scrolled to the end. */
export const MARKET_PAGE_SIZE = 25;
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

function queryKey(f: MarketFilters, page: number): string {
  return `${JSON.stringify({ ...f, sellerName: undefined, stats: f.stats.map(({ id: _id, ...rest }) => rest) })}#${page}`;
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

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
 * results are cached per query (60 s). `filters: null` keeps the hook idle.
 */
export function useMarketSearch(
  api: MarketApi | null,
  filters: MarketFilters | null,
  { signedIn, debounceMs = DEFAULT_DEBOUNCE_MS }: { signedIn: boolean; debounceMs?: number },
): MarketSearch {
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
        hasMore: result.items.length < result.total,
      });
    };

    const cached = force ? null : cacheGet(queryKey(filters, 0));
    if (cached) {
      show(cached);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setState((s) => ({ ...IDLE, status: 'loading', items: s.items }));
    const timer = window.setTimeout(
      async () => {
        try {
          const result = await runSearch(api, filters, {
            page: 0,
            pageSize: MARKET_PAGE_SIZE,
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          cacheSet(queryKey(filters, 0), result);
          show(result);
        } catch (e) {
          if (controller.signal.aborted || isAbort(e)) return;
          setState({ ...IDLE, status: 'error', error: searchErrorMessage(e) });
        }
      },
      force ? 0 : debounceMs,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [api, filters, signedIn, debounceMs, reloadToken]);

  const fetchMore = useCallback(
    async (retry: boolean) => {
      if (!api || !filters || !state.hasMore || state.loadingMore) return;
      if (state.loadMoreError && (!retry || (state.loadMoreRetryAt ?? 0) > Date.now())) return;
      const page = pageRef.current + 1;
      const controller = abortRef.current ?? new AbortController();
      abortRef.current = controller;
      setState((s) => ({ ...s, loadingMore: true, loadMoreError: null, loadMoreRetryAt: null }));
      try {
        const key = queryKey(filters, page);
        const result =
          cacheGet(key) ??
          (await runSearch(api, filters, { page, pageSize: MARKET_PAGE_SIZE, signal: controller.signal }));
        if (controller.signal.aborted) return;
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
            hasMore: result.items.length > 0 && items.length < result.total,
          };
        });
      } catch (e) {
        if (controller.signal.aborted || isAbort(e)) return;
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
    [api, filters, state.hasMore, state.loadingMore, state.loadMoreError, state.loadMoreRetryAt],
  );
  const loadMore = useCallback(() => fetchMore(false), [fetchMore]);
  const retryLoadMore = useCallback(() => fetchMore(true), [fetchMore]);

  const refresh = useCallback(() => {
    forceRef.current = true;
    setReloadToken((t) => t + 1);
  }, []);

  return { ...state, loadMore, retryLoadMore, refresh };
}
