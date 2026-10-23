import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemType as PD2Item } from '@/assets/itemFuzzySearch';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { Item, Stat } from './interfaces';
import { StatId } from './stat-mappings';
import {
  buildGetAllUserMarketListingsQuery,
  buildGetMarketListingByStashItemQuery,
  buildGetMarketListingQuery,
  buildTradeUrl,
} from './tradeUrlBuilder';

type Filters = Record<string, { value?: string; min?: string; max?: string }>;

const SC_LADDER = { mode: 'softcore', ladder: 'ladder' };
const HC_NONLADDER = { mode: 'hardcore', ladder: 'non-ladder' };

const makeItem = (over: Partial<Item> = {}): Item => ({
  name: 'Some Item',
  quality: 'Rare',
  type: 'Monarch',
  iLevel: 85,
  stats: [],
  ...over,
});

const noMapped = undefined as unknown as PD2Item;

/** Builds the trade URL and returns its query params for assertions. */
function urlParams(
  item: Item,
  selected: string[] = [],
  filters: Filters = {},
  opts: {
    settings?: object;
    mapped?: PD2Item;
    statMapper?: (id: number, stat: Stat) => string | undefined;
    searchMode?: number;
    matched?: Parameters<typeof buildTradeUrl>[7];
    archive?: boolean;
    corrupted?: number;
    quality?: string;
  } = {},
) {
  const url = new URL(
    buildTradeUrl(
      item,
      opts.mapped ?? noMapped,
      new Set(selected),
      filters,
      opts.settings ?? SC_LADDER,
      opts.statMapper,
      opts.searchMode,
      opts.matched,
      opts.archive,
      opts.corrupted,
      opts.quality,
    ),
  );
  return { url, p: url.searchParams };
}

describe('buildTradeUrl', () => {
  it('targets the market page with realm flags and the item quality', () => {
    const { url, p } = urlParams(makeItem());
    expect(url.origin + url.pathname).toBe('https://www.projectdiablo2.com/market');
    expect(p.get('quality')).toBe('Rare');
    expect(p.get('is_hardcore')).toBe('false');
    expect(p.get('is_ladder')).toBe('true');
  });

  it('targets the archive page and hardcore non-ladder realm', () => {
    const { url, p } = urlParams(makeItem(), [], {}, { archive: true, settings: HC_NONLADDER });
    expect(url.pathname).toBe('/market/archive');
    expect(p.get('is_hardcore')).toBe('true');
    expect(p.get('is_ladder')).toBe('false');
  });

  it('applies the quality override', () => {
    expect(urlParams(makeItem(), [], {}, { quality: 'Unique' }).p.get('quality')).toBe('Unique');
  });

  it.each([
    [0, null],
    [1, 'true'],
    [2, 'false'],
  ])('corruptedState %i sets corrupted=%s regardless of selection', (state, expected) => {
    const item = makeItem({ stats: [{ stat_id: StatId.Corrupted, name: 'Corrupted' }] });
    expect(urlParams(item, ['id:360'], {}, { corrupted: state }).p.get('corrupted')).toBe(expected);
  });

  it('adds min/max for selected stats only, using the D2 property name', () => {
    const item = makeItem({
      stats: [
        { stat_id: 105, name: 'Faster Cast Rate', value: 20 },
        { stat_id: 7, name: 'Life', value: 40 },
      ],
    });
    const { p } = urlParams(item, ['id:105', 'id:4242'], { 'id:105': { min: '10', max: '20' }, 'id:7': { min: '1' } });
    expect(p.get('properties[item_fastercastrate][min]')).toBe('10');
    expect(p.get('properties[item_fastercastrate][max]')).toBe('20');
    expect([...p.keys()].some((k) => k.includes('maxhp'))).toBe(false);
  });

  it('omits empty min/max values', () => {
    const item = makeItem({ stats: [{ stat_id: 105, name: 'FCR', value: 20 }] });
    const { p } = urlParams(item, ['id:105'], { 'id:105': { min: '', max: '' } });
    expect([...p.keys()].some((k) => k.startsWith('properties'))).toBe(false);
  });

  it('lets a statMapper override the property name, falling back to stat_<id> for unknown stats', () => {
    const item = makeItem({
      stats: [
        { stat_id: 105, name: 'FCR', value: 20 },
        { stat_id: 4242, name: 'Mystery', value: 1 },
      ],
    });
    const statMapper = (id: number) => (id === 105 ? 'custom_fcr' : undefined);
    const { p } = urlParams(item, ['id:105', 'id:4242'], { 'id:105': { min: '5' }, 'id:4242': { min: '1' } }, { statMapper });
    expect(p.get('properties[custom_fcr][min]')).toBe('5');
    expect(p.get('properties[stat_4242][min]')).toBe('1');
  });

  it.each([
    ['Fire Ball', 'item_singleskill{47}'],
    ['Sorceress Skills', 'item_addclassskills{1}'],
    ['Fire Skills (Sorceress)', 'item_addskill_tab{8}'],
  ])('maps skill stat %s to %s', (skill, prop) => {
    const item = makeItem({ stats: [{ stat_id: 107, name: skill, skill, value: 2 }] });
    const key = `skill:${skill.toLowerCase()}`;
    expect(urlParams(item, [key], { [key]: { min: '2' } }).p.get(`properties[${prop}][min]`)).toBe('2');
  });

  it('maps socket filters to sockets_min/sockets_max', () => {
    const item = makeItem({ sockets: 4 });
    const { p } = urlParams(item, ['id:1000'], { 'id:1000': { min: '3', max: '4' } });
    expect(p.get('sockets_min')).toBe('3');
    expect(p.get('sockets_max')).toBe('4');
    expect([...p.keys()].some((k) => k.startsWith('properties'))).toBe(false);
  });

  it('ignores socket filters when the item has no socket row', () => {
    const { p } = urlParams(makeItem(), ['id:1000'], { 'id:1000': { min: '3' } });
    expect(p.has('sockets_min')).toBe(false);
  });

  it('adds ethereal=true only when the ethereal row is selected', () => {
    const item = makeItem({ isEthereal: true });
    expect(urlParams(item, ['id:1001']).p.get('ethereal')).toBe('true');
    expect(urlParams(item, []).p.has('ethereal')).toBe(false);
  });

  it('combines enhanced min/max damage into one maxdamage_percent row', () => {
    const item = makeItem({
      stats: [
        { stat_id: 17, name: 'ED max', value: 200 },
        { stat_id: 18, name: 'ED min', value: 200 },
      ],
    });
    const { p } = urlParams(item, ['id:998', 'id:17', 'id:18'], {
      'id:998': { min: '180' },
      'id:17': { min: '1' },
      'id:18': { min: '1' },
    });
    expect([...p.entries()].filter(([k]) => k.startsWith('properties'))).toEqual([
      ['properties[maxdamage_percent][min]', '180'],
    ]);
  });

  it('combines four equal resists into all_resist, but keeps unequal resists separate', () => {
    const resists = (cold: number): Stat[] => [
      { stat_id: 39, name: 'Fire', value: 15 },
      { stat_id: 41, name: 'Light', value: 15 },
      { stat_id: 43, name: 'Cold', value: cold },
      { stat_id: 45, name: 'Poison', value: 15 },
    ];
    const filters = { 'id:999': { min: '15' }, 'id:39': { min: '15' } };
    const equal = urlParams(makeItem({ stats: resists(15) }), ['id:999', 'id:39'], filters).p;
    expect(equal.get('properties[all_resist][min]')).toBe('15');
    expect(equal.has('properties[fireresist][min]')).toBe(false);

    const unequal = urlParams(makeItem({ stats: resists(20) }), ['id:999', 'id:39'], filters).p;
    expect(unequal.has('properties[all_resist][min]')).toBe(false);
    expect(unequal.get('properties[fireresist][min]')).toBe('15');
  });

  it('combines four equal attributes (incl. "to Strength" remapped by name) into all_attributes', () => {
    const item = makeItem({
      stats: [
        { stat_id: 9999, name: 'to Strength', value: 5 },
        { stat_id: 1, name: 'Energy', value: 5 },
        { stat_id: 2, name: 'Dexterity', value: 5 },
        { stat_id: 3, name: 'Vitality', value: 5 },
      ],
    });
    const { p } = urlParams(item, ['id:1002'], { 'id:1002': { min: '5' } });
    expect(p.get('properties[all_attributes][min]')).toBe('5');
  });

  it('never filters on stripped stats', () => {
    const item = makeItem({ stats: [{ stat_id: 56, name: 'Strip me', value: 1 }] });
    const { p } = urlParams(item, ['id:56'], { 'id:56': { min: '1' } });
    expect([...p.keys()].some((k) => k.startsWith('properties'))).toBe(false);
  });

  describe('item identity', () => {
    it('searches jewels by jewel type/base', () => {
      const { p } = urlParams(makeItem({ type: 'Jewel', quality: 'Magic' }));
      expect(p.get('type')).toBe('jewl');
      expect(p.get('base')).toBe('jew');
    });

    it('searches charms by charm types and the size-specific base', () => {
      const { p } = urlParams(makeItem({ type: 'Grand Charm', quality: 'Unique', name: 'Gheed' }));
      expect(JSON.parse(p.get('type')!)).toEqual({ $in: ['scha', 'mcha', 'lcha', 'torc'] });
      expect(p.get('base')).toBe('cm3');
      expect(p.has('name')).toBe(false);
    });

    it('searches runewords by runeword name even in typeLabel mode', () => {
      const item = makeItem({ quality: 'Normal', isRuneword: true, runeword: 'Spirit' });
      const matched = { typeLabel: 'Shield', typeValue: 'shie', bases: [] };
      const { p } = urlParams(item, [], {}, { searchMode: 1, matched });
      expect(p.get('name')).toBe('Spirit');
      expect(p.has('type')).toBe(false);
    });

    it('searches uniques by mapped name, falling back to the parsed name', () => {
      const unique = makeItem({ quality: 'Unique', name: 'stormshield' });
      expect(urlParams(unique, [], {}, { mapped: { name: 'Stormshield' } as PD2Item }).p.get('name')).toBe('Stormshield');
      expect(urlParams(unique).p.get('name')).toBe('stormshield');
    });

    it('ignores typeLabel mode for uniques', () => {
      const matched = { typeLabel: 'Shield', typeValue: 'shie', bases: [] };
      const { p } = urlParams(makeItem({ quality: 'Unique' }), [], {}, { searchMode: 1, matched });
      expect(p.get('name')).toBe('Some Item');
      expect(p.has('type')).toBe(false);
    });

    it('searches base qualities by category type and base code', () => {
      const { p } = urlParams(makeItem());
      expect(p.get('type')).toBe('shie');
      expect(p.get('base')).toBe('uit');
      expect(p.has('name')).toBe(false);
    });

    it('keeps $in category types as JSON strings in the URL', () => {
      const { p } = urlParams(makeItem({ type: 'Ring' }));
      expect(p.get('type')).toBe('{"$in": ["amul", "ring", "amus"]}');
      expect(p.get('base')).toBe('rin');
    });

    it('omits the base when it resolves to "Any"', () => {
      const { p } = urlParams(makeItem({ type: 'Any' }));
      expect(p.get('type')).toBe('2hcs');
      expect(p.has('base')).toBe(false);
    });

    it('searches by category only in typeLabel mode', () => {
      const matched = { typeLabel: 'Belt', typeValue: '{"$in": ["bels", "belt"]}', bases: [] };
      const { p } = urlParams(makeItem({ type: 'Belt' }), [], {}, { searchMode: 1, matched });
      expect(p.get('type')).toBe('{"$in": ["bels", "belt"]}');
      expect(p.has('base')).toBe(false);
    });

    it('omits type/base and warns for unknown base types', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { p } = urlParams(makeItem({ type: 'Mystery Box' }));
      expect(p.has('type')).toBe(false);
      expect(p.has('base')).toBe(false);
      expect(warn).toHaveBeenCalled();
    });
  });
});

describe('buildGetMarketListingQuery', () => {
  const NOW = new Date('2026-10-18T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function query(
    item: Item,
    selected: string[] = [],
    filters: Filters = {},
    opts: {
      settings?: object;
      mapped?: PD2Item;
      archive?: boolean;
      searchMode?: number;
      matched?: Parameters<typeof buildGetMarketListingQuery>[8];
      corrupted?: number;
      limit?: number;
      offset?: number;
      corruptions?: string[];
      quality?: string;
    } = {},
  ) {
    return buildGetMarketListingQuery(
      item,
      opts.mapped ?? noMapped,
      new Set(selected),
      filters,
      opts.settings ?? SC_LADDER,
      undefined,
      opts.archive,
      opts.searchMode,
      opts.matched,
      opts.corrupted,
      opts.limit,
      opts.offset,
      opts.corruptions,
      opts.quality,
    ) as Record<string, any>;
  }

  it('builds an open-listing query over the last 3 days, newest bump first', () => {
    const q = query(makeItem());
    expect(q).toMatchObject({
      type: 'item',
      $limit: 10,
      $skip: 0,
      accepted_offer_id: null,
      updated_at: { $gte: '2026-10-15T12:00:00.000Z' },
      $sort: { bumped_at: -1 },
      is_hardcore: false,
      is_ladder: true,
      'item.quality.name': 'Rare',
    });
    expect(q).not.toHaveProperty(['item.modifiers']);
    expect(q).not.toHaveProperty(['item.corrupted']);
  });

  it('looks back 14 days in archive mode and honors paging, realm and quality override', () => {
    const q = query(makeItem(), [], {}, { archive: true, limit: 50, offset: 100, settings: HC_NONLADDER, quality: 'Crafted' });
    expect(q.updated_at.$gte).toBe('2026-10-04T12:00:00.000Z');
    expect(q).toMatchObject({ $limit: 50, $skip: 100, is_hardcore: true, is_ladder: false, 'item.quality.name': 'Crafted' });
  });

  it.each([
    [1, true],
    [2, false],
  ])('corruptedState %i sets item.corrupted=%s', (state, expected) => {
    expect(query(makeItem(), [], {}, { corrupted: state })['item.corrupted']).toBe(expected);
  });

  it('requires all selected corruption names, and ignores an empty list', () => {
    expect(query(makeItem(), [], {}, { corruptions: ['a', 'b'] })['item.corruptions']).toEqual({ $all: ['a', 'b'] });
    expect(query(makeItem(), [], {}, { corruptions: [] })).not.toHaveProperty(['item.corruptions']);
  });

  it('turns stat filters into numeric $elemMatch modifiers', () => {
    const item = makeItem({
      stats: [
        { stat_id: 105, name: 'FCR', value: 20 },
        { stat_id: 7, name: 'Life', value: 40 },
        { stat_id: 4242, name: 'Unmapped', value: 1 },
      ],
    });
    const q = query(item, ['id:105', 'id:7', 'id:4242'], { 'id:105': { min: '10', max: '20' }, 'id:7': { min: '', max: '' } });
    expect(q['item.modifiers']).toEqual({
      $all: [
        { $elemMatch: { name: 'item_fastercastrate', 'values.0': { $gte: 10, $lte: 20 } } },
        { $elemMatch: { name: 'maxhp' } },
      ],
    });
  });

  it.each([
    ['Fire Ball', 'item_singleskill', 47],
    ['Sorceress Skills', 'item_addclassskills', 1],
    ['Fire Skills (Sorceress)', 'item_addskill_tab', 8],
  ])('matches skill %s as %s with the skill id in values.0 and the level range in values.1', (skill, name, id) => {
    const item = makeItem({ stats: [{ stat_id: 107, name: skill, skill, value: 3 }] });
    const key = `skill:${skill.toLowerCase()}`;
    expect(query(item, [key], { [key]: { min: '2', max: '3' } })['item.modifiers'].$all).toEqual([
      { $elemMatch: { name, 'values.0': id, 'values.1': { $gte: 2, $lte: 3 } } },
    ]);
    expect(query(item, [key])['item.modifiers'].$all).toEqual([{ $elemMatch: { name, 'values.0': id } }]);
  });

  it('merges socket min and max into one socket_count range', () => {
    const q = query(makeItem({ sockets: 4 }), ['id:1000'], { 'id:1000': { min: '2', max: '4' } });
    expect(q['item.socket_count']).toEqual({ $gte: 2, $lte: 4 });
    expect(q).not.toHaveProperty(['item.modifiers']);
  });

  it('filters on ethereal when the ethereal row is selected', () => {
    expect(query(makeItem({ isEthereal: true }), ['id:1001'])['item.is_ethereal']).toBe(true);
  });

  // BUG: tradeUrlBuilder.ts:216 checks `stat.stat_id === StatId.Ethereal || item.isEthereal`, so for an ethereal item
  // every selected regular/skill stat short-circuits to `is_ethereal` and its modifier filter is silently dropped.
  it.fails('keeps stat filters for ethereal items', () => {
    const item = makeItem({ isEthereal: true, stats: [{ stat_id: 105, name: 'FCR', value: 20 }] });
    const q = query(item, ['id:105'], { 'id:105': { min: '10' } });
    expect(q['item.modifiers']).toEqual({
      $all: [{ $elemMatch: { name: 'item_fastercastrate', 'values.0': { $gte: 10 } } }],
    });
  });

  describe('item identity', () => {
    it('matches jewels and charms by type/base code', () => {
      expect(query(makeItem({ type: 'Jewel' }))).toMatchObject({ 'item.base.type_code': 'jewl', 'item.base_code': 'jew' });
      expect(query(makeItem({ type: 'Small Charm', quality: 'Magic' }))).toMatchObject({
        'item.base.type_code': { $in: ['scha', 'mcha', 'lcha', 'torc'] },
        'item.base_code': 'cm1',
      });
    });

    it('matches runewords by case-insensitive runeword name', () => {
      const q = query(makeItem({ quality: 'Normal', isRuneword: true, runeword: 'Enigma' }));
      expect(q['item.name']).toEqual({ $regex: 'Enigma', $options: 'i' });
      expect(q).not.toHaveProperty(['item.base.type_code']);
    });

    it('matches uniques/sets by mapped name, else parsed name', () => {
      const unique = makeItem({ quality: 'Set', name: 'tal rasha' });
      expect(query(unique, [], {}, { mapped: { name: "Tal Rasha's Guardianship" } as PD2Item })['item.name']).toEqual({
        $regex: "Tal Rasha's Guardianship",
        $options: 'i',
      });
      expect(query(unique)['item.name'].$regex).toBe('tal rasha');
    });

    it('sends no name filter for a nameless item: PD2 answers an empty $regex with a 500', () => {
      const q = query(makeItem({ quality: 'Inferior', name: undefined, type: 'Short Sword' }));
      expect(q['item.quality.name']).toBe('Inferior');
      expect(q).not.toHaveProperty(['item.name']);
      expect(query(makeItem({ quality: 'Normal', isRuneword: true, name: '' }))).not.toHaveProperty(['item.name']);
    });

    it('parses $in category and base values into query objects', () => {
      expect(query(makeItem({ type: 'Ring' }))).toMatchObject({
        'item.base.type_code': { $in: ['amul', 'ring', 'amus'] },
        'item.base_code': 'rin',
      });
      expect(query(makeItem({ type: 'Flawless Diamond', quality: 'Normal' }))['item.base_code']).toEqual({
        $in: ['glw', 'glws'],
      });
    });

    it('omits base_code for "Any" and in typeLabel mode', () => {
      expect(query(makeItem({ type: 'Any' }))).not.toHaveProperty(['item.base_code']);
      const matched = { typeLabel: 'Shield', typeValue: 'shie', bases: [] };
      const q = query(makeItem(), [], {}, { searchMode: 1, matched });
      expect(q['item.base.type_code']).toBe('shie');
      expect(q).not.toHaveProperty(['item.base_code']);
    });

    it('omits type and warns for unknown bases', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(query(makeItem({ type: 'Mystery Box' }))).not.toHaveProperty(['item.base.type_code']);
      expect(warn).toHaveBeenCalled();
    });
  });
});

describe('buildGetMarketListingByStashItemQuery', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const stash = (hashes: Array<string | null | undefined>) => hashes.map((hash) => ({ hash }) as GameStashItem);

  it('returns null when no item has a hash', () => {
    expect(buildGetMarketListingByStashItemQuery(stash([null, undefined]), 'u1')).toBeNull();
    expect(buildGetMarketListingByStashItemQuery([], 'u1')).toBeNull();
  });

  it("queries the user's recent open listings for the stash hashes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T00:00:00.000Z'));
    const q = buildGetMarketListingByStashItemQuery(stash(['h1', null, 'h2']), 'u1') as Record<string, any>;
    expect(q).toMatchObject({
      user_id: 'u1',
      'item.hash': { $in: ['h1', 'h2'] },
      accepted_offer_id: null,
      updated_at: { $gte: '2026-10-15T00:00:00.000Z' },
    });
  });

  it('caps the hash list at 20 and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hashes = Array.from({ length: 25 }, (_, i) => `h${i}`);
    const q = buildGetMarketListingByStashItemQuery(stash(hashes), 'u1') as Record<string, any>;
    expect(q['item.hash'].$in).toEqual(hashes.slice(0, 20));
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('buildGetAllUserMarketListingsQuery', () => {
  it('pages through all open listings of a user in a realm', () => {
    expect(buildGetAllUserMarketListingsQuery('u1', true, false)).toMatchObject({
      user_id: 'u1',
      is_hardcore: true,
      is_ladder: false,
      $limit: 20,
      $skip: 0,
      accepted_offer_id: null,
    });
    expect(buildGetAllUserMarketListingsQuery('u1', false, true, 5, 10)).toMatchObject({ $limit: 5, $skip: 10 });
  });
});
