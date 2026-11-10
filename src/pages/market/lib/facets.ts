import type { MarketFilters, Rarity } from './types';

/**
 * Facet counts from the market service (`facets` of `POST /api/market/search`; server
 * src/market-listings/filters/facets.ts). A facet on a dimension the filters select on is counted without that
 * dimension's own filter, so it lists the alternatives; the others count within the results. Each value counts what
 * picking it would find: quality = that rarity alone, flags = yes / no.
 */

/** The facets the market browser asks for (first page of a narrowed search only, see `wantsFacets`). */
export const BROWSER_FACETS = ['quality', 'typeCode', 'baseCode', 'ethereal', 'corrupted', 'price'] as const;
export type MarketFacetName = (typeof BROWSER_FACETS)[number];

/** Set on every search (realm, archive/live, age window, presence, buyout, sort): they never make it a narrowed one. */
const ALWAYS_SET: Partial<Record<keyof MarketFilters, true>> = {
  source: true,
  hardcore: true,
  ladder: true,
  userOnlineSite: true,
  userOnlineGame: true,
  hasBuyout: true,
  maxAgeDays: true,
  sort: true,
};

function narrows(value: unknown): boolean {
  if (value === undefined || value === null || value === '' || value === 'any') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.values(value).some(narrows);
  return true;
}

/**
 * Whether a search narrows the market beyond the always-set fields. The default search (every live listing) is the
 * broadest and most-run one, so its facet counts would be the costliest to compute and the least useful: they're
 * skipped there. Any other filter, including ones added later, turns them on.
 */
export function wantsFacets(f: MarketFilters): boolean {
  return Object.entries(f).some(([key, value]) => !ALWAYS_SET[key as keyof MarketFilters] && narrows(value));
}

export interface FacetCount<T> {
  value: T;
  count: number;
}

/** Listings with an effective HR price in `[from, to)` (`to` null: open-ended). */
export interface PriceBucket {
  from: number;
  to: number | null;
  count: number;
}

export interface MarketFacets {
  quality?: FacetCount<Rarity>[];
  typeCode?: FacetCount<string>[];
  baseCode?: FacetCount<string>[];
  ethereal?: FacetCount<boolean>[];
  corrupted?: FacetCount<boolean>[];
  price?: PriceBucket[];
}

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

function counts<T>(raw: unknown, isValue: (v: unknown) => v is T): FacetCount<T>[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.flatMap((b: unknown) =>
    b && typeof b === 'object' && 'value' in b && 'count' in b && isValue(b.value) && isCount(b.count)
      ? [{ value: b.value, count: b.count }]
      : [],
  );
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

/** The `facets` of a search reply, keeping only well-formed buckets; undefined when the reply has none. */
export function parseFacets(raw: unknown): MarketFacets | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const f = raw as Record<string, unknown>;
  const price = Array.isArray(f.price)
    ? f.price.flatMap((b: unknown) =>
        b && typeof b === 'object' && 'from' in b && 'count' in b && isNumber(b.from) && isCount(b.count)
          ? [{ from: b.from, to: 'to' in b && isNumber(b.to) ? b.to : null, count: b.count }]
          : [],
      )
    : undefined;
  return {
    quality: counts(f.quality, isString) as FacetCount<Rarity>[] | undefined,
    typeCode: counts(f.typeCode, isString),
    baseCode: counts(f.baseCode, isString),
    ethereal: counts(f.ethereal, isBoolean),
    corrupted: counts(f.corrupted, isBoolean),
    price,
  };
}

/** value → count of one facet (missing facet: an empty map, so callers show no counts). */
export function countsByValue<T>(facet: FacetCount<T>[] | undefined): Map<T, number> {
  return new Map((facet ?? []).map((b) => [b.value, b.count]));
}

/**
 * The service's cap on the `typeCode` / `baseCode` lists (its TYPE_FACET_SIZE / BASE_FACET_SIZE): a shorter list is
 * every code the search finds, so a code missing from it finds nothing.
 */
export const CODE_FACET_SIZE = { typeCode: 50, baseCode: 20 } as const;

/** A code facet's counts, and whether they are all of them (codes missing from a complete list count 0). */
export interface CodeCounts {
  byCode: Map<string, number>;
  complete: boolean;
}

export function codeCounts(facet: FacetCount<string>[] | undefined, size: number): CodeCounts | undefined {
  return facet && { byCode: countsByValue(facet), complete: facet.length < size };
}

/** How far a facet hairline / fill reaches: `count / total` in [0, 1] (0 without a total). */
export function facetShare(count: number | undefined, total: number): number {
  return count && total > 0 ? Math.min(1, count / total) : 0;
}

/** A run of adjacent options picked together (price buckets): indexes `lo..hi`. */
export interface IndexRange {
  lo: number;
  hi: number;
}

export const inRange = (r: IndexRange | null, i: number) => !!r && r.lo <= i && i <= r.hi;

/** The range between two picks, in either order. */
export const spanOf = (a: number, b: number): IndexRange => ({ lo: Math.min(a, b), hi: Math.max(a, b) });

/**
 * Calendar-style picking: with nothing picked, a pick is that option alone; with one option picked, picking another
 * spans the range between them (either order) and picking it again clears; with a range picked, a pick starts over
 * with that option alone.
 */
export function pickIndex(current: IndexRange | null, i: number): IndexRange | null {
  if (!current || current.lo !== current.hi) return { lo: i, hi: i };
  return current.lo === i ? null : spanOf(current.lo, i);
}

/** The HR price filter fields; `hrMaxExclusive`: `hrMax` is `<` (a bucket's upper edge), not `<=` (typed). */
export interface HrRange {
  hrMin?: number;
  hrMax?: number;
  hrMaxExclusive?: boolean;
}

/** Part of a price bucket's width a range covers, as fractions `from..to` of [0, 1]. */
export interface BarLight {
  from: number;
  to: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * The part of a bucket an HR range covers, linear within `[from, to)`; null when the range misses it or is unset. The
 * open last bucket has no width to interpolate in: it is covered whole or not at all.
 */
export function bucketLight(b: PriceBucket, r: HrRange): BarLight | null {
  const { hrMin, hrMax } = r;
  if (hrMin === undefined && hrMax === undefined) return null;
  if (hrMin !== undefined && b.to !== null && hrMin >= b.to) return null;
  if (hrMax !== undefined && (r.hrMaxExclusive ? hrMax <= b.from : hrMax < b.from)) return null;
  if (b.to === null) return { from: 0, to: 1 };
  const at = (v: number) => clamp01((v - b.from) / (b.to! - b.from));
  return { from: hrMin === undefined ? 0 : at(hrMin), to: hrMax === undefined ? 1 : at(hrMax) };
}

/** Where typed bounds fall strictly inside a bucket, as fractions of its width (for a marker line). */
export function bucketMarkers(b: PriceBucket, r: HrRange): number[] {
  if (b.to === null) return [];
  return [r.hrMin, r.hrMax].flatMap((v) =>
    v !== undefined && v > b.from && v < b.to! ? [(v - b.from) / (b.to! - b.from)] : [],
  );
}

/** The buckets an HR range touches (first..last); null when it touches none or is unset. */
export function priceRange(buckets: PriceBucket[], r: HrRange): IndexRange | null {
  const lit = buckets.flatMap((b, i) => (bucketLight(b, r) ? [i] : []));
  return lit.length ? { lo: lit[0], hi: lit[lit.length - 1] } : null;
}

/**
 * A bucket range as the HR filter (every field set, so it replaces the old range): from the first bucket's lower edge
 * to the last one's upper edge, exclusive like the buckets (`[from, to)`); the open last bucket leaves no max.
 */
export function priceFilter(buckets: PriceBucket[], r: IndexRange | null): HrRange {
  if (!r) return { hrMin: undefined, hrMax: undefined, hrMaxExclusive: undefined };
  const to = buckets[r.hi].to;
  return { hrMin: buckets[r.lo].from, hrMax: to ?? undefined, hrMaxExclusive: to === null ? undefined : true };
}
