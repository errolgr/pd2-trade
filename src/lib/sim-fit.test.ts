import { describe, expect, it } from 'vitest';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { fitCharacter, type FitCharacter, pickFitting, unfitReason } from './sim-fit';
import { MAX_SIM_EXPORT_ITEMS } from './sim-export-api';

const gear = (hash: string, over: Partial<GameStashItem> = {}): GameStashItem =>
  ({
    hash,
    name: hash,
    base: { name: 'Base', type_code: 'helm', stackable: false },
    requirements: { level: 1, strength: 0, dexterity: 0 },
    location: { zone: 'Stored', storage: 'Shared Stash' },
    modifiers: [],
    ...over,
  }) as GameStashItem;

const req = (level: number, strength = 0, dexterity = 0) => ({ level, strength, dexterity });
const base = (type_code: string) => ({ name: type_code, type_code, stackable: false }) as GameStashItem['base'];

const PALADIN: FitCharacter = { className: 'Paladin', level: 80, strength: 125, dexterity: 90 };

describe('unfitReason', () => {
  it('passes an item every requirement of which the character meets', () => {
    expect(unfitReason(gear('shako', { requirements: req(62, 50) }), PALADIN)).toBeNull();
    expect(unfitReason(gear('shield', { base: base('ashd'), requirements: req(80, 125, 90) }), PALADIN)).toBeNull();
  });

  it('says which class alone can use a class base', () => {
    expect(unfitReason(gear('titan', { base: base('ajav') }), PALADIN)).toBe('Amazon only');
    expect(unfitReason(gear('claw', { base: base('h2h2') }), PALADIN)).toBe('Assassin only');
    expect(unfitReason(gear('orb', { base: base('orb') }), PALADIN)).toBe('Sorceress only');
    expect(unfitReason(gear('pelt', { base: base('pelt') }), PALADIN)).toBe('Druid only');
    expect(unfitReason(gear('head', { base: base('head') }), PALADIN)).toBe('Necromancer only');
    expect(unfitReason(gear('helm', { base: base('phlm') }), PALADIN)).toBe('Barbarian only');
    expect(unfitReason(gear('shield', { base: base('ashd') }), { ...PALADIN, className: 'Sorceress' })).toBe(
      'Paladin only',
    );
  });

  it('names the first unmet level, Strength or Dexterity requirement with the character’s value', () => {
    expect(unfitReason(gear('a', { requirements: req(85) }), PALADIN)).toBe('needs level 85 · is 80');
    expect(unfitReason(gear('b', { requirements: req(70, 170) }), PALADIN)).toBe('needs Str 170 · has 125');
    expect(unfitReason(gear('c', { requirements: req(70, 100, 136) }), PALADIN)).toBe('needs Dex 136 · has 90');
  });

  it('reads missing requirements as none', () => {
    expect(unfitReason(gear('jewel', { requirements: {} as GameStashItem['requirements'] }), PALADIN)).toBeNull();
  });
});

describe('fitCharacter', () => {
  it('adds the Strength and Dexterity of worn gear and inventory charms, not the weapon switch or stored gear', () => {
    const mod = (name: string, value: number) => ({ name, values: [value], label: name });
    const fit = fitCharacter({
      stats: { className: 'Paladin', level: 90, strength: 100, dexterity: 60 },
      items: [
        gear('ring', {
          location: { zone: 'Equipped', equipment: 'Left Ring' } as never,
          modifiers: [mod('strength', 20)],
        }),
        gear('amulet', {
          location: { zone: 'Equipped', equipment: 'Amulet' } as never,
          modifiers: [mod('all_attributes', 4)],
        }),
        gear('switch', {
          location: { zone: 'Equipped', equipment: 'Right Hand Switch' } as never,
          modifiers: [mod('strength', 50)],
        }),
        gear('charm', {
          base: base('scha'),
          location: { zone: 'Stored', storage: 'Inventory' } as never,
          modifiers: [mod('dexterity', 6)],
        }),
        gear('stored', {
          location: { zone: 'Stored', storage: 'Inventory' } as never,
          modifiers: [mod('strength', 30)],
        }),
      ],
      mercenary: [],
    });
    expect(fit).toEqual({ className: 'Paladin', level: 90, strength: 124, dexterity: 70 });
  });

  it('is null without stats from PD2', () => {
    expect(fitCharacter({ items: [], mercenary: [] })).toBeNull();
  });
});

describe('pickFitting', () => {
  it('picks the fitting items in list order', () => {
    const items = [gear('a'), gear('heavy', { requirements: req(10, 400) }), gear('b')];
    expect([...pickFitting(items, PALADIN, MAX_SIM_EXPORT_ITEMS)]).toEqual(['a', 'b']);
  });

  it(`stops at ${MAX_SIM_EXPORT_ITEMS} items`, () => {
    const items = Array.from({ length: MAX_SIM_EXPORT_ITEMS + 5 }, (_, i) => gear(`i${i}`));
    const picked = pickFitting(items, PALADIN, MAX_SIM_EXPORT_ITEMS);
    expect(picked.size).toBe(MAX_SIM_EXPORT_ITEMS);
    expect(picked.has(`i${MAX_SIM_EXPORT_ITEMS - 1}`)).toBe(true);
    expect(picked.has(`i${MAX_SIM_EXPORT_ITEMS}`)).toBe(false);
  });
});
