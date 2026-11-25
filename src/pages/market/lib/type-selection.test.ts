import { describe, expect, it } from 'vitest';
import { optionCodes } from './catalog';
import {
  basesForTypeValue,
  baseValueLabel,
  isTypeOptionSelected,
  pickedBases,
  toggleTypeOption,
  type TypeBaseValue,
  typeCodeForCodes,
  typeCodeForSelection,
  typeLabel,
  typeSelection,
  typeValueLabel,
} from './type-selection';
import { WEAPON_GROUPS, weaponGroupBases } from './weapon-groups';

const FIST = '{"$in": ["h2h", "h2h2"]}';
const JEWELRY = '{"$in": ["amul", "ring", "amus"]}';
/** The Type value of a toggle on a Type value alone. */
const toggleType = (typeCode: string | undefined, code: string) => toggleTypeOption({ typeCode }, code).typeCode;

describe('typeSelection', () => {
  it('reads nothing, one option, or the options covering a `$in` of type codes', () => {
    expect(typeSelection(undefined)).toEqual([]);
    expect(typeSelection('pole')).toEqual(['pole']);
    expect(typeSelection('group:bows')).toEqual(['group:bows']);
    expect(typeSelection(FIST)).toEqual([FIST]);
    // A group's members read back as the group; options in list order
    expect(typeSelection('{"$in": ["spea", "pole", "aspe"]}')).toEqual(['pole', 'group:spears']);
    expect(typeSelection('{"$in": ["knif", "h2h", "h2h2"]}')).toEqual(['knif', FIST]);
    expect(typeSelection('{"$in": ["bow", "pole"]}')).toEqual(['bow', 'pole']);
  });

  it('keeps a type code no option stands for', () => {
    expect(typeSelection('lcha')).toEqual(['lcha']);
    expect(typeSelection('{"$in": ["pole", "amul"]}')).toEqual(['pole', 'amul']);
  });
});

describe('typeCodeForSelection', () => {
  it('is undefined for none and the code itself for one', () => {
    expect(typeCodeForSelection([])).toBeUndefined();
    expect(typeCodeForSelection(['group:helms'])).toBe('group:helms');
    expect(typeCodeForSelection([JEWELRY])).toBe(JEWELRY);
  });

  it('sends several as the `$in` of every type code, groups expanded (the service only expands a lone group)', () => {
    expect(typeCodeForSelection(['pole', 'group:spears'])).toBe('{"$in": ["pole", "spea", "aspe"]}');
    expect(typeCodeForSelection([FIST, 'knif'])).toBe('{"$in": ["knif", "h2h", "h2h2"]}');
    expect(typeCodeForSelection([JEWELRY, 'jewl'])).toBe('{"$in": ["jewl", "amul", "ring", "amus"]}');
  });

  it('collapses to the option standing for exactly those codes', () => {
    expect(typeCodeForSelection(['bow', 'abow'])).toBe('group:bows');
    expect(typeCodeForSelection(['group:bows', 'bow'])).toBe('group:bows');
  });

  it('round-trips through typeSelection', () => {
    for (const selection of [
      ['pole', 'group:spears'],
      ['knif', FIST],
      ['bow', 'helm', 'pole'],
    ])
      expect(typeSelection(typeCodeForSelection(selection))).toEqual(selection);
  });
});

describe('typeCodeForCodes', () => {
  it("reads a PD2 query's `$in` as the option, the group or the options it stands for", () => {
    expect(typeCodeForCodes(['h2h', 'h2h2'])).toBe(FIST);
    expect(typeCodeForCodes(['abow', 'bow'])).toBe('group:bows');
    expect(typeCodeForCodes(['pole'])).toBe('pole');
    expect(typeCodeForCodes(['spea', 'aspe', 'pole'])).toBe('{"$in": ["pole", "spea", "aspe"]}');
  });
});

describe('toggleTypeOption', () => {
  it('adds an option to the selection and removes a picked one', () => {
    const two = toggleType('pole', 'group:spears');
    expect(typeSelection(two)).toEqual(['pole', 'group:spears']);
    expect(toggleType(two, 'pole')).toBe('group:spears');
    expect(toggleType('pole', 'pole')).toBeUndefined();
    expect(toggleType(undefined, 'knif')).toBe('knif');
  });

  it('removing a type under a picked group keeps its other types', () => {
    expect(toggleType('group:bows', 'abow')).toBe('bow');
    expect(typeSelection(toggleType('group:helms', 'circ'))).toEqual(['phlm', 'pelt', 'helm']);
    expect(typeSelection(toggleType('{"$in": ["pole", "spea", "aspe"]}', 'aspe'))).toEqual(['pole', 'spea']);
  });

  it('adding a group takes in its types picked one by one; picking every type of a group is the group', () => {
    expect(toggleType('{"$in": ["bow", "pole"]}', 'group:bows')).toBe('{"$in": ["bow", "abow", "pole"]}');
    expect(typeSelection(toggleType('{"$in": ["bow", "pole"]}', 'group:bows'))).toEqual(['group:bows', 'pole']);
    expect(toggleType('bow', 'abow')).toBe('group:bows');
  });

  it('keeps a picked base while a type still offers it', () => {
    expect(toggleTypeOption({ typeCode: 'swor', baseCode: '7gd' }, 'axe')).toEqual({
      typeCode: '{"$in": ["axe", "swor"]}',
      baseCode: '7gd',
    });
    expect(toggleTypeOption({ typeCode: 'swor', baseCode: '7gd' }, 'swor')).toEqual({
      typeCode: undefined,
      baseCode: undefined,
    });
  });

  it('picks a weapon class as the $in of its types, never as its code, and unpicks its types one by one', () => {
    const melee = toggleType(undefined, 'weapons:melee');
    expect(melee).not.toContain('weapons:');
    expect(optionCodes(melee!)).toHaveLength(21);
    expect(typeSelection(melee)).toEqual(['weapons:melee']);
    expect(typeLabel(melee)).toBe('Melee');
    // Unticking Sword keeps the rest of Melee
    const noSwords = toggleType(melee, 'swor');
    expect(optionCodes(noSwords!)).toHaveLength(20);
    expect(optionCodes(noSwords!)).not.toContain('swor');
    // ...and ticking it again is Melee again; unticking Melee clears it
    expect(toggleType(noSwords, 'swor')).toBe(melee);
    expect(toggleType(melee, 'weapons:melee')).toBeUndefined();
    // Weapons takes in Melee
    expect(typeSelection(toggleType(melee, 'weapons:weapons'))).toEqual(['weapons:weapons']);
    // Bows + Crossbow are 2H Ranged
    expect(typeSelection(toggleType('group:bows', 'xbow'))).toEqual(['weapons:2h-ranged']);
  });

  it('picks a hand group as its types plus the $in of its bases, and unpicks it', () => {
    const twoHanded = WEAPON_GROUPS.find((g) => g.id === '2h')!;
    const value = toggleTypeOption({}, 'weapons:2h');
    expect(new Set(optionCodes(value.typeCode!))).toEqual(new Set(twoHanded.types));
    expect(new Set(optionCodes(value.baseCode!))).toEqual(new Set(weaponGroupBases(twoHanded)));
    expect(pickedBases(value)?.size).toBe(136);
    expect(typeValueLabel(value)).toBe('2H');
    expect(baseValueLabel(value)).toBe('136 bases');
    expect(toggleTypeOption(value, 'weapons:2h')).toEqual({});
  });

  it('with picked bases, adds or removes an option by its bases', () => {
    const oneHanded = toggleTypeOption({}, 'weapons:1h');
    // Sword is only partly picked: ticking it takes in the two-handed swords, unticking it then drops every sword
    expect(isTypeOptionSelected(oneHanded, 'swor')).toBe(false);
    const allSwords = toggleTypeOption(oneHanded, 'swor');
    expect(isTypeOptionSelected(allSwords, 'swor')).toBe(true);
    expect(pickedBases(allSwords)?.size).toBe(157 + 18);
    const noSwords = toggleTypeOption(allSwords, 'swor');
    expect(optionCodes(noSwords.typeCode!)).not.toContain('swor');
    expect(pickedBases(noSwords)?.size).toBe(157 - 24);
    expect(typeValueLabel(noSwords)).toContain('Axe (15 bases)');
    // Unticking a type it holds whole (Dagger) drops just that type
    const noDaggers = toggleTypeOption(oneHanded, 'knif');
    expect(pickedBases(noDaggers)?.size).toBe(157 - 12);
    expect(isTypeOptionSelected(noDaggers, 'weapons:1h')).toBe(false);
    // Ticking Bows adds its bases to the pick
    const withBows = toggleTypeOption(oneHanded, 'group:bows');
    expect(pickedBases(withBows)?.size).toBe(157 + 30);
    expect(typeValueLabel(withBows)).toBe('1H, Bows');
    // 1H + 2H is every base of their types: no Base value
    expect(toggleTypeOption(oneHanded, 'weapons:2h')).toEqual({ typeCode: typeCodeForSelection(['weapons:weapons']) });
  });

  it('unticking a hand group under a weapon group keeps the rest of it', () => {
    const melee: TypeBaseValue = { typeCode: toggleType(undefined, 'weapons:melee') };
    expect(typeValueLabel(toggleTypeOption(melee, 'weapons:2h-melee'))).toBe('1H');
    const weapons: TypeBaseValue = { typeCode: toggleType(undefined, 'weapons:weapons') };
    const oneHanded = toggleTypeOption(weapons, 'weapons:2h');
    expect(typeValueLabel(oneHanded)).toBe('1H');
    expect(oneHanded).toEqual(toggleTypeOption({}, 'weapons:1h'));
    // 2H is not all Melee (bows): ticking it under Melee adds the bows and crossbows, which is every weapon
    expect(toggleTypeOption(melee, 'weapons:2h')).toEqual(weapons);
  });
});

describe('isTypeOptionSelected', () => {
  it('shows a picked option and the types of a picked group as picked', () => {
    const value = { typeCode: '{"$in": ["pole", "spea", "aspe"]}' };
    expect(isTypeOptionSelected(value, 'pole')).toBe(true);
    expect(isTypeOptionSelected(value, 'group:spears')).toBe(true);
    expect(isTypeOptionSelected(value, 'aspe')).toBe(true);
    expect(isTypeOptionSelected(value, 'knif')).toBe(false);
  });

  it('shows the types and groups of a picked weapon group as picked', () => {
    const ranged = { typeCode: toggleType(undefined, 'weapons:ranged') };
    expect(isTypeOptionSelected(ranged, 'weapons:ranged')).toBe(true);
    expect(isTypeOptionSelected(ranged, 'group:bows')).toBe(true);
    expect(isTypeOptionSelected(ranged, 'tkni')).toBe(true);
    expect(isTypeOptionSelected(ranged, 'weapons:2h-ranged')).toBe(true);
    expect(isTypeOptionSelected(ranged, 'weapons:melee')).toBe(false);
    expect(isTypeOptionSelected(ranged, 'swor')).toBe(false);
    // A hand group is picked when all its bases are
    const weapons = { typeCode: toggleType(undefined, 'weapons:weapons') };
    expect(isTypeOptionSelected(weapons, 'weapons:1h')).toBe(true);
    expect(isTypeOptionSelected({ typeCode: 'swor' }, 'weapons:1h')).toBe(false);
  });

  it('with picked bases, shows an option picked when all its bases are', () => {
    const twoHanded = toggleTypeOption({}, 'weapons:2h');
    expect(isTypeOptionSelected(twoHanded, 'weapons:2h')).toBe(true);
    expect(isTypeOptionSelected(twoHanded, 'weapons:2h-melee')).toBe(true);
    expect(isTypeOptionSelected(twoHanded, 'pole')).toBe(true);
    expect(isTypeOptionSelected(twoHanded, 'group:bows')).toBe(true);
    // Swords only partly
    expect(isTypeOptionSelected(twoHanded, 'swor')).toBe(false);
    expect(isTypeOptionSelected(twoHanded, 'weapons:1h')).toBe(false);
    expect(isTypeOptionSelected(twoHanded, 'weapons:melee')).toBe(false);
  });
});

describe('typeLabel', () => {
  it('names every picked option', () => {
    expect(typeLabel(undefined)).toBeUndefined();
    expect(typeLabel('group:spears')).toBe('Spears');
    expect(typeLabel('{"$in": ["pole", "spea", "aspe"]}')).toBe('Polearm, Spears');
    expect(typeLabel('{"$in": ["h2h", "h2h2", "knif"]}')).toBe('Dagger, Fist Weapon');
    expect(typeLabel('lcha')).toBe('Charm');
  });
});

describe('basesForTypeValue', () => {
  it('offers the bases of every picked type', () => {
    const labels = basesForTypeValue('{"$in": ["pole", "spea", "aspe"]}').map((b) => b.label);
    expect(labels).toContain('Bardiche'); // polearm
    expect(labels).toContain('War Spear'); // spear
    expect(labels).toContain('Ceremonial Spear'); // amazon spear
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    expect(basesForTypeValue('pole').map((b) => b.label)).toContain('Bardiche');
    expect(basesForTypeValue(undefined)).toEqual([]);
  });
});
