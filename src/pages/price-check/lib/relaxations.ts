import type { RelaxationCandidate } from '@/pages/market/hooks/useRelaxations';
import type { MarketFilters } from '@/pages/market/lib/types';
import { type PriceCheckSearch, priceCheckServiceSearch } from '@/pages/market/store/priceCheckFilters';
import { StatId } from './stat-mappings';
import { BASE_QUALITIES } from './tradeUrlBuilder';
import { RANGE_FIELDS } from './utils';

/** One change that widens the price check's search, applied to its controls when picked. */
export type PriceCheckRelaxation =
  | { kind: 'ranges' }
  | { kind: 'stat'; key: string }
  | { kind: 'type' }
  | { kind: 'quality' }
  | { kind: 'corrupted' }
  | { kind: 'corruptions' };

const CORRUPTED_KEY = `id:${StatId.Corrupted}`;

/**
 * The ways to widen a price check search that found nothing, each with the search it makes, least drastic first
 * (useRelaxationCounts tries the first few): clearing the stat ranges, dropping one selected stat, any base of the
 * type, any quality, either corruption state, dropping a corruption price's filter. A change only the PD2 query
 * could express (a gap) isn't offered: the market service couldn't count it.
 */
export function priceCheckRelaxations(
  search: PriceCheckSearch,
  sort: MarketFilters['sort'],
  can: { searchType: boolean; anyQuality: boolean },
): RelaxationCandidate<PriceCheckRelaxation>[] {
  const variants: [PriceCheckRelaxation, PriceCheckSearch][] = [];
  const { selected, filters } = search;

  if ([...selected].some((key) => RANGE_FIELDS.some((field) => !!filters[key]?.[field]))) {
    const cleared = Object.fromEntries(RANGE_FIELDS.map((field) => [field, '']));
    variants.push([
      { kind: 'ranges' },
      {
        ...search,
        filters: Object.fromEntries(
          Object.entries(filters).map(([key, input]) => [key, selected.has(key) ? { ...input, ...cleared } : input]),
        ),
      },
    ]);
  }
  for (const key of selected) {
    // The corrupted row is a three-way state of its own (below)
    if (key === CORRUPTED_KEY) continue;
    variants.push([
      { kind: 'stat', key },
      {
        ...search,
        selected: new Set([...selected].filter((k) => k !== key)),
        filters: Object.fromEntries(Object.entries(filters).filter(([k]) => k !== key)),
      },
    ]);
  }
  if (can.searchType && search.searchMode === 0) variants.push([{ kind: 'type' }, { ...search, searchMode: 1 }]);
  if (can.anyQuality && !Array.isArray(search.qualityOverride))
    variants.push([{ kind: 'quality' }, { ...search, qualityOverride: BASE_QUALITIES }]);
  if (search.corruptedState !== 0)
    variants.push([
      { kind: 'corrupted' },
      { ...search, corruptedState: 0, selected: new Set([...selected].filter((k) => k !== CORRUPTED_KEY)) },
    ]);
  if (search.corruptionNames.length > 0) variants.push([{ kind: 'corruptions' }, { ...search, corruptionNames: [] }]);

  return variants.flatMap(([value, variant]) => {
    const { filters: serviceFilters, gaps } = priceCheckServiceSearch(variant, sort);
    const id = value.kind === 'stat' ? `stat:${value.key}` : value.kind;
    return gaps.length > 0 ? [] : [{ id, value, filters: serviceFilters }];
  });
}
