import { describe, expect, it } from 'vitest';
import { allItems } from '@/assets/items';
import { createItemsMapByKey } from '@/lib/item-utils';
import type { ItemDetail } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { jewelElement, listingArtCandidates, listingArtUrl } from './listing-art';

const itemsByKey = createItemsMapByKey(allItems);
const art = (name: string, quality: string, baseName?: string) =>
  listingArtUrl(
    { name, quality: { id: 0, name: quality }, base: baseName ? { name: baseName } : undefined } as ItemDetail,
    itemsByKey,
  );

describe('listingArtUrl', () => {
  it("uses a unique's own art from the items database", () => {
    const invfile = itemsByKey['Harlequin Crest'].image.invfile;
    expect(art('Harlequin Crest', 'Unique', 'Shako')).toBe(`https://pd2trader.com/assets/items/${invfile}.png`);
  });

  it('falls back to base art for a unique the database does not know', () => {
    expect(art('Brand New Unique', 'Unique', 'Shako')).toBe('https://pd2trader.com/assets/items/invcap.png');
  });

  it('uses bundled art for runes, currency and uber items', () => {
    expect(art('Ohm Rune', 'Normal', 'Ohm Rune')).toBe('/runes/Ohm_Rune.png');
    expect(art("Larzuk's Puzzlebox", 'Normal')).toBe('/currency/Larzuks_Puzzlebox.png');
    expect(art("Trang-Oul's Jawbone", 'Normal')).toBe('/ubers/Trang_Ouls_Jawbone.png');
  });

  it('uses the base art of rares, runewords and jewelry, any tier', () => {
    expect(art('Enigma', 'Normal', 'Archon Plate')).toBe('https://pd2trader.com/assets/items/invltp.png');
    expect(art('Doom Band', 'Rare', 'Ring')).toBe('https://pd2trader.com/assets/items/invrin.png');
  });

  it('draws each charm at its own size, in the look its graphic_id picks', () => {
    const charm = (base: string, graphic_id?: number) =>
      listingArtUrl(
        { name: base, quality: { id: 4, name: 'Magic' }, base: { name: base }, graphic_id } as ItemDetail,
        itemsByKey,
      );
    expect(charm('Small Charm')).toBe('https://pd2trader.com/assets/items/invch1.png');
    expect(charm('Large Charm', 1)).toBe('https://pd2trader.com/assets/items/invch5.png');
    expect(charm('Grand Charm')).toBe('https://pd2trader.com/assets/items/invch3.png');
    expect(charm('Grand Charm', 2)).toBe('https://pd2trader.com/assets/items/invch9.png');
  });

  it('returns null when nothing matches', () => {
    expect(art('Mystery Thing', 'Normal', 'Mystery Thing')).toBeNull();
  });

  it('finds uniques whose database key differs from the listed name', () => {
    // key "Eschuta's temper", name "Eschuta's Temper"; its base (Eldritch Orb) has no base art
    expect(art("Eschuta's Temper", 'Unique', 'Eldritch Orb')).toBe('https://pd2trader.com/assets/items/invob2.png');
  });

  it('does not throw on an item PD2 lists without a name', () => {
    // A live PD2 listing: 8 T1 maps whose item has no name and whose base has none either
    const map = {
      quality: { id: 2, name: 'Normal' },
      base: { id: 't18', category: 'misc', type: 'Map T1', type_code: 't1m' },
      base_code: 't18',
      graphic_id: false,
      quantity: 8,
    } as unknown as ItemDetail;
    expect(listingArtUrl(map, itemsByKey)).toBeNull();
    expect(listingArtCandidates(map, itemsByKey)).toEqual([]);
    // Nameless with a named base: the base's art; nameless unique: no database lookup by name
    expect(listingArtUrl({ ...map, base: { name: 'Ring' } } as ItemDetail, itemsByKey)).toBe(
      'https://pd2trader.com/assets/items/invrin.png',
    );
    expect(listingArtUrl({ ...map, quality: { id: 7, name: 'Unique' } } as ItemDetail, itemsByKey)).toBeNull();
  });
});

describe('listingArtCandidates', () => {
  const item = (name: string, quality: string, baseName: string) =>
    ({ name, quality: { id: 0, name: quality }, base: { name: baseName } }) as ItemDetail;

  it('falls back from pd2trader.com art to the same file on projectdiablo2.com', () => {
    expect(listingArtCandidates(item('Doom Band', 'Rare', 'Ring'), itemsByKey)).toEqual([
      'https://pd2trader.com/assets/items/invrin.png',
      'https://projectdiablo2.com/image/items/invrin.png',
    ]);
  });

  it('keeps bundled art as the only candidate, and none when nothing matches', () => {
    expect(listingArtCandidates(item('Ohm Rune', 'Normal', 'Ohm Rune'), itemsByKey)).toEqual(['/runes/Ohm_Rune.png']);
    expect(listingArtCandidates(item('Mystery Thing', 'Normal', 'Mystery Thing'), itemsByKey)).toEqual([]);
  });
});

describe('jewel art', () => {
  const jewel = (name: string, quality: string, graphic_id: unknown, modifiers: { name: string }[] = []) =>
    ({
      name,
      quality: { id: 0, name: quality },
      base: { name: 'Jewel', type_code: 'jewl' },
      base_code: 'jew',
      graphic_id,
      modifiers,
    }) as unknown as ItemDetail;
  const url = (file: string) => `https://pd2trader.com/assets/items/${file}.png`;

  it('draws jewels as the site does: invgswe + (graphic_id + 1)', () => {
    expect(listingArtUrl(jewel('Ruby Jewel of Fervor', 'Magic', 0), itemsByKey)).toBe(url('invgswe1'));
    expect(listingArtUrl(jewel('Jewel', 'Rare', 5), itemsByKey)).toBe(url('invgswe6'));
    // No (or an unknown) graphic id: the plain white jewel
    expect(listingArtUrl(jewel('Jewel', 'Rare', false), itemsByKey)).toBe(url('invgswe'));
    expect(listingArtUrl(jewel('Jewel', 'Rare', 9), itemsByKey)).toBe(url('invgswe'));
  });

  it('draws Rainbow Facets by element, whatever their graphic id', () => {
    const facet = (mod: string) => jewel('Rainbow Facet', 'Unique', 3, [{ name: 'item_skillondeath' }, { name: mod }]);
    expect(listingArtUrl(facet('passive_fire_mastery'), itemsByKey)).toBe(url('invgswe5'));
    expect(listingArtUrl(facet('passive_cold_pierce'), itemsByKey)).toBe(url('invgswe2'));
    expect(listingArtUrl(facet('passive_ltng_mastery'), itemsByKey)).toBe(url('invgswe3'));
    expect(listingArtUrl(facet('passive_pois_mastery'), itemsByKey)).toBe(url('invgswe4'));
    expect(listingArtUrl(jewel('Rainbow Facet', 'Unique', 3), itemsByKey)).toBe(url('invgswe'));
  });

  it('reads the element from mod names', () => {
    expect(jewelElement([{ name: 'lightmindam' }])).toBe('lightning');
    expect(jewelElement([{ name: 'item_lightradius' }])).toBeNull();
    expect(jewelElement(undefined)).toBeNull();
  });
});
