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

/** One bar of a spread chart: listings priced in `[from, to)` (outliers folded into the end bars). */
export interface SpreadBar {
  from: number;
  to: number;
  count: number;
}

export interface SpreadChart {
  bars: SpreadBar[];
  /** The axis ends (log scale): the first bar's `from`, the last bar's `to`. */
  min: number;
  max: number;
  /** Where a price sits on the axis, 0..1 (clamped). */
  at: (price: number) => number;
}

/** Ratio of a server histogram step (R10: ×10^0.1). */
const STEP = 10 ** 0.1;
const MIN_BARS = 6;
const MAX_BARS = 16;
/** Share of listings cut off each end of the axis (folded into its end bars): one far outlier never squashes it. */
const TAIL = 0.05;

/**
 * The stats' histogram as at most MAX_BARS equal bars on a log price axis spanning its 5th to 95th percentile
 * buckets (at least MIN_BARS steps wide, around the middle); listings outside it count in the end bars. Null without
 * buckets.
 */
export function spreadChart(stats: MarketPriceStats): SpreadChart | null {
  const buckets = stats.histogram.filter((b) => b.count > 0);
  const total = buckets.reduce((n, b) => n + b.count, 0);
  if (!total) return null;
  // A bucket's ends on the log axis: the open-ended last one is one step wide, the one from 0 one step below its top
  const top = (b: PriceStatsBucket) => b.to ?? b.from * STEP;
  const bottom = (b: PriceStatsBucket) => (b.from > 0 ? b.from : top(b) / STEP);
  let seen = 0;
  let lo = buckets[0];
  let hi = buckets[buckets.length - 1];
  let loFound = false;
  for (const b of buckets) {
    seen += b.count;
    if (!loFound && seen > total * TAIL) {
      lo = b;
      loFound = true;
    }
    if (seen >= total * (1 - TAIL)) {
      hi = b;
      break;
    }
  }
  let logMin = Math.log(bottom(lo));
  let logMax = Math.log(top(hi));
  const steps = Math.round((logMax - logMin) / Math.log(STEP));
  if (steps < MIN_BARS) {
    const widen = ((MIN_BARS - steps) * Math.log(STEP)) / 2;
    logMin -= widen;
    logMax += widen;
  }
  const n = Math.min(MAX_BARS, Math.max(MIN_BARS, steps));
  const width = (logMax - logMin) / n;
  const bars: SpreadBar[] = Array.from({ length: n }, (_, i) => ({
    from: Math.exp(logMin + i * width),
    to: Math.exp(logMin + (i + 1) * width),
    count: 0,
  }));
  for (const b of buckets) {
    // Each bucket counts in the bar holding its middle (log scale); buckets are never wider than a bar
    const mid = (Math.log(bottom(b)) + Math.log(top(b))) / 2;
    const i = Math.min(n - 1, Math.max(0, Math.floor((mid - logMin) / width)));
    bars[i].count += b.count;
  }
  return {
    bars,
    min: bars[0].from,
    max: bars[n - 1].to,
    at: (price) => (price > 0 ? Math.min(1, Math.max(0, (Math.log(price) - logMin) / (logMax - logMin))) : 0),
  };
}
