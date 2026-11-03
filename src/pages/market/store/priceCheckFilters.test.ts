import { describe, expect, it } from 'vitest';
import type { ItemType as PD2Item } from '@/assets/itemFuzzySearch';
import type { Item } from '@/pages/price-check/lib/interfaces';
import type { MarketFilters } from '@/pages/market/lib/types';
import {
  marketQueryToFilters,
  priceCheckMarketSearch,
  priceCheckToMarketFilters,
  type PriceCheckSearch,
} from './priceCheckFilters';

const stripIds = (filters: Partial<MarketFilters>) =>
  filters.stats?.map(({ id, ...rest }) => {
    expect(id).toEqual(expect.any(String));
    return rest;
  });

const read = (query: Record<string, unknown>, archive = false) => marketQueryToFilters(query, archive).filters;

describe('marketQueryToFilters', () => {
  it('reads every price-check query field back into filters', () => {
    const filters = read(
      {
        is_hardcore: true,
        is_ladder: false,
        'item.quality.name': 'Rare',
        'item.base.type_code': 'circ',
        'item.base_code': 'ci0',
        'item.corrupted': true,
        'item.corruptions': { $all: ['item_fastercastrate'] },
        'item.is_ethereal': true,
        'item.socket_count': { $gte: 1, $lte: 2 },
        'item.modifiers': {
          $all: [
            { $elemMatch: { name: 'item_fastercastrate', 'values.0': { $gte: 20 } } },
            { $elemMatch: { name: 'item_singleskill', 'values.0': 54, 'values.1': { $gte: 2, $lte: 3 } } },
            { $elemMatch: { name: 'item_addskill_tab', 'values.0': 25 } },
          ],
        },
      },
      false,
    );
    expect(filters).toMatchObject({
      source: 'live',
      maxAgeDays: 3,
      hardcore: true,
      ladder: false,
      rarity: ['Rare'],
      typeCode: 'circ',
      baseCode: 'ci0',
      corrupted: 'yes',
      ethereal: 'yes',
      socketsMin: 1,
      socketsMax: 2,
    });
    expect(stripIds(filters)).toEqual([
      { kind: 'mod', key: 'item_fastercastrate', min: 20, enabled: true },
      { kind: 'mod', key: 'item_singleskill{54}', min: 2, max: 3, enabled: true },
      { kind: 'mod', key: 'item_addskill_tab{25}', enabled: true },
      { kind: 'corruption', key: 'item_fastercastrate', enabled: true },
    ]);
  });

  // Listings carry these lines under these names; renaming or splitting them found nothing (ED) or only items
  // rolling four separate resists / attributes (All Resistances, All Attributes)
  it('keeps Enhanced Damage, All Resistances and All Attributes as the single modifiers listings carry', () => {
    const filters = read(
      {
        'item.modifiers': {
          $all: [
            { $elemMatch: { name: 'all_resist', 'values.0': { $gte: 15 } } },
            { $elemMatch: { name: 'all_attributes', 'values.0': { $gte: 5 } } },
            { $elemMatch: { name: 'maxdamage_percent', 'values.0': { $gte: 200, $lte: 250 } } },
          ],
        },
      },
      true,
    );
    expect(filters).toMatchObject({ source: 'archive', maxAgeDays: 14 });
    expect(stripIds(filters)).toEqual([
      { kind: 'mod', key: 'all_resist', min: 15, enabled: true },
      { kind: 'mod', key: 'all_attributes', min: 5, enabled: true },
      { kind: 'mod', key: 'maxdamage_percent', min: 200, max: 250, enabled: true },
    ]);
  });

  it('writes skill-parameterised, multi-value and damage rows in the service key grammar', () => {
    const { filters, gaps } = marketQueryToFilters(
      {
        'item.modifiers': {
          $all: [
            // Chance to cast: skill in values.1, level rolled in values.0
            { $elemMatch: { name: 'item_skillongethit', 'values.1': 44, 'values.0': { $gte: 15 } } },
            // A skill known by several ids (an aura and its proc)
            { $elemMatch: { name: 'item_aura', 'values.0': { $in: [98, 123] }, 'values.1': { $gte: 5 } } },
            { $elemMatch: { name: 'item_charged_skill', 'values.1': { $in: [36, 522] } } },
            // An unparameterised roll in values.2
            { $elemMatch: { name: 'item_splashonhit', 'values.2': { $gte: 50 } } },
            // One elemental damage line: min in values.0, max rolled in values.1
            {
              $elemMatch: {
                name: { $in: ['firedam', 'firemindam'] },
                'values.0': { $gte: 4 },
                'values.1': { $gte: 14, $lte: 20 },
              },
            },
            { $elemMatch: { name: { $in: ['colddam', 'coldmindam'] }, 'values.1': { $gte: 10 } } },
          ],
        },
      },
      false,
    );
    expect(gaps).toEqual([]);
    expect(stripIds(filters)).toEqual([
      { kind: 'mod', key: 'item_skillongethit{*,44}[0]', min: 15, enabled: true },
      { kind: 'mod', key: 'item_aura{98|123}', min: 5, enabled: true },
      { kind: 'mod', key: 'item_charged_skill{*,36|522}', enabled: true },
      { kind: 'mod', key: 'item_splashonhit[2]', min: 50, enabled: true },
      { kind: 'mod', key: 'firedam|firemindam{4..}', min: 14, max: 20, enabled: true },
      { kind: 'mod', key: 'colddam|coldmindam[1]', min: 10, enabled: true },
    ]);
  });

  it('reports a skill matched by its label as a gap', () => {
    const { gaps } = marketQueryToFilters(
      {
        'item.modifiers': {
          $all: [
            { $elemMatch: { name: 'item_aura', label: { $regex: '^Level \\d+ Foo Aura' }, 'values.1': { $gte: 3 } } },
          ],
        },
      },
      false,
    );
    expect(gaps).toEqual(['label']);
  });

  it('reads the item name regex as the exact name and charm bases as their type', () => {
    expect(read({ 'item.name': { $regex: 'Spirit', $options: 'i' } }).itemName).toBe('Spirit');
    expect(
      read({ 'item.base.type_code': { $in: ['scha', 'mcha', 'lcha', 'torc'] }, 'item.base_code': 'cm3' }),
    ).toMatchObject({ typeCode: 'lcha', baseCode: 'cm3' });
  });

  it('reads a grouped type or base ($in) as its catalog option', () => {
    expect(read({ 'item.base.type_code': { $in: ['h2h', 'h2h2'] } }).typeCode).toBe('{"$in": ["h2h", "h2h2"]}');
    expect(read({ 'item.base_code': { $in: ['glw', 'glws'] } }).baseCode).toBe('{"$in": ["glw", "glws"]}');
  });

  it('reads several qualities ($in, the price check\'s "Any") as a multi-rarity filter', () => {
    expect(read({ 'item.quality.name': { $in: ['Normal', 'Superior', 'Magic', 'Rare', 'Crafted'] } }).rarity).toEqual([
      'Normal',
      'Superior',
      'Magic',
      'Rare',
      'Crafted',
    ]);
  });

  it('leaves out an unknown quality and absent fields', () => {
    const filters = read({ 'item.quality.name': 'Weird' });
    expect(filters.rarity).toBeUndefined();
    expect(filters.corrupted).toBeUndefined();
    expect(filters.stats).toEqual([]);
  });
});

describe('priceCheckToMarketFilters', () => {
  const shako: Item = {
    name: 'Harlequin Crest',
    quality: 'Unique',
    type: 'Shako',
    iLevel: 80,
    isEthereal: true,
    sockets: 1,
    stats: [
      { stat_id: 105, name: 'Faster Cast Rate', value: 20 },
      { stat_id: 107, name: 'to Teleport', value: 3, skill: 'Teleport' },
      { stat_id: 7, name: 'Life', value: 100 },
    ],
  };
  const search = (over: Partial<PriceCheckSearch> = {}): PriceCheckSearch => ({
    item: shako,
    pd2Item: { name: 'Harlequin Crest' } as unknown as PD2Item,
    selected: new Set(['id:105', 'skill:teleport', 'id:1000']),
    filters: {
      'id:105': { min: '20', max: '' },
      'skill:teleport': { min: '2', max: '3' },
      'id:1000': { min: '1', max: '1' },
    },
    settings: { mode: 'softcore', ladder: 'ladder' },
    archive: false,
    searchMode: 0,
    matchedItemType: null,
    corruptedState: 2,
    corruptionNames: [],
    ...over,
  });

  it('carries the item, the selected stats and their ranges', () => {
    const filters = priceCheckToMarketFilters(search());
    expect(filters).toMatchObject({
      hardcore: false,
      ladder: true,
      itemName: 'Harlequin Crest',
      rarity: ['Unique'],
      corrupted: 'no',
      socketsMin: 1,
      socketsMax: 1,
      ethereal: 'any',
    });
    expect(stripIds(filters)).toEqual([
      { kind: 'mod', key: 'item_fastercastrate', min: 20, enabled: true },
      { kind: 'mod', key: 'item_singleskill{54}', min: 2, max: 3, enabled: true },
    ]);
  });

  it('filters ethereal only when the Ethereal row is selected', () => {
    const selected = new Set(['id:105', 'id:1001']);
    const filters = priceCheckToMarketFilters(search({ selected }));
    expect(filters.ethereal).toBe('yes');
    expect(stripIds(filters)).toEqual([{ kind: 'mod', key: 'item_fastercastrate', min: 20, enabled: true }]);
  });

  it('switches to the sold archive window', () => {
    expect(priceCheckToMarketFilters(search({ archive: true }))).toMatchObject({ source: 'archive', maxAgeDays: 14 });
  });

  it('searches a runeword as a Runeword, whatever its base quality', () => {
    const spirit: Item = {
      name: 'Spirit',
      quality: 'Normal',
      type: 'Monarch',
      isRuneword: true,
      runeword: 'Spirit',
      iLevel: 80,
      stats: [],
    };
    const { filters, gaps } = priceCheckMarketSearch(search({ item: spirit, selected: new Set(), filters: {} }));
    expect(filters).toMatchObject({ itemName: 'Spirit', rarity: ['Runeword'] });
    expect(gaps).toEqual([]);
  });

  it('sends selected pseudo rows as pseudo filters, not PD2 modifiers', () => {
    const selected = new Set(['id:105', 'pseudo:pseudo_total_res', 'pseudo:pseudo_fire_res']);
    const filters = priceCheckToMarketFilters(
      search({
        selected,
        filters: {
          'id:105': { min: '20', max: '' },
          'pseudo:pseudo_total_res': { min: '80', max: '' },
          'pseudo:pseudo_fire_res': { min: '30', max: '45' },
        },
      }),
    );
    expect(stripIds(filters)).toEqual([
      { kind: 'mod', key: 'item_fastercastrate', min: 20, enabled: true },
      { kind: 'pseudo', key: 'pseudo_total_res', min: 80, enabled: true },
      { kind: 'pseudo', key: 'pseudo_fire_res', min: 30, max: 45, enabled: true },
    ]);
  });
});
