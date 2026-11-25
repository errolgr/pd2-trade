import { describe, expect, it } from 'vitest';
import { searchModeWeaponGroup, searchScopes } from './search-modes';
import { findItemType } from './utils';

/** The item's entry in the site's Type list, found by its base name as the price check finds it. */
const matched = (base: string) => findItemType(base)?.type ?? null;
const modes = (base: string, type = matched(base)) => searchScopes(base, type).map((s) => s.mode);
const groups = (base: string) =>
  modes(base).map((mode) => searchModeWeaponGroup(mode, base, matched(base))?.id ?? mode);

describe('searchScopes', () => {
  it('widens a weapon from its base through its type, type group, hand and class groups to Weapons', () => {
    expect(modes('Colossus Blade')).toEqual([0, 1, 3, 4, 5]);
    expect(groups('Colossus Blade')).toEqual([0, 1, '2h-melee', 'melee', 'weapons']);
    expect(groups('Ceremonial Bow')).toEqual([0, 1, 2, '2h-ranged', 'ranged', 'weapons']);
    expect(groups('Hydra Bow')).toEqual([0, 1, 2, '2h-ranged', 'ranged', 'weapons']);
    expect(groups('Demon Crossbow')).toEqual([0, 1, '2h-ranged', 'ranged', 'weapons']);
    expect(groups('Crystal Sword')).toEqual([0, 1, '1h', 'melee', 'weapons']);
    expect(groups('Matriarchal Javelin')).toEqual([0, 1, 2, '1h-ranged', 'ranged', 'weapons']);
    expect(groups('Thunder Maul')).toEqual([0, 1, '2h-melee', 'melee', 'weapons']);
    expect(groups('Feral Claws')).toEqual([0, 1, '1h', 'melee', 'weapons']);
  });

  it('a Phase Blade is a one-handed Sword, like the other Crystal Swords', () => {
    expect(matched('Phase Blade')?.typeLabel).toBe('Sword');
    expect(groups('Phase Blade')).toEqual([0, 1, '1h', 'melee', 'weapons']);
    expect(groups('Dimensional Blade')).toEqual([0, 1, '1h', 'melee', 'weapons']);
  });

  it('skips a scope that searches the same bases as the one before it', () => {
    // The site's 2H Crystal Sword type has one base, a two-handed Phase Blade: its type adds nothing to its base
    const twoHandedPhaseBlade = { typeLabel: '2H Crystal Sword', typeValue: '2hcs', bases: [] };
    expect(modes('Phase Blade', twoHandedPhaseBlade)).toEqual([0, 3, 4, 5]);
    // 2H Ranged is exactly the bows and crossbows: for a crossbow, its own type then the two of them
    expect(modes('Demon Crossbow')).toEqual([0, 1, 3, 4, 5]);
  });

  it('keeps the base / type / type group scopes for anything but weapons', () => {
    expect(modes('Shako')).toEqual([0, 1, 2]);
    expect(modes('Monarch')).toEqual([0, 1, 2]);
    expect(modes('Amulet')).toEqual([0, 1]);
    expect(modes('Mystery Box', null)).toEqual([0]);
  });

  it('sizes each scope: this base, then bases of a type or hand group, types of a family or class', () => {
    const sizes = searchScopes('Colossus Blade', matched('Colossus Blade')).map((s) => s.size.unit);
    expect(sizes).toEqual(['base', 'bases', 'bases', 'types', 'types']);
    const [, type, family] = searchScopes('Ceremonial Bow', matched('Ceremonial Bow'));
    expect(type.size).toEqual({ unit: 'bases', count: expect.any(Number) });
    expect(family.size).toEqual({ unit: 'types', count: 2 });
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
