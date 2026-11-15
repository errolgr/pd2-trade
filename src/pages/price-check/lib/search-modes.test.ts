import { describe, expect, it } from 'vitest';
import { itemTypes } from '@/common/item-types';
import { availableSearchModes, searchModeWeaponGroup } from './search-modes';

/** The item's entry in the site's Type list, found by its base name as the price check finds it. */
const matched = (base: string) =>
  itemTypes.find((type) => type.bases.some((b) => b.label.toLowerCase() === base.toLowerCase())) ?? null;
const groups = (base: string) =>
  availableSearchModes(base, matched(base)).map((mode) => searchModeWeaponGroup(mode, base, matched(base))?.id ?? mode);

describe('availableSearchModes', () => {
  it('cycles a weapon from its base through its type, type group, hand and class groups to Weapons', () => {
    expect(availableSearchModes('Colossus Blade', matched('Colossus Blade'))).toEqual([0, 1, 3, 4, 5]);
    expect(groups('Colossus Blade')).toEqual([0, 1, '2h-melee', 'melee', 'weapons']);
    expect(groups('Ceremonial Bow')).toEqual([0, 1, 2, '2h-ranged', 'ranged', 'weapons']);
    expect(groups('Hydra Bow')).toEqual([0, 1, 2, '2h-ranged', 'ranged', 'weapons']);
    expect(groups('Demon Crossbow')).toEqual([0, 1, '2h-ranged', 'ranged', 'weapons']);
    expect(groups('Crystal Sword')).toEqual([0, 1, '1h', 'melee', 'weapons']);
    expect(groups('Matriarchal Javelin')).toEqual([0, 1, 2, '1h-ranged', 'ranged', 'weapons']);
    expect(groups('Thunder Maul')).toEqual([0, 1, '2h-melee', 'melee', 'weapons']);
    expect(groups('Feral Claws')).toEqual([0, 1, '1h', 'melee', 'weapons']);
  });

  it('skips a scope that searches the same bases as the one before it', () => {
    // The site's 2H Crystal Sword type has one base, Phase Blade (two-handed): its type adds nothing to its base
    const twoHandedPhaseBlade = { typeLabel: '2H Crystal Sword', typeValue: '2hcs', bases: [] };
    expect(groups('Phase Blade')).toEqual([0, '2h-melee', 'melee', 'weapons']);
    expect(availableSearchModes('Phase Blade', twoHandedPhaseBlade)).toEqual([0, 3, 4, 5]);
    // 2H Ranged is exactly the bows and crossbows: for a crossbow, its own type then the two of them
    expect(availableSearchModes('Demon Crossbow', matched('Demon Crossbow'))).toEqual([0, 1, 3, 4, 5]);
  });

  it('keeps the base / type / type group cycle for anything but weapons', () => {
    expect(availableSearchModes('Shako', matched('Shako'))).toEqual([0, 1, 2]);
    expect(availableSearchModes('Monarch', matched('Monarch'))).toEqual([0, 1, 2]);
    expect(availableSearchModes('Amulet', matched('Amulet'))).toEqual([0, 1]);
    expect(availableSearchModes('Mystery Box', null)).toEqual([0]);
  });
});

describe('searchModeWeaponGroup', () => {
  it('is the weapon group of modes 3-5 only', () => {
    const blade = matched('Colossus Blade');
    expect(searchModeWeaponGroup(2, 'Colossus Blade', blade)).toBeUndefined();
    expect(searchModeWeaponGroup(3, 'Colossus Blade', blade)?.id).toBe('2h-melee');
    expect(searchModeWeaponGroup(4, 'Colossus Blade', blade)?.id).toBe('melee');
    expect(searchModeWeaponGroup(5, 'Colossus Blade', blade)?.id).toBe('weapons');
    expect(searchModeWeaponGroup(3, 'Shako', matched('Shako'))).toBeUndefined();
    expect(searchModeWeaponGroup(3, 'Colossus Blade', null)).toBeUndefined();
  });
});
