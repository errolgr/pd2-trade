import { describe, expect, it } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { defaultFilters, mergeFilters, upgradeFilters, withSource } from './defaults';
import { itemArtUrl, itemDisplayName, listingAge, listingUrl, sellerAccount } from './listing';
import { applyPreset, BUILT_IN_PRESETS } from './presets';
import { PSEUDO_STATS } from './pseudo';
import { STAT_OPTIONS } from './stats';
import { listing } from './test-utils';
import { buildWhisper } from './whisper';

const NOW = new Date('2026-10-18T12:00:00.000Z');
const withUser = (l: MarketListingEntry, user: Partial<MarketListingEntry['user']>) => ({
  ...l,
  user: { ...l.user, ...user },
});

describe('listing helpers', () => {
  it('links to the site listing page', () => {
    expect(listingUrl({ _id: 'abc123' })).toBe('https://projectdiablo2.com/market/listing/abc123');
  });

  it('formats bump age compactly', () => {
    const at = (iso: string) => listingAge({ bumped_at: iso, updated_at: iso }, NOW);
    expect(at('2026-10-18T11:59:40Z')).toBe('now');
    expect(at('2026-10-18T11:55:00Z')).toBe('5m');
    expect(at('2026-10-18T07:00:00Z')).toBe('5h');
    expect(at('2026-10-16T12:00:00Z')).toBe('2d');
    expect(at('2026-09-20T12:00:00Z')).toBe('4w');
    expect(listingAge({ bumped_at: '', updated_at: '' }, NOW)).toBe('');
  });

  it('whispers the account in game, else the item’s account, else the first linked one', () => {
    const l = listing();
    expect(sellerAccount(withUser(l, { in_game_account: 'Playing' }))).toBe('Playing');
    expect(sellerAccount(l)).toBe('selleracc');
    expect(sellerAccount({ ...l, item: { ...l.item, account_id: '' } })).toBe('selleracc');
    expect(sellerAccount({ ...l, item: { ...l.item, account_id: '' }, user: undefined })).toBeNull();
  });

  it('names rares by quality and base, uniques by name', () => {
    expect(
      itemDisplayName({ name: 'Amulet', quality: { id: 6, name: 'Rare' }, base: { name: 'Amulet' } as never }),
    ).toBe('Rare Amulet');
    expect(
      itemDisplayName({
        name: 'Harlequin Crest',
        quality: { id: 7, name: 'Unique' },
        base: { name: 'Shako' } as never,
      }),
    ).toBe('Harlequin Crest');
  });

  it('finds unique art by display name and rune art by name', () => {
    expect(
      itemArtUrl({ name: 'Harlequin Crest', quality: { id: 7, name: 'Unique' }, base: { name: 'Shako' } as never }),
    ).toMatch(/^https:\/\/pd2trader\.com\/assets\/items\/.+\.png$/);
    expect(
      itemArtUrl({ name: 'Ber Rune', quality: { id: 2, name: 'Normal' }, base: { name: 'Ber Rune' } as never }),
    ).toBe('/runes/Ber_Rune.png');
  });
});

describe('buildWhisper', () => {
  it('uses the price check wording with the HR price', () => {
    expect(buildWhisper(listing({ hr: 3, name: 'Harlequin Crest' }))).toBe(
      "/w *selleracc Hi, I'm interested in your Harlequin Crest listed for 3 HR",
    );
  });

  it('falls back to the price note, and drops the clause without any price', () => {
    expect(buildWhisper(listing({ price: '2 ist\nobo' }))).toBe(
      "/w *selleracc Hi, I'm interested in your Rare Amulet listed for 2 ist obo",
    );
    expect(buildWhisper(listing())).toBe("/w *selleracc Hi, I'm interested in your Rare Amulet");
  });

  it('fills custom templates', () => {
    expect(buildWhisper(listing({ hr: 1 }), 'yo {seller}, {item} for {price}? ({account})')).toBe(
      '/w *selleracc yo Seller, Rare Amulet for 1 HR? (selleracc)',
    );
  });

  it('whispers the account with a single "*", even when the listing names it "*account" (#148)', () => {
    const starred = listing({ hr: 2, name: 'Harlequin Crest' });
    starred.user = { ...starred.user!, in_game_account: '*selleracc' } as typeof starred.user;
    expect(buildWhisper(starred, '{item} for {price}? ({account})')).toBe(
      '/w *selleracc Harlequin Crest for 2 HR? (selleracc)',
    );
  });
});

describe('defaults', () => {
  const base = defaultFilters({ hardcore: true, ladder: false });

  it('merges nested fields and clears optional ones set to undefined', () => {
    const merged = mergeFilters(
      { ...base, itemName: 'Shako', requirements: { levelMax: 80 } },
      { itemName: undefined, requirements: { strMin: 10 }, sort: { by: 'price', dir: 'desc' }, hardcore: undefined },
    );
    expect(merged.itemName).toBeUndefined();
    expect(merged.requirements).toEqual({ levelMax: 80, strMin: 10 });
    expect(merged.sort).toEqual({ by: 'price', dir: 'desc' });
    expect(merged.hardcore).toBe(true);
  });

  it('switching to the archive moves a default age window to 14 days and back', () => {
    const archive = withSource(base, 'archive');
    expect(archive).toMatchObject({ source: 'archive', maxAgeDays: 14 });
    expect(withSource(archive, 'live').maxAgeDays).toBe(3);
    expect(withSource({ ...base, maxAgeDays: 1 }, 'archive').maxAgeDays).toBe(1);
  });
});

describe('upgradeFilters', () => {
  const base = defaultFilters({ hardcore: false, ladder: true });
  it('drops stored weights and falls back from score/value sorts to newest bumps', () => {
    const old = {
      ...base,
      sort: { by: 'value' as const, dir: 'asc' as const },
      stats: [{ id: 'a', kind: 'mod' as const, key: 'maxhp', min: 10, weight: 1, enabled: true }],
    };
    expect(upgradeFilters(old)).toMatchObject({ sort: { by: 'bumped', dir: 'desc' } });
    expect(upgradeFilters(old).stats).toEqual([{ id: 'a', kind: 'mod', key: 'maxhp', min: 10, enabled: true }]);
    const stat = { ...base, sort: { by: 'stat' as const, key: 'maxhp', dir: 'desc' as const } };
    expect(upgradeFilters(stat)).toBe(stat);
  });

  it('turns the old corruptions list into presence-only corruption rows', () => {
    const old = { ...base, stats: [{ id: 'a', kind: 'mod' as const, key: 'maxhp', enabled: true }] };
    const upgraded = upgradeFilters({ ...old, corruptions: ['item_numsockets', 7, 'dmg%'] });
    expect(upgraded).not.toHaveProperty('corruptions');
    expect(upgraded.stats.map(({ id: _id, ...row }) => row)).toEqual([
      { kind: 'mod', key: 'maxhp', enabled: true },
      { kind: 'corruption', key: 'item_numsockets', enabled: true },
      { kind: 'corruption', key: 'dmg%', enabled: true },
    ]);
    expect(upgradeFilters({ ...old, corruptions: [] })).toEqual(old);
  });

  it('puts the single any-of group of older versions (`or: true`) into block 1', () => {
    const row = (id: string, or: unknown) => ({ id, kind: 'mod' as const, key: 'maxhp', enabled: true, or });
    const old = { ...base, stats: [row('a', true), row('b', false), row('c', 2)] } as unknown as typeof base;
    expect(upgradeFilters(old).stats).toEqual([
      { id: 'a', kind: 'mod', key: 'maxhp', enabled: true, or: 1 },
      { id: 'b', kind: 'mod', key: 'maxhp', enabled: true },
      { id: 'c', kind: 'mod', key: 'maxhp', enabled: true, or: 2 },
    ]);
  });
});

describe('applyPreset', () => {
  const base = { ...defaultFilters({ hardcore: false, ladder: true }), typeCode: 'helm', baseCode: 'uap' };

  it('replaces stats with fresh ids, sets type/rarity/name, keeps the sort and drops stored weights', () => {
    const circlet = {
      id: 'u-circlet',
      name: '2/20 circlet',
      builtIn: false,
      typeCodes: ['circ'],
      rarity: ['Magic' as const, 'Rare' as const],
      stats: [{ kind: 'mod' as const, key: 'item_fastercastrate', min: 20, enabled: true }],
    };
    const next = applyPreset(base, circlet);
    expect(next.stats.map((s) => s.key)).toEqual(circlet.stats.map((s) => s.key));
    expect(new Set(next.stats.map((s) => s.id)).size).toBe(next.stats.length);
    expect(next).toMatchObject({ typeCode: 'circ', baseCode: undefined, rarity: ['Magic', 'Rare'] });
    expect(next.sort).toEqual(base.sort);
    const legacy = applyPreset(base, {
      id: 'u',
      name: 'old',
      builtIn: false,
      stats: [{ kind: 'mod', key: 'item_fastercastrate', min: 10, weight: 2, enabled: true }],
    });
    expect(legacy.stats[0]).not.toHaveProperty('weight');

    const gc = applyPreset(base, BUILT_IN_PRESETS.find((p) => p.id === 'builtin-skiller-gc')!);
    expect(gc).toMatchObject({ itemName: 'Grand Charm', typeCode: 'helm', baseCode: 'uap' });
  });

  it('every built-in preset uses known stat keys of the right kind', () => {
    const pseudoIds = new Set(PSEUDO_STATS.map((p) => p.id));
    const modKeys = new Set(STAT_OPTIONS.map((o) => o.key));
    for (const preset of BUILT_IN_PRESETS) {
      for (const row of preset.stats) expect((row.kind === 'pseudo' ? pseudoIds : modKeys).has(row.key)).toBe(true);
    }
  });
});
