import { describe, expect, it } from 'vitest';
import { SLOT_OUTPUT_SCHEMAS, type MarketRow, type NetWorthSummary } from '@pd2-trader/plugin-sdk';
import {
  berMetric,
  compareMessage,
  dealSort,
  dealsFilter,
  insightsTab,
  medianColumn,
  medianHr,
  runeTable,
} from './insights';

const row = (id: string, priceHr: number | null, online = true): MarketRow => ({
  id,
  name: 'Harlequin Crest',
  base: 'Shako',
  quality: 'unique',
  priceHr,
  priceText: priceHr === null ? 'offer' : `${priceHr} HR`,
  seller: 'Seller',
  online,
  listedAt: '2026-11-01T00:00:00.000Z',
  stats: [],
});

const rows = [row('a', 1), row('b', 0.7, false), row('c', 1.4), row('d', null), row('e', 0.7)];
const table = runeTable([
  { name: 'Ber Rune', priceHr: 2, listings: 40, fixed: false },
  { name: 'Jah Rune', priceHr: 1.5, listings: 30, fixed: false },
]);
const summary: NetWorthSummary = {
  account: 'acc',
  ladder: true,
  hardcore: false,
  totalHr: 40,
  uncertainHr: 12,
  gold: 0,
  takenAt: '2026-11-01T00:00:00.000Z',
  byCategory: { runes: 24, uniques: 16, gems: 0 },
  topLines: [
    { name: 'Ber Rune', category: 'Runes', qty: 6, valueHr: 12 },
    { name: 'Harlequin Crest', category: 'Uniques', qty: 1, valueHr: 1 },
  ],
};

describe('market slots', () => {
  it('compares priced rows to the median of the results', () => {
    expect(medianHr(rows)).toBe(0.85);
    expect(medianHr(rows.slice(0, 2))).toBeNull();
    const column = medianColumn(rows)!;
    expect(column.cells).toEqual({
      a: { text: '+18%', tone: 'warning' },
      b: { text: '-18%', tone: 'success' },
      c: { text: '+65%', tone: 'warning' },
      e: { text: '-18%', tone: 'success' },
    });
    expect(dealsFilter(rows)).toEqual({ label: 'Under median', keep: ['b', 'e'] });
    const { scores } = dealSort(rows)!;
    expect(Object.keys(scores).sort((x, y) => scores[y] - scores[x])).toEqual(['e', 'b', 'a', 'c']);
  });

  it('returns output the host accepts', () => {
    expect(SLOT_OUTPUT_SCHEMAS['market.column'].safeParse(medianColumn(rows)).success).toBe(true);
    expect(SLOT_OUTPUT_SCHEMAS['market.filter'].safeParse(dealsFilter(rows)).success).toBe(true);
    expect(SLOT_OUTPUT_SCHEMAS['market.sort'].safeParse(dealSort(rows)).success).toBe(true);
    expect(SLOT_OUTPUT_SCHEMAS['networth.tab'].safeParse(insightsTab(summary, table)).success).toBe(true);
    expect(SLOT_OUTPUT_SCHEMAS['networth.metric'].safeParse(berMetric(summary, table)).success).toBe(true);
  });

  it('words the row comparison', () => {
    expect(compareMessage(row('a', 1.2), 0.8)).toBe(
      'Harlequin Crest at 1.20 HR is +50% vs the market median of 0.80 HR.',
    );
    expect(compareMessage(row('a', 1.2), null)).toMatch(/no market median/);
    expect(compareMessage(row('d', null), 1)).toMatch(/no HR price/);
  });
});

describe('net worth slots', () => {
  it('breaks the total down and shows it in Ber', () => {
    expect(berMetric(summary, table)).toEqual({
      label: 'In Ber',
      value: { type: 'text', text: '≈ 20 Ber', tone: 'q-rune' },
    });
    expect(berMetric(summary, new Map())).toBeNull();
    const tab = insightsTab(summary, table)!;
    expect(tab.title).toBe('Insights');
    expect(JSON.stringify(tab.content)).toContain('"label":"Runes","value":"24 HR · 60%"');
    expect(JSON.stringify(tab.content)).not.toContain('"Gems"');
    expect(JSON.stringify(tab.content)).toContain('"label":"Uncertain value","value":"30%","tone":"warning"');
    expect(JSON.stringify(tab.content)).toContain('"label":"Ber Rune ×6","value":"≈ 6.0 Ber"');
    expect(insightsTab({ ...summary, totalHr: 0 }, table)).toBeNull();
  });
});
