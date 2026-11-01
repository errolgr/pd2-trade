import { useEffect, useMemo, useState } from 'react';
import { type ActiveFilter, activeFilters } from '../lib/active-filters';
import type { SearchDefaults } from '../lib/defaults';
import type { MarketApi, MarketFilters } from '../lib/types';

/** Most filters an empty search tries dropping: one count request each, so a 60/min rate limit stays far. */
export const MAX_RELAXATIONS = 6;

/** Dropping `filter` from the empty search finds `total` listings (`totalExact` false: a lower bound or estimate). */
export interface Relaxation {
  filter: ActiveFilter;
  total: number;
  totalExact: boolean;
}

/**
 * For a search that found nothing: how many listings it finds without each of its filters (the item name last,
 * the one the user most likely wants to keep), best first and only those that find something. Null while counting
 * or when `filters` is null (nothing to suggest). Counting failures leave that filter out.
 */
export function useRelaxations(
  api: MarketApi | null,
  filters: MarketFilters | null,
  defaults: SearchDefaults,
): Relaxation[] | null {
  const candidates = useMemo(() => {
    if (!filters) return [];
    const active = activeFilters(filters, defaults);
    return [
      ...active.filter((a) => a.spec.kind !== 'itemName'),
      ...active.filter((a) => a.spec.kind === 'itemName'),
    ].slice(0, MAX_RELAXATIONS);
  }, [filters, defaults]);
  const [result, setResult] = useState<{ for: MarketFilters; relaxations: Relaxation[] } | null>(null);

  useEffect(() => {
    if (!api || !filters || candidates.length === 0) return;
    const abort = new AbortController();
    void Promise.all(
      candidates.map((filter) =>
        api
          .searchListings(filter.clear(filters), { page: 0, limit: 1, signal: abort.signal })
          .then(({ total, totalExact }): Relaxation => ({ filter, total, totalExact }))
          .catch(() => null),
      ),
    ).then((counted) => {
      if (abort.signal.aborted) return;
      const relaxations = counted
        .filter((r): r is Relaxation => r !== null && r.total > 0)
        .sort((a, b) => b.total - a.total);
      setResult({ for: filters, relaxations });
    });
    return () => abort.abort();
  }, [api, filters, candidates]);

  if (!filters || candidates.length === 0) return null;
  return result?.for === filters ? result.relaxations : null;
}
