import { describe, expect, it } from 'vitest';
import {
  basesForType,
  CORRUPTION_OPTIONS,
  findBaseOption,
  findTypeOption,
  ITEM_TYPES,
  itemNameOptions,
  optionCodes,
  TYPE_CODES,
} from './catalog';
import { isPseudo, parseStatKey, searchStats, STAT_OPTIONS, statLabel } from './stats';

describe('catalog', () => {
  it('has the site Type list with its codes', () => {
    expect(ITEM_TYPES).toHaveLength(67);
    const byLabel = Object.fromEntries(ITEM_TYPES.map((t) => [t.label, t.code]));
    expect(byLabel).toMatchObject({
      Circlet: 'circ',
      Armor: 'tors',
      'Barbarian Helm': 'phlm',
      'Sorceress Orb': 'orb',
      Jewel: 'jewl',
      Jewelry: '{"$in": ["amul", "ring", "amus"]}',
      Charm: '{"$in": ["scha", "mcha", "lcha", "torc"]}',
      'Fist Weapon': '{"$in": ["h2h", "h2h2"]}',
    });
    expect(TYPE_CODES.jewelry).toBe(byLabel.Jewelry);
  });

  it('lists bases per type, sorted, and maps a base back to its selects', () => {
    const helms = basesForType('helm');
    expect(helms.map((b) => b.label)).toEqual([...helms.map((b) => b.label)].sort());
    expect(helms).toContainEqual({ code: 'uap', label: 'Shako' });
    expect(basesForType(undefined)).toEqual([]);
    expect(findBaseOption('uap')).toEqual({ typeCode: 'helm', baseCode: 'uap' });
    expect(findBaseOption('r30s')).toEqual({
      typeCode: '{"$in": ["rune", "runs"]}',
      baseCode: '{"$in": ["r30", "r30s"]}',
    });
    expect(findBaseOption('nope')).toBeNull();
    expect(findTypeOption('ring')?.label).toBe('Jewelry');
    expect(optionCodes('{"$in": ["a", "b"]}')).toEqual(['a', 'b']);
    expect(optionCodes('circ')).toEqual(['circ']);
  });

  it('suggests item names: prefix first, then word starts, then substrings', () => {
    const names = itemNameOptions('shako').map((o) => o.name);
    expect(names[0]).toBe('Shako');
    expect(itemNameOptions('harlequin')).toEqual([{ name: 'Harlequin Crest', quality: 'Unique' }]);
    expect(itemNameOptions('enigma')[0]).toEqual({ name: 'Enigma', quality: 'Runeword' });
    expect(itemNameOptions('ber')[0]).toEqual({ name: 'Ber Rune', quality: 'Base' });
    expect(itemNameOptions('  ')).toEqual([]);
    expect(itemNameOptions('a', 5)).toHaveLength(5);
  });

  it('labels corruption options without the roll', () => {
    expect(CORRUPTION_OPTIONS).toContainEqual({ value: 'item_fastercastrate', label: 'Faster Cast Rate' });
    expect(CORRUPTION_OPTIONS).toContainEqual({ value: 'item_numsockets', label: 'Sockets' });
    // Not a property key: labelled by the property it rolls
    expect(CORRUPTION_OPTIONS).toContainEqual({ value: 'dmg-max', label: 'to Maximum Damage' });
    // No site property: the modifier's own label
    expect(CORRUPTION_OPTIONS).toContainEqual({ value: 'item_demon_tohit', label: 'to Attack Rating against Demons' });
    expect(CORRUPTION_OPTIONS).toContainEqual({ value: 'passive_ltng_mastery', label: 'to Lightning Skill Damage' });
    expect(CORRUPTION_OPTIONS).toContainEqual({ value: 'curse_effectiveness', label: 'Curse Resistance' });
    expect(CORRUPTION_OPTIONS.map((o) => o.value)).not.toContain('dmg%');
    // Every option reads as words, never a raw key, and none repeats
    for (const o of CORRUPTION_OPTIONS) expect(o.label).not.toMatch(/_|\{X\}/);
    expect(new Set(CORRUPTION_OPTIONS.map((o) => o.value)).size).toBe(CORRUPTION_OPTIONS.length);
  });
});

describe('stats', () => {
  it('uses the site property keys and label templates', () => {
    expect(statLabel('item_fastercastrate')).toBe('+{X} Faster Cast Rate');
    expect(statLabel('fireresist')).toBe('Fire Resist +{X}%');
    expect(statLabel('item_addclassskills{1}')).toBe('+{X} to Sorceress Skills');
    expect(statLabel('pseudo_total_res')).toMatch(/Total Resistances/);
    expect(statLabel('unknown_thing')).toBe('unknown_thing');
    expect(STAT_OPTIONS.find((o) => o.key === 'item_fastercastrate')?.group).toBe('Caster');
    expect(STAT_OPTIONS.find((o) => o.key === 'fireresist')?.group).toBe('Resists');
  });

  it('parses the site key grammar', () => {
    expect(parseStatKey('maxhp')).toEqual({ names: ['maxhp'], params: [], valueIndex: 0 });
    expect(parseStatKey('item_singleskill{54}')).toEqual({ names: ['item_singleskill'], params: [54], valueIndex: 1 });
    expect(parseStatKey('a|b')).toEqual({ names: ['a', 'b'], params: [], valueIndex: 0 });
    expect(parseStatKey('item_elemskill_cold')).toEqual({ names: ['item_elemskill_cold'], params: [], valueIndex: 1 });
  });

  it('searches with shorthands, pseudo stats first', () => {
    const fcr = searchStats('fcr');
    expect(isPseudo(fcr[0]) && fcr[0].id).toBe('pseudo_fcr');
    expect(fcr.some((o) => !isPseudo(o) && o.key === 'item_fastercastrate')).toBe(true);
    const res = searchStats('fire res').slice(0, 5);
    expect(res.some((o) => !isPseudo(o) && o.key === 'fireresist')).toBe(true);
    expect(res.some((o) => isPseudo(o) && o.id === 'pseudo_fire_res')).toBe(true);
    expect(searchStats('sorceress skills').some((o) => !isPseudo(o) && o.key === 'item_addclassskills{1}')).toBe(true);
    expect(searchStats('zzzz')).toEqual([]);
  });

  it('finds pseudo stats when the query includes their "Total" prefix', () => {
    const hits = searchStats('total res');
    expect(isPseudo(hits[0]) && hits[0].id).toBe('pseudo_total_res');
    expect(hits.slice(0, 6).every(isPseudo)).toBe(true);
    expect(searchStats('total life').some((o) => isPseudo(o) && o.id === 'pseudo_life')).toBe(true);
  });
});
