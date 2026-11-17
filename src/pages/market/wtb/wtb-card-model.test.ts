import { describe, expect, it } from 'vitest';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { defaultFilters } from '../lib/defaults';
import type { MarketFilters, StatFilter } from '../lib/types';
import type { WtbRequest } from '../lib/wtb';
import { buildWtbCardModel } from './wtb-card-model';

const NOW = Date.parse('2026-11-16T12:00:00Z');
const row = (id: string, key: string, extra: Partial<StatFilter> = {}): StatFilter => ({
  id,
  kind: 'mod',
  key,
  enabled: true,
  ...extra,
});
const request = (filters: Partial<MarketFilters> = {}, extra: Partial<WtbRequest> = {}): WtbRequest => ({
  id: 'r1',
  buyer: { userId: 'u-buyer', name: 'Buyer' },
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
const stashItem = {
  hash: 'h1',
  name: 'Grim Visage',
  socket_count: 0,
  modifiers: [
    { name: 'item_fastercastrate', values: [20], label: '+20% Faster Cast Rate' },
    { name: 'item_allskills', values: [1], label: '+1 to All Skills' },
  ],
} as unknown as GameStashItem;

describe('buildWtbCardModel', () => {
  it("pills: the listing card's quality, sockets, Corrupted, Ethereal; fits / yours in the badge slot", () => {
    const model = buildWtbCardModel(
      request({ socketsMin: 2, corrupted: 'yes', ethereal: 'yes' }, { buyer: { userId: 'me', name: 'Me' } }),
      { userId: 'me', fit: { item: stashItem, niceToHave: [] }, now: NOW },
    );
    expect(model.pills).toEqual({
      quality: 'Rare',
      qualityColor: 'text-q-rare',
      sockets: '2+os',
      corrupted: true,
      ethereal: true,
    });
    expect(model).toMatchObject({ fits: true, own: true });
    expect(
      buildWtbCardModel(request({ itemName: 'Harlequin Crest', rarity: [] }), { userId: null, now: NOW }).pills,
    ).toEqual({
      quality: 'Unique',
      qualityColor: 'text-q-unique',
      sockets: null,
      corrupted: false,
      ethereal: false,
    });
    const rw = buildWtbCardModel(request({ itemName: 'Spirit', rarity: [], socketsMin: 4, socketsMax: 4 }), {
      userId: null,
      now: NOW,
    });
    expect(rw.pills).toMatchObject({ quality: 'Runeword', qualityColor: 'text-q-rune', sockets: '4os' });
    expect(rw).toMatchObject({ fits: false, own: false });
  });

  it('pays: the offer, open to offers and its HR value when in runes', () => {
    const model = buildWtbCardModel(request(), { userId: null, now: NOW });
    expect(model).toMatchObject({ offer: '1 Ber', approxHr: 3, openToOffers: true, own: false, kind: 'Circlet' });
    const hr = buildWtbCardModel(request({}, { offer: { amount: 2, currency: 'HR', hr: 2 }, openToOffers: false }), {
      userId: null,
      now: NOW,
    });
    expect(hr).toMatchObject({ offer: '2 HR', approxHr: null, openToOffers: false });
  });

  it('wants: one line per stat row, Nice marked, nothing matched without a stash item', () => {
    const model = buildWtbCardModel(request(), { userId: null, now: NOW });
    expect(model.fits).toBe(false);
    expect(model.listPrice).toBeNull();
    expect(model.wants).toEqual([
      { id: 'fcr', text: '+20 Faster Cast Rate', corruption: false, nice: false, matched: false, value: null },
      { id: 'life', text: '+30 to Life', corruption: false, nice: true, matched: false, value: null },
      { id: 'cs', text: 'c: +1 to All Skills', corruption: true, nice: false, matched: false, value: null },
    ]);
  });

  it('with a fitting stash item: required rows matched with its values, Nice as /match said, List at', () => {
    const model = buildWtbCardModel(request(), {
      userId: 'me',
      fit: { item: stashItem, niceToHave: [{ id: 'life', met: false }] },
      now: NOW,
    });
    expect(model.fits).toBe(true);
    expect(model.wants.map((w) => [w.id, w.matched, w.value])).toEqual([
      ['fcr', true, 20],
      ['life', false, null],
      ['cs', true, 1],
    ]);
    expect(model.listPrice).toEqual({ price: 3 });
  });

  it('the owner sees the status instead of contacting', () => {
    const mine = (extra: Partial<WtbRequest>) =>
      buildWtbCardModel(request({}, { buyer: { userId: 'me', name: 'Me' }, ...extra }), { userId: 'me', now: NOW });
    expect(mine({})).toMatchObject({ own: true, status: 'live', daysLeft: 4 });
    expect(mine({ expiresAt: '2026-11-17T06:00:00Z' }).status).toBe('soon');
    expect(mine({ status: 'paused' }).status).toBe('paused');
    expect(mine({ expiresAt: '2026-11-10T00:00:00Z' }).status).toBe('expired');
    expect(mine({ status: 'closed' }).status).toBe('closed');
  });
});
