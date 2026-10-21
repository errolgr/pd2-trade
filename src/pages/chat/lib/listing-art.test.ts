import { describe, expect, it } from 'vitest';
import { allItems } from '@/assets/items';
import { createItemsMapByKey } from '@/lib/item-utils';
import type { ItemDetail } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { listingArtCandidates, listingArtUrl } from './listing-art';

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
    expect(art('Grand Charm', 'Magic', 'Grand Charm')).toBe('https://pd2trader.com/assets/items/invch4.png');
  });

  it('returns null when nothing matches', () => {
    expect(art('Mystery Thing', 'Normal', 'Mystery Thing')).toBeNull();
  });

  it('finds uniques whose database key differs from the listed name', () => {
    // key "Eschuta's temper", name "Eschuta's Temper"; its base (Eldritch Orb) has no base art
    expect(art("Eschuta's Temper", 'Unique', 'Eldritch Orb')).toBe('https://pd2trader.com/assets/items/invob2.png');
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
