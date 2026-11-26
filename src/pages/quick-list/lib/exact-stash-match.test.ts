import { describe, expect, it } from 'vitest';
import type { Item as GameStashItem, Modifier } from '@/common/types/pd2-website/GameStashResponse';
import type { Item as PriceCheckItem, Stat } from '@/pages/price-check/lib/interfaces';
import { diffStashItem, matchStashItem } from './exact-stash-match';

const mod = (name: string, label: string, values: number[]): Modifier => ({ name, label, values, priority: 0 });

const stash = (hash: string, modifiers: Modifier[], over: Partial<GameStashItem> = {}): GameStashItem =>
  ({
    hash,
    name: 'Jewel',
    quality: { id: 6, name: 'Rare' },
    item_level: 87,
    is_ethereal: false,
    socket_count: 0,
    modifiers,
    ...over,
  }) as GameStashItem;

const clip = (stats: Stat[], over: Partial<PriceCheckItem> = {}): PriceCheckItem => ({
  name: 'Storm Eye',
  quality: 'Rare',
  type: 'Jewel',
  iLevel: 87,
  location: 'Stash',
  stats,
  ...over,
});

const hashes = (items: GameStashItem[]) => items.map((i) => i.hash);
const matched = (item: PriceCheckItem, candidates: GameStashItem[]) => {
  const { tier, items } = matchStashItem(item, candidates);
  return { tier, hashes: hashes(items) };
};

// Rare jewel as the game copies it: ED arrives as both min and max % rows, all res as four rows.
const inspected = clip([
  { stat_id: 17, name: '% Enhanced Damage', value: 25 },
  { stat_id: 18, name: '% Enhanced Damage', value: 25 },
  { stat_id: 39, name: 'Fire Resist', value: 10 },
  { stat_id: 41, name: 'Lightning Resist', value: 10 },
  { stat_id: 43, name: 'Cold Resist', value: 10 },
  { stat_id: 45, name: 'Poison Resist', value: 10 },
  { stat_id: 21, name: 'to Minimum Damage', value: 8 },
]);
const itself = stash('self', [
  mod('min_damage', '+8 to Minimum Damage', [8]),
  mod('maxdamage_percent', '+25% Enhanced Damage', [25, 25]),
  mod('all_resist', 'All Resistances +10%', [10]),
]);
const withEnergy = (hash: string) => stash(hash, [...itself.modifiers, mod('energy', '+5 to Energy', [5])]);

describe('matchStashItem', () => {
  it('picks the inspected jewel out of many of the same base and quality', () => {
    const others = [
      stash('ed', [
        mod('min_damage', '+8 to Minimum Damage', [8]),
        mod('maxdamage_percent', '+26% Enhanced Damage', [26, 26]),
        mod('all_resist', 'All Resistances +10%', [10]),
      ]),
      stash('ilvl', itself.modifiers, { item_level: 55 }),
      stash('eth', itself.modifiers, { is_ethereal: true }),
      stash('sockets', itself.modifiers, { socket_count: 1 }),
    ];
    expect(matched(inspected, [...others, itself])).toEqual({ tier: 'exact', hashes: ['self'] });
  });

  it('rejects a stash item missing one of the clipboard lines', () => {
    expect(matched(inspected, [stash('missing', itself.modifiers.slice(1))])).toEqual({ tier: 'none', hashes: [] });
  });

  it('loosely matches a stash item showing a line the clipboard dropped', () => {
    expect(matched(inspected, [withEnergy('extra')])).toEqual({ tier: 'loose', hashes: ['extra'] });
  });

  it('prefers an exact match over a loose one', () => {
    expect(matched(inspected, [withEnergy('extra'), itself])).toEqual({ tier: 'exact', hashes: ['self'] });
  });

  it('never loosely matches a clipboard item without numbers', () => {
    expect(matched(clip([]), [itself])).toEqual({ tier: 'none', hashes: [] });
  });

  it('matches skill, chance-to-cast and charge lines by their numbers', () => {
    const item = clip([
      { stat_id: 107, name: '+%d to Fire Ball', skill: 'Fire Ball', value: 2 },
      { stat_id: 201, name: 'Chance to cast level %d %s when you Die', skill: 'Meteor', level: 31, chance: 100 },
      { stat_id: 204, name: 'Teleport', level: 5, charges: '(25/31 Charges)' },
      { stat_id: 333, name: '-%d%% to Enemy Fire Resistance', value: -5 },
    ]);
    const facet = stash('facet', [
      mod('item_singleskill', '+2 to Fire Ball (Sorceress Only)', [47, 2]),
      mod('item_skillondeath', '100% Chance to cast level 31 Meteor when you Die', [31, 56, 100]),
      mod('item_charged_skill', 'Level 5 Teleport (25/31 Charges)', [5, 54, 25, 31]),
      mod('passive_fire_pierce', '-5% to Enemy Fire Resistance', [5]),
    ]);
    expect(matched(item, [facet])).toEqual({ tier: 'exact', hashes: ['facet'] });
  });

  it('ignores corruption and socket rows, comparing sockets through the item field', () => {
    const item = clip(
      [
        { stat_id: 360, name: 'Corrupted', value: 2 },
        { stat_id: 361, name: 'Corruptor', value: 4 },
        { stat_id: 194, name: 'Socketed', value: 3 },
        { stat_id: 21, name: 'to Minimum Damage', value: 8 },
      ],
      { sockets: 3 },
    );
    const armor = stash(
      'armor',
      [
        mod('corrupted', 'Corrupted', [0, 16]),
        mod('item_numsockets', 'Socketed (3)', [3]),
        mod('min_damage', '+8 to Minimum Damage', [8]),
      ],
      { socket_count: 3, corrupted: true },
    );
    expect(matched(item, [armor])).toEqual({ tier: 'exact', hashes: ['armor'] });
  });

  it('accepts a clipboard value only the modifier values carry (label-less flags)', () => {
    const item = clip([
      { stat_id: 81, name: 'Knockback', value: 1 },
      { stat_id: 21, name: 'to Minimum Damage', value: 8 },
    ]);
    const knock = stash('knock', [
      mod('item_knockback', 'Knockback', [1]),
      mod('min_damage', '+8 to Minimum Damage', [8]),
    ]);
    expect(matched(item, [knock])).toEqual({ tier: 'exact', hashes: ['knock'] });
  });

  it('breaks a tie between identical-looking copies by the stash name when it can', () => {
    const item = clip([{ stat_id: 93, name: '% Increased Attack Speed', value: 15 }], {
      name: 'Jewel of Fervor',
      quality: 'Magic',
    });
    const ias = mod('item_fasterattackrate', '+15% Increased Attack Speed', [15]);
    const fervor = stash('fervor', [ias], { name: 'Jewel of Fervor' });
    const ruby = stash('ruby', [mod('item_maxdamage_percent', '+15% Enhanced Damage', [15])], { name: 'Ruby Jewel' });
    expect(matched(item, [ruby, fervor])).toEqual({ tier: 'exact', hashes: ['fervor'] });
  });

  it('keeps every identical copy when names cannot tell them apart', () => {
    const copies = [stash('a', itself.modifiers), stash('b', itself.modifiers)];
    expect(matched(inspected, copies)).toEqual({ tier: 'exact', hashes: ['a', 'b'] });
  });

  it('finds nothing when the inspected item is not among the candidates', () => {
    expect(matched(inspected, [])).toEqual({ tier: 'none', hashes: [] });
    expect(matched(inspected, [stash('other', [mod('energy', '+5 to Energy', [5])])])).toEqual({
      tier: 'none',
      hashes: [],
    });
  });
});

describe('diffStashItem', () => {
  it('names the stat lines and frame fields that differ', () => {
    const other = stash('other', [mod('min_damage', '+8 to Minimum Damage', [8]), mod('energy', '+5 to Energy', [5])], {
      item_level: 55,
      socket_count: 1,
    });
    expect(diffStashItem(inspected, other)).toEqual({
      itemLevel: true,
      ethereal: false,
      sockets: true,
      clipboardOnlyStats: [17, 18, 39, 41, 43, 45],
      stashOnlyModifiers: ['energy'],
    });
  });
});
