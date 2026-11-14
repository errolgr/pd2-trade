import { describe, expect, it } from 'vitest';
import {
  basesForTypeValue,
  isTypeSelected,
  toggleTypeOption,
  typeCodeForCodes,
  typeCodeForSelection,
  typeLabel,
  typeSelection,
} from './type-selection';

const FIST = '{"$in": ["h2h", "h2h2"]}';
const JEWELRY = '{"$in": ["amul", "ring", "amus"]}';

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
    const two = toggleTypeOption('pole', 'group:spears');
    expect(typeSelection(two)).toEqual(['pole', 'group:spears']);
    expect(toggleTypeOption(two, 'pole')).toBe('group:spears');
    expect(toggleTypeOption('pole', 'pole')).toBeUndefined();
    expect(toggleTypeOption(undefined, 'knif')).toBe('knif');
  });

  it('removing a type under a picked group keeps its other types', () => {
    expect(toggleTypeOption('group:bows', 'abow')).toBe('bow');
    expect(typeSelection(toggleTypeOption('group:helms', 'circ'))).toEqual(['phlm', 'pelt', 'helm']);
    expect(typeSelection(toggleTypeOption('{"$in": ["pole", "spea", "aspe"]}', 'aspe'))).toEqual(['pole', 'spea']);
  });

  it('adding a group takes in its types picked one by one; picking every type of a group is the group', () => {
    expect(toggleTypeOption('{"$in": ["bow", "pole"]}', 'group:bows')).toBe('{"$in": ["bow", "abow", "pole"]}');
    expect(typeSelection(toggleTypeOption('{"$in": ["bow", "pole"]}', 'group:bows'))).toEqual(['group:bows', 'pole']);
    expect(toggleTypeOption('bow', 'abow')).toBe('group:bows');
  });
});

describe('isTypeSelected', () => {
  it('shows a picked option and the types of a picked group as picked', () => {
    const selection = typeSelection('{"$in": ["pole", "spea", "aspe"]}');
    expect(isTypeSelected(selection, 'pole')).toBe(true);
    expect(isTypeSelected(selection, 'group:spears')).toBe(true);
    expect(isTypeSelected(selection, 'aspe')).toBe(true);
    expect(isTypeSelected(selection, 'knif')).toBe(false);
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
