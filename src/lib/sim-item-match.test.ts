import { describe, expect, it } from 'vitest';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { StatId } from '@/pages/price-check/lib/stat-mappings';
import { matchStashItem } from './sim-item-match';

const checked = (over: Partial<PriceCheckItem> = {}): PriceCheckItem => ({
  name: 'Harlequin Crest',
  quality: 'Unique',
  type: 'Shako',
  iLevel: 85,
  location: 'Stash',
  stats: [
    { stat_id: 3, name: 'to Vitality', value: 2 },
    { stat_id: 9, name: 'to Mana', value: 2 },
  ],
  ...over,
});

const stashed = (
  hash: string,
  over: Partial<GameStashItem> = {},
  modifiers: [string, number][] = [
    ['vitality', 2],
    ['maxmana', 2],
  ],
): GameStashItem =>
  ({
    hash,
    name: 'Harlequin Crest',
    quality: { id: 7, name: 'Unique' },
    base: { name: 'Shako' },
    is_ethereal: false,
    is_runeword: false,
    socket_count: 0,
    corrupted: false,
    modifiers: modifiers.map(([name, value]) => ({ name, values: [value], label: name, priority: 0 })),
    ...over,
  }) as GameStashItem;

describe('matchStashItem', () => {
  it('finds the unique by name, quality and base among other gear', () => {
    const stash = [
      stashed('arach', { name: 'Arachnid Mesh', base: { name: 'Spiderweb Sash' } as GameStashItem['base'] }),
      stashed('shako'),
    ];
    expect(matchStashItem(checked(), stash)?.hash).toBe('shako');
  });

  it('is null when nothing in the stash is that item', () => {
    expect(matchStashItem(checked(), [])).toBeNull();
    expect(matchStashItem(checked(), [stashed('set', { quality: { id: 5, name: 'Set' } })])).toBeNull();
    expect(
      matchStashItem(checked(), [stashed('other', { base: { name: 'Cap' } as GameStashItem['base'] })]),
    ).toBeNull();
  });

  it('tells copies apart by ethereal, sockets and stat values', () => {
    const plain = stashed('plain');
    const eth = stashed('eth', { is_ethereal: true });
    const socketed = stashed('socketed', { socket_count: 1 });
    const low = stashed('low', {}, [
      ['vitality', 1],
      ['maxmana', 1],
    ]);
    const stash = [eth, socketed, low, plain];
    expect(matchStashItem(checked(), stash)?.hash).toBe('plain');
    expect(matchStashItem(checked({ isEthereal: true }), stash)?.hash).toBe('eth');
    expect(matchStashItem(checked({ sockets: 1 }), stash)?.hash).toBe('socketed');
    expect(
      matchStashItem(
        checked({
          stats: [
            { stat_id: 3, name: 'to Vitality', value: 1 },
            { stat_id: 9, name: 'to Mana', value: 1 },
          ],
        }),
        stash,
      )?.hash,
    ).toBe('low');
  });

  it('reads ethereal and corruption from the stat rows too', () => {
    const eth = stashed('eth', { is_ethereal: true });
    expect(
      matchStashItem(checked({ stats: [...checked().stats, { stat_id: StatId.Ethereal, name: 'Ethereal' }] }), [
        stashed('plain'),
        eth,
      ])?.hash,
    ).toBe('eth');

    const corrupted = stashed('corrupted', { corrupted: true });
    const withCorruption = checked({ stats: [...checked().stats, { stat_id: StatId.Corrupted, name: 'Corrupted' }] });
    expect(matchStashItem(withCorruption, [stashed('clean'), corrupted])?.hash).toBe('corrupted');
    expect(matchStashItem(checked(), [corrupted, stashed('clean')])?.hash).toBe('clean');
  });

  it('is null when the best match is ambiguous, but takes either of two identical copies', () => {
    const rare = (hash: string, mods: [string, number][]) =>
      stashed(hash, { name: 'Doom Visage', quality: { id: 6, name: 'Rare' } }, mods);
    const ring = checked({
      name: 'Doom Visage',
      quality: 'Rare',
      stats: [{ stat_id: 0, name: 'to Strength', value: 5 }],
    });
    // Both carry the stat; they differ in something the price check didn't show.
    const a = rare('a', [
      ['strength', 5],
      ['dexterity', 3],
    ]);
    const b = rare('b', [
      ['strength', 5],
      ['dexterity', 4],
    ]);
    expect(matchStashItem(ring, [a, b])).toBeNull();
    expect(matchStashItem(checked(), [stashed('one'), stashed('two')])?.hash).toBe('one');
  });

  it('matches runewords by the runeword name on the same base', () => {
    const spirit = stashed('spirit', {
      name: 'Spirit',
      is_runeword: true,
      quality: { id: 2, name: 'Normal' },
      base: { name: 'Monarch' } as GameStashItem['base'],
      socket_count: 4,
    });
    const base = stashed('base', {
      name: 'Monarch',
      quality: { id: 2, name: 'Normal' },
      base: { name: 'Monarch' } as GameStashItem['base'],
      socket_count: 4,
    });
    const item = checked({
      name: 'Monarch',
      quality: 'Normal',
      type: 'Monarch',
      isRuneword: true,
      runeword: 'Spirit',
      sockets: 4,
    });
    expect(matchStashItem(item, [base, spirit])?.hash).toBe('spirit');
    expect(matchStashItem({ ...item, isRuneword: false, runeword: undefined }, [spirit, base])?.hash).toBe('base');
  });

  it('ignores colour codes in the clipboard base', () => {
    expect(matchStashItem(checked({ type: 'Shakoÿc\\/' }), [stashed('shako')])?.hash).toBe('shako');
  });
});
