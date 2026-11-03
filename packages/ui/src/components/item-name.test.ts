import { describe, expect, it } from 'vitest';
import { itemQualityClass } from './item-name';
import { runeBaseName } from './rune-icon';
import { sparkChange } from './spark-chart';

describe('itemQualityClass', () => {
  it('maps qualities, runes and runewords', () => {
    expect(itemQualityClass('Unique')).toBe('text-q-unique');
    expect(itemQualityClass('Rare')).toBe('text-q-rare');
    expect(itemQualityClass('Unique', { runeword: true })).toBe('text-q-rune');
    expect(itemQualityClass('Normal', { name: 'Ber Rune' })).toBe('text-q-rune');
    expect(itemQualityClass('Superior')).toBe('text-q-normal');
    expect(itemQualityClass(null)).toBe('text-q-normal');
  });
});

describe('runeBaseName', () => {
  it('accepts both spellings and rejects other items', () => {
    expect(runeBaseName('Ber Rune')).toBe('Ber');
    expect(runeBaseName('Ber')).toBe('Ber');
    expect(runeBaseName('Harlequin Crest')).toBeNull();
  });
});

describe('sparkChange', () => {
  it('is first-to-last percent, null without a base', () => {
    expect(sparkChange([2, 3])).toBe(50);
    expect(sparkChange([1])).toBeNull();
    expect(sparkChange([0, 1])).toBeNull();
  });
});
