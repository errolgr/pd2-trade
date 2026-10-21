import type { MarketFilters, StatFilter } from './types';

/** The site's `updated_at` windows: Trade shows the last 3 days, Archive the last 14. */
export const DEFAULT_MAX_AGE_DAYS = { live: 3, archive: 14 } as const;

/** Fresh filters for the user's realm, matching the site's empty Trade search. */
export function defaultFilters(mode: { hardcore: boolean; ladder: boolean }): MarketFilters {
  return {
    source: 'live',
    hardcore: mode.hardcore,
    ladder: mode.ladder,
    rarity: [],
    ethereal: 'any',
    corrupted: 'any',
    desecrated: 'any',
    identified: 'any',
    userOnlineSite: 'all',
    userOnlineGame: 'all',
    hasBuyout: 'any',
    requirements: {},
    stats: [],
    corruptions: [],
    maxAgeDays: DEFAULT_MAX_AGE_DAYS.live,
    sort: { by: 'bumped', dir: 'desc' },
  };
}

/** Fields every MarketFilters has; `undefined` in a partial never clears these. */
const REQUIRED_KEYS = new Set(Object.keys(defaultFilters({ hardcore: false, ladder: false })));

/**
 * `partial` over `base`. Nested `requirements` and `sort` merge field by field; arrays replace. A key present
 * in `partial` with an `undefined` value clears that optional filter (item name, seller, ranges…); required
 * fields keep the base value.
 */
export function mergeFilters(base: MarketFilters, partial?: Partial<MarketFilters>): MarketFilters {
  if (!partial) return base;
  const merged: MarketFilters = { ...base };
  for (const [key, value] of Object.entries(partial) as [keyof MarketFilters, unknown][]) {
    if (value === undefined && REQUIRED_KEYS.has(key)) continue;
    (merged as unknown as Record<string, unknown>)[key] = value;
  }
  merged.requirements = { ...base.requirements, ...partial.requirements };
  merged.sort = { ...base.sort, ...partial.sort };
  return merged;
}

/** Switch between live listings and the sold archive, moving the age window along when it is at its default. */
export function withSource(f: MarketFilters, source: MarketFilters['source']): MarketFilters {
  if (f.source === source) return f;
  const atDefault = f.maxAgeDays === DEFAULT_MAX_AGE_DAYS[f.source];
  return { ...f, source, maxAgeDays: atDefault ? DEFAULT_MAX_AGE_DAYS[source] : f.maxAgeDays };
}

/** A stat row with a fresh id, enabled unless told otherwise. */
export function newStatFilter(row: Omit<StatFilter, 'id' | 'enabled'> & { enabled?: boolean }): StatFilter {
  return { ...row, id: crypto.randomUUID(), enabled: row.enabled ?? true };
}
