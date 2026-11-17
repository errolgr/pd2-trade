import { describe, expect, it } from 'vitest';
import { defaultFilters } from '../lib/defaults';
import type { MarketPriceStats } from '../lib/price-stats';
import type { StatFilter } from '../lib/types';
import type { WtbRequest } from '../lib/wtb';
import { demandBarModel, demandBodies, othersBoxModel, othersOverlapBody, requestDifference } from './wtb-demand';

const NOW = Date.parse('2026-11-16T12:00:00Z');
const row = (id: string, key: string, extra: Partial<StatFilter> = {}): StatFilter => ({
  id,
  kind: 'mod',
  key,
  enabled: true,
  ...extra,
});
const request = (id: string, offer: WtbRequest['offer'], extra: Partial<WtbRequest> = {}): WtbRequest => ({
  id,
  buyer: { userId: `u-${id}`, name: `Buyer ${id}` },
  whisperTo: id,
  title: 'Rare Circlet',
  filters: { ...defaultFilters({ hardcore: false, ladder: true }), typeCode: 'circ', stats: [] },
  niceToHaveIds: [],
  offer,
  openToOffers: true,
  status: 'open',
  createdAt: '2026-11-15T12:00:00Z',
  bumpedAt: '2026-11-15T12:00:00Z',
  expiryDays: 7,
  updatedAt: '2026-11-15T12:00:00Z',
  expiresAt: '2026-11-20T12:00:00Z',
  ...extra,
});
const page = (items: WtbRequest[], total = items.length) => ({ items, nextCursor: null, total });
const stats = (over: Partial<MarketPriceStats> = {}): MarketPriceStats => ({
  count: 12,
  avg: 2,
  p25: 1.234,
  median: 2,
  p75: 3.456,
  histogram: [],
  ...over,
});

describe('demand bar', () => {
  const top = [
    request('a', { amount: 1, currency: 'Ber', hr: 3 }),
    request('b', { amount: 2, currency: 'HR', hr: 2 }),
    request('c', { amount: 1, currency: 'Ist', hr: null }),
  ];

  it('shows nothing until someone is buying, nor on the Wanted source', () => {
    const opts = { mine: null, priceStats: null, now: NOW };
    expect(demandBarModel('live', null, opts)).toBeNull();
    expect(demandBarModel('live', page([]), opts)).toBeNull();
    expect(demandBarModel('wanted', page(top), opts)).toBeNull();
  });

  it('Live: how many, the best offers (three), and whether the user has one open', () => {
    expect(demandBarModel('live', page(top, 7), { mine: [], priceStats: null, now: NOW })).toEqual({
      kind: 'live',
      count: 7,
      topOffers: ['1 Ber', '2 HR', '1 Ist'],
      includesYours: false,
    });
    const mine = (status: WtbRequest['status'], expiresAt = '2026-11-20T12:00:00Z') => [
      request('m', { amount: 1, currency: 'HR', hr: 1 }, { status, expiresAt }),
    ];
    const yours = (m: WtbRequest[]) => demandBarModel('live', page(top), { mine: m, priceStats: null, now: NOW });
    expect(yours(mine('open'))).toMatchObject({ includesYours: true });
    expect(yours(mine('paused'))).toMatchObject({ includesYours: false });
    expect(yours(mine('open', '2026-11-01T00:00:00Z'))).toMatchObject({ includesYours: false });
  });

  it('Sold archive: what it sold for (the archive results) and the open offers in HR', () => {
    expect(demandBarModel('archive', page(top, 4), { mine: null, priceStats: stats(), now: NOW })).toEqual({
      kind: 'archive',
      count: 4,
      sold: { low: 1.23, high: 3.46, count: 12 },
      offers: { low: 2, high: 3 },
    });
    const noSales = demandBarModel('archive', page([top[2]]), {
      mine: null,
      priceStats: stats({ count: 0, p25: null, p75: null }),
      now: NOW,
    });
    expect(noSales).toEqual({ kind: 'archive', count: 1, sold: null, offers: null });
  });
});

describe('others want this too', () => {
  const draft = { stats: [row('x', 'item_fastercastrate', { min: 20 })] };
  const same = request(
    'same',
    { amount: 2, currency: 'HR', hr: 2 },
    {
      filters: {
        ...request('s', { amount: 1, currency: 'HR', hr: 1 }).filters,
        stats: [row('y', 'item_fastercastrate', { min: 20 })],
      },
    },
  );
  const lower = request(
    'lower',
    { amount: 1, currency: 'Ber', hr: 3 },
    {
      filters: { ...same.filters, stats: [row('z', 'item_fastercastrate', { min: 10 })] },
    },
  );

  it('says how another request differs: the same stats, or its first different row and how many more', () => {
    expect(requestDifference(same, draft)).toEqual({ kind: 'same' });
    expect(requestDifference(lower, draft)).toEqual({ kind: 'row', text: '+10 Faster Cast Rate', more: 0 });
    const wider = {
      filters: {
        ...same.filters,
        stats: [
          row('z', 'item_fastercastrate', { min: 10 }),
          row('l', 'maxhp', { min: 30 }),
          row('m', 'maxmana', { min: 5 }),
        ],
      },
    };
    expect(requestDifference(wider, draft)).toMatchObject({ kind: 'row', text: '+10 Faster Cast Rate', more: 2 });
  });

  it("lists other users' requests only, at most three, with their age and how many there are; none: no box", () => {
    const opts = { userId: 'me', editingId: null, now: NOW };
    expect(othersBoxModel(null, draft, opts)).toBeNull();
    const box = othersBoxModel(page([lower, same]), draft, opts);
    expect(box?.count).toBe(2);
    expect(box?.rows.map(({ request: r, ...rest }) => ({ id: r.id, ...rest }))).toEqual([
      {
        id: 'lower',
        buyer: 'Buyer lower',
        age: '1d',
        difference: { kind: 'row', text: '+10 Faster Cast Rate', more: 0 },
        offer: '1 Ber',
      },
      { id: 'same', buyer: 'Buyer same', age: '1d', difference: { kind: 'same' }, offer: '2 HR' },
    ]);
    const many = ['a', 'b', 'c', 'd'].map((id) => request(id, { amount: 1, currency: 'HR', hr: 1 }));
    const paged = othersBoxModel(page(many, 12), draft, { ...opts, userId: null });
    expect(paged?.rows).toHaveLength(3);
    expect(paged?.count).toBe(12);
  });

  it('editing: never the request being edited, nor the user’s other ones (nor in the count)', () => {
    const edited = request('edited', { amount: 5, currency: 'HR', hr: 5 }, { buyer: { userId: 'me', name: 'Me' } });
    const otherOfMine = request('mine2', { amount: 4, currency: 'HR', hr: 4 }, { buyer: { userId: 'me', name: 'Me' } });
    expect(
      othersBoxModel(page([edited, otherOfMine]), draft, { userId: 'me', editingId: 'edited', now: NOW }),
    ).toBeNull();
    // Signed out (no user id), the edited one is still left out by id
    const box = othersBoxModel(page([edited, same]), draft, { userId: null, editingId: 'edited', now: NOW });
    expect(box?.rows.map((r) => r.request.id)).toEqual(['same']);
    expect(box?.count).toBe(1);
  });
});

// Regression: a Live search for a type only ("Circlet, Jewel": no stats, so not postable as is) showed neither the
// demand bar nor "Others want this too" (both were gated on the post rule instead of on naming an item)
describe('type-only search (Circlet, Jewel)', () => {
  const live = {
    ...defaultFilters({ hardcore: false, ladder: true }),
    source: 'live' as const,
    typeCode: '{"$in": ["circ", "jewl"]}',
    userOnlineGame: 'online' as const,
    maxAgeDays: 7,
  };
  const circlet = request('circ', { amount: 2, currency: 'HR', hr: 2 }, { buyer: { userId: 'errol', name: 'errol' } });
  const jewel = request(
    'jewl',
    { amount: 1, currency: 'Ist', hr: 0.15 },
    {
      buyer: { userId: 'hammer', name: 'HammerTime' },
      title: 'Rare Jewel',
      filters: { ...circlet.filters, typeCode: 'jewl' },
    },
  );

  it('asks for the overlapping requests: item and realm only, best offer first, and the user’s own on Live', () => {
    expect(demandBodies(live, true)).toEqual({
      body: {
        ladder: true,
        hardcore: false,
        typeCode: '{"$in": ["circ", "jewl"]}',
        overlap: true,
        sort: 'offer',
        limit: 3,
      },
      mineBody: {
        ladder: true,
        hardcore: false,
        typeCode: '{"$in": ["circ", "jewl"]}',
        overlap: true,
        sort: 'offer',
        limit: 50,
        mine: true,
      },
    });
    expect(demandBodies(live, false)?.mineBody).toBeNull();
    expect(demandBodies({ ...live, source: 'archive' }, true)).toMatchObject({ body: { limit: 50 }, mineBody: null });
  });

  it('no demand for stats alone, nor on the Wanted source', () => {
    const statsOnly = { ...live, typeCode: undefined, stats: [row('x', 'item_fastercastrate', { min: 20 })] };
    expect(demandBodies(statsOnly, true)).toBeNull();
    expect(demandBodies({ ...live, source: 'wanted' }, true)).toBeNull();
    expect(demandBodies(null, true)).toBeNull();
  });

  it('the server’s reply shows the bar: two buying, including yours, the best offers', () => {
    expect(demandBarModel('live', page([circlet, jewel]), { mine: [circlet], priceStats: null, now: NOW })).toEqual({
      kind: 'live',
      count: 2,
      topOffers: ['2 HR', '1 Ist'],
      includesYours: true,
    });
  });

  it("the post drawer asks too, and lists HammerTime's jewel (the user's own left out)", () => {
    expect(othersOverlapBody(live)).toMatchObject({ typeCode: '{"$in": ["circ", "jewl"]}', overlap: true, limit: 10 });
    expect(othersOverlapBody({ ...live, typeCode: undefined })).toBeNull();
    const box = othersBoxModel(page([circlet, jewel]), live, { userId: 'errol', editingId: null, now: NOW });
    expect(box?.count).toBe(1);
    expect(box?.rows.map((r) => [r.buyer, r.offer])).toEqual([['HammerTime', '1 Ist']]);
  });
});
