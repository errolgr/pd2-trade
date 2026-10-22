import { describe, expect, it } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { computePseudo } from './pseudo';
import { scoreListing } from './scoring';
import { readStatValue } from './stats';
import { listing, mod } from './test-utils';
import type { StatFilter } from './types';

const row = (key: string, weight: number | undefined, over: Partial<StatFilter> = {}): StatFilter => ({
  id: key,
  kind: key.startsWith('pseudo_') ? 'pseudo' : 'mod',
  key,
  weight,
  enabled: true,
  ...over,
});

const score = (l: MarketListingEntry, stats: StatFilter[]) => scoreListing(l, stats, computePseudo(l.item));

describe('scoreListing', () => {
  it('is Σ weight × value over weighted rows, missing stats counting 0', () => {
    const l = listing({ mods: [mod('item_fastercastrate', 20), mod('maxhp', 30)], hr: 4 });
    expect(score(l, [row('item_fastercastrate', 1), row('maxhp', 2), row('strength', 5)])).toEqual({
      score: 20 + 60,
      value: 80 / 4,
    });
  });

  it('reads pseudo rows from the pseudo values and param keys from their roll', () => {
    const l = listing({ mods: [mod('all_resist', 10), mod('item_addclassskills', 1, 2)], hr: 2 });
    expect(
      score(l, [row('pseudo_total_res', 0.5), row('item_addclassskills{1}', 10), row('item_addclassskills{3}', 10)])
        .score,
    ).toBe(20 + 20);
  });

  it('null score without weighted rows; null value without an HR price', () => {
    const l = listing({ mods: [mod('maxhp', 30)] });
    expect(score(l, [row('maxhp', undefined), row('maxhp', 0), row('maxhp', 3, { enabled: false })])).toEqual({
      score: null,
      value: null,
    });
    expect(score(l, [row('maxhp', 1)])).toEqual({ score: 30, value: null });
    expect(score(listing({ mods: [mod('maxhp', 30)], hr: 0 }), [row('maxhp', 1)]).value).toBeNull();
  });

  it('negative weights penalise', () => {
    const l = listing({ mods: [mod('item_req_percent', -20)] });
    expect(score(l, [row('item_req_percent', -1)]).score).toBe(20);
  });
});

describe('readStatValue', () => {
  it('matches alternatives and params, picks the largest roll, null when absent', () => {
    const mods = [
      mod('maxdamage', 12),
      mod('secondary_maxdamage', 20),
      mod('item_singleskill', 54, 3),
      mod('item_singleskill', 56, 1),
    ];
    expect(readStatValue(mods, 'max_damage|maxdamage|secondary_maxdamage')).toBe(20);
    expect(readStatValue(mods, 'item_singleskill{56}')).toBe(1);
    expect(readStatValue(mods, 'item_singleskill{99}')).toBeNull();
    expect(readStatValue([mod('item_elemskill_fire', 0, 2)], 'item_elemskill_fire')).toBe(2);
    expect(readStatValue(undefined, 'maxhp')).toBeNull();
  });
});
