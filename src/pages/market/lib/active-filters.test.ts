import { describe, expect, it } from 'vitest';
import { activeFilters } from './active-filters';
import { defaultFilters, mergeFilters, SITE_SEARCH_DEFAULTS, type SearchDefaults, withSource } from './defaults';
import type { MarketFilters } from './types';

const realm = { hardcore: false, ladder: true };
const base = (defaults: SearchDefaults = SITE_SEARCH_DEFAULTS) => defaultFilters(realm, defaults);
const ids = (f: MarketFilters, defaults: SearchDefaults = SITE_SEARCH_DEFAULTS) =>
  activeFilters(f, defaults).map((a) => a.id);

describe('activeFilters', () => {
  it('finds nothing on a fresh search, whatever the realm, source, sort or saved defaults', () => {
    expect(ids(base())).toEqual([]);
    expect(ids(mergeFilters(base(), { hardcore: true, ladder: false, sort: { by: 'price', dir: 'asc' } }))).toEqual([]);
    expect(ids(withSource(base(), 'archive'))).toEqual([]);
    const mine: SearchDefaults = {
      ...SITE_SEARCH_DEFAULTS,
      hasBuyout: 'yes',
      userOnlineGame: 'online',
      maxAgeDays: 7,
    };
    expect(ids(base(mine), mine)).toEqual([]);
  });

  it('lists a price check prefill in sidebar order, and each clear takes back only its own filter', () => {
    const f = mergeFilters(base(), {
      itemName: 'Harlequin Crest',
      rarity: ['Unique'],
      typeCode: 'helm',
      baseCode: 'uap',
      corrupted: 'no',
      socketsMin: 1,
      hrMax: 3,
      hrMaxExclusive: true,
      stats: [
        { id: 's1', kind: 'mod', key: 'maxhp', min: 100, enabled: true },
        { id: 's2', kind: 'mod', key: 'strength', enabled: false },
        { id: 's3', kind: 'mod', key: '', enabled: true },
      ],
    });
    const active = activeFilters(f, SITE_SEARCH_DEFAULTS);
    expect(active.map((a) => a.id)).toEqual([
      'itemName',
      'stat:s1',
      'type',
      'base',
      'rarity',
      'corrupted',
      'sockets',
      'hr',
    ]);
    const clear = (id: string) => active.find((a) => a.id === id)!.clear(f);
    expect(clear('stat:s1').stats.map((s) => s.id)).toEqual(['s2', 's3']);
    expect(clear('type')).toMatchObject({ typeCode: undefined, baseCode: undefined, rarity: ['Unique'] });
    expect(clear('base')).toMatchObject({ typeCode: 'helm', baseCode: undefined });
    expect(clear('corrupted').corrupted).toBe('any');
    expect(clear('sockets')).toMatchObject({ socketsMin: undefined, socketsMax: undefined });
    // A price chart bucket's exclusive max goes with the range
    expect(clear('hr')).toMatchObject({ hrMin: undefined, hrMax: undefined, hrMaxExclusive: undefined, socketsMin: 1 });
    // Each clear takes back its own filter only (dropping the type drops its base along)
    for (const a of active) {
      const gone = a.id === 'type' ? ['type', 'base'] : [a.id];
      expect(ids(a.clear(f))).toEqual(active.map((x) => x.id).filter((id) => !gone.includes(id)));
    }
  });

  it('compares the always-set fields with the user defaults, and clears back to them', () => {
    const mine: SearchDefaults = { ...SITE_SEARCH_DEFAULTS, hasBuyout: 'yes', userOnlineSite: 'online', maxAgeDays: 7 };
    const f = mergeFilters(base(mine), {
      hasBuyout: 'any',
      userOnlineSite: 'all',
      userOnlineGame: 'offline',
      maxAgeDays: 30,
    });
    const active = activeFilters(f, mine);
    expect(active.map((a) => a.spec)).toEqual([
      { kind: 'age', days: 30 },
      { kind: 'tri', field: 'hasBuyout', value: 'any' },
      { kind: 'online', field: 'site', value: 'all' },
      { kind: 'online', field: 'game', value: 'offline' },
    ]);
    const cleared = active.reduce((g, a) => a.clear(g), f);
    expect(cleared).toMatchObject({ hasBuyout: 'yes', userOnlineSite: 'online', userOnlineGame: 'all', maxAgeDays: 7 });
    // The archive's own window is its default
    expect(ids(withSource(mergeFilters(base(mine), { maxAgeDays: 14 }), 'archive'), mine)).toEqual([]);
  });

  it('lists the seller, requirements and class, keeping the other requirements on clear', () => {
    const f = mergeFilters(base(), {
      sellerUserId: 'u1',
      requirements: { class: 'sorceress', levelMax: 30, strMin: 50 },
    });
    const active = activeFilters(f, SITE_SEARCH_DEFAULTS);
    expect(active.map((a) => a.id)).toEqual(['class', 'seller', 'level', 'strength']);
    expect(active.find((a) => a.id === 'level')!.clear(f).requirements).toEqual({
      class: 'sorceress',
      levelMin: undefined,
      levelMax: undefined,
      strMin: 50,
    });
    expect(active.find((a) => a.id === 'seller')!.clear(f)).toMatchObject({
      sellerUserId: undefined,
      sellerName: undefined,
    });
  });
});
