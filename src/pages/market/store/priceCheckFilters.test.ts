import { describe, expect, it } from 'vitest';
import type { ItemType as PD2Item } from '@/assets/itemFuzzySearch';
import type { Item } from '@/pages/price-check/lib/interfaces';
import { marketQueryToFilters, priceCheckToMarketFilters, type PriceCheckSearch } from './priceCheckFilters';

const stripIds = (filters: ReturnType<typeof marketQueryToFilters>) =>
  filters.stats?.map(({ id, ...rest }) => {
    expect(id).toEqual(expect.any(String));
    return rest;
  });

describe('marketQueryToFilters', () => {
  it('reads every price-check query field back into filters', () => {
    const filters = marketQueryToFilters(
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

  it('expands combined rows into real modifiers and fixes unprefixed names', () => {
    const filters = marketQueryToFilters(
      {
        'item.modifiers': {
          $all: [
            { $elemMatch: { name: 'all_resist', 'values.0': { $gte: 15 } } },
            { $elemMatch: { name: 'maxdamage_percent', 'values.0': { $gte: 200, $lte: 250 } } },
          ],
        },
      },
      true,
    );
    expect(filters).toMatchObject({ source: 'archive', maxAgeDays: 14 });
    expect(stripIds(filters)).toEqual([
      { kind: 'mod', key: 'fireresist', min: 15, enabled: true },
      { kind: 'mod', key: 'lightresist', min: 15, enabled: true },
      { kind: 'mod', key: 'coldresist', min: 15, enabled: true },
      { kind: 'mod', key: 'poisonresist', min: 15, enabled: true },
      { kind: 'mod', key: 'item_maxdamage_percent', min: 200, max: 250, enabled: true },
    ]);
  });

  it('reads the item name regex as the exact name and charm bases as their type', () => {
    expect(marketQueryToFilters({ 'item.name': { $regex: 'Spirit', $options: 'i' } }, false).itemName).toBe('Spirit');
    expect(
      marketQueryToFilters(
        { 'item.base.type_code': { $in: ['scha', 'mcha', 'lcha', 'torc'] }, 'item.base_code': 'cm3' },
        false,
      ),
    ).toMatchObject({ typeCode: 'lcha', baseCode: 'cm3' });
  });

  it('reads a grouped type ($in) as its Type option', () => {
    expect(marketQueryToFilters({ 'item.base.type_code': { $in: ['h2h', 'h2h2'] } }, false).typeCode).toBe(
      '{"$in": ["h2h", "h2h2"]}',
    );
  });

  it('leaves out an unknown quality and absent fields', () => {
    const filters = marketQueryToFilters({ 'item.quality.name': 'Weird' }, false);
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
