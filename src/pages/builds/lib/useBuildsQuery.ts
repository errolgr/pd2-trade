import { useEffect, useState } from 'react';
import { BuildsApiError, type BuildsMode, type CharacterDetail, getBuildCharacter } from '@/lib/builds-api';

/** Responses are reused this long, so switching tabs/back is instant (the server refreshes builds hourly). */
export const CACHE_TTL_MS = 2 * 60_000;

const cache = new Map<string, { at: number; data: unknown }>();

/** Tests: forget every cached response. */
export function clearBuildsCache() {
  cache.clear();
}

function cached<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return hit.data as T;
}

export interface BuildsQuery<T> {
  /** The answer for `key`, or the previous key's while the new one loads (`stale`). */
  data: T | undefined;
  loading: boolean;
  /** `data` belongs to an earlier key. */
  stale: boolean;
  error: string | null;
  /** HTTP status of the failure (0 = no answer); null when it didn't fail. */
  status: number | null;
  retry: () => void;
}

interface State<T> {
  key: string | null;
  data: T | undefined;
  error: string | null;
  status: number | null;
  loading: boolean;
}

/**
 * Loads `load(signal)` for `key` (null = nothing to load). In-flight requests are aborted when the key changes;
 * answers are cached per key for CACHE_TTL_MS. `retry` reloads past the cache.
 */
export function useBuildsQuery<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): BuildsQuery<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State<T>>(() => {
    const hit = key ? cached<T>(key) : undefined;
    return { key, data: hit, error: null, status: null, loading: !!key && hit === undefined };
  });

  // Adjusted during render: a cached key shows at once, a new one starts loading (keeping the old data)
  if (state.key !== key) {
    const hit = key ? cached<T>(key) : undefined;
    setState({
      key,
      data: hit ?? (key ? state.data : undefined),
      error: null,
      status: null,
      loading: !!key && hit === undefined,
    });
  }

  useEffect(() => {
    if (!key) return;
    const fresh = attempt === 0 ? cached<T>(key) : undefined;
    if (fresh !== undefined) {
      setState({ key, data: fresh, error: null, status: null, loading: false });
      return;
    }
    const controller = new AbortController();
    setState((s) => (s.key === key ? { ...s, loading: true, error: null, status: null } : s));
    load(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        cache.set(key, { at: Date.now(), data });
        setState({ key, data, error: null, status: null, loading: false });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const status = error instanceof BuildsApiError ? error.status : 0;
        const message = error instanceof Error ? error.message : 'Request failed';
        setState((s) => ({ ...s, key, error: message, status, loading: false }));
      },
    );
    return () => controller.abort();
    // `load` is a fresh closure every render; the key names everything it depends on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const own = state.key === key;
  return {
    data: state.data,
    loading: !!key && (state.loading || !own),
    stale: state.data !== undefined && !!key && (state.loading || !!state.error) && cached(key) === undefined,
    error: own ? state.error : null,
    status: own ? state.status : null,
    retry: () => setAttempt((n) => n + 1),
  };
}

/** One tracked character (shared cache between the character cards and the character view). */
export function useBuildCharacter(name: string | null, mode?: BuildsMode): BuildsQuery<CharacterDetail> {
  return useBuildsQuery(name ? `character|${name.toLowerCase()}|${mode ?? ''}` : null, (signal) =>
    getBuildCharacter(name ?? '', { mode }, signal),
  );
}

/** A cached answer for a key, if fresh. */
export { cached as peekBuildsCache };

/** Stores an answer fetched outside a query (a batch), so the single-key query finds it. */
export function primeBuildsCache(key: string, data: unknown) {
  cache.set(key, { at: Date.now(), data });
}

export const snapshotQueryKey = (name: string, mode: BuildsMode, id: string) =>
  `snapshot|${name.toLowerCase()}|${mode}|${id}`;
