import { describe, expect, it } from 'vitest';
import type { ItemDetail } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { listingPriceCode } from './price-codes';

const item = (over: Record<string, unknown>) =>
  ({ is_identified: true, is_runeword: false, quality: { id: 2, name: 'Normal' }, ...over }) as unknown as ItemDetail;

describe('listingPriceCode', () => {
  it.each([
    [
      'a rune by its base id',
      item({ name: 'Ohm Rune', base_code: 'r27', base: { id: 'r27', name: 'Ohm Rune' } }),
      'r27'],
    ['a stacked rune without the s', item({ name: 'Ber Rune', base_code: 'r30s', base: { id: 'r30s' } }), 'r30'],
    ['a rune from base_code alone', item({ name: 'Jah Rune', base_code: 'r31' }), 'r31'],
    ['an uber ingredient', item({ name: 'Key of Terror', base_code: 'tes', base: { id: 'tes' } }), 'tes'],
    ['currency', item({ name: "Larzuk's Puzzlebox", base_code: 'lbox', base: { id: 'lbox' } }), 'lbox'],
    [
      'a tier 5 map',
      item({ name: 'Ruins of Viz-Jun', base_code: 't51', base: { id: 't51', type_code: 't5m' } }),
      't51'],
    [
      'a unique by normalized name',
      item({ name: 'Harlequin Crest', quality: { name: 'Unique' }, base: { name: 'Shako' } }),
      'harlequin_crest'],
    [
      'a set item with an apostrophe',
      item({ name: "Tal Rasha's Guardianship", quality: { name: 'Set' }, base: { name: 'Lacquered Plate' } }),
      'tal_rasha_s_guardianship'],
  ])('prices %s', (_, detail, code) => {
    expect(listingPriceCode(detail)).toBe(code);
  });

  it.each([
    [
      'runewords',
      item({
        name: 'Enigma',
        is_runeword: true,
        quality: { name: 'Normal' },
        base_code: 'xtp',
        base: { name: 'Mage Plate' },
      }),
    ],
    ['rares', item({ name: 'Grim Visage', quality: { name: 'Rare' }, base_code: 'uap', base: { name: 'Shako' } })],
    ['magic items', item({ name: 'Cobalt Small Charm', quality: { name: 'Magic' }, base_code: 'cm1' })],
    [
      'plain bases',
      item({ name: 'Monarch', quality: { name: 'Superior' }, base_code: 'uit', base: { name: 'Monarch' } }),
    ],
    [
      'per-variant uniques',
      item({ name: 'Hellfire Torch', quality: { name: 'Unique' }, base: { name: 'Large Charm' } }),
    ],
    [
      'uniques named after their base',
      item({ name: 'Hand Axe', quality: { name: 'Unique' }, base: { name: 'Hand Axe' } }),
    ],
    [
      'unidentified uniques',
      item({ name: 'Harlequin Crest', is_identified: false, quality: { name: 'Unique' }, base: { name: 'Shako' } }),
    ],
  ])('skips %s', (_, detail) => {
    expect(listingPriceCode(detail)).toBeNull();
  });
});
