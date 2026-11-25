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

/** An HR price as the app shows it: 2 decimals below 10 HR, 1 from 10 up (0.13, 2.5, 12.5). */
export const roundHr = (hr: number): number => (hr >= 10 ? Math.round(hr * 10) / 10 : Math.round(hr * 100) / 100);

/** One row of the price ladder: the listings of the buckets whose start rounds to `price`. */
export interface LadderRow extends PriceStatsBucket {
  /** The row's price level: its first bucket's start, rounded as HR prices are shown. */
  price: number;
  /** The median price falls in this row. */
  median: boolean;
}

export interface PriceLadder {
  /** The cheapest price levels with listings, cheapest first (at most LADDER_ROWS). */
  rows: LadderRow[];
  /** The most listings in one shown row: a full-width bar. */
  peak: number;
  /** The levels past the shown rows: their listings, and the price the cheapest of them starts at. */
  more: { count: number; price: number } | null;
}

/** Most rows the ladder shows; pricier levels are summed into `more`. */
export const LADDER_ROWS = 8;

/**
 * The stats' histogram as an ask ladder: one row per price level with listings, cheapest first. A level is a bucket's
 * start rounded as HR prices are shown, so neighbouring buckets that round alike (0.01 and 0.0125) share a row. Marks
 * the median's row. Null without buckets.
 */
export function priceLadder(stats: MarketPriceStats): PriceLadder | null {
  const levels: { price: number; from: number; to: number | null; count: number }[] = [];
  for (const bucket of stats.histogram) {
    if (bucket.count <= 0) continue;
    const price = roundHr(bucket.from);
    const last = levels.at(-1);
    if (last?.price === price) {
      last.to = bucket.to;
      last.count += bucket.count;
    } else {
      levels.push({ price, from: bucket.from, to: bucket.to, count: bucket.count });
    }
  }
  if (levels.length === 0) return null;
  const { median } = stats;
  const rows = levels.slice(0, LADDER_ROWS).map((level) => ({
    ...level,
    median: median !== null && median >= level.from && (level.to === null || median < level.to),
  }));
  const rest = levels.slice(LADDER_ROWS);
  return {
    rows,
    peak: Math.max(...rows.map((row) => row.count)),
    more: rest.length ? { count: rest.reduce((n, level) => n + level.count, 0), price: rest[0].price } : null,
  };
}
