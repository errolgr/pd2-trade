import { describe, expect, it } from 'vitest';
import { defaultFilters } from '../lib/defaults';
import type { MarketFilters, StatFilter } from '../lib/types';
import { itemRowValue, statRowText, statSummary, wtbArt, wtbTitle, wtbTitleColor } from './wtb-text';

const row = (id: string, key: string, extra: Partial<StatFilter> = {}): StatFilter => ({
  id,
  kind: 'mod',
  key,
  enabled: true,
  ...extra,
});

const filters = (extra: Partial<MarketFilters> = {}): MarketFilters => ({
  ...defaultFilters({ hardcore: false, ladder: true }),
  ...extra,
});

describe('wtbTitle', () => {
  it('is the item name when one is searched', () => {
    expect(wtbTitle(filters({ itemName: 'Harlequin Crest', rarity: ['Unique'] }))).toBe('Harlequin Crest');
  });

  it('is the single rarity with the base or type', () => {
    expect(wtbTitle(filters({ rarity: ['Rare'], typeCode: 'circ' }))).toBe('Rare Circlet');
    expect(wtbTitle(filters({ rarity: ['Rare'], typeCode: 'circ', baseCode: 'ci3' }))).toBe('Rare Diadem');
    expect(wtbTitle(filters({ rarity: ['Rare', 'Crafted'], typeCode: 'circ', ethereal: 'yes' }))).toBe(
      'Ethereal Circlet',
    );
  });

  it('falls back to the first required stat, skipping nice-to-have rows', () => {
    const f = filters({
      rarity: ['Magic'],
      stats: [row('a', 'item_maxhp', { min: 40 }), row('b', 'item_fastercastrate', { min: 20 })],
    });
    expect(wtbTitle(f, ['a'])).toBe('Magic item with +20 Faster Cast Rate');
    expect(wtbTitle(filters())).toBe('Item');
  });

  it('stays within 80 characters', () => {
    expect(wtbTitle(filters({ itemName: 'x'.repeat(120) }))).toHaveLength(80);
  });

  it('colours the title by the named item or the single rarity', () => {
    expect(wtbTitleColor(filters({ rarity: ['Rare'] }))).toBe('text-q-rare');
    expect(wtbTitleColor(filters({ itemName: 'Harlequin Crest' }))).toBe('text-q-unique');
  });
});

describe('stat summary', () => {
  it('reads each enabled row short, corruption rows marked, bounds kept', () => {
    const f = filters({
      stats: [
        row('a', 'item_fastercastrate', { min: 20 }),
        row('b', 'maxhp', { min: 10, max: 50 }),
        row('c', 'item_allskills', { kind: 'corruption', min: 1 }),
        row('d', 'item_fastercastrate', { enabled: false, min: 5 }),
      ],
    });
    expect(statSummary(f)).toBe('+20 Faster Cast Rate · Life 10–50 · c: +1 to All Skills');
  });

  it('marks excluded rows and reads unbounded rows by name', () => {
    expect(statRowText(row('a', 'item_fastercastrate', { not: true }))).toBe('Not Faster Cast Rate');
    expect(statRowText(row('s', 'sockets', { kind: 'item', min: 3 }))).toBe('3 Sockets');
  });

  it('reads a bare alias group member as its group (requests from other clients)', () => {
    expect(statRowText(row('m', 'max_damage', { min: 9 }))).toBe('+9 to Maximum Damage');
  });
});

describe('itemRowValue', () => {
  it("reads the item's roll for a row", () => {
    const item = { socket_count: 2, modifiers: [{ name: 'item_fastercastrate', values: [20], label: '+20% FCR' }] };
    expect(itemRowValue(item, row('a', 'item_fastercastrate'))).toBe(20);
    expect(itemRowValue(item, row('b', 'item_maxhp'))).toBeNull();
    expect(itemRowValue(item, row('s', 'sockets', { kind: 'item' }))).toBe(2);
  });
});

describe('wtbArt', () => {
  it('is a unique or set by name, else the base, else the type’s first base', () => {
    expect(wtbArt({ itemName: 'Harlequin Crest' })).toEqual({
      name: 'Harlequin Crest',
      quality: 'Unique',
      baseName: null,
    });
    expect(wtbArt({ typeCode: 'circ', baseCode: 'ci3' })).toEqual({
      name: 'Diadem',
      quality: null,
      baseName: 'Diadem',
    });
    expect(wtbArt({ typeCode: 'circ' })).toEqual({ name: 'Circlet', quality: null, baseName: 'Circlet' });
  });

  it('takes the first code of a grouped value', () => {
    expect(wtbArt({ typeCode: 'circ', baseCode: '{"$in":["ci3","ci2"]}' })?.name).toBe('Diadem');
  });

  it('a member of a grouped site type shows its own base, the group its first', () => {
    expect(wtbArt({ typeCode: 'ring' })?.name).toBe('Ring');
    expect(wtbArt({ typeCode: 'amul' })?.name).toBe('Amulet');
    expect(wtbArt({ typeCode: 'amus' })?.name).toBe('Amulet [S]');
    expect(wtbArt({ typeCode: '{"$in": ["amul", "ring", "amus"]}' })?.name).toBe('Amulet');
  });

  it('is null when nothing names an item, base or type', () => {
    expect(wtbArt({ itemName: 'Enigma' })).toBeNull();
    expect(wtbArt({})).toBeNull();
  });
});
