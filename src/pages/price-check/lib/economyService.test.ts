import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMultipleItemPrices } from '@/pages/currency/lib/price-api';
import type { AveragePriceResponse } from '@/pages/currency/lib/price-api';
import { calculateRuneValues, fetchEconomyData, getRuneBreakdown, sortItemsByPrice } from './economyService';
import type { ItemData, ItemValue } from './types';

vi.mock('@/pages/currency/lib/price-api', () => ({ fetchMultipleItemPrices: vi.fn() }));

const price = (over: Partial<AveragePriceResponse>): AveragePriceResponse =>
  ({
    baseCode: 'r30',
    itemName: 'Ber Rune',
    medianPrice: 2,
    movingAverage7Days: 3,
    sampleCount: 42,
    timeRange: { start: '2026-10-01', end: '2026-10-08' },
    ...over,
  }) as AveragePriceResponse;

const runeData = (name: string, p: number, numListings: number): ItemData => ({
  itemName: name,
  proper: name,
  dataByIngestionDate: [{ date: 'd', trueDate: 'd', numListings, price: p }],
});

afterEach(() => {
  vi.mocked(fetchMultipleItemPrices).mockReset();
});

describe('fetchEconomyData', () => {
  it('requests every rune with ladder/softcore defaults over a 7-day window', async () => {
    vi.mocked(fetchMultipleItemPrices).mockResolvedValue(new Map());
    await fetchEconomyData();
    const [items, config] = vi.mocked(fetchMultipleItemPrices).mock.calls[0];
    expect(items).toHaveLength(33);
    expect(items).toContainEqual({ baseCode: 'r30' });
    expect(config).toEqual({ isLadder: true, isHardcore: false, hours: 168 });
  });

  it('forwards explicit realm and date range', async () => {
    vi.mocked(fetchMultipleItemPrices).mockResolvedValue(new Map());
    await fetchEconomyData({ isLadder: false, isHardcore: true, startDate: 's', endDate: 'e', hours: 1 });
    expect(vi.mocked(fetchMultipleItemPrices).mock.calls[0][1]).toEqual({
      isLadder: false,
      isHardcore: true,
      hours: 168,
      startDate: 's',
      endDate: 'e',
    });
  });

  it('maps prices by rune name, preferring the 7-day moving average over the median', async () => {
    vi.mocked(fetchMultipleItemPrices).mockResolvedValue(
      new Map([
        ['r30', price({})],
        ['r31', price({ baseCode: 'r31', itemName: 'Jah Rune', movingAverage7Days: undefined, medianPrice: 1.8 })],
        ['r99', price({ itemName: '' })],
      ]),
    );
    const data = await fetchEconomyData();
    expect(Object.keys(data.Runes).sort()).toEqual(['Ber Rune', 'Jah Rune']);
    expect(data.Runes['Ber Rune'].dataByIngestionDate[0]).toEqual({
      date: '2026-10-08',
      trueDate: '2026-10-08',
      numListings: 42,
      price: 3,
    });
    expect(data.Runes['Jah Rune'].dataByIngestionDate[0].price).toBe(1.8);
  });

  it('returns empty runes when the batch request fails', async () => {
    vi.mocked(fetchMultipleItemPrices).mockResolvedValue(null);
    expect(await fetchEconomyData()).toEqual({ Runes: {} });
  });

  it('returns empty runes when the price API throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetchMultipleItemPrices).mockRejectedValue(new Error('down'));
    expect(await fetchEconomyData()).toEqual({ Runes: {} });
  });
});

describe('sortItemsByPrice', () => {
  it('returns every rune in hierarchy order (Zod first, El last) with API data attached', () => {
    const ber = runeData('Ber Rune', 3, 20);
    const sorted = sortItemsByPrice({ 'Ber Rune': ber });
    expect(sorted).toHaveLength(33);
    expect(sorted[0].name).toBe('Zod Rune');
    expect(sorted[32].name).toBe('El Rune');
    expect(sorted.find((r) => r.name === 'Ber Rune')?.data).toBe(ber);
    expect(sorted.find((r) => r.name === 'Jah Rune')?.data).toBeNull();
  });
});

describe('calculateRuneValues', () => {
  const valueOf = (values: ItemValue[], name: string) => values.find((v) => v.name === name);

  it('uses the API price for high runes with at least 10 listings', () => {
    const values = calculateRuneValues([{ name: 'Ber Rune', data: runeData('Ber Rune', 3.4, 10) }]);
    expect(valueOf(values, 'Ber Rune')).toEqual({
      name: 'Ber Rune',
      price: 3.4,
      numListings: 10,
      isCalculated: false,
      isFixed: false,
    });
  });

  it('falls back to the fixed HR value when listings are thin, keeping the listing count', () => {
    const values = calculateRuneValues([{ name: 'Ber Rune', data: runeData('Ber Rune', 9, 9) }]);
    expect(valueOf(values, 'Ber Rune')).toMatchObject({ price: 3, numListings: 9, isFixed: true });
  });

  it('falls back to the fixed HR value when there is no or zero-price data', () => {
    const values = calculateRuneValues([
      { name: 'Jah Rune', data: null },
      { name: 'Zod Rune', data: runeData('Zod Rune', 0, 50) },
    ]);
    expect(valueOf(values, 'Jah Rune')).toMatchObject({ price: 2, numListings: -1, isFixed: true });
    expect(valueOf(values, 'Zod Rune')).toMatchObject({ price: 4.5, numListings: -1, isFixed: true });
  });

  it('always prices low runes at the fixed table, ignoring API price', () => {
    const values = calculateRuneValues([{ name: 'Vex Rune', data: runeData('Vex Rune', 0.9, 500) }]);
    expect(valueOf(values, 'Vex Rune')).toMatchObject({ price: 0.5, numListings: 500, isFixed: true });
  });

  it('prefers FIXED_RUNE_PRICES over HR values when both exist', () => {
    // Lem: fixed 0.01, HR table 0.02
    expect(valueOf(calculateRuneValues([]), 'Lem Rune')?.price).toBe(0.01);
  });

  it('skips low runes without any price and fills all priced runes once, sorted by price desc', () => {
    const values = calculateRuneValues(sortItemsByPrice({}));
    expect(valueOf(values, 'El Rune')).toBeUndefined();
    const names = values.map((v) => v.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(17);
    expect(names[0]).toBe('Zod Rune');
    for (let i = 1; i < values.length; i++) expect(values[i - 1].price).toBeGreaterThanOrEqual(values[i].price);
  });
});

describe('getRuneBreakdown', () => {
  const v = (name: string, p: number): ItemValue => ({ name, price: p, numListings: -1, isCalculated: false });

  it('returns nothing for unknown runes and for Lem', () => {
    const values = [v('Lem Rune', 0.01), v('Pul Rune', 0.03)];
    expect(getRuneBreakdown('Zod Rune', values)).toEqual([]);
    expect(getRuneBreakdown('Lem Rune', values)).toEqual([]);
  });

  it('finds combinations of cheaper runes summing to the target within 5%, best first, max 5', () => {
    const values = [v('Ber Rune', 3), v('Jah Rune', 2), v('Lo Rune', 1), v('Sur Rune', 1.5)];
    const combos = getRuneBreakdown('Ber Rune', values);
    expect(combos.length).toBeGreaterThan(0);
    expect(combos.length).toBeLessThanOrEqual(5);
    expect(combos[0].difference).toBe(0);
    for (const c of combos) {
      expect(c.runes.some((r) => r.name === 'Ber Rune')).toBe(false);
      expect(c.totalValue).toBeCloseTo(c.runes.reduce((s, r) => s + r.price * r.count, 0));
      expect(c.difference).toBeLessThanOrEqual(3 * 0.05 + 1e-9);
    }
    for (let i = 1; i < combos.length; i++) expect(combos[i - 1].difference).toBeLessThanOrEqual(combos[i].difference);
    const asText = combos.map((c) => c.runes.map((r) => `${r.count}x${r.name}`).join('+'));
    expect(asText).toContain('1xJah Rune+1xLo Rune');
    expect(asText).toContain('2xSur Rune');
  });

  it('stays fast for an expensive rune over the full rune ladder, using at most 3 different runes', () => {
    // Today's market shape: Zod 6.8 HR over ~17 cheaper runes took ~3 s with the exhaustive search
    const prices = [6.79, 2.99, 2.96, 1.9, 1.27, 0.94, 0.85, 0.5, 0.25, 0.15, 0.1, 0.05, 0.03, 0.01, 0.01, 0.01, 0.005];
    const values = prices.map((p, i) => v(i === 0 ? 'Zod Rune' : `R${i}`, p));
    const started = performance.now();
    const combos = getRuneBreakdown('Zod Rune', values);
    expect(performance.now() - started).toBeLessThan(200);
    expect(combos).toHaveLength(5);
    for (const c of combos) expect(c.runes.length).toBeLessThanOrEqual(3);
  });

  it('caps repeats of the same rune at 3 for targets >= 0.1', () => {
    const combos = getRuneBreakdown('Lo Rune', [v('Lo Rune', 1), v('Mal Rune', 0.1)]);
    expect(combos).toEqual([]);
  });
});
