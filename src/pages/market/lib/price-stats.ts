/**
 * Price statistics of a market search (`priceStats` of `POST /api/market/search` with `priceStats: true`; server
 * src/market-listings/filters/price-stats.ts): the HR price spread of every listing the search matches, all pages,
 * over the listings with an HR price.
 */

/** Listings with an HR price in `[from, to)` (`to` null: open-ended). */
export interface PriceStatsBucket {
  from: number;
  to: number | null;
  count: number;
}

export interface MarketPriceStats {
  /** Matches with an HR price: the sample of every other figure. */
  count: number;
  avg: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  /** The non-empty buckets of a fine log-spaced histogram, in price order. */
  histogram: PriceStatsBucket[];
}

/** Fewest priced matches a median is shown for: below it, one or two asks say little about a price. */
export const MIN_MEDIAN_SAMPLE = 3;

const isPrice = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const priceOrNull = (v: unknown): number | null => (isPrice(v) ? v : null);

/** The `priceStats` of a search reply, keeping only well-formed buckets; undefined when the reply has none. */
export function parsePriceStats(raw: unknown): MarketPriceStats | undefined {
  if (!raw || typeof raw !== 'object' || !('count' in raw) || !isPrice(raw.count)) return undefined;
  const r = raw as Record<string, unknown>;
  const histogram = Array.isArray(r.histogram)
    ? r.histogram.flatMap((b: unknown) =>
        b && typeof b === 'object' && 'from' in b && 'count' in b && isPrice(b.from) && isPrice(b.count)
          ? [{ from: b.from, to: 'to' in b && isPrice(b.to) ? b.to : null, count: b.count }]
          : [],
      )
    : [];
  return {
    count: r.count as number,
    avg: priceOrNull(r.avg),
    p25: priceOrNull(r.p25),
    median: priceOrNull(r.median),
    p75: priceOrNull(r.p75),
    histogram,
  };
}

/** One row of the price ladder: a histogram bucket's listings. */
export interface LadderRow extends PriceStatsBucket {
  /** The median price falls in this bucket. */
  median: boolean;
  /** The bucket overlaps the middle half (25th to 75th percentile). */
  middleHalf: boolean;
}

export interface PriceLadder {
  /** The cheapest non-empty buckets, cheapest first (at most LADDER_ROWS). */
  rows: LadderRow[];
  /** The most listings in one shown row: a full-width bar. */
  peak: number;
  /** The buckets past the shown rows: their listings, and the price the cheapest of them starts at. */
  more: { count: number; from: number } | null;
}

/** Most rows the ladder shows; pricier buckets are summed into `more`. */
export const LADDER_ROWS = 8;

/**
 * The stats' histogram as an ask ladder: one row per non-empty bucket, cheapest first, marking the median's bucket
 * and the ones overlapping the middle half. Null without buckets.
 */
export function priceLadder(stats: MarketPriceStats): PriceLadder | null {
  const buckets = stats.histogram.filter((bucket) => bucket.count > 0);
  if (buckets.length === 0) return null;
  const { p25, median, p75 } = stats;
  const rows = buckets.slice(0, LADDER_ROWS).map((bucket) => ({
    ...bucket,
    median: median !== null && median >= bucket.from && (bucket.to === null || median < bucket.to),
    middleHalf: p25 !== null && p75 !== null && bucket.from <= p75 && (bucket.to === null || bucket.to > p25),
  }));
  const rest = buckets.slice(LADDER_ROWS);
  return {
    rows,
    peak: Math.max(...rows.map((row) => row.count)),
    more: rest.length ? { count: rest.reduce((n, bucket) => n + bucket.count, 0), from: rest[0].from } : null,
  };
}
