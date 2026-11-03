import { useEffect, useMemo, useState } from 'react';
import { type ActiveFilter, activeFilters } from '../lib/active-filters';
import type { SearchDefaults } from '../lib/defaults';
import type { MarketFilters } from '../lib/types';

/** Most filters an empty search tries dropping: one count request each, so a 60/min rate limit stays far. */
export const MAX_RELAXATIONS = 6;
/** Count requests in flight at once: the market service answers a burst of searches slower, or not in time. */
const CONCURRENT_COUNTS = 2;

/** One way to widen a search that found nothing: `filters` is the search with that change. */
export interface RelaxationCandidate<T> {
  id: string;
  value: T;
  filters: MarketFilters;
}

/**
 * A candidate and, once its count landed (`counting` false), how many listings it finds (`totalExact` false: a
 * lower bound or estimate).
 */
export interface Relaxation<T> {
  id: string;
  value: T;
  counting: boolean;
  total: number;
  totalExact: boolean;
}

/** A market service count (`searchListings` / `searchMarketListings` asked for one row). */
export type CountListings = (
  filters: MarketFilters,
  opts: { page: number; limit: number; signal?: AbortSignal },
) => Promise<{ total: number; totalExact: boolean }>;

/**
 * The first MAX_RELAXATIONS candidates, in their order, each counted as soon as its count lands (`counting` until
 * then), so they show while the rest still count. A failed count drops that candidate. Null without candidates or
 * a way to count. Candidates are compared by their id and filters (stat row ids aside: they name a row, not what it
 * searches), so rebuilding equal ones doesn't count again.
 */
export function useRelaxationCounts<T>(
  count: CountListings | null,
  candidates: readonly RelaxationCandidate<T>[] | null,
): Relaxation<T>[] | null {
  const tried = candidates?.slice(0, MAX_RELAXATIONS) ?? [];
  const key =
    count && tried.length > 0
      ? JSON.stringify(
          tried.map((c) => [c.id, { ...c.filters, stats: c.filters.stats.map(({ id: _id, ...row }) => row) }]),
        )
      : null;
  /** Per candidate index: its count, or null when it failed (absent: still counting). */
  const [counted, setCounted] = useState<{
    key: string;
    byIndex: Record<number, { total: number; totalExact: boolean } | null>;
  } | null>(null);

  useEffect(() => {
    if (!count || key === null) return;
    const abort = new AbortController();
    let next = 0;
    const land = (i: number, result: { total: number; totalExact: boolean } | null) => {
      if (abort.signal.aborted) return;
      setCounted((c) => ({ key, byIndex: { ...(c?.key === key ? c.byIndex : {}), [i]: result } }));
    };
    const worker = async () => {
      while (next < tried.length && !abort.signal.aborted) {
        const i = next++;
        try {
          const { total, totalExact } = await count(tried[i].filters, { page: 0, limit: 1, signal: abort.signal });
          land(i, { total, totalExact });
        } catch {
          land(i, null);
        }
      }
    };
    for (let w = 0; w < Math.min(CONCURRENT_COUNTS, tried.length); w++) void worker();
    return () => abort.abort();
    // `key` stands for the candidates: rebuilt equal ones must not count again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, key]);

  if (key === null) return null;
  const byIndex = counted?.key === key ? counted.byIndex : {};
  return tried.flatMap(({ id, value }, i): Relaxation<T>[] => {
    const result = byIndex[i];
    if (result === null) return [];
    return [
      result ? { id, value, counting: false, ...result } : { id, value, counting: true, total: 0, totalExact: true },
    ];
  });
}

/**
 * The market browser's: for a search that found nothing, how many listings it finds without each of its filters
 * (the item name last, the one the user most likely wants to keep). Null when `filters` is null or has none.
 */
export function useRelaxations(
  count: CountListings | null,
  filters: MarketFilters | null,
  defaults: SearchDefaults,
): Relaxation<ActiveFilter>[] | null {
  const candidates = useMemo(() => {
    if (!filters) return null;
    const active = activeFilters(filters, defaults);
    return [
      ...active.filter((a) => a.spec.kind !== 'itemName'),
      ...active.filter((a) => a.spec.kind === 'itemName'),
    ].map((filter) => ({ id: filter.id, value: filter, filters: filter.clear(filters) }));
  }, [filters, defaults]);
  return useRelaxationCounts(count, candidates);
}
