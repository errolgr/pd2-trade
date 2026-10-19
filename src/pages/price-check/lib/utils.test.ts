import { describe, expect, it } from 'vitest';
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
});
