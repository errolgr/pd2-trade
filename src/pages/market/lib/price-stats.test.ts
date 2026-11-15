import { describe, expect, it } from 'vitest';
import { type MarketPriceStats, parsePriceStats, spreadChart } from './price-stats';

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

describe('spreadChart', () => {
  it('no buckets: no chart', () => {
    expect(spreadChart(stats([]))).toBeNull();
  });

  it('every listing counted once, in price order; at least 6 bars around a narrow spread', () => {
    const chart = spreadChart(
      stats([
        { from: 2, to: 2.5, count: 7 },
        { from: 2.5, to: 3.15, count: 3 },
      ]),
    )!;
    expect(chart.bars.length).toBe(6);
    expect(chart.bars.reduce((n, b) => n + b.count, 0)).toBe(10);
    expect(chart.min).toBeLessThan(2);
    expect(chart.max).toBeGreaterThan(3.15);
    for (let i = 1; i < chart.bars.length; i++) expect(chart.bars[i].from).toBeCloseTo(chart.bars[i - 1].to);
    // 2–2.5 lands left of 2.5–3.15
    const at = (price: number) => chart.bars.findIndex((b) => b.from <= price && price < b.to);
    expect(chart.bars[at(2.2)].count).toBe(7);
    expect(chart.bars[at(2.8)].count).toBe(3);
  });

  it('a far outlier is folded into the end bar instead of stretching the axis', () => {
    const chart = spreadChart(
      stats([
        { from: 1, to: 1.25, count: 30 },
        { from: 1.25, to: 1.6, count: 40 },
        { from: 1.6, to: 2, count: 29 },
        { from: 1000, to: null, count: 1 },
      ]),
    )!;
    expect(chart.max).toBeLessThan(10);
    expect(chart.bars.reduce((n, b) => n + b.count, 0)).toBe(100);
    expect(chart.bars[chart.bars.length - 1].count).toBeGreaterThanOrEqual(1);
  });

  it('a wide spread is at most 16 bars; positions run 0..1 on a log axis, clamped', () => {
    const chart = spreadChart(
      stats([
        { from: 0.01, to: 0.0125, count: 10 },
        { from: 1, to: 1.25, count: 10 },
        { from: 400, to: 500, count: 10 },
      ]),
    )!;
    expect(chart.bars.length).toBe(16);
    expect(chart.at(chart.min)).toBeCloseTo(0);
    expect(chart.at(chart.max)).toBeCloseTo(1);
    expect(chart.at(Math.sqrt(chart.min * chart.max))).toBeCloseTo(0.5);
    expect(chart.at(0)).toBe(0);
    expect(chart.at(1e9)).toBe(1);
  });
});
