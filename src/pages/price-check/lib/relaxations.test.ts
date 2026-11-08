import { describe, expect, it } from 'vitest';
import type { ItemType as PD2Item } from '@/assets/itemFuzzySearch';
import type { PriceCheckSearch } from '@/pages/market/store/priceCheckFilters';
import type { Item } from './interfaces';
import { priceCheckRelaxations } from './relaxations';

const bow: Item = { name: 'Grim Fletch', quality: 'Rare', type: 'Ceremonial Bow', iLevel: 80, stats: [] };

const search = (over: Partial<PriceCheckSearch> = {}): PriceCheckSearch => ({
  item: bow,
  pd2Item: { name: 'Ceremonial Bow' } as unknown as PD2Item,
  selected: new Set(),
  filters: {},
  settings: { mode: 'softcore', ladder: 'ladder' },
  archive: false,
  searchMode: 0,
  matchedItemType: { typeLabel: 'Amazon Bow', typeValue: 'abow', bases: [] },
  corruptedState: 0,
  corruptionNames: [],
  ...over,
});

const sort = { by: 'bumped', dir: 'desc' } as const;
const can = { searchType: true, searchTypeGroup: true, anyQuality: false };

describe('priceCheckRelaxations', () => {
  it('widens a base search to its type, and a type search to its type group', () => {
    const fromBase = priceCheckRelaxations(search(), sort, can);
    expect(fromBase.map((r) => r.id)).toEqual(['type']);
    expect(fromBase[0].filters).toMatchObject({ typeCode: 'abow' });
    expect(fromBase[0].filters.baseCode).toBeUndefined();

    const fromType = priceCheckRelaxations(search({ searchMode: 1 }), sort, can);
    expect(fromType.map((r) => r.id)).toEqual(['typeGroup']);
    expect(fromType[0].filters).toMatchObject({ typeCode: 'group:bows' });

    expect(priceCheckRelaxations(search({ searchMode: 2 }), sort, can)).toEqual([]);
  });

  it("doesn't offer a type group the item's type has none of", () => {
    const orb = { typeLabel: 'Sorceress Orb', typeValue: 'orb', bases: [] };
    const relaxations = priceCheckRelaxations(search({ searchMode: 1, matchedItemType: orb }), sort, {
      ...can,
      searchTypeGroup: false,
    });
    expect(relaxations).toEqual([]);
  });
});
