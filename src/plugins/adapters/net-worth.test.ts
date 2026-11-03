import { describe, expect, it } from 'vitest';
import type { Valuation, ValuationLine } from '@/lib/networth-api';
import { NET_WORTH_TOP_LINES, toNetWorthSummary } from './net-worth';

const line = (name: string, value: number): ValuationLine => ({
  key: name,
  name,
  category: 'runes',
  qty: 1,
  unitPrice: value,
  value,
  confidence: 'ok',
  sampleCount: 3,
  priceChange7dPercent: null,
  tab: null,
  iconPath: null,
});

const valuation = (lines: ValuationLine[]): Valuation => ({
  account: 'acc',
  isLadder: true,
  isHardcore: false,
  seasonId: 's14',
  takenAt: '2026-11-03T12:00:00.000Z',
  priceDay: '2026-11-03',
  priceSource: 'market',
  totalHr: 12.5,
  uncertainHr: 1,
  unpricedCount: 0,
  gold: 900000,
  byCategory: { runes: 12.5, currency: 0, ubers: 0, gems: 0, mats: 0, uniques: 0, sets: 0, other: 0 },
  byTab: { '1': 12.5 },
  lines,
});

describe('toNetWorthSummary', () => {
  it('is null before the first snapshot', () => {
    expect(toNetWorthSummary(null)).toBeNull();
    expect(toNetWorthSummary(undefined)).toBeNull();
  });

  it('maps the valuation and keeps the most valuable lines first', () => {
    const summary = toNetWorthSummary(valuation([line('Ist', 1), line('Ber', 9), line('Um', 0.5)]));
    expect(summary).toEqual({
      account: 'acc',
      ladder: true,
      hardcore: false,
      totalHr: 12.5,
      uncertainHr: 1,
      gold: 900000,
      takenAt: '2026-11-03T12:00:00.000Z',
      byCategory: { runes: 12.5, currency: 0, ubers: 0, gems: 0, mats: 0, uniques: 0, sets: 0, other: 0 },
      topLines: [
        { name: 'Ber', category: 'runes', qty: 1, valueHr: 9 },
        { name: 'Ist', category: 'runes', qty: 1, valueHr: 1 },
        { name: 'Um', category: 'runes', qty: 1, valueHr: 0.5 },
      ],
    });
  });

  it(`caps the lines at ${NET_WORTH_TOP_LINES}`, () => {
    const lines = Array.from({ length: 30 }, (_, i) => line(`L${i}`, i));
    expect(toNetWorthSummary(valuation(lines))?.topLines).toHaveLength(NET_WORTH_TOP_LINES);
  });
});
