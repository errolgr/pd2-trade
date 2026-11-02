import { describe, expect, it } from 'vitest';
import { cubeCorruptions } from '@/assets/cube-corruptions';
import { corruptionNamesForRoll, sameCorruptionNames } from './corruptions';

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
