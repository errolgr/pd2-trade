import { describe, expect, it } from 'vitest';
import { defaultFilters, mergeFilters } from './defaults';
import { wantsFacets } from './facets';
import type { MarketFilters } from './types';

const realm = { hardcore: false, ladder: true };
const base = () => defaultFilters(realm);

describe('wantsFacets', () => {
  it('skips the default search, whatever the saved search defaults are', () => {
    expect(wantsFacets(base())).toBe(false);
    const userDefaults = defaultFilters(realm, {
      sort: { by: 'price', dir: 'asc' },
      userOnlineSite: 'online',
      userOnlineGame: 'online',
      hasBuyout: 'yes',
      maxAgeDays: 3,
    });
    expect(wantsFacets(userDefaults)).toBe(false);
    expect(wantsFacets(mergeFilters(base(), { hardcore: true, ladder: false, source: 'archive' }))).toBe(false);
  });

  it('treats cleared optional filters and empty requirements as the default search', () => {
    expect(wantsFacets(mergeFilters(base(), { itemName: undefined, socketsMin: undefined, requirements: {} }))).toBe(
      false,
    );
    expect(wantsFacets(mergeFilters(base(), { itemName: '' }))).toBe(false);
  });

  it.each<[string, Partial<MarketFilters>]>([
    ['item name', { itemName: 'Harlequin Crest' }],
    ['type', { typeCode: 'ring' }],
    ['rarity', { rarity: ['Unique'] }],
    ['a yes/no flag', { corrupted: 'yes' }],
    ['a socket bound of 0', { socketsMax: 0 }],
    ['an HR range', { hrMin: 0.5 }],
    ['a requirement', { requirements: { level: { max: 60 } } as MarketFilters['requirements'] }],
    ['a stat row', { stats: [{ key: 'item_fastercastrate', min: 20 }] as MarketFilters['stats'] }],
    ['a seller', { sellerName: 'someone' }],
    ['history statuses', { status: ['removed'] }],
  ])('asks for facets once a search narrows by %s', (_, partial) => {
    expect(wantsFacets(mergeFilters(base(), partial))).toBe(true);
  });
});
