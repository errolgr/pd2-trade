import { describe, expect, it } from 'vitest';
import { defaultFilters } from '../lib/defaults';
import type { MarketFilters, StatFilter } from '../lib/types';
import type { WtbItemMatch, WtbRequest } from '../lib/wtb';
import {
  buyerChipModel,
  itemStatValues,
  metStats,
  nearMisses,
  stashItemSearch,
  statValueOf,
  valueFor,
} from './wtb-chip';

const row = (id: string, key: string, extra: Partial<StatFilter> = {}): StatFilter => ({
  id,
  kind: 'mod',
  key,
  enabled: true,
  ...extra,
});
const request = (id: string, extra: Partial<WtbRequest> = {}, filters: Partial<MarketFilters> = {}): WtbRequest => ({
  id,
  buyer: { userId: `u-${id}`, name: `Buyer ${id}` },
  whisperTo: 'BuyerAcc',
  title: 'Rare Circlet',
  filters: {
    ...defaultFilters({ hardcore: false, ladder: true }),
    typeCode: 'circ',
    rarity: ['Rare'],
    stats: [
      row('fcr', 'item_fastercastrate', { min: 20 }),
      row('life', 'maxhp', { min: 30 }),
      row('cs', 'item_allskills', { kind: 'corruption', min: 1 }),
    ],
    ...filters,
  },
  niceToHaveIds: ['life'],
  offer: { amount: 1, currency: 'Ber', hr: 3 },
  openToOffers: true,
  status: 'open',
  createdAt: '2026-11-15T12:00:00Z',
  bumpedAt: '2026-11-15T12:00:00Z',
  expiryDays: 7,
  updatedAt: '2026-11-15T12:00:00Z',
  expiresAt: '2026-11-20T12:00:00Z',
  ...extra,
});
const match = (r: WtbRequest, niceMet = false): WtbItemMatch => ({
  request: r,
  niceToHave: [{ id: 'life', met: niceMet }],
});

describe('buyerChipModel', () => {
  it('no chip without an exact match', () => {
    expect(buyerChipModel([])).toBeNull();
  });

  it('counts the matches and shows the best offer', () => {
    const chip = buyerChipModel([
      match(request('a', { offer: { amount: 2, currency: 'HR', hr: 2 } })),
      match(request('b')),
    ]);
    expect(chip).toEqual({ count: 2, bestOffer: '1 Ber' });
  });
});

describe('values', () => {
  it('reads the rolls by key, falling back to an alias sharing a name', () => {
    const values = itemStatValues([
      { key: 'item_fastercastrate', min: 20 },
      { key: 'maxhp', min: undefined },
    ]);
    expect(valueFor('item_fastercastrate', values)).toBe(20);
    expect(valueFor('maxhp', values)).toBeNull();
    expect(valueFor('item_fastercastrate|item_fcr_alias', values)).toBe(20);
  });

  it('metStats: every required row and the nice-to-haves the item has', () => {
    const valueOf = statValueOf(
      new Map([
        ['item_fastercastrate', 25],
        ['item_allskills', 1],
      ]),
    );
    expect(metStats(match(request('a')), valueOf).map((m) => m.value)).toEqual([25, 1]);
    expect(metStats(match(request('a'), true), valueOf)).toHaveLength(3);
  });
});

describe('nearMisses', () => {
  it('keeps requests missing exactly one required stat, leaving out exact matches', () => {
    const one = request('one');
    const two = request(
      'two',
      {},
      { stats: [row('fcr', 'item_fastercastrate', { min: 30 }), row('res', 'all_res', { min: 20 })] },
    );
    const exact = request('exact');
    const valueOf = statValueOf(new Map([['item_fastercastrate', 20]]));
    const near = nearMisses([one, two, exact], valueOf, new Set(['exact']));
    expect(near.map((n) => n.request.id)).toEqual(['one']);
    expect(near[0].yourValue).toBeNull();
  });

  it('reports the value the item has when it falls short', () => {
    const r = request('short', { niceToHaveIds: [] }, { stats: [row('fcr', 'item_fastercastrate', { min: 30 })] });
    const near = nearMisses([r], statValueOf(new Map([['item_fastercastrate', 20]])), new Set());
    expect(near).toHaveLength(1);
    expect(near[0].yourValue).toBe(20);
  });
});

describe('stashItemSearch', () => {
  it('searches a unique by name, anything else by base', () => {
    const realm = { hardcore: false, ladder: true };
    expect(stashItemSearch({ name: 'Harlequin Crest', base_code: 'uap' }, realm)).toMatchObject({
      itemName: 'Harlequin Crest',
    });
    const rare = stashItemSearch({ name: 'Grim Visage', base_code: 'ci0' }, realm);
    expect(rare).toMatchObject({ baseCode: 'ci0' });
    expect(rare.itemName).toBeFalsy();
  });
});
