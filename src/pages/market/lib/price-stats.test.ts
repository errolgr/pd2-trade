import { describe, expect, it } from 'vitest';
import { LADDER_ROWS, type MarketPriceStats, parsePriceStats, priceLadder } from './price-stats';

const stats = (
  histogram: MarketPriceStats['histogram'],
  overrides: Partial<MarketPriceStats> = {},
): MarketPriceStats => ({
  count: histogram.reduce((n, b) => n + b.count, 0),
  avg: 3,
  p25: 1.5,
  median: 2.5,
  p75: 4,
  histogram,
  ...overrides,
});

describe('parsePriceStats', () => {
  it('reads the figures and well-formed buckets', () => {
    expect(
      parsePriceStats({
        count: 23,
        avg: 3.1,
        p25: 1.5,
        median: 2.5,
        p75: 4,
        histogram: [{ from: 2, to: 2.5, count: 20 }, { from: 1000, to: null, count: 3 }, { from: 'x', count: 1 }, null],
      }),
    ).toEqual({
      count: 23,
      avg: 3.1,
      p25: 1.5,
      median: 2.5,
      p75: 4,
      histogram: [
        { from: 2, to: 2.5, count: 20 },
        { from: 1000, to: null, count: 3 },
      ],
    });
  });

  it('null figures stay null; no count is no stats', () => {
    expect(parsePriceStats({ count: 0, avg: null, p25: null, median: null, p75: null, histogram: [] })).toEqual({
      count: 0,
      avg: null,
      p25: null,
      median: null,
      p75: null,
      histogram: [],
    });
    expect(parsePriceStats({ median: 2 })).toBeUndefined();
    expect(parsePriceStats(null)).toBeUndefined();
  });
});

describe('priceLadder', () => {
  it('no buckets: no ladder', () => {
    expect(priceLadder(stats([]))).toBeNull();
    expect(priceLadder(stats([{ from: 1, to: 1.25, count: 0 }]))).toBeNull();
  });

  it('one row per non-empty bucket, cheapest first; the median bucket marked', () => {
    // p25 1.5, median 2.5, p75 4
    const ladder = priceLadder(
      stats([
        { from: 0.01, to: 0.0125, count: 1 },
        { from: 1.25, to: 1.6, count: 6 },
        { from: 2, to: 2.5, count: 0 },
        { from: 2.5, to: 3.15, count: 12 },
        { from: 4, to: 5, count: 5 },
        { from: 1000, to: null, count: 1 },
      ]),
    )!;
    expect(ladder.rows.map((r) => [r.from, r.count, r.median])).toEqual([
      [0.01, 1, false],
      [1.25, 6, false],
      [2.5, 12, true],
      [4, 5, false],
      [1000, 1, false],
    ]);
    expect(ladder.peak).toBe(12);
    expect(ladder.more).toBeNull();
  });

  it('the open-ended row holds a median above the last bounded bucket', () => {
    const ladder = priceLadder(
      stats(
        [
          { from: 1.25, to: 1.6, count: 2 },
          { from: 1.6, to: 2, count: 2 },
          { from: 1000, to: null, count: 3 },
        ],
        { median: 1200 },
      ),
    )!;
    expect(ladder.rows.map((r) => [r.from, r.median])).toEqual([
      [1.25, false],
      [1.6, false],
      [1000, true],
    ]);
  });

  it(`shows the cheapest ${LADDER_ROWS} rows and sums the pricier ones into "more"`, () => {
    const buckets = Array.from({ length: LADDER_ROWS + 3 }, (_, i) => ({ from: i + 1, to: i + 2, count: i + 1 }));
    const ladder = priceLadder(stats(buckets))!;
    expect(ladder.rows.map((r) => r.from)).toEqual(buckets.slice(0, LADDER_ROWS).map((b) => b.from));
    expect(ladder.peak).toBe(LADDER_ROWS);
    // From the cheapest hidden level
    expect(ladder.more).toEqual({
      count: LADDER_ROWS + 1 + (LADDER_ROWS + 2) + (LADDER_ROWS + 3),
      price: LADDER_ROWS + 1,
    });
  });

  it('levels are bucket starts rounded as HR prices are shown; buckets rounding alike share a row', () => {
    const ladder = priceLadder(
      stats(
        [
          { from: 0.01, to: 0.0125, count: 1 },
          { from: 0.0125, to: 0.016, count: 2 },
          { from: 0.016, to: 0.02, count: 1 },
          { from: 0.02, to: 0.025, count: 3 },
          { from: 0.125, to: 0.16, count: 4 },
          { from: 12.5, to: 16, count: 1 },
        ],
        { p25: 0.0125, median: 0.02, p75: 0.13 },
      ),
    )!;
    expect(ladder.rows.map((r) => [r.price, r.from, r.to, r.count, r.median])).toEqual([
      [0.01, 0.01, 0.016, 3, false],
      [0.02, 0.016, 0.025, 4, true],
      [0.13, 0.125, 0.16, 4, false],
      [12.5, 12.5, 16, 1, false],
    ]);
    expect(ladder.peak).toBe(4);
  });
});
