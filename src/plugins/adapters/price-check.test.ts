import { describe, expect, it } from 'vitest';
import type { Item } from '@/pages/price-check/lib/interfaces';
import { StatId } from '@/pages/price-check/lib/stat-mappings';
import type { AveragePriceResponse } from '@/pages/currency/lib/price-api';
import { toCorePrice, toGameMode, toPluginItem } from './price-check';

const item = (over: Partial<Item>): Item => ({
  name: 'Harlequin Crest',
  quality: 'Unique',
  type: 'Shako',
  iLevel: 85,
  stats: [],
  ...over,
});

describe('toPluginItem', () => {
  it('maps the item with stat lines as the game shows them', () => {
    const out = toPluginItem(
      item({
        sockets: 1,
        stats: [
          { stat_id: 105, name: 'Faster Cast Rate', value: 20 },
          { stat_id: 39, name: 'Fire Resist', value: 30, corrupted: true },
        ],
      }),
    );
    expect(out).toEqual({
      name: 'Harlequin Crest',
      base: 'Shako',
      quality: 'unique',
      isRuneword: false,
      ethereal: false,
      corrupted: true,
      sockets: 1,
      itemLevel: 85,
      stats: [
        { id: 105, text: '+20% Faster Cast Rate', value: 20 },
        { id: 39, text: 'Fire Resist +30%', value: 30, corrupted: true },
      ],
    });
  });

  it('names runewords by runeword and other qualities by base', () => {
    expect(
      toPluginItem(item({ quality: 'Normal', isRuneword: true, runeword: 'Spirit', name: 'Monarch', type: 'Monarch' })),
    ).toMatchObject({ name: 'Spirit', isRuneword: true, quality: 'normal' });
    expect(toPluginItem(item({ quality: 'Rare', name: 'Grim Shell', type: 'Shako' }))).toMatchObject({
      name: 'Shako',
      base: 'Shako',
    });
  });

  it('treats the Corrupted stat as corrupted, but not the injected filter row', () => {
    expect(toPluginItem(item({ stats: [{ stat_id: StatId.Corrupted, name: 'Corrupted' }] })).corrupted).toBe(true);
    const injected = toPluginItem(item({ stats: [{ stat_id: StatId.Corrupted, name: 'Corrupted', _injected: true }] }));
    expect(injected.corrupted).toBe(false);
    expect(injected.stats).toEqual([]);
  });

  it('reads ethereal from the flag or the stat, and defaults sockets to 0', () => {
    expect(toPluginItem(item({ isEthereal: true }))).toMatchObject({ ethereal: true, sockets: 0 });
    expect(toPluginItem(item({ stats: [{ stat_id: StatId.Ethereal, name: 'Ethereal' }] })).ethereal).toBe(true);
  });

  it('falls back to "name: value" for stats without a tooltip line', () => {
    const out = toPluginItem(item({ stats: [{ stat_id: 99999, name: 'Mystery', value: 3 }] }));
    expect(out.stats[0].text).toMatch(/Mystery/);
  });
});

describe('toCorePrice', () => {
  it('maps the average price response', () => {
    const price = {
      medianPrice: 1.5,
      minPrice: 1,
      maxPrice: 2.25,
      sampleCount: 42,
      priceChange7Days: { change: 0.1, changePercent: 7.5, previousMedianPrice: 1.4 },
    } as AveragePriceResponse;
    expect(toCorePrice(price)).toEqual({
      medianHr: 1.5,
      lowHr: 1,
      highHr: 2.25,
      sampleCount: 42,
      change7dPercent: 7.5,
    });
  });

  it('is null without a price and has no change without history', () => {
    expect(toCorePrice(null)).toBeNull();
    const price = { medianPrice: 3, minPrice: 2, maxPrice: 4, sampleCount: 1 } as AveragePriceResponse;
    expect(toCorePrice(price)?.change7dPercent).toBeNull();
  });
});

describe('toGameMode', () => {
  it('maps ladder and hardcore settings', () => {
    expect(toGameMode({ ladder: 'ladder', mode: 'softcore' })).toEqual({ ladder: true, hardcore: false });
    expect(toGameMode({ ladder: 'non-ladder', mode: 'hardcore' })).toEqual({ ladder: false, hardcore: true });
  });
});
