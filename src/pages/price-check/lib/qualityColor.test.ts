import { describe, expect, it } from 'vitest';
import { qualityColor } from './qualityColor';

describe('qualityColor', () => {
  it.each([
    ['Unique', 'text-q-unique'],
    ['Set', 'text-q-set'],
    ['Rare', 'text-q-rare'],
    ['Crafted', 'text-q-crafted'],
    ['Magic', 'text-q-magic'],
  ])('maps %s to its quality class', (quality, cls) => {
    expect(qualityColor(quality)).toBe(cls);
  });

  it.each(['Normal', 'Superior', 'Runeword', '', 'unique'])('falls back to normal color for %j', (quality) => {
    expect(qualityColor(quality)).toBe('text-q-normal');
  });
});
