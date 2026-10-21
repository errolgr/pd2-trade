import { describe, expect, it } from 'vitest';
import { defaultFilters, mergeFilters } from './defaults';
import { buildListingQuery, isPoolMode, isScoreOnly } from './query';
import type { MarketFilters, StatFilter } from './types';

const NOW = new Date('2026-10-21T12:00:00.000Z');
const THREE_DAYS_AGO = '2026-10-18T12:00:00.000Z';
const base = defaultFilters({ hardcore: false, ladder: true });
const filters = (partial: Partial<MarketFilters>) => mergeFilters(base, partial);
const query = (partial: Partial<MarketFilters>, page = { limit: 10, skip: 0 }) =>
  buildListingQuery(filters(partial), page, NOW);
const stat = (key: string, over: Partial<StatFilter> = {}): StatFilter => ({
  id: key,
  kind: 'mod',
  key,
  enabled: true,
  ...over,
});

describe('buildListingQuery — site parity (queries captured from projectdiablo2.com/market)', () => {
  it('Rare circlet with 20 FCR: the captured Trade search', () => {
    expect(query({ typeCode: 'circ', rarity: ['Rare'], stats: [stat('item_fastercastrate', { min: 20 })] })).toEqual({
      $resolve: { user: { in_game_account: true } },
      type: 'item',
      $limit: 10,
      $skip: 0,
      accepted_offer_id: null,
      updated_at: { $gte: THREE_DAYS_AGO },
      $sort: { bumped_at: -1 },
      'item.modifiers': { $all: [{ $elemMatch: { name: 'item_fastercastrate', 'values.0': { $gte: 20 } } }] },
      is_hardcore: false,
      is_ladder: true,
      'item.base.type_code': 'circ',
      'item.quality.name': 'Rare',
    });
  });

  it('every Trade filter at once: the captured full mapping', () => {
    const q = buildListingQuery(
      mergeFilters(defaultFilters({ hardcore: true, ladder: false }), {
        typeCode: 'tors',
        baseCode: 'utp',
        rarity: ['Unique'],
        ethereal: 'yes',
        corrupted: 'no',
        desecrated: 'no',
        socketsMin: 1,
        socketsMax: 4,
        identified: 'yes',
        userOnlineSite: 'online',
        userOnlineGame: 'online',
        priceText: '2',
        requirements: { levelMin: 10, levelMax: 80, strMin: 50, strMax: 150, dexMin: 20, dexMax: 100 },
        sort: { by: 'price', dir: 'asc' },
      }),
      { limit: 10, skip: 0 },
      NOW,
    );
    expect(q).toMatchObject({
      $sort: { hr_price: 1 },
      is_hardcore: true,
      is_ladder: false,
      'item.base.type_code': 'tors',
      'item.base_code': 'utp',
      'item.quality.name': 'Unique',
      'item.is_ethereal': true,
      'item.corrupted': false,
      'item.desecrated': false,
      'item.socket_count': { $gte: 1, $lte: 4 },
      'item.is_identified': true,
      online: true,
      in_game: true,
      price: { $regex: '2', $options: 'i' },
      'item.requirements.level': { $gte: 10, $lte: 80 },
      'item.requirements.strength': { $gte: 50, $lte: 150 },
      'item.requirements.dexterity': { $gte: 20, $lte: 100 },
      hr_price: { $gt: 0 },
    });
  });

  it('exact item names, except the base kinds the site matches as a pattern', () => {
    expect(query({ itemName: 'Harlequin Crest' })['item.name']).toBe('Harlequin Crest');
    expect(query({ itemName: 'Grand Charm' })['item.name']).toEqual({ $regex: 'Grand Charm', $options: 'i' });
    expect(query({ itemName: 'ring' })['item.name']).toEqual({ $regex: 'ring', $options: 'i' });
  });

  it('grouped Type/Base select values become $in', () => {
    const q = query({ typeCode: '{"$in": ["amul", "ring", "amus"]}', baseCode: '{"$in": ["r30", "r30s"]}' });
    expect(q['item.base.type_code']).toEqual({ $in: ['amul', 'ring', 'amus'] });
    expect(q['item.base_code']).toEqual({ $in: ['r30', 'r30s'] });
  });

  it('Runeword rarity maps to is_runeword like the site', () => {
    const q = query({ rarity: ['Runeword'] });
    expect(q['item.is_runeword']).toBe(true);
    expect(q).not.toHaveProperty(['item.quality.name']);
  });

  it('max 0 sockets means unsocketed; a min still bounds socket_count', () => {
    expect(query({ socketsMax: 0 })).toMatchObject({ 'item.is_socketed': false });
    expect(query({ socketsMax: 0 })).not.toHaveProperty(['item.socket_count']);
    expect(query({ socketsMin: 2, socketsMax: 0 })).toMatchObject({
      'item.is_socketed': false,
      'item.socket_count': { $gte: 2 },
    });
  });

  it('property keys: params pin leading values, the roll follows them; alternatives become $or', () => {
    const q = query({
      stats: [
        stat('item_addclassskills{3}', { min: 2 }),
        stat('item_elemskill_fire', { min: 1 }),
        stat('max_damage|maxdamage', { min: 10, max: 30 }),
        stat('item_aura{123}', { min: 10 }),
        stat('item_cannotbefrozen'),
      ],
    });
    expect(q['item.modifiers']).toEqual({
      $all: [
        { $elemMatch: { name: 'item_addclassskills', 'values.0': 3, 'values.1': { $gte: 2 } } },
        { $elemMatch: { name: 'item_elemskill_fire', 'values.1': { $gte: 1 } } },
        { $elemMatch: { $or: [{ name: 'max_damage' }, { name: 'maxdamage' }], 'values.0': { $gte: 10, $lte: 30 } } },
        { $elemMatch: { name: 'item_aura', 'values.0': 123, 'values.1': { $gte: 10 } } },
        { $elemMatch: { name: 'item_cannotbefrozen' } },
      ],
    });
  });

  it('price sort adds hr_price > 0 in either direction', () => {
    expect(query({ sort: { by: 'price', dir: 'desc' } })).toMatchObject({
      $sort: { hr_price: -1 },
      hr_price: { $gt: 0 },
    });
  });

  it('archive: no accepted_offer filter, plain user resolve, its own window', () => {
    const q = query({ source: 'archive', maxAgeDays: 14 });
    expect(q).not.toHaveProperty('accepted_offer_id');
    expect(q.$resolve).toEqual({ user: true });
    expect(q.updated_at).toEqual({ $gte: '2026-10-07T12:00:00.000Z' });
  });

  it('pages with $limit/$skip and stays on the defaults when nothing is set', () => {
    const q = query({}, { limit: 250, skip: 500 });
    expect(q).toEqual({
      $resolve: { user: { in_game_account: true } },
      type: 'item',
      $limit: 250,
      $skip: 500,
      accepted_offer_id: null,
      updated_at: { $gte: THREE_DAYS_AGO },
      $sort: { bumped_at: -1 },
      is_hardcore: false,
      is_ladder: true,
    });
  });
});

describe('buildListingQuery — extensions and fixes', () => {
  it('several rarities use $in; Runeword alongside others becomes an $or', () => {
    expect(query({ rarity: ['Rare', 'Crafted'] })['item.quality.name']).toEqual({ $in: ['Rare', 'Crafted'] });
    expect(query({ rarity: ['Runeword', 'Unique'] }).$or).toEqual([
      { 'item.is_runeword': true },
      { 'item.quality.name': 'Unique' },
    ]);
  });

  it('Has Buyout filters on an HR price being set, merged with the HR range', () => {
    expect(query({ hasBuyout: 'yes' }).hr_price).toEqual({ $gt: 0 });
    expect(query({ hasBuyout: 'no' }).hr_price).toEqual({ $in: [null, 0] });
    expect(query({ hrMin: 1, hrMax: 5, sort: { by: 'price', dir: 'asc' } }).hr_price).toEqual({
      $gte: 1,
      $lte: 5,
      $gt: 0,
    });
  });

  it('a class requirement narrows the type to that class’s items', () => {
    expect(query({ requirements: { class: 'sorceress' } })['item.base.type_code']).toBe('orb');
    expect(query({ requirements: { class: 'amazon' } })['item.base.type_code']).toEqual({
      $in: ['abow', 'ajav', 'aspe'],
    });
    expect(
      query({ requirements: { class: 'assassin' }, typeCode: '{"$in": ["h2h", "h2h2"]}' })['item.base.type_code'],
    ).toEqual({
      $in: ['h2h', 'h2h2'],
    });
    expect(query({ requirements: { class: 'paladin' }, typeCode: 'circ' })['item.base.type_code']).toEqual({ $in: [] });
  });

  it('seller, corruptions and escaped price text', () => {
    const q = query({ sellerUserId: 'u1', corruptions: ['item_fastercastrate'], priceText: '1.5 hr (obo)' });
    expect(q).toMatchObject({
      user_id: 'u1',
      'item.corruptions': { $all: ['item_fastercastrate'] },
      price: { $regex: '1\\.5 hr \\(obo\\)', $options: 'i' },
    });
  });

  it('leaves pseudo rows, disabled rows and score-only rows to the client', () => {
    const q = query({
      stats: [
        stat('pseudo_total_res', { kind: 'pseudo', min: 60 }),
        stat('maxhp', { enabled: false, min: 10 }),
        stat('item_fastercastrate', { weight: 2 }),
        stat('strength', { min: 5, weight: 1 }),
      ],
    });
    expect(q['item.modifiers']).toEqual({ $all: [{ $elemMatch: { name: 'strength', 'values.0': { $gte: 5 } } }] });
    expect(isScoreOnly(stat('x', { weight: 1 }))).toBe(true);
    expect(isScoreOnly(stat('x', { weight: 1, max: 0 }))).toBe(false);
  });

  it('client sorts fetch newest first', () => {
    expect(query({ sort: { by: 'score', dir: 'asc' } }).$sort).toEqual({ bumped_at: -1 });
  });
});

describe('isPoolMode', () => {
  it('is on for client sorts and bounded pseudo rows only', () => {
    expect(isPoolMode(filters({}))).toBe(false);
    expect(isPoolMode(filters({ sort: { by: 'value', dir: 'desc' } }))).toBe(true);
    expect(isPoolMode(filters({ stats: [stat('pseudo_life', { kind: 'pseudo', min: 50 })] }))).toBe(true);
    expect(isPoolMode(filters({ stats: [stat('pseudo_life', { kind: 'pseudo', weight: 1 })] }))).toBe(false);
    expect(isPoolMode(filters({ stats: [stat('pseudo_life', { kind: 'pseudo', min: 50, enabled: false })] }))).toBe(
      false,
    );
  });
});
