import { describe, expect, it } from 'vitest';
import { cubeCorruptions } from '@/assets/cube-corruptions';
import { corruptionNamesForRoll, repairMergedDamageReduction, sameCorruptionNames } from './corruptions';
import type { Item, Stat } from './interfaces';

describe('corruptionNamesForRoll', () => {
  // expected values are corruptionKey arrays returned by pd2trader's corruption prices
  it.each([
    [51, ['all_resist', 'coldresist', 'fireresist', 'lightresist', 'poisonresist', 'transform_dye']],
    [53, ['fireresist', 'maxfireresist']],
    [72, ['maxcoldresist', 'maxfireresist', 'maxlightresist', 'maxpoisonresist']],
    [3, ['tohit']],
    [26, ['dmg%', 'maxdamage_percent', 'tohit']],
    [61, ['maxhp']],
    [52, ['damageresist']],
    [40, ['manarecoverybonus']],
    [65, ['dexterity', 'energy', 'strength', 'vitality']],
    [32, ['item_numsockets']],
  ])('roll %i → %j', (roll, names) => {
    expect(corruptionNamesForRoll(roll)).toEqual(names);
  });

  it('collapses a name rolled twice', () => {
    expect(corruptionNamesForRoll(73)).toEqual(['item_fasterblockrate', 'toblock']);
  });

  it('names every item corruption roll', () => {
    const itemRolls = cubeCorruptions.filter((c) => !c.stats.some(({ stat }) => stat.startsWith('map-')));
    expect(itemRolls.filter((c) => corruptionNamesForRoll(c.key) === null).map((c) => c.key)).toEqual([]);
  });

  it('returns null for an unknown roll', () => {
    expect(corruptionNamesForRoll(-1)).toBeNull();
  });
});

describe('sameCorruptionNames', () => {
  it('ignores order but not membership', () => {
    expect(sameCorruptionNames(['fireresist', 'maxfireresist'], ['maxfireresist', 'fireresist'])).toBe(true);
    expect(sameCorruptionNames(['fireresist'], ['fireresist', 'maxfireresist'])).toBe(false);
    expect(sameCorruptionNames(['fireresist'], ['coldresist'])).toBe(false);
  });
});

describe('repairMergedDamageReduction', () => {
  const PDR = 'Physical Damage Taken Reduced by';
  const armor = (stats: Stat[]): Item =>
    ({ name: 'Pain Mantle', type: 'Dusk Shroud', quality: 'Rare', iLevel: 85, stats }) as Item;
  const ids = (item: Item) => item.stats.filter((s) => s.name === PDR).map((s) => [s.stat_id, s.value]);

  it('gives a corrupted flat entry under a % damage reduction corruption its % id back', () => {
    // BH export of 4 flat DR + an 8% PDR corruption (roll 52): one stat 34 entry with the corruption's value
    const item = armor([
      { stat_id: 34, name: PDR, value: 8, corrupted: true },
      { stat_id: 360, name: 'Corrupted', value: 52 },
    ]);
    expect(ids(repairMergedDamageReduction(item))).toEqual([[36, 8]]);
  });

  it('keeps flat DR that the corruption did not set', () => {
    // flat ≥ %: the entry kept the flat roll and its own (uncorrupted) flag
    const pdrRoll = armor([
      { stat_id: 34, name: PDR, value: 11 },
      { stat_id: 360, name: 'Corrupted', value: 52 },
    ]);
    expect(ids(repairMergedDamageReduction(pdrRoll))).toEqual([[34, 11]]);
    // a flat DR corruption (roll 46) is flat
    const flatRoll = armor([
      { stat_id: 34, name: PDR, value: 8, corrupted: true },
      { stat_id: 360, name: 'Corrupted', value: 46 },
    ]);
    expect(ids(repairMergedDamageReduction(flatRoll))).toEqual([[34, 8]]);
  });

  it('leaves an export that already splits the two stats alone', () => {
    const item = armor([
      { stat_id: 34, name: PDR, value: 4 },
      { stat_id: 36, name: PDR, value: 8, corrupted: true },
      { stat_id: 360, name: 'Corrupted', value: 52 },
    ]);
    expect(ids(repairMergedDamageReduction(item))).toEqual([
      [34, 4],
      [36, 8],
    ]);
  });
});
