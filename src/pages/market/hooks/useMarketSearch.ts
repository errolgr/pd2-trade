import { useCallback, useEffect, useRef, useState } from 'react';
import { isPoolMode } from '../lib/query';
import { DEFAULT_POOL_SIZE, runSearch, sortScored } from '../lib/search';
import { scoreListing } from '../lib/scoring';
import type { MarketApi, MarketFilters, ScoredListing, SearchResult } from '../lib/types';

/** Rows per server page (server mode) — the list loads the next page when scrolled to the end. */
export const MARKET_PAGE_SIZE = 25;
const DEFAULT_DEBOUNCE_MS = 350;
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 30;

export type MarketSearchStatus = 'idle' | 'loading' | 'ready' | 'error' | 'auth';

export interface MarketSearchState {
  status: MarketSearchStatus;
  /** Every row loaded so far (server mode: pages appended; pool mode: the ranked pool). */
  items: ScoredListing[];
  total: number;
  mode: 'server' | 'pool';
  truncated: boolean;
  /** Pool scan progress while loading. */
  progress: { fetched: number; total: number } | null;
  /** The filters `items` were searched with (set once ready); compare with the current filters. */
  filters: MarketFilters | null;
  /** The filters of the last search that actually ran (fetched or served from cache); re-ranks keep it. */
  ranFilters: MarketFilters | null;
  error: string | null;
  /** A next server page is being fetched. */
  loadingMore: boolean;
  hasMore: boolean;
}

const IDLE: MarketSearchState = {
  status: 'idle',
  items: [],
  total: 0,
  mode: 'server',
  truncated: false,
  progress: null,
  error: null,
  loadingMore: false,
  hasMore: false,
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

/** Filters minus everything that only re-ranks (weights, client sort) — what the fetched pool depends on. */
function poolKey(f: MarketFilters): string {
  const clientSort = f.sort.by === 'score' || f.sort.by === 'value';
  return JSON.stringify({
    ...f,
    sellerName: undefined,
    stats: f.stats.map(({ weight: _weight, id: _id, ...rest }) => rest),
    sort: clientSort ? 'client' : f.sort,
  });
}

function queryKey(f: MarketFilters, page: number): string {
  return `${JSON.stringify({ ...f, sellerName: undefined, stats: f.stats.map(({ id: _id, ...rest }) => rest) })}#${page}`;
}

/** Re-score (and for client sorts re-order) already fetched rows after a weight/sort-only change. */
export function rescore(items: ScoredListing[], f: MarketFilters): ScoredListing[] {
  return sortScored(
    items.map((row) => ({ ...row, ...scoreListing(row.listing, f.stats, row.pseudo) })),
    f.sort,
  );
}

function errorStatus(e: unknown): number | undefined {
  if (typeof e === 'object' && e !== null && 'status' in e) return Number(e.status);
  return undefined;
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

function errorMessage(e: unknown): string {
  if (errorStatus(e) === 429) return 'The market API is rate limiting requests. Try again in a moment.';
  return e instanceof Error ? e.message.split('\n')[0] : 'Search failed';
}

export interface MarketSearch extends MarketSearchState {
  /** Server mode: append the next page. */
  loadMore: () => Promise<void>;
  /** Refetch now, bypassing the cache. */
  refresh: () => void;
}

/**
 * Debounced market search: every `filters` change aborts the in-flight search and runs `runSearch` after
 * `debounceMs`. Results are cached per query (60 s); weight-only (and score/value sort-only) changes re-rank
 * the rows already fetched instead of refetching. `filters: null` keeps the hook idle.
 */
export function useMarketSearch(
  api: MarketApi | null,
  filters: MarketFilters | null,
  { signedIn, debounceMs = DEFAULT_DEBOUNCE_MS }: { signedIn: boolean; debounceMs?: number },
): MarketSearch {
  const [state, setState] = useState<MarketSearchState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);
  const pageRef = useRef(0);
  /** Filters + pool key of the rows in `state.items`; set only while they are complete (status 'ready'). */
  const loadedRef = useRef<{ filters: MarketFilters; poolKey: string } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const forceRef = useRef(false);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (!filters || !api) {
      setState(IDLE);
      loadedRef.current = null;
      return;
    }
    if (!signedIn) {
      setState({ ...IDLE, status: 'auth' });
      loadedRef.current = null;
      return;
    }

    const force = forceRef.current;
    forceRef.current = false;
    const key = poolKey(filters);
    const loaded = loadedRef.current;
    const pool = isPoolMode(filters);
    // Only weights / client sort changed: re-rank what we have
    if (!force && loaded && loaded.poolKey === key && pool === isPoolMode(loaded.filters)) {
      loadedRef.current = { filters, poolKey: key };
      setState((s) => ({ ...s, filters, items: rescore(s.items, filters) }));
      return;
    }
    loadedRef.current = null;

    const cached = force ? null : cacheGet(queryKey(filters, 0));
    if (cached) {
      pageRef.current = 0;
      loadedRef.current = { filters, poolKey: key };
      setState({
        ...IDLE,
        status: 'ready',
        filters,
        ranFilters: filters,
        items: cached.items,
        total: cached.total,
        mode: cached.mode,
        truncated: cached.truncated,
        hasMore: cached.mode === 'server' && cached.items.length < cached.total,
      });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setState((s) => ({ ...IDLE, status: 'loading', mode: pool ? 'pool' : 'server', items: s.items }));
    const timer = window.setTimeout(
      async () => {
        try {
          const result = await runSearch(api, filters, {
            page: 0,
            pageSize: MARKET_PAGE_SIZE,
            poolSize: DEFAULT_POOL_SIZE,
            signal: controller.signal,
            onProgress: (fetched, total) => {
              if (!controller.signal.aborted) setState((s) => ({ ...s, progress: { fetched, total } }));
            },
          });
          if (controller.signal.aborted) return;
          cacheSet(queryKey(filters, 0), result);
          pageRef.current = 0;
          loadedRef.current = { filters, poolKey: key };
          setState({
            ...IDLE,
            status: 'ready',
            filters,
            ranFilters: filters,
            items: result.items,
            total: result.total,
            mode: result.mode,
            truncated: result.truncated,
            hasMore: result.mode === 'server' && result.items.length < result.total,
          });
        } catch (e) {
          if (controller.signal.aborted || isAbort(e)) return;
          loadedRef.current = null;
          const status = errorStatus(e);
          setState({
            ...IDLE,
            status: status === 401 ? 'auth' : 'error',
            error: status === 401 ? null : errorMessage(e),
          });
        }
      },
      force ? 0 : debounceMs,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [api, filters, signedIn, debounceMs, reloadToken]);

  /** Server mode: append the next page. */
  const loadMore = useCallback(async () => {
    if (!api || !filters || state.mode !== 'server' || !state.hasMore || state.loadingMore) return;
    const page = pageRef.current + 1;
    const controller = abortRef.current ?? new AbortController();
    abortRef.current = controller;
    setState((s) => ({ ...s, loadingMore: true }));
    try {
      const key = queryKey(filters, page);
      const result =
        cacheGet(key) ??
        (await runSearch(api, filters, { page, pageSize: MARKET_PAGE_SIZE, signal: controller.signal }));
      if (controller.signal.aborted) return;
      cacheSet(key, result);
      pageRef.current = page;
      setState((s) => {
        const seen = new Set(s.items.map((row) => row.listing._id));
        const items = [...s.items, ...result.items.filter((row) => !seen.has(row.listing._id))];
        return {
          ...s,
          items,
          total: result.total,
          loadingMore: false,
          hasMore: result.items.length > 0 && items.length < result.total,
        };
      });
    } catch (e) {
      if (controller.signal.aborted || isAbort(e)) return;
      setState((s) => ({ ...s, loadingMore: false, error: errorMessage(e) }));
    }
  }, [api, filters, state.mode, state.hasMore, state.loadingMore]);

  /** Refetch now, bypassing the cache. */
  const refresh = useCallback(() => {
    forceRef.current = true;
    setReloadToken((t) => t + 1);
  }, []);

  return { ...state, loadMore, refresh };
}
