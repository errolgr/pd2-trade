import { useEffect, useMemo, useState } from 'react';
import { CatalogSearchError, type CatalogSearchHit, searchCatalog } from '@/lib/catalog-search-api';
import { reportApiError } from '@/lib/error-reporting';
import { itemNameOptions } from '../lib/catalog';
import { type ItemNameSuggestion, itemNameSuggestions } from '../lib/name-suggestions';

/** The server is asked once typing pauses this long (the local list shows at once). */
export const SUGGEST_DEBOUNCE_MS = 150;
/** A catalog search slower than this is dropped: the local list stays. */
export const SUGGEST_TIMEOUT_MS = 800;
/** Queries whose answers are kept for the session (oldest dropped first). */
const CACHE_MAX = 200;

const cache = new Map<string, CatalogSearchHit[]>();
let reported = false;

/** Tests: forget the cached answers and that a failure was reported. */
export function resetItemNameSuggestions(): void {
  cache.clear();
  reported = false;
}

const cacheKey = (query: string, limit: number) => `${limit}:${query.toLowerCase()}`;

function remember(key: string, hits: CatalogSearchHit[]) {
  cache.delete(key);
  cache.set(key, hits);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
}

/** The first failure of the session is reported; the local list covers for it and for every later one. */
function reportOnce(error: unknown, query: string) {
  if (reported) return;
  reported = true;
  const err = error instanceof Error ? error : new Error(String(error));
  reportApiError(err, 'catalog-search', 'api/search', err instanceof CatalogSearchError ? err.status : undefined, {
    query,
  });
}

export interface ItemNameSuggestionsOptions {
  /** Pause in typing before the server is asked (default SUGGEST_DEBOUNCE_MS). */
  debounceMs?: number;
  /** Shorter queries get the local list only (default 1: any text asks the server). */
  minChars?: number;
}

export interface ItemNameSuggestionsResult {
  suggestions: ItemNameSuggestion[];
  /** The server is being asked about the current text (its answer will replace the local list). */
  loading: boolean;
}

/**
 * Suggestions for the item-name box: the local list right away, replaced by the server's typo- and
 * nickname-tolerant ranking once it answers for the current text. Each pause in typing asks once; a newer
 * text cancels the request in flight, so an older answer never replaces a newer one.
 */
export function useItemNameSuggestions(
  text: string,
  limit: number,
  { debounceMs = SUGGEST_DEBOUNCE_MS, minChars = 1 }: ItemNameSuggestionsOptions = {},
): ItemNameSuggestionsResult {
  const query = text.trim();
  const key = cacheKey(query, limit);
  const asks = query.length >= Math.max(1, minChars);
  /** The server's answer for `key`; null hits: it failed or was too slow (the local list stays). */
  const [answer, setAnswer] = useState<{ key: string; hits: CatalogSearchHit[] | null } | null>(null);
  const cached = asks ? cache.get(key) : undefined;
  const hits = asks ? (cached ?? (answer?.key === key ? answer.hits : null)) : null;
  const loading = asks && !cached && answer?.key !== key;

  useEffect(() => {
    if (!asks || cache.has(key)) return;
    const controller = new AbortController();
    let slow: number | undefined;
    const start = window.setTimeout(() => {
      slow = window.setTimeout(() => {
        reportOnce(new CatalogSearchError(`The catalog search took longer than ${SUGGEST_TIMEOUT_MS} ms.`), query);
        setAnswer({ key, hits: null });
        controller.abort();
      }, SUGGEST_TIMEOUT_MS);
      searchCatalog(query, { limit, signal: controller.signal })
        .then(
          (result) => {
            // A late answer (newer text, or past the time limit) would swap the list under the user: drop it
            if (controller.signal.aborted) return;
            remember(key, result);
            setAnswer({ key, hits: result });
          },
          (error: unknown) => {
            // Cancelled: newer text, unmount, or already reported as too slow
            if (controller.signal.aborted) return;
            reportOnce(error, query);
            setAnswer({ key, hits: null });
          },
        )
        .finally(() => window.clearTimeout(slow));
    }, debounceMs);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(slow);
      controller.abort();
    };
  }, [asks, query, key, limit, debounceMs]);

  const suggestions = useMemo(
    () => itemNameSuggestions(query, itemNameOptions(query, limit), hits, limit),
    [query, hits, limit],
  );
  return useMemo(() => ({ suggestions, loading }), [suggestions, loading]);
}
