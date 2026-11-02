import { describe, expect, it } from 'vitest';
import { defaultFilters, mergeFilters } from './defaults';
import {
  bucketLight,
  bucketMarkers,
  codeCounts,
  facetShare,
  pickIndex,
  priceFilter,
  priceRange,
  wantsFacets,
  type IndexRange,
  type PriceBucket,
} from './facets';
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

describe('pickIndex (calendar-style range picking)', () => {
  const one = (i: number): IndexRange => ({ lo: i, hi: i });

  it('nothing picked: a pick is that option alone', () => {
    expect(pickIndex(null, 3)).toEqual(one(3));
  });

  it('one picked: another spans the range between them in either order; itself clears', () => {
    expect(pickIndex(one(3), 5)).toEqual({ lo: 3, hi: 5 });
    expect(pickIndex(one(5), 3)).toEqual({ lo: 3, hi: 5 });
    expect(pickIndex(one(3), 3)).toBeNull();
  });

  it('a range picked: any pick starts over with that option alone, inside the range or not', () => {
    expect(pickIndex({ lo: 3, hi: 5 }, 4)).toEqual(one(4));
    expect(pickIndex({ lo: 3, hi: 5 }, 5)).toEqual(one(5));
    expect(pickIndex({ lo: 3, hi: 5 }, 0)).toEqual(one(0));
  });
});

describe('facetShare', () => {
  it('is count / total, capped at 1, and 0 without a count or a total', () => {
    expect(facetShare(40, 64)).toBe(0.625);
    expect(facetShare(330, 330)).toBe(1);
    expect(facetShare(0, 10)).toBe(0);
    expect(facetShare(undefined, 10)).toBe(0);
    expect(facetShare(5, 0)).toBe(0);
  });
});

describe('codeCounts', () => {
  it('a list shorter than the service cap is every code found', () => {
    expect(codeCounts([{ value: 'helm', count: 3 }], 50)).toEqual({ byCode: new Map([['helm', 3]]), complete: true });
    const full = Array.from({ length: 20 }, (_, i) => ({ value: `b${i}`, count: 1 }));
    expect(codeCounts(full, 20)?.complete).toBe(false);
    expect(codeCounts(undefined, 20)).toBeUndefined();
  });
});

describe('price buckets', () => {
  const buckets: PriceBucket[] = [
    { from: 0, to: 0.5, count: 4 },
    { from: 0.5, to: 1, count: 8 },
    { from: 1, to: 2, count: 2 },
    { from: 2, to: null, count: 1 },
  ];

  it('a bucket range is the HR range between their outer edges, max exclusive; the open bucket has no max', () => {
    expect(priceFilter(buckets, { lo: 1, hi: 1 })).toEqual({ hrMin: 0.5, hrMax: 1, hrMaxExclusive: true });
    expect(priceFilter(buckets, { lo: 0, hi: 2 })).toEqual({ hrMin: 0, hrMax: 2, hrMaxExclusive: true });
    expect(priceFilter(buckets, { lo: 2, hi: 3 })).toEqual({ hrMin: 1, hrMax: undefined, hrMaxExclusive: undefined });
    expect(priceFilter(buckets, null)).toEqual({ hrMin: undefined, hrMax: undefined, hrMaxExclusive: undefined });
  });

  it('a bucket pick lights exactly its buckets (an exclusive max stops at the edge)', () => {
    const r = priceFilter(buckets, { lo: 1, hi: 2 });
    expect(priceRange(buckets, r)).toEqual({ lo: 1, hi: 2 });
    expect(buckets.map((b) => bucketLight(b, r))).toEqual([null, { from: 0, to: 1 }, { from: 0, to: 1 }, null]);
    expect(buckets.flatMap((b) => bucketMarkers(b, r))).toEqual([]);
  });

  it('a typed max inside a bucket lights it up to the interpolated point, inclusive at an edge', () => {
    expect(bucketLight(buckets[1], { hrMax: 0.7 })).toEqual({ from: 0, to: expect.closeTo(0.4) });
    expect(bucketMarkers(buckets[1], { hrMax: 0.7 })).toEqual([expect.closeTo(0.4)]);
    expect(priceRange(buckets, { hrMax: 0.7 })).toEqual({ lo: 0, hi: 1 });
    // A typed max of 1 is <= 1: it touches the bucket starting at 1, without lighting any of it
    expect(bucketLight(buckets[2], { hrMax: 1 })).toEqual({ from: 0, to: 0 });
    expect(bucketLight(buckets[2], { hrMax: 1, hrMaxExclusive: true })).toBeNull();
  });

  it('a typed min inside a bucket lights it from the point on; the open bucket is lit whole', () => {
    expect(bucketLight(buckets[2], { hrMin: 1.25 })).toEqual({ from: 0.25, to: 1 });
    expect(bucketMarkers(buckets[2], { hrMin: 1.25 })).toEqual([0.25]);
    expect(bucketLight(buckets[3], { hrMin: 50 })).toEqual({ from: 0, to: 1 });
    expect(bucketMarkers(buckets[3], { hrMin: 50 })).toEqual([]);
    expect(priceRange(buckets, { hrMin: 1.25 })).toEqual({ lo: 2, hi: 3 });
  });

  it('a range inside one bucket lights that part of it, with both markers; no range lights nothing', () => {
    expect(bucketLight(buckets[1], { hrMin: 0.6, hrMax: 0.8 })).toEqual({
      from: expect.closeTo(0.2),
      to: expect.closeTo(0.6),
    });
    expect(bucketMarkers(buckets[1], { hrMin: 0.6, hrMax: 0.8 })).toHaveLength(2);
    expect(priceRange(buckets, {})).toBeNull();
    expect(priceRange(buckets, { hrMin: 5, hrMax: 1 })).toBeNull();
  });
});
