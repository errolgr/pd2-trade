/**
 * Buy request data for the market's Wanted tab and the seller surfaces: the realm's requests, the user's own, and
 * which requests an item matches (`/match`, cached a few minutes so reopening a panel doesn't ask again).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { t } from '@/i18n';
import {
  checkWtbRequest,
  dismissWtbResponse,
  listMyWtbRequests,
  listWtbResponses,
  matchWtbRequests,
  searchWtbRequests,
  wtbFilters,
  type WtbMatchItem,
  type WtbSearchPage,
} from '../alerts/wtb-api';
import { subscribeWtbResponses } from '../alerts/alert-events';
import {
  byBestOffer,
  MAX_WTB_MATCH_ITEMS,
  type WtbCheckBody,
  type WtbImpossible,
  type WtbItemMatch,
  type WtbRealm,
  type WtbRequest,
  type WtbResponse,
  type WtbSearchBody,
  type WtbStatus,
} from '../lib/wtb';

/** How long a `/match` answer is reused. */
export const WTB_MATCH_TTL_MS = 3 * 60_000;

const matchCache = new Map<string, { at: number; result: Promise<Map<string, WtbItemMatch[]>> }>();

/** `run`'s answer for `cacheKey`, reused for WTB_MATCH_TTL_MS; a failure is not kept. */
export function cachedMatch(
  cacheKey: string,
  run: () => Promise<Map<string, WtbItemMatch[]>>,
): Promise<Map<string, WtbItemMatch[]>> {
  const now = Date.now();
  for (const [key, entry] of matchCache) if (now - entry.at >= WTB_MATCH_TTL_MS) matchCache.delete(key);
  const hit = matchCache.get(cacheKey);
  if (hit) return hit.result;
  const result = run();
  matchCache.set(cacheKey, { at: now, result });
  result.catch(() => matchCache.delete(cacheKey));
  return result;
}

/** Drops every cached `/match` answer (tests; a new stash read). */
export function clearWtbMatchCache(): void {
  matchCache.clear();
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message.split('\n')[0] : String(error));

/** The user's realm (Settings mode / ladder) and PD2 token; realm null while settings load. */
export function useWtbSession(): { realm: WtbRealm | null; token: string | null; userId: string | null } {
  const { settings, isLoading } = useOptions();
  const { authData } = usePd2Website();
  const hardcore = settings?.mode === 'hardcore';
  const ladder = settings?.ladder !== 'non-ladder';
  const realm = useMemo(() => (isLoading ? null : { ladder, hardcore }), [isLoading, ladder, hardcore]);
  return { realm, token: settings?.pd2Token || null, userId: authData?.user?._id ?? null };
}

/**
 * The open requests a price-checked / listed item (its raw clipboard JSON) matches, best offer first. No view is
 * counted (see `countWtbViews`). Nothing while `text` or the realm is null, or when the call fails.
 */
export function useWtbItemMatches(text: string | null, realm: WtbRealm | null, token: string | null): WtbItemMatch[] {
  const cacheKey = text && realm ? `item|${realm.ladder}|${realm.hardcore}|${token ? 'user' : 'anon'}|${text}` : null;
  const [settled, setSettled] = useState<{ key: string; matches: WtbItemMatch[] } | null>(null);
  useEffect(() => {
    if (!cacheKey || !text || !realm) return;
    let cancelled = false;
    cachedMatch(cacheKey, () => matchWtbRequests(realm, [{ key: 'item', text }], { token })).then(
      (results) =>
        !cancelled && setSettled({ key: cacheKey, matches: [...(results.get('item') ?? [])].sort(byBestOffer) }),
      (error) => console.warn('[wtb] item match failed:', error),
    );
    return () => {
      cancelled = true;
    };
    // The key holds text, realm and token
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);
  return settled && settled.key === cacheKey ? settled.matches : [];
}

/** The buyers chip was opened: a view counts on each request the item matches (best effort). */
export function countWtbViews(realm: WtbRealm, text: string, token: string | null): void {
  matchWtbRequests(realm, [{ key: 'item', text }], { token, countViews: true }).catch((error) =>
    console.warn('[wtb] views not counted:', error),
  );
}

/** Open requests matching the user's own listings, by listing id (one `/match` call, no view counted). */
export function useListingWtbMatches(
  listings: readonly MarketListingEntry[] | null,
  realm: WtbRealm | null,
  token: string | null,
): ReadonlyMap<string, WtbItemMatch[]> {
  const items = useMemo<WtbMatchItem[]>(
    () =>
      (listings ?? [])
        .filter((l) => l.item)
        .slice(0, MAX_WTB_MATCH_ITEMS)
        .map((l) => ({ key: l._id, item: l.item })),
    [listings],
  );
  const cacheKey =
    items.length && realm ? `listings|${realm.ladder}|${realm.hardcore}|${items.map((i) => i.key).join(',')}` : null;
  const [settled, setSettled] = useState<{ key: string; matches: Map<string, WtbItemMatch[]> } | null>(null);
  useEffect(() => {
    if (!cacheKey || !realm) return;
    let cancelled = false;
    cachedMatch(cacheKey, () => matchWtbRequests(realm, items, { token })).then(
      (matches) => !cancelled && setSettled({ key: cacheKey, matches }),
      (error) => console.warn('[wtb] listing match failed:', error),
    );
    return () => {
      cancelled = true;
    };
    // The key holds the listing ids and the realm
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);
  return settled && settled.key === cacheKey ? settled.matches : EMPTY_MATCHES;
}

const EMPTY_MATCHES: ReadonlyMap<string, WtbItemMatch[]> = new Map();

/** A request one of the user's stash items fits. */
export interface StashWtbMatch extends WtbItemMatch {
  item: GameStashItem;
}

export interface StashWtbMatches {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  /** By request id. */
  byRequest: ReadonlyMap<string, StashWtbMatch>;
  reload: () => void;
}

/** One stash read's matches per realm, shared by every mount for WTB_MATCH_TTL_MS. */
let stashCache: { key: string; at: number; result: Promise<Map<string, StashWtbMatch>> } | null = null;

async function matchStash(
  fetchStash: () => Promise<{ items?: GameStashItem[] } | null | undefined>,
  realm: WtbRealm,
  token: string,
): Promise<Map<string, StashWtbMatch>> {
  const stash = await fetchStash();
  const items = (stash?.items ?? []).filter((i) => i?.hash);
  const byHash = new Map(items.map((i) => [i.hash, i]));
  const out = new Map<string, StashWtbMatch>();
  for (let from = 0; from < items.length; from += MAX_WTB_MATCH_ITEMS) {
    const chunk = items.slice(from, from + MAX_WTB_MATCH_ITEMS).map((i) => ({ key: i.hash, item: i }));
    const results = await matchWtbRequests(realm, chunk, { token });
    for (const [hash, matches] of results) {
      const item = byHash.get(hash);
      if (!item) continue;
      for (const match of matches) if (!out.has(match.request.id)) out.set(match.request.id, { ...match, item });
    }
  }
  return out;
}

/**
 * Fits my stash: the user's stash (the existing stash fetch) sent to `/match` (no views counted), as the requests
 * it fits. Runs while `enabled` (signed in, on the Wanted tab).
 */
export function useStashWtbMatches(enabled: boolean, realm: WtbRealm | null, token: string | null): StashWtbMatches {
  const { fetchStash } = usePd2Website();
  const fetchRef = useRef(fetchStash);
  fetchRef.current = fetchStash;
  const [generation, setGeneration] = useState(0);
  // A new realm, token or reload is a new read: loading until its answer settles under the same key
  const realmKey = enabled && realm && token ? `${realm.ladder}|${realm.hardcore}|${token}` : null;
  const key = realmKey && `${realmKey}|${generation}`;
  const [settled, setSettled] = useState<{
    key: string;
    status: 'ready' | 'error';
    error: string | null;
    byRequest: Map<string, StashWtbMatch>;
  } | null>(null);

  useEffect(() => {
    if (!key || !realmKey || !realm || !token) return;
    let cancelled = false;
    if (!stashCache || stashCache.key !== realmKey || Date.now() - stashCache.at >= WTB_MATCH_TTL_MS) {
      const result = matchStash(() => fetchRef.current(), realm, token);
      stashCache = { key: realmKey, at: Date.now(), result };
      result.catch(() => {
        if (stashCache?.result === result) stashCache = null;
      });
    }
    stashCache.result.then(
      (byRequest) => !cancelled && setSettled({ key, status: 'ready', error: null, byRequest }),
      (error) =>
        !cancelled &&
        setSettled({
          key,
          status: 'error',
          error: messageOf(error) || t('market:wtb.stashFailed'),
          byRequest: new Map(),
        }),
    );
    return () => {
      cancelled = true;
    };
    // The key holds realm, token and generation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => {
    stashCache = null;
    setGeneration((g) => g + 1);
  }, []);
  const current = !!key && settled?.key === key;
  return {
    status: !key ? 'idle' : current ? settled.status : 'loading',
    error: current ? settled.error : null,
    byRequest: current ? settled.byRequest : EMPTY_STASH,
    reload,
  };
}

const EMPTY_STASH: ReadonlyMap<string, StashWtbMatch> = new Map();

export interface WtbSearch {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  items: WtbRequest[];
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  /** A failed next page (the list footer offers Retry). */
  loadMoreError: string | null;
  loadMore: () => void;
  reload: () => void;
  /** A request the server just returned (an owner action): replaces the shown copy. */
  replace: (request: WtbRequest) => void;
}

const SEARCH_PAGE = 25;
/** Typing in a filter: wait for a pause before asking. */
const SEARCH_DEBOUNCE_MS = 300;

type SearchState = {
  key: string;
  status: 'ready' | 'error';
  error: string | null;
  items: WtbRequest[];
  total: number;
  cursor: string | null;
  loadingMore: boolean;
  loadMoreError: string | null;
};

/**
 * The Wanted source's results for `body` (null: not on Wanted), a page at a time; the shown pages stay while the
 * next query loads. Fits my stash with no fitting request answers empty without asking.
 */
export function useWtbSearch(body: WtbSearchBody | null, token: string | null): WtbSearch {
  const [generation, setGeneration] = useState(0);
  const query = body && JSON.stringify(body);
  const key = query && `${query}|${token ?? ''}|${generation}`;
  const [state, setState] = useState<SearchState | null>(null);
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    if (!key || !body) return;
    const settle = (next: Omit<SearchState, 'key' | 'loadingMore' | 'loadMoreError'>) =>
      keyRef.current === key && setState({ key, ...next, loadingMore: false, loadMoreError: null });
    const timer = window.setTimeout(
      () => {
        if (body.ids?.length === 0) {
          settle({ status: 'ready', error: null, items: [], total: 0, cursor: null });
          return;
        }
        searchWtbRequests({ ...body, limit: SEARCH_PAGE }, { token }).then(
          (page) =>
            settle({ status: 'ready', error: null, items: page.items, total: page.total, cursor: page.nextCursor }),
          (error) => settle({ status: 'error', error: messageOf(error), items: [], total: 0, cursor: null }),
        );
      },
      state ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => window.clearTimeout(timer);
    // The key holds the body, token and generation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = !!key && state?.key === key;
  const loadMore = useCallback(() => {
    if (!body || !state || state.key !== key || !state.cursor || state.loadingMore) return;
    const { cursor } = state;
    setState({ ...state, loadingMore: true, loadMoreError: null });
    searchWtbRequests({ ...body, cursor, limit: SEARCH_PAGE }, { token }).then(
      (page) =>
        setState((s) =>
          s && s.key === key
            ? {
                ...s,
                items: [...s.items, ...page.items.filter((r) => !s.items.some((x) => x.id === r.id))],
                total: page.total,
                cursor: page.nextCursor,
                loadingMore: false,
              }
            : s,
        ),
      (error) =>
        setState((s) => (s && s.key === key ? { ...s, loadingMore: false, loadMoreError: messageOf(error) } : s)),
    );
  }, [body, key, state, token]);

  return {
    status: !key ? 'idle' : current ? state.status : 'loading',
    error: state?.error ?? null,
    items: key ? (state?.items ?? []) : [],
    total: state?.total ?? 0,
    hasMore: current && !!state.cursor,
    loadingMore: current && state.loadingMore,
    loadMoreError: current ? state.loadMoreError : null,
    loadMore,
    reload: useCallback(() => setGeneration((g) => g + 1), []),
    replace: useCallback(
      (request: WtbRequest) =>
        setState((s) => s && { ...s, items: s.items.map((r) => (r.id === request.id ? request : r)) }),
      [],
    ),
  };
}

export interface MyWtbRequests {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  items: WtbRequest[];
  reload: () => void;
  /** A request the server just returned (created / patched): replaces the old copy, new ones first. */
  upsert: (request: WtbRequest) => void;
  remove: (id: string) => void;
}

/** The signed-in user's requests (every status, with counts); loads once `enabled`, again on reload. */
export function useMyWtbRequests(enabled: boolean, token: string | null): MyWtbRequests {
  const [generation, setGeneration] = useState(0);
  const key = enabled && token ? `${token}|${generation}` : null;
  const [state, setState] = useState<{
    key: string;
    status: 'ready' | 'error';
    error: string | null;
    items: WtbRequest[];
  } | null>(null);

  useEffect(() => {
    if (!key || !token) return;
    let cancelled = false;
    listMyWtbRequests(token).then(
      (items) => !cancelled && setState({ key, status: 'ready', error: null, items }),
      (error) =>
        !cancelled &&
        setState((s) => ({ key, status: 'error', error: messageOf(error), items: s?.key === key ? s.items : [] })),
    );
    return () => {
      cancelled = true;
    };
    // The key holds the token and generation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = !!key && state?.key === key;
  return {
    status: !key ? 'idle' : current ? state.status : 'loading',
    error: current ? state.error : null,
    // A reload keeps showing the list it refreshes; another account's (or signed out) shows none
    items: key && state?.key.startsWith(`${token}|`) ? state.items : [],
    reload: useCallback(() => setGeneration((g) => g + 1), []),
    upsert: useCallback(
      (request: WtbRequest) =>
        setState(
          (s) =>
            s && {
              ...s,
              items: s.items.some((r) => r.id === request.id)
                ? s.items.map((r) => (r.id === request.id ? request : r))
                : [request, ...s.items],
            },
        ),
      [],
    ),
    remove: useCallback((id: string) => setState((s) => s && { ...s, items: s.items.filter((r) => r.id !== id) }), []),
  };
}

type AnswerCache<T> = Map<string, { at: number; result: Promise<T> }>;

/**
 * `run`'s answer for `key` (null: none), shared through `cache` for `ttlMs` (a failure is not kept); `debounceMs`
 * waits for typing to pause. Null while unknown, and on an error (logged as `what`).
 */
function useCachedAnswer<T>(
  key: string | null,
  run: () => Promise<T>,
  { cache, ttlMs, debounceMs, what }: { cache: AnswerCache<T>; ttlMs: number; debounceMs: number; what: string },
): T | null {
  const [settled, setSettled] = useState<{ key: string; value: T | null } | null>(null);
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const now = Date.now();
      for (const [k, entry] of cache) if (now - entry.at >= ttlMs) cache.delete(k);
      let entry = cache.get(key);
      if (!entry) {
        entry = { at: now, result: run() };
        cache.set(key, entry);
        const failed = entry;
        entry.result.catch(() => cache.get(key) === failed && cache.delete(key));
      }
      entry.result.then(
        (value) => !cancelled && setSettled({ key, value }),
        (error) => {
          if (cancelled) return;
          console.warn(`[wtb] ${what} failed:`, error);
          setSettled({ key, value: null });
        },
      );
    }, debounceMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // The key holds everything `run` sends
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return settled && settled.key === key ? settled.value : null;
}

/** How long an overlap answer (demand bar, "Others want this too") is reused. */
const OVERLAP_TTL_MS = 2 * 60_000;
const overlapCache: AnswerCache<WtbSearchPage> = new Map();

/**
 * One overlap search (`overlap: true`) per `body` (null: none), cached a few minutes per filters; `debounceMs`
 * waits for typing to pause. Null while unknown, and on an error (the surfaces then just don't show).
 */
export function useWtbOverlap(body: WtbSearchBody | null, token: string | null, debounceMs = 0): WtbSearchPage | null {
  const key = body && `${token ? 'user' : 'anon'}|${JSON.stringify(body)}`;
  return useCachedAnswer(key, () => searchWtbRequests(body!, { token }), {
    cache: overlapCache,
    ttlMs: OVERLAP_TTL_MS,
    debounceMs,
    what: 'overlap search',
  });
}

/** How long a `/check` answer is reused (game data doesn't change under a session). */
const CHECK_TTL_MS = 10 * 60_000;
const checkCache: AnswerCache<WtbImpossible[]> = new Map();
const NO_IMPOSSIBLE: WtbImpossible[] = [];

/**
 * What of a request the server proves can't exist (`/check`), cached per filters and nice-to-have rows;
 * `debounceMs` waits for typing to pause. Empty while unknown, without a body, and on an error (the post itself
 * is checked again by the server).
 */
export function useWtbCheck(body: WtbCheckBody | null, token: string | null, debounceMs = 0): WtbImpossible[] {
  const key = useMemo(
    () => body && `${token ? 'user' : 'anon'}|${JSON.stringify([wtbFilters(body.filters), body.niceToHaveIds])}`,
    [body, token],
  );
  const impossible = useCachedAnswer(key, () => checkWtbRequest(body!, { token }), {
    cache: checkCache,
    ttlMs: CHECK_TTL_MS,
    debounceMs,
    what: 'request check',
  });
  return impossible ?? NO_IMPOSSIBLE;
}

/** Responses read per list (newest first). */
const RESPONSES_LIMIT = 50;

export interface WtbResponses {
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** On the user's requests (one request's with `requestId`); dismissed ones dropped. */
  received: WtbResponse[];
  /** The user's to others' requests (none with `requestId`). */
  made: WtbResponse[];
  reload: () => void;
  /** Hides a received response (on pd2trader.com too); rejects when the server refused. */
  dismiss: (id: string) => Promise<void>;
  /** A request's new status shown on its responses (Mark filled closes it). */
  setRequestStatus: (requestId: string, status: WtbStatus) => void;
}

const upsertResponse = (list: WtbResponse[], response: WtbResponse) =>
  list.some((r) => r.id === response.id) ? list.map((r) => (r.id === response.id ? response : r)) : [response, ...list];

const NO_RESPONSES: WtbResponse[] = [];

/**
 * The signed-in user's buy request responses: received and made (Chat), or one request's received ones
 * (`requestId`: its drawer). Loads once `enabled`, again on reload; responses pushed on the alerts stream
 * (`wtb.response`) come in live.
 */
export function useWtbResponses(enabled: boolean, token: string | null, requestId?: string): WtbResponses {
  const [generation, setGeneration] = useState(0);
  const key = enabled && token ? `${token}|${requestId ?? ''}|${generation}` : null;
  const [state, setState] = useState<{
    key: string;
    status: 'ready' | 'error';
    received: WtbResponse[];
    made: WtbResponse[];
  } | null>(null);

  useEffect(() => {
    if (!key || !token) return;
    const controller = new AbortController();
    const received = listWtbResponses(
      token,
      { direction: 'received', requestId, limit: RESPONSES_LIMIT },
      controller.signal,
    );
    const made = requestId
      ? Promise.resolve({ items: [] as WtbResponse[] })
      : listWtbResponses(token, { direction: 'made', limit: RESPONSES_LIMIT }, controller.signal);
    Promise.all([received, made]).then(
      ([r, m]) => setState({ key, status: 'ready', received: r.items, made: m.items }),
      (error) => {
        if (controller.signal.aborted) return;
        console.warn('[wtb] responses failed:', error);
        setState((s) => ({
          key,
          status: 'error',
          received: s?.key === key ? s.received : [],
          made: s?.key === key ? s.made : [],
        }));
      },
    );
    return () => controller.abort();
    // The key holds the token, request and generation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Pushed responses (on the user's requests) come in without a refetch
  useEffect(() => {
    if (!key) return;
    return subscribeWtbResponses((response) => {
      if (requestId && response.requestId !== requestId) return;
      setState((s) => s && { ...s, received: upsertResponse(s.received, response) });
    });
  }, [key, requestId]);

  const current = !!key && state?.key === key;
  const dismiss = useCallback(
    async (id: string) => {
      if (!token) return;
      await dismissWtbResponse(token, id);
      setState((s) => s && { ...s, received: s.received.filter((r) => r.id !== id) });
    },
    [token],
  );
  const setRequestStatus = useCallback(
    (requestId: string, status: WtbStatus) =>
      setState((s) => {
        if (!s) return s;
        const update = (list: WtbResponse[]) =>
          list.map((r) => (r.requestId === requestId ? { ...r, request: { ...r.request, status } } : r));
        return { ...s, received: update(s.received), made: update(s.made) };
      }),
    [],
  );
  // A reload keeps showing the lists it refreshes; another account's (or signed out) shows none
  const shown = !!key && !!state?.key.startsWith(`${token}|${requestId ?? ''}|`);
  const received = useMemo(
    () => (shown && state ? state.received.filter((r) => !r.dismissed) : NO_RESPONSES),
    [shown, state],
  );
  return {
    status: !key ? 'idle' : current ? state.status : 'loading',
    received,
    made: shown && state ? state.made : NO_RESPONSES,
    reload: useCallback(() => setGeneration((g) => g + 1), []),
    dismiss,
    setRequestStatus,
  };
}
