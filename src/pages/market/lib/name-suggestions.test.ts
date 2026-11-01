import { describe, expect, it } from 'vitest';
import type { CatalogItem, CatalogSearchHit } from '@/lib/catalog-search-api';
import { itemNameOption, itemNameOptions } from './catalog';
import { hitOption, itemNameSuggestions } from './name-suggestions';

const item = (name: string, quality: string | null): CatalogItem => ({
  baseCode: name.toLowerCase().replace(/\W+/g, '_'),
  name,
  quality,
});
const hit = (i: CatalogItem, matchedOn: CatalogSearchHit['matchedOn'], score = 300): CatalogSearchHit => ({
  item: i,
  score,
  matchedOn,
});

const HARLEQUIN = item('Harlequin Crest', 'Unique');
const ZOD = item('Zod Rune', null);

describe('hitOption', () => {
  it('is the local list entry itself, so a pick sets the same name filter', () => {
    expect(hitOption(HARLEQUIN)).toBe(itemNameOption('Harlequin Crest'));
    expect(hitOption(HARLEQUIN)).toBe(itemNameOptions('harlequin crest', 1)[0]);
    // The local list's quality wins over the catalog's (runes are bases there)
    expect(hitOption(ZOD)).toEqual({ name: 'Zod Rune', quality: 'Base', slot: 'Rune' });
  });

  it('folds catalog variants into the name the site lists', () => {
    expect(hitOption(item('Hellfire Torch (Amazon)', 'Unique'))).toBe(itemNameOption('Hellfire Torch'));
    expect(hitOption(item('Rainbow Facet (Cold 3/3)', 'Unique'))).toBe(itemNameOption('Rainbow Facet'));
  });

  it('keeps a unique or set the bundled list lacks, and drops what has no name filter', () => {
    expect(hitOption(item('Brand New Unique', 'Unique'))).toEqual({ name: 'Brand New Unique', quality: 'Unique' });
    expect(hitOption(item("Mephisto's Soulstone", null))).toBeNull();
    expect(hitOption(item('New Thing (Variant)', 'Unique'))).toBeNull();
  });
});

describe('itemNameSuggestions', () => {
  it('is the local list, highlighted, until the server answers', () => {
    const local = itemNameOptions('harle', 30);
    const out = itemNameSuggestions('harle', local, null, 30);
    expect(out.map((o) => o.name)).toEqual(local.map((o) => o.name));
    expect(out[0]).toMatchObject({ name: 'Harlequin Crest', highlight: { start: 0, end: 5 } });
  });

  it('puts server matches first, then the local ones, without duplicates or look-alikes', () => {
    const local = itemNameOptions('shako', 30);
    const out = itemNameSuggestions(
      'shako',
      local,
      [hit(HARLEQUIN, 'alias'), hit(item('Shadow Dancer', 'Unique'), 'fuzzy')],
      30,
    );
    expect(out.map((o) => [o.name, o.highlight, o.closeMatch])).toEqual([
      ['Harlequin Crest', undefined, undefined],
      ['Shako', { start: 0, end: 5 }, undefined],
    ]);
  });

  it('a nickname that is also part of the name is highlighted', () => {
    const out = itemNameSuggestions('zod', itemNameOptions('zod', 30), [hit(ZOD, 'alias')], 30);
    expect(out[0]).toEqual({ ...itemNameOption('Zod Rune'), highlight: { start: 0, end: 3 } });
  });

  it('typo matches show when nothing matches as typed, marked as close matches without a highlight', () => {
    for (const query of ['shko', 'harliquin']) {
      expect(itemNameSuggestions(query, [], [hit(HARLEQUIN, 'fuzzy')], 30)).toEqual([
        { ...itemNameOption('Harlequin Crest'), closeMatch: true },
      ]);
    }
  });

  it('of the typo matches, only those about as close as the best one', () => {
    const griffon = item("Griffon's Eye", 'Unique');
    const out = itemNameSuggestions(
      'griffs',
      [],
      [
        hit(griffon, 'fuzzy', 349.2),
        hit(item("Grim's Burning Dead", 'Unique'), 'fuzzy', 279.4),
        hit(item('Lidless Wall', 'Unique'), 'fuzzy', 279.4),
      ],
      30,
    );
    expect(out.map((o) => [o.name, o.closeMatch])).toEqual([["Griffon's Eye", true]]);
    const tied = [hit(HARLEQUIN, 'fuzzy', 315.3), hit(item('Shadow Dancer', 'Unique'), 'fuzzy', 315.3)];
    expect(itemNameSuggestions('shadw', [], tied, 30).map((o) => o.name)).toEqual(['Harlequin Crest', 'Shadow Dancer']);
  });
});
