import { describe, expect, it } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketFilters, ScoredListing } from '@/pages/market/lib/types';
import {
  applyPluginView,
  cellsByRow,
  MAX_PLUGIN_ROWS,
  pluginRows,
  rowsKey,
  toMarketQuery,
  toMarketRow,
} from './market';

const row = (
  id: string,
  over: Partial<MarketListingEntry> = {},
  extra: Partial<ScoredListing> = {},
): ScoredListing => ({
  listing: {
    _id: id,
    price: '',
    hr_price: 0,
    created_at: '2026-10-01T00:00:00.000Z',
    user: { username: 'seller' },
    item: {
      name: 'Harlequin Crest',
      base: { name: 'Shako' },
      quality: { id: 7, name: 'Unique' },
      modifiers: [],
    },
    ...over,
  } as unknown as MarketListingEntry, // test fixture: only the fields the adapter reads
  pseudo: {},
  score: null,
  value: null,
  ...extra,
});

const ids = (rows: ScoredListing[]) => rows.map((r) => r.listing._id);

describe('toMarketRow', () => {
  it('maps the listing, its mods in game order and the price', () => {
    const r = row(
      'a',
      {
        price: '2 ist',
        hr_price: 0.5,
        user_last_ingame: new Date().toISOString(),
        item: {
          name: 'Harlequin Crest',
          base: { name: 'Shako' },
          quality: { id: 7, name: 'Unique' },
          modifiers: [
            { name: 'maxhp', values: [40], label: '+40 to Life', priority: 1 },
            { name: 'item_allskills', values: [2], label: '+2 to All Skills', priority: 9, corrupted: true },
            { name: 'corrupted', values: [1], label: 'Corrupted', priority: 0 },
            { name: 'hidden', values: [1], label: '', priority: 5 },
          ],
        } as unknown as MarketListingEntry['item'],
      },
      { listedAt: '2026-10-02T00:00:00.000Z' },
    );
    const out = toMarketRow(r);
    expect(out).toMatchObject({
      id: 'a',
      name: 'Harlequin Crest',
      base: 'Shako',
      quality: 'unique',
      priceHr: 0.5,
      priceText: '2 ist',
      seller: 'seller',
      online: true,
      listedAt: '2026-10-02T00:00:00.000Z',
    });
    expect(out.stats.map((s) => s.text)).toEqual(['+2 to All Skills', '+40 to Life']);
    expect(out.stats[0]).toMatchObject({ value: 2, corrupted: true });
    // maxhp is stat 7
    expect(out.stats[1]).toEqual({ id: 7, text: '+40 to Life', value: 40 });
  });

  it('has no HR price for note-only listings and falls back to created_at', () => {
    const out = toMarketRow(row('b'));
    expect(out.priceHr).toBeNull();
    expect(out.online).toBe(false);
    expect(out.listedAt).toBe('2026-10-01T00:00:00.000Z');
  });
});

describe('toMarketQuery', () => {
  it('keeps the realm, source and item name only', () => {
    const filters = {
      source: 'archive',
      ladder: true,
      hardcore: false,
      itemName: 'Shako',
      rarity: [],
    } as unknown as MarketFilters;
    expect(toMarketQuery(filters)).toEqual({ source: 'archive', ladder: true, hardcore: false, itemName: 'Shako' });
    expect(toMarketQuery({ ...filters, itemName: undefined })).not.toHaveProperty('itemName');
  });
});

describe('page rows', () => {
  it('sends and keys at most MAX_PLUGIN_ROWS rows', () => {
    const rows = Array.from({ length: MAX_PLUGIN_ROWS + 5 }, (_, i) => row(`r${i}`));
    expect(pluginRows(rows)).toHaveLength(MAX_PLUGIN_ROWS);
    expect(rowsKey(rows.slice(0, 3))).toBe('r0,r1,r2');
  });
});

describe('cellsByRow', () => {
  it('groups cells per row in plugin order and skips empty text', () => {
    const cells = cellsByRow([
      { pluginId: 'p1', column: { title: 'Value', cells: { a: { text: '1.2x', tone: 'success' }, b: { text: '' } } } },
      { pluginId: 'p2', column: { title: 'Age', cells: { a: { text: 'new' } } } },
    ]);
    expect(cells.get('a')).toEqual([
      { pluginId: 'p1', title: 'Value', text: '1.2x', tone: 'success' },
      { pluginId: 'p2', title: 'Age', text: 'new' },
    ]);
    expect(cells.has('b')).toBe(false);
  });
});

describe('applyPluginView', () => {
  const rows = ['a', 'b', 'c', 'd'].map((id) => row(id));

  it('returns the rows themselves when nothing applies', () => {
    expect(applyPluginView(rows, [], null)).toBe(rows);
  });

  it('keeps only rows every active filter keeps', () => {
    const out = applyPluginView(
      rows,
      [
        { label: 'Cheap', keep: ['a', 'b', 'c'] },
        { label: 'Online', keep: ['b', 'c', 'd'] },
      ],
      null,
    );
    expect(ids(out)).toEqual(['b', 'c']);
  });

  it('sorts by score desc, ties stable, unscored rows last in their order', () => {
    const out = applyPluginView(rows, [], { label: 'Best', scores: { c: 1, a: 5, d: 5 } });
    expect(ids(out)).toEqual(['a', 'd', 'c', 'b']);
  });

  it('filters then sorts', () => {
    const out = applyPluginView(rows, [{ label: 'x', keep: ['b', 'c', 'd'] }], { label: 'y', scores: { b: 1, d: 2 } });
    expect(ids(out)).toEqual(['d', 'b', 'c']);
  });
});
