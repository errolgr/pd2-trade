import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Item, Stat } from './interfaces';
import { buildStatRows } from './stat-rows';
import { cleanItemType, getStatKey, getTypeFromBaseType } from './utils';

describe('cleanItemType', () => {
  it('strips the trailing ÿc color marker and slashes from clipboard type strings', () => {
    expect(cleanItemType('Catalyst Shardÿc\\/')).toBe('Catalyst Shard');
  });

  it('normalizes internal whitespace and trims', () => {
    expect(cleanItemType('  Grand   Charm \t')).toBe('Grand Charm');
  });

  it('leaves a clean type untouched', () => {
    expect(cleanItemType('Monarch')).toBe('Monarch');
  });
});

describe('getTypeFromBaseType', () => {
  it('resolves a base label to its category type code and base code (case-insensitive)', () => {
    expect(getTypeFromBaseType('monarch')).toEqual({ type: 'shie', base: 'uit', label: 'Monarch' });
  });

  it('cleans color codes before matching', () => {
    expect(getTypeFromBaseType('Monarchÿc\\/')?.base).toBe('uit');
  });

  it('returns undefined for unknown bases', () => {
    expect(getTypeFromBaseType('Not A Real Base')).toBeUndefined();
  });

  it('keeps $in type values as strings for URL building', () => {
    expect(getTypeFromBaseType('Ring')).toEqual({
      type: '{"$in": ["amul", "ring", "amus"]}',
      base: 'rin',
      label: 'Ring',
    });
  });

  it('parses $in type and base values into objects for query building', () => {
    expect(getTypeFromBaseType('Ring', true)?.type).toEqual({ $in: ['amul', 'ring', 'amus'] });
    expect(getTypeFromBaseType('Flawless Diamond', true)?.base).toEqual({ $in: ['glw', 'glws'] });
  });

  it('leaves plain codes as strings even when parsing is requested', () => {
    expect(getTypeFromBaseType('Monarch', true)).toEqual({ type: 'shie', base: 'uit', label: 'Monarch' });
  });
});

describe('getStatKey', () => {
  it('keys skill stats by lower-cased skill name, ignoring stat_id', () => {
    expect(getStatKey({ stat_id: 107, name: 'x', skill: 'Fire Ball' })).toBe('skill:fire ball');
  });

  it('keys other stats by stat_id', () => {
    expect(getStatKey({ stat_id: 105, name: 'FCR' })).toBe('id:105');
  });

  it('falls back to stat_id when skill is empty', () => {
    expect(getStatKey({ stat_id: 83, name: 'x', skill: '' })).toBe('id:83');
  });

  it('keys lines exported without a stat_id (chance to cast, auras) by their wording', () => {
    const ctc = { name: '15% Chance to cast level 20 Fire Ball on attack', chance: 15, level: 20 } as Stat;
    const aura = { name: 'Level 6 Resist Lightning Aura When Equipped' } as Stat;
    expect(getStatKey(ctc)).toBe('line:15% Chance to cast level 20 Fire Ball on attack');
    expect(getStatKey(aura)).toBe('line:Level 6 Resist Lightning Aura When Equipped');
  });

  // Rows render keyed by getStatKey: a shared key leaves stale rows on screen when the next item is checked (#147).
  it('gives every stat row of a Ctrl+C export its own key', () => {
    const oracle = readFileSync(path.join(__dirname, '__fixtures__/stat-ranges-oracle.s14.jsonl'), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line): Item => {
        // Fixture rows are { clipboard, tooltip } captured from the game
        const row: { clipboard: Item } = JSON.parse(line);
        return row.clipboard;
      });
    const twoCtc: Item = {
      name: 'Doom Coil',
      quality: 'Rare',
      type: 'Ring',
      iLevel: 85,
      stats: [
        { stat_id: 105, name: 'Faster Cast Rate', value: 10 },
        { name: '15% Chance to cast level 20 Fire Ball on attack', chance: 15, level: 20 } as Stat,
        { name: '2% Chance to cast level 20 Fire Wall on attack', chance: 2, level: 20 } as Stat,
      ],
    };
    for (const item of [...oracle, twoCtc]) {
      const keys = buildStatRows(item).map(getStatKey);
      expect(keys, item.name ?? item.type).toEqual([...new Set(keys)]);
    }
  });
});

describe('buildStatRows: magic damage', () => {
  // BH sends both "+%d magic damage" lines with the max (Lightsabre: Adds 60-120 magic damage)
  const lightsabre = (quality: string): Item =>
    ({
      name: 'Lightsabre',
      quality,
      type: 'Phase Blade',
      stats: [
        { name: '+%d magic damage', stat_id: 52, value: 120, range: { min: 60, max: 120 } },
        { name: '+%d magic damage', stat_id: 53, value: 120, range: { min: 60, max: 120 } },
      ],
    }) as unknown as Item;
  const magic = (item: Item) => buildStatRows(item).find((s) => s.name === 'Magic Damage');

  it("is one Adds X-Y row with the unique's min, not +120", () => {
    expect(magic(lightsabre('Unique'))).toMatchObject({ value: 60, maxValue: 120 });
  });

  it('stays as sent without a fixed item to read the min from', () => {
    expect(magic(lightsabre('Rare'))).toMatchObject({ value: 120, maxValue: 120 });
  });
});
