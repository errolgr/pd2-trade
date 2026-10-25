import { describe, expect, it } from 'vitest';
import { defaultFilters, newStatFilter, withSource } from './defaults';
import { siteSearchLink } from './site-url';
import type { MarketFilters } from './types';

const base = (over: Partial<MarketFilters> = {}): MarketFilters => ({
  ...defaultFilters({ hardcore: false, ladder: true }),
  ...over,
});

const query = (f: MarketFilters) => {
  const url = new URL(siteSearchLink(f).url);
  return { path: url.pathname, params: [...url.searchParams] };
};

describe('siteSearchLink', () => {
  it('carries every filter the site reads from its URL, exactly', () => {
    const f = base({
      itemName: 'Harlequin Crest',
      typeCode: '{"$in": ["helm", "circ"]}',
      baseCode: 'uap',
      rarity: ['Unique'],
      corrupted: 'no',
      ethereal: 'yes',
      identified: 'yes',
      socketsMin: 1,
      socketsMax: 2,
      stats: [
        newStatFilter({ kind: 'mod', key: 'item_allskills', min: 2 }),
        newStatFilter({ kind: 'mod', key: 'item_singleskill{54}', min: 1, max: 3 }),
        // Disabled and unpicked rows aren't part of the search
        newStatFilter({ kind: 'mod', key: 'strength', min: 5, enabled: false }),
        newStatFilter({ kind: 'mod', key: ' ' }),
      ],
    });
    expect(siteSearchLink(f).dropped).toEqual([]);
    expect(query(f)).toEqual({
      path: '/market',
      params: [
        ['name', 'Harlequin Crest'],
        ['type', '{"$in": ["helm", "circ"]}'],
        ['base', 'uap'],
        ['quality', 'Unique'],
        ['corrupted', 'false'],
        ['ethereal', 'true'],
        ['is_identified', 'true'],
        ['sockets_min', '1'],
        ['sockets_max', '2'],
        ['properties[item_allskills][min]', '2'],
        ['properties[item_singleskill{54}][min]', '1'],
        ['properties[item_singleskill{54}][max]', '3'],
        ['is_hardcore', 'false'],
        ['is_ladder', 'true'],
      ],
    });
  });

  it('opens sold searches on the archive, at its default age window', () => {
    const f = withSource(base({ hardcore: true, ladder: false }), 'archive');
    expect(query(f)).toEqual({
      path: '/market/archive',
      params: [
        ['is_hardcore', 'true'],
        ['is_ladder', 'false'],
      ],
    });
    expect(siteSearchLink(f).dropped).toEqual([]);
  });

  it('requires a stat row without bounds', () => {
    const f = base({ stats: [newStatFilter({ kind: 'mod', key: 'item_fastercastrate' })] });
    expect(query(f).params).toContainEqual(['properties[item_fastercastrate][min]', '']);
  });

  it('joins an any-of group into the site alternatives key only when the rows share a range', () => {
    const shared = base({
      stats: [
        newStatFilter({ kind: 'mod', key: 'fireresist', min: 20, or: true }),
        newStatFilter({ kind: 'mod', key: 'coldresist', min: 20, or: true }),
      ],
    });
    expect(query(shared).params).toContainEqual(['properties[fireresist|coldresist][min]', '20']);
    expect(siteSearchLink(shared).dropped).toEqual([]);

    const differing = base({
      stats: [
        newStatFilter({ kind: 'mod', key: 'fireresist', min: 20, or: true }),
        newStatFilter({ kind: 'mod', key: 'coldresist', min: 30, or: true }),
      ],
    });
    expect(query(differing).params.some(([k]) => k.startsWith('properties'))).toBe(false);
    expect(siteSearchLink(differing).dropped).toEqual(['any-of stat group']);

    const single = base({ stats: [newStatFilter({ kind: 'mod', key: 'fireresist', min: 20, or: true })] });
    expect(query(single).params).toContainEqual(['properties[fireresist][min]', '20']);
  });

  it('names every filter the site link cannot carry', () => {
    const f = base({
      rarity: ['Rare', 'Crafted'],
      desecrated: 'yes',
      priceText: 'ist',
      hrMax: 1,
      requirements: { class: 'sorceress', levelMax: 60 },
      sellerName: 'Bob',
      userOnlineGame: 'online',
      hasBuyout: 'yes',
      maxAgeDays: 7,
      sort: { by: 'price', dir: 'asc' },
      stats: [
        newStatFilter({ kind: 'pseudo', key: 'pseudo_total_res', min: 60 }),
        newStatFilter({ kind: 'corruption', key: 'sockets' }),
      ],
    });
    expect(siteSearchLink(f).dropped).toEqual([
      'rarity (the site takes one: Rare, Crafted)',
      'pseudo stat',
      'corruption stat',
      'desecrated',
      'price note',
      'HR price',
      'class',
      'requirements',
      'seller',
      'online',
      'buyout',
      'listing age',
      'sort',
    ]);
    expect(query(f).params.map(([k]) => k)).toEqual(['is_hardcore', 'is_ladder']);
  });
});
