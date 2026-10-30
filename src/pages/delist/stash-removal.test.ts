import { describe, expect, it } from 'vitest';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { detectStashRemovals, itemFingerprint, snapshotStash } from './stash-removal';

type Look = 'shako' | 'ring' | 'rune';
const LOOKS: Record<Look, Partial<GameStashItem>> = {
  shako: {
    base_code: 'uap',
    quality: { id: 7, name: 'Unique' } as GameStashItem['quality'],
    item_level: 85,
    modifiers: [
      { name: 'item_allskills', values: [2], label: '', priority: 0 },
      { name: 'maxhp', values: [86], label: '', priority: 0 },
    ],
  },
  ring: {
    base_code: 'rin',
    quality: { id: 6, name: 'Rare' } as GameStashItem['quality'],
    item_level: 90,
    modifiers: [{ name: 'fcr', values: [10], label: '', priority: 0 }],
  },
  rune: {
    base_code: 'r30',
    quality: { id: 2, name: 'Normal' } as GameStashItem['quality'],
    item_level: 1,
    modifiers: [{ name: 'quantity', values: [3], label: '', priority: 0 }],
  },
};

const item = (look: Look, hash: string, storage = 'Shared Stash', over: Partial<GameStashItem> = {}): GameStashItem =>
  ({
    ...LOOKS[look],
    hash,
    name: look,
    socket_count: 0,
    is_ethereal: false,
    corrupted: false,
    location: { storage, stash_page: 1 },
    ...over,
  }) as unknown as GameStashItem;

const listing = (id: string, look: Look, hash: string): MarketListingEntry =>
  ({ _id: id, item: item(look, hash) }) as unknown as MarketListingEntry;

const detect = (prev: GameStashItem[], cur: GameStashItem[], listings: MarketListingEntry[]) => {
  const { removed, ambiguous } = detectStashRemovals(snapshotStash(prev), snapshotStash(cur), listings);
  return {
    removed: removed.map((l) => l._id),
    ambiguous: ambiguous.map((group) => ({ ids: group.listings.map((l) => l._id), count: group.count })),
  };
};

describe('itemFingerprint', () => {
  it('ignores where the item is, its hash and the mod order, but not its rolls', () => {
    const a = item('shako', 'h1');
    const moved = item('shako', 'h2', 'Stash', {
      modifiers: [...LOOKS.shako.modifiers!].reverse(),
      position: { column: 3, row: 2 },
    } as Partial<GameStashItem>);
    const lowerRoll = item('shako', 'h3', 'Shared Stash', {
      modifiers: [
        { name: 'item_allskills', values: [2], label: '', priority: 0 },
        { name: 'maxhp', values: [80], label: '', priority: 0 },
      ],
    });
    expect(itemFingerprint(moved)).toBe(itemFingerprint(a));
    expect(itemFingerprint(lowerRoll)).not.toBe(itemFingerprint(a));
    expect(itemFingerprint({ ...a, is_ethereal: true })).not.toBe(itemFingerprint(a));
  });

  it('keeps a stack the same item when its quantity changes', () => {
    const smaller = item('rune', 'h2', 'Shared Stash', {
      modifiers: [{ name: 'quantity', values: [2], label: '', priority: 0 }],
    });
    expect(itemFingerprint(smaller)).toBe(itemFingerprint(item('rune', 'h1')));
  });
});

describe('detectStashRemovals', () => {
  it('leaves a listing alone when its item moves to another tab under a new hash', () => {
    expect(detect([item('shako', 'h1')], [item('shako', 'h9', 'Stash')], [listing('L1', 'shako', 'h1')])).toEqual({
      removed: [],
      ambiguous: [],
    });
  });

  it('removes a listing whose item left the stash', () => {
    expect(
      detect([item('shako', 'h1'), item('ring', 'r1')], [item('ring', 'r1')], [listing('L1', 'shako', 'h1')]),
    ).toEqual({ removed: ['L1'], ambiguous: [] });
  });

  it('counts moving an item into the inventory as leaving the stash', () => {
    expect(
      detect([item('shako', 'h1')], [item('shako', 'h9', 'Inventory')], [listing('L1', 'shako', 'h1')]).removed,
    ).toEqual(['L1']);
  });

  it('removes a listing whose item had moved since listing and then left', () => {
    expect(detect([item('shako', 'h5')], [], [listing('L1', 'shako', 'h1')]).removed).toEqual(['L1']);
  });

  it('removes the listed copy when it left and its unmoved look-alike stayed', () => {
    expect(
      detect([item('shako', 'h1'), item('shako', 'h2')], [item('shako', 'h2')], [listing('L1', 'shako', 'h1')]),
    ).toEqual({ removed: ['L1'], ambiguous: [] });
  });

  it('keeps the listing when its unlisted look-alike left', () => {
    expect(
      detect([item('shako', 'h1'), item('shako', 'h2')], [item('shako', 'h1')], [listing('L1', 'shako', 'h1')]),
    ).toEqual({ removed: [], ambiguous: [] });
  });

  it('asks when one of two look-alikes left and the other moved', () => {
    expect(
      detect([item('shako', 'h1'), item('shako', 'h2')], [item('shako', 'h9')], [listing('L1', 'shako', 'h1')]),
    ).toEqual({ removed: [], ambiguous: [{ ids: ['L1'], count: 1 }] });
  });

  it('asks which listing went when look-alike listings outnumber the items that left', () => {
    expect(detect([item('rune', 'a')], [], [listing('L1', 'rune', 'x'), listing('L2', 'rune', 'y')])).toEqual({
      removed: [],
      ambiguous: [{ ids: ['L1', 'L2'], count: 1 }],
    });
  });

  it('settles a look-alike group by hash where it can, and asks for nothing left over', () => {
    expect(detect([item('rune', 'a')], [], [listing('L1', 'rune', 'a'), listing('L2', 'rune', 'y')])).toEqual({
      removed: ['L1'],
      ambiguous: [],
    });
  });

  it('ignores listings whose item was never in the stash', () => {
    expect(detect([item('ring', 'r1')], [], [listing('L1', 'shako', 'h1')])).toEqual({ removed: [], ambiguous: [] });
  });
});
