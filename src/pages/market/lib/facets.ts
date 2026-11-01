import type { Rarity } from './types';

/**
 * Facet counts from the market service (`facets` of `POST /api/market/search`; server
 * src/market-listings/filters/facets.ts). A facet on a dimension the filters select on is counted without that
 * dimension's own filter, so it lists the alternatives; the others count within the results. Each value counts what
 * picking it would find: quality = that rarity alone, sockets n = min n / max n (0 = unsocketed), flags = yes / no.
 */

/** The facets the market browser asks for (first page only). */
export const BROWSER_FACETS = ['quality', 'typeCode', 'baseCode', 'sockets', 'ethereal', 'corrupted', 'price'] as const;
export type MarketFacetName = (typeof BROWSER_FACETS)[number];

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
  sockets?: FacetCount<number>[];
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
    sockets: counts(f.sockets, isNumber),
    ethereal: counts(f.ethereal, isBoolean),
    corrupted: counts(f.corrupted, isBoolean),
    price,
  };
}

/** value → count of one facet (missing facet: an empty map, so callers show no counts). */
export function countsByValue<T>(facet: FacetCount<T>[] | undefined): Map<T, number> {
  return new Map((facet ?? []).map((b) => [b.value, b.count]));
}
