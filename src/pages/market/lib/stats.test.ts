import { describe, expect, it } from 'vitest';
import { searchStats } from './stats';

const top = (query: string, n = 2) =>
  searchStats(query, n).map((o) => ('label' in o ? o.label : '').replace(/\{X\}/g, 'X'));

describe('searchStats ranking', () => {
  it('puts whole-name matches first, the pseudo total ahead of the plain property', () => {
    expect(top('life')).toEqual(['+X Total Life (incl. 2 per Vitality)', '+X to Life']);
    expect(top('mana')).toEqual(['+X Total Mana (incl. 2 per Energy)', '+X to Mana']);
    expect(top('cold res', 1)).toEqual(['+X% Total Cold Resistance']);
    expect(top('all res', 1)).toEqual(['+X% All Resistances (lowest of the four)']);
  });

  it('prefers shorter names among partial matches, and short words must match whole words', () => {
    expect(top('def')).toEqual(['+X Defense', '+X Defense (Based on Character Level)']);
    expect(top('life', 5).indexOf('+X% Total Life Stolen per Hit')).toBeGreaterThan(1);
  });
});
