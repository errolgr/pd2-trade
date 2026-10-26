import { describe, expect, it } from 'vitest';
import type { ItemUsage } from '@/lib/builds-api';
import { coreKitTotal, missingCoreTotal, peerFilters, signatureSkills, wornKeys } from './gear-up';
import { marketFiltersFor } from './market-link';
import { pushRecent, toggleFollow } from './character-refs';

const usage = (key: string, pct: number, priceHr: number | null): ItemUsage => ({
  key,
  name: key,
  quality: 'Unique',
  iconUrl: null,
  count: pct,
  pct,
  priceHr,
});

const items = [
  usage('rw:enigma', 80, 2.5),
  usage('unique:harlequin_crest', 40, 0.4),
  usage('rw:spirit', 25, 0.05),
  usage('unique:arachnid_mesh', 24.9, 1),
  usage('unique:mara_s_kaleidoscope', 30, null),
];

describe('core kit', () => {
  it('sums the priced items worn by 25% or more', () => {
    expect(coreKitTotal(items)).toBe(2.95);
    expect(coreKitTotal([])).toBe(0);
  });

  it('prices only the core items a build does not wear (character or merc)', () => {
    const worn = wornKeys({
      equipped: [{ key: 'rw:enigma' }, { key: 'base:amu:rare' }],
      merc: { equipped: [{ key: 'rw:spirit' }] },
    });
    expect(missingCoreTotal(items, worn)).toBe(0.4);
    expect(missingCoreTotal(items, wornKeys({ equipped: [], merc: null }))).toBe(2.95);
  });
});

describe('signatureSkills', () => {
  it('ranks by hard points, then total, without unused skills', () => {
    const ranked = signatureSkills([
      { name: 'Holy Shield', base: 1, total: 20 },
      { name: 'Blessed Hammer', base: 20, total: 38 },
      { name: 'Concentration', base: 20, total: 40 },
      { name: 'Smite', base: 0, total: 0 },
      { name: 'Vigor', base: 1, total: 5 },
    ]);
    expect(ranked.map((s) => s.name)).toEqual(['Concentration', 'Blessed Hammer', 'Holy Shield', 'Vigor']);
  });

  it('falls back to the highest total when nothing has hard points', () => {
    expect(
      signatureSkills([
        { name: 'A', base: 0, total: 4 },
        { name: 'B', base: 0, total: 9 },
      ])[0].name,
    ).toBe('B');
  });
});

describe('peerFilters', () => {
  it('filters by class and the skill maxed; class-only drops the skill', () => {
    expect(peerFilters('Paladin', 'Blessed Hammer', 'hardcore')).toMatchObject({
      mode: 'hardcore',
      classes: ['Paladin'],
      skills: ['Blessed Hammer:20'],
      items: [],
    });
    expect(peerFilters('Paladin', 'Blessed Hammer', 'softcore', true).skills).toEqual([]);
  });
});

describe('marketFiltersFor', () => {
  it('searches uniques, sets, runewords and runes by name, in the build mode on ladder', () => {
    expect(
      marketFiltersFor({ key: 'rw:enigma', name: 'Enigma', quality: 'Runeword', runeword: true }, 'hardcore'),
    ).toEqual({
      hardcore: true,
      ladder: true,
      itemName: 'Enigma',
    });
    expect(marketFiltersFor({ key: 'rune:r10', name: 'Thul', quality: null }, 'softcore')).toMatchObject({
      itemName: 'Thul',
    });
  });

  it('searches other items by base and quality', () => {
    expect(
      marketFiltersFor({ key: 'base:amu:rare', name: 'Grim Talisman', quality: 'Rare', baseCode: 'amu' }, 'softcore'),
    ).toEqual({ hardcore: false, ladder: true, baseCode: 'amu', rarity: ['Rare'] });
    // usage rows carry no baseCode: the key does
    expect(marketFiltersFor({ key: 'base:rin:magic', name: 'Ring', quality: 'Magic' }, 'softcore')).toMatchObject({
      baseCode: 'rin',
      rarity: ['Magic'],
    });
  });
});

describe('recent / followed characters', () => {
  it('puts the latest first, de-duplicated case-insensitively, at most 10', () => {
    const list = Array.from({ length: 10 }, (_, i) => ({ name: `C${i}`, mode: 'softcore' as const }));
    const next = pushRecent(list, { name: 'c5', mode: 'softcore' });
    expect(next[0]).toEqual({ name: 'c5', mode: 'softcore' });
    expect(next).toHaveLength(10);
    expect(next.filter((r) => r.name.toLowerCase() === 'c5')).toHaveLength(1);
    expect(pushRecent(list, { name: 'New', mode: 'softcore' }).at(-1)).toEqual({ name: 'C8', mode: 'softcore' });
  });

  it('returns the same list when the character is already the latest (no settings write)', () => {
    const list = [{ name: 'A', mode: 'hardcore' as const }];
    expect(pushRecent(list, { name: 'A', mode: 'hardcore' })).toBe(list);
  });

  it('keeps the same name in another mode apart', () => {
    expect(pushRecent([{ name: 'A', mode: 'softcore' }], { name: 'A', mode: 'hardcore' })).toHaveLength(2);
  });

  it('toggles follow', () => {
    const followed = toggleFollow([], { name: 'Hammerdin', mode: 'softcore' });
    expect(followed).toEqual([{ name: 'Hammerdin', mode: 'softcore' }]);
    expect(toggleFollow(followed, { name: 'hammerdin', mode: 'softcore' })).toEqual([]);
  });
});
