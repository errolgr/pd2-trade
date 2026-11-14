import { describe, expect, it } from 'vitest';
import { cubeCorruptions } from '@/assets/cube-corruptions';
import { corruptionNamesForLines, corruptionNamesForRoll, sameCorruptionNames } from './corruptions';

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

describe('corruptionNamesForLines', () => {
  // Lines are `corruptedMods` of live builds (the lines PD2 flags as changed by the corruption)
  it.each([
    [['+1 to All Skills'], ['item_allskills']],
    [['30% Faster Cast Rate'], ['item_fastercastrate']],
    [['Fire Resist 60%'], ['fireresist']],
    [
      ['5% to Maximum Lightning Resist', 'Lightning Resist 15%'],
      ['lightresist', 'maxlightresist'],
    ],
    [['Socketed (3)'], ['item_numsockets']],
    [['236% Enhanced Defense'], ['item_armor_percent']],
    [['Regenerate Mana 27%'], ['manarecoverybonus']],
    [['Cannot Be Frozen'], ['item_cannotbefrozen']],
    [['-22% Target Defense'], ['item_fractionaltargetac']],
    [['+36 to Life'], ['maxhp']],
    [
      ['+40% Enhanced Damage', '+100 to Attack Rating'],
      ['dmg%', 'maxdamage_percent', 'tohit'],
    ],
  ])('%j → %j', (lines, names) => {
    expect(corruptionNamesForLines(lines)).toEqual(names);
  });

  it('tells percent and flat damage reduction apart', () => {
    expect(corruptionNamesForLines(['Physical Damage Taken Reduced by 5%'])).toEqual(['damageresist']);
    expect(corruptionNamesForLines(['Physical Damage Taken Reduced by 5'])).toEqual(['normal_damage_reduction']);
  });

  it('reads all resistances from the grouped line or the four resist lines', () => {
    const allRes = corruptionNamesForRoll(51);
    expect(corruptionNamesForLines(['All Resistances +10'])).toEqual(allRes);
    expect(
      corruptionNamesForLines(['Cold Resist 10%', 'Fire Resist 40%', 'Lightning Resist 10%', 'Poison Resist 10%']),
    ).toEqual(allRes);
  });

  it('reads all attributes from the grouped line', () => {
    expect(corruptionNamesForLines(['+5 to all Attributes'])).toEqual(['dexterity', 'energy', 'strength', 'vitality']);
  });

  it('needs every line of a multi-line outcome before picking it', () => {
    // Max resist alone isn't an outcome: it always comes with its resist
    expect(corruptionNamesForLines(['5% to Maximum Lightning Resist'])).toBeNull();
  });

  it('returns null without lines or for a line no corruption shows', () => {
    expect(corruptionNamesForLines([])).toBeNull();
    expect(corruptionNamesForLines(['Level 7 Grim Ward (30/30 Charges)'])).toBeNull();
    expect(corruptionNamesForLines(['+1 to All Skills', 'Nonsense'])).toBeNull();
  });
});
