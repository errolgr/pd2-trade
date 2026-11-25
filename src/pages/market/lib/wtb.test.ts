import { describe, expect, it } from 'vitest';
import { defaultFilters } from './defaults';
import type { MarketFilters, StatFilter } from './types';
import {
  isValidOfferAmount,
  listPriceFor,
  matchSummary,
  niceToHaveIdsFor,
  requiredRows,
  toggleNiceToHave,
  wtbDaysLeft,
  wtbExpiringSoon,
  isPostBlocker,
  postBlocker,
  offerToHr,
  wtbBoardFilters,
  wtbOverlapBody,
  wtbSearchBody,
  wtbSearchFilters,
  wtbWhisper,
  type WtbCurrency,
  type WtbItemMatch,
  type WtbRequest,
} from './wtb';

const row = (id: string, key: string, extra: Partial<StatFilter> = {}): StatFilter => ({
  id,
  kind: 'mod',
  key,
  enabled: true,
  ...extra,
});

const filters = (extra: Partial<MarketFilters> = {}): MarketFilters => ({
  ...defaultFilters({ hardcore: false, ladder: true }),
  ...extra,
});

const request = (extra: Partial<WtbRequest> = {}): WtbRequest => ({
  id: 'r1',
  buyer: { userId: 'u1', name: 'Buyer' },
  whisperTo: 'BuyerAcc',
  title: 'Rare Circlet',
  filters: filters({ typeCode: 'circ', stats: [row('a', 'item_fastercastrate', { min: 20 }), row('b', 'item_maxhp')] }),
  niceToHaveIds: ['b'],
  offer: { amount: 2, currency: 'HR', hr: 2 },
  openToOffers: true,
  status: 'open',
  createdAt: '2026-11-10T00:00:00Z',
  bumpedAt: '2026-11-10T00:00:00Z',
  expiryDays: 7,
  updatedAt: '2026-11-10T00:00:00Z',
  expiresAt: '2026-11-17T00:00:00Z',
  ...extra,
});

describe('whisper text', () => {
  it('is the contract wording to the buyer account, one line', () => {
    expect(wtbWhisper(request())).toBe('/w *BuyerAcc Hi! I have the Rare Circlet you want for 2 HR (pd2trader)');
    expect(
      wtbWhisper(
        request({ whisperTo: '*Acc', title: 'Shako\nnow', offer: { amount: 1.5, currency: 'Ber', hr: null } }),
      ),
    ).toBe('/w *Acc Hi! I have the Shako now you want for 1.5 Ber (pd2trader)');
  });
});

describe('Must / Nice', () => {
  it('toggles a row in and out of niceToHaveIds', () => {
    expect(toggleNiceToHave([], 'a')).toEqual(['a']);
    expect(toggleNiceToHave(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('keeps only ids of enabled rows still in the filters', () => {
    const f = filters({ stats: [row('a', 'k1'), row('b', 'k2', { enabled: false })] });
    expect(niceToHaveIdsFor(f, ['a', 'b', 'gone'])).toEqual(['a']);
  });

  it('required rows leave out nice-to-have, any-of and excluded rows', () => {
    const f = filters({
      stats: [row('a', 'k1'), row('b', 'k2'), row('c', 'k3', { or: 1 }), row('d', 'k4', { not: true })],
    });
    expect(requiredRows(f, ['b']).map((s) => s.id)).toEqual(['a']);
  });
});

describe('postBlocker (WTB_POST_RULE v2)', () => {
  const fcr = row('a', 'item_fastercastrate', { min: 20 });

  it('item: stats alone say nothing about which item', () => {
    expect(postBlocker(filters({ stats: [fcr] }), [])).toBe('item');
    expect(postBlocker(filters({ rarity: ['Rare'], ethereal: 'yes' }), [])).toBe('item');
  });

  it('detail: a type (and rarity) without a required stat, sockets or ethereal', () => {
    expect(postBlocker(filters({ typeCode: 'circ' }), [])).toBe('detail');
    expect(postBlocker(filters({ typeCode: 'circ', rarity: ['Rare'] }), [])).toBe('detail');
    expect(postBlocker(filters({ typeCode: 'circ', ethereal: 'no' }), [])).toBe('detail');
  });

  it('detail: nice-to-have, any-of and excluded rows are not required', () => {
    expect(postBlocker(filters({ typeCode: 'circ', stats: [fcr] }), ['a'])).toBe('detail');
    const optional = [row('b', 'item_maxhp', { or: 1 }), row('c', 'item_maxmana', { not: true })];
    expect(postBlocker(filters({ baseCode: 'ci3', stats: optional }), [])).toBe('detail');
    expect(postBlocker(filters({ typeCode: 'circ', stats: [{ ...fcr, enabled: false }] }), [])).toBe('detail');
  });

  it('postable: a type with a required stat, a socket count or ethereal', () => {
    expect(postBlocker(filters({ typeCode: 'circ', stats: [fcr] }), [])).toBeNull();
    expect(postBlocker(filters({ typeCode: 'circ', socketsMin: 2 }), [])).toBeNull();
    expect(postBlocker(filters({ typeCode: 'circ', socketsMax: 0 }), [])).toBeNull();
    expect(postBlocker(filters({ baseCode: 'ci3', ethereal: 'yes' }), [])).toBeNull();
  });

  it('postable: an item name alone', () => {
    expect(postBlocker(filters({ itemName: 'Harlequin Crest' }), [])).toBeNull();
    expect(postBlocker(filters({ itemName: 'Enigma', stats: [fcr] }), ['a'])).toBeNull();
  });

  it('only explains rules it knows', () => {
    expect([isPostBlocker('item'), isPostBlocker('detail'), isPostBlocker('other'), isPostBlocker(null)]).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });
});

describe('offer', () => {
  it('takes amounts above 0, up to 1000, at most 2 decimals', () => {
    expect([0.01, 2, 1000, 12.5].every(isValidOfferAmount)).toBe(true);
    expect([undefined, 0, -1, 1000.5, 1.234, NaN].some(isValidOfferAmount)).toBe(false);
  });

  it('lists at the HR value when known, else as a note', () => {
    expect(listPriceFor({ amount: 2, currency: 'HR', hr: 2 })).toEqual({ price: 2 });
    expect(listPriceFor({ amount: 1, currency: 'Ber', hr: 1.333 })).toEqual({ price: 1.33 });
    expect(listPriceFor({ amount: 3, currency: 'Ist', hr: null })).toEqual({ note: '3 Ist' });
  });
});

describe('expiry', () => {
  const now = Date.parse('2026-11-16T12:00:00Z');
  it('counts whole days left and flags the last day', () => {
    expect(wtbDaysLeft(request(), now)).toBe(1);
    expect(wtbExpiringSoon(request(), now)).toBe(true);
    expect(wtbExpiringSoon(request({ expiresAt: '2026-11-20T00:00:00Z' }), now)).toBe(false);
    expect(wtbDaysLeft(request({ expiresAt: '2026-11-01T00:00:00Z' }), now)).toBe(0);
  });
});

describe('matchSummary', () => {
  const match = (r: WtbRequest, met: boolean[]): WtbItemMatch => ({
    request: r,
    niceToHave: r.niceToHaveIds.map((id, i) => ({ id, met: met[i] })),
  });

  it('is null without matches', () => {
    expect(matchSummary([])).toBeNull();
  });

  it('picks the best HR offer and counts met rows (required + nice-to-have met)', () => {
    const cheap = match(request({ id: 'cheap', offer: { amount: 1, currency: 'HR', hr: 1 } }), [true]);
    const unknown = match(request({ id: 'unknown', offer: { amount: 1, currency: 'Ist', hr: null } }), [true]);
    const best = match(request({ id: 'best', offer: { amount: 1, currency: 'Ber', hr: 3 } }), [false]);
    const summary = matchSummary([cheap, unknown, best]);
    expect(summary).toMatchObject({ count: 3, total: 2, met: 1 });
    expect(summary?.best.request.id).toBe('best');
  });
});

describe('wtbSearchFilters', () => {
  it("puts the request's item fields over the user's fresh search, keeping their listing fields", () => {
    const base = filters({ userOnlineGame: 'online', maxAgeDays: 7, sellerName: 'x' });
    const r = request({ filters: filters({ hardcore: true, ladder: false, corrupted: 'yes', rarity: ['Rare'] }) });
    const f = wtbSearchFilters(r, base);
    expect(f).toMatchObject({ hardcore: true, ladder: false, corrupted: 'yes', rarity: ['Rare'], source: 'live' });
    expect(f).toMatchObject({ userOnlineGame: 'online', maxAgeDays: 7, sellerName: 'x' });
  });
});

describe('Wanted search body', () => {
  const runes = [
    { name: 'Ber Rune', price: 3 },
    { name: 'Ist Rune', price: 0.15 },
  ];
  const f = filters({
    source: 'wanted',
    typeCode: 'circ',
    rarity: ['Rare'],
    sellerName: ' BuyerAcc ',
    userOnlineGame: 'online',
    stats: [
      row('a', 'item_fastercastrate', { min: 20 }),
      row('b', 'item_maxhp', { or: 1 }),
      row('c', 'item_maxmana', { not: true }),
      row('d', 'item_allskills', { enabled: false }),
    ],
  });

  it('sends the item, the required rows, the buyer and the order; never listing-only fields', () => {
    expect(wtbSearchBody(f, { stashIds: null, runeValues: runes })).toEqual({
      ladder: true,
      hardcore: false,
      typeCode: 'circ',
      rarity: ['Rare'],
      stats: [{ kind: 'mod', key: 'item_fastercastrate', min: 20 }],
      buyer: 'BuyerAcc',
      sort: 'newest',
    });
  });

  it('converts the lowest offer to HR with the rune prices (HR as is; unknown rune: none)', () => {
    const body = (minOffer: number, offerCurrency: WtbCurrency) =>
      wtbSearchBody({ ...f, wanted: { minOffer, offerCurrency } }, { stashIds: null, runeValues: runes }).minOfferHr;
    expect(body(2, 'Ber')).toBe(6);
    expect(body(1.5, 'HR')).toBe(1.5);
    expect(body(10, 'Ist')).toBe(1.5);
    expect(body(1, 'Zod')).toBeUndefined();
    expect(offerToHr(3, 'Ber', runes)).toBe(9);
  });

  it('Fits my stash sends the ids the stash matched (none while unknown), Mine only and the order', () => {
    const w = { ...f, wanted: { fitsStash: true, mine: true, sort: 'offer' as const } };
    expect(wtbSearchBody(w, { stashIds: ['r1', 'r2'], runeValues: [] })).toMatchObject({
      ids: ['r1', 'r2'],
      mine: true,
      sort: 'offer',
    });
    expect(wtbSearchBody(w, { stashIds: null, runeValues: [] })).not.toHaveProperty('ids');
    const many = Array.from({ length: 600 }, (_, i) => `r${i}`);
    expect(wtbSearchBody(w, { stashIds: many, runeValues: [] }).ids).toHaveLength(500);
  });

  it('sends the socket range to the board and the overlap search (requests asking for sockets in it)', () => {
    const s = { ...f, socketsMin: 4, socketsMax: 4 };
    expect(wtbSearchBody(s, { stashIds: null, runeValues: [] })).toMatchObject({ socketsMin: 4, socketsMax: 4 });
    expect(wtbOverlapBody({ ...f, socketsMin: 2 }, { limit: 3 })).toMatchObject({ socketsMin: 2 });
    expect(wtbOverlapBody({ ...f, socketsMin: 2 }, { limit: 3 })).not.toHaveProperty('socketsMax');
  });

  it('overlap: the item and required rows only, best offer first', () => {
    expect(wtbOverlapBody(f, { limit: 3 })).toEqual({
      ladder: true,
      hardcore: false,
      typeCode: 'circ',
      rarity: ['Rare'],
      stats: [{ kind: 'mod', key: 'item_fastercastrate', min: 20 }],
      overlap: true,
      sort: 'offer',
      limit: 3,
    });
    expect(wtbOverlapBody(f, { limit: 50, mine: true })).toMatchObject({ mine: true, limit: 50 });
  });

  it("the board for a request: its item and realm on the Wanted source, the user's other fields kept", () => {
    const r = request({ filters: filters({ hardcore: true, itemName: 'Shako', stats: [row('x', 'k')] }) });
    const board = wtbBoardFilters(r, filters({ maxAgeDays: 7 }));
    expect(board).toMatchObject({ source: 'wanted', hardcore: true, itemName: 'Shako', stats: [], maxAgeDays: 7 });
  });
});
