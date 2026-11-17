import { hasLegacyOr, upgradeRowGroup } from './stat-groups';
import type { MarketFilters, MarketListingStatus, OnlineFilter, StatFilter, Tri } from './types';

/** The site's own `updated_at` windows (Trade: the last 3 days, Archive: the last 14), which its links always apply. */
export const DEFAULT_MAX_AGE_DAYS = { live: 3, archive: 14 } as const;

/** The archive's statuses (the site's Archive shows them all); a search with none set searches every one. */
export const ARCHIVE_STATUSES: readonly MarketListingStatus[] = ['sold', 'removed', 'expired'];

/** Longest free-text filter (item name, price note) the market service accepts (its dto `MAX_TEXT`). */
export const MAX_FILTER_TEXT = 100;
/** Longest seller name the market service accepts. */
export const MAX_SELLER_NAME = 64;
/** Longest listing age window the market service accepts. */
const MAX_AGE_DAYS_LIMIT = 365;

/** What a fresh search starts with besides the realm: the user's Settings → Market defaults. */
export interface SearchDefaults {
  sort: MarketFilters['sort'];
  userOnlineSite: OnlineFilter;
  userOnlineGame: OnlineFilter;
  hasBuyout: Tri;
  /** Live listings' age window; absent = every listing. The archive always starts without one. */
  maxAgeDays?: number;
}

/** The empty search: every listing, newest bump first. */
export const SITE_SEARCH_DEFAULTS: SearchDefaults = {
  sort: { by: 'bumped', dir: 'desc' },
  userOnlineSite: 'all',
  userOnlineGame: 'all',
  hasBuyout: 'any',
};

/** The Settings → Market fields behind SearchDefaults (as stored: any may be missing or stale). */
export interface SearchDefaultSettings {
  marketDefaultSort?: 'newest' | 'cheapest' | 'priciest';
  marketDefaultSeller?: 'all' | 'online' | 'in-game';
  marketDefaultHasBuyout?: Tri;
  /** 0 (or anything out of range) = no window. */
  marketDefaultListedWithinDays?: number;
}

/** Price sorts a fresh search can start with ('newest' is the site's sort). */
const PRICE_SORTS: Record<'cheapest' | 'priciest', MarketFilters['sort']> = {
  cheapest: { by: 'price', dir: 'asc' },
  priciest: { by: 'price', dir: 'desc' },
};

/** The user's search defaults; unknown or out-of-range values fall back to the site's. */
export function searchDefaults(s: SearchDefaultSettings): SearchDefaults {
  const sort =
    s.marketDefaultSort === 'cheapest' || s.marketDefaultSort === 'priciest'
      ? PRICE_SORTS[s.marketDefaultSort]
      : SITE_SEARCH_DEFAULTS.sort;
  const age = s.marketDefaultListedWithinDays;
  const buyout = s.marketDefaultHasBuyout;
  return {
    sort: { ...sort },
    userOnlineSite: s.marketDefaultSeller === 'online' ? 'online' : 'all',
    userOnlineGame: s.marketDefaultSeller === 'in-game' ? 'online' : 'all',
    hasBuyout: buyout === 'yes' || buyout === 'no' ? buyout : 'any',
    ...(typeof age === 'number' &&
      Number.isInteger(age) &&
      age >= 1 &&
      age <= MAX_AGE_DAYS_LIMIT && { maxAgeDays: age }),
  };
}

/**
 * A source's default age window: the user's for live listings (none = any age), none for the archive. Wanted has
 * no age window: it keeps the live one, so switching back to listings finds it as it was.
 */
export function defaultAgeDays(source: MarketFilters['source'], defaults: SearchDefaults): number | undefined {
  return source === 'archive' ? undefined : defaults.maxAgeDays;
}

/** Fresh filters for the user's realm: the site's empty Trade search, or the user's `defaults`. */
export function defaultFilters(
  mode: { hardcore: boolean; ladder: boolean },
  defaults: SearchDefaults = SITE_SEARCH_DEFAULTS,
): MarketFilters {
  return {
    source: 'live',
    hardcore: mode.hardcore,
    ladder: mode.ladder,
    rarity: [],
    ethereal: 'any',
    corrupted: 'any',
    desecrated: 'any',
    identified: 'any',
    userOnlineSite: defaults.userOnlineSite,
    userOnlineGame: defaults.userOnlineGame,
    hasBuyout: defaults.hasBuyout,
    requirements: {},
    stats: [],
    ...(defaults.maxAgeDays !== undefined && { maxAgeDays: defaults.maxAgeDays }),
    sort: { ...defaults.sort },
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

/**
 * Filters stored by older versions (saved searches, the last search, payloads): stat weights are dropped and the
 * score/value sorts they fed fall back to the newest bumps; the old `corruptions` list becomes corruption rows;
 * the single any-of group (`or: true`) becomes block 1.
 */
export function upgradeFilters(stored: MarketFilters & { corruptions?: unknown }): MarketFilters {
  const { corruptions, ...f } = stored;
  const legacy = Array.isArray(corruptions) ? corruptions.filter((c): c is string => typeof c === 'string') : [];
  // Stored filters are only checked for their envelope: a field may be missing
  const weighted = (f.stats ?? []).some((s) => s.weight !== undefined);
  const legacyOr = (f.stats ?? []).some(hasLegacyOr);
  const scoreSort = f.sort?.by === 'score' || f.sort?.by === 'value';
  if (!weighted && !legacyOr && !scoreSort && corruptions === undefined) return stored;
  const stats = (f.stats ?? []).map(({ weight: _weight, ...row }) => upgradeRowGroup(row));
  return {
    ...f,
    stats: [...stats, ...legacy.map((key) => newStatFilter({ kind: 'corruption', key }))],
    sort: scoreSort ? { by: 'bumped', dir: 'desc' } : f.sort,
  };
}

/**
 * Switch between live listings and the archive, moving the age window along when it is at its default. The archive's
 * status pick doesn't apply to live listings and is dropped.
 */
export function withSource(
  f: MarketFilters,
  source: MarketFilters['source'],
  defaults: SearchDefaults = SITE_SEARCH_DEFAULTS,
): MarketFilters {
  if (f.source === source) return f;
  const atDefault = f.maxAgeDays === defaultAgeDays(f.source, defaults);
  return {
    ...f,
    source,
    status: undefined,
    maxAgeDays: atDefault ? defaultAgeDays(source, defaults) : f.maxAgeDays,
  };
}

/** A stat row with a fresh id, enabled unless told otherwise. */
export function newStatFilter(row: Omit<StatFilter, 'id' | 'enabled'> & { enabled?: boolean }): StatFilter {
  return { ...row, id: crypto.randomUUID(), enabled: row.enabled ?? true };
}
