import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameData, Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { getCharacterItems } from '@/lib/builds-api';
import type { Item } from '@/pages/price-check/lib/interfaces';
import { CHARACTER_ITEMS_FRESH_MS, clearCharacterItemsCache, findSimItem } from './sim-item-sources';

vi.mock('@/lib/builds-api', () => ({ getCharacterItems: vi.fn() }));
vi.mock('@/hooks/pd2website/usePD2Website', () => {
  class AuthenticationError extends Error {}
  class AccountMismatchError extends Error {}
  return { AuthenticationError, AccountMismatchError };
});

const shako = (location: Partial<GameStashItem['location']>, over: Partial<GameStashItem> = {}) =>
  ({
    hash: 'h-shako',
    name: 'Harlequin Crest',
    is_simple: false,
    is_ear: false,
    is_ethereal: false,
    is_runeword: false,
    corrupted: false,
    socket_count: 0,
    quality: { id: 7, name: 'Unique' },
    base: { name: 'Shako', stackable: false },
    modifiers: [],
    location,
    ...over,
  }) as unknown as GameStashItem;

const clipboard = (location: string): Item => ({
  name: 'Harlequin Crest',
  quality: 'Unique',
  type: 'Shako',
  iLevel: 85,
  location,
  stats: [],
});
const none = { items: [], mercenary: [] };
const emptyStash = async () => ({ items: [] }) as unknown as GameData;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  clearCharacterItemsCache();
  vi.mocked(getCharacterItems).mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('findSimItem', () => {
  it("names where on a character PD2 has it: cube, mercenary, the character's personal stash", async () => {
    const cube = shako({ zone: 'Stored', storage: 'Cube' });
    vi.mocked(getCharacterItems).mockResolvedValueOnce({ items: [cube], mercenary: [] });
    expect(await findSimItem(clipboard('Inventory'), { stash: emptyStash, characters: ['Sorc'] })).toEqual({
      item: cube,
      source: 'cube',
      holder: 'Sorc',
    });

    const merc = shako({ zone: 'Equipped', equipment: 'Helm' });
    vi.mocked(getCharacterItems).mockResolvedValueOnce({ items: [], mercenary: [merc] });
    expect(await findSimItem(clipboard('Inventory'), { stash: emptyStash, characters: ['Pal'] })).toMatchObject({
      source: 'mercenary',
      holder: 'Pal',
    });

    const personal = shako({ storage: 'Shared Stash', stash_page: 0 }, { character_id: 'sorc' });
    const stash = async () => ({ items: [personal] }) as unknown as GameData;
    expect(await findSimItem(clipboard('Stash'), { stash, characters: [] })).toEqual({
      item: personal,
      source: 'stash',
      holder: 'sorc',
    });
  });

  it('skips a source it cannot read when another has the item, and only fails when none has it', async () => {
    const worn = shako({ zone: 'Equipped', equipment: 'Helm' });
    const down = new Error('PD2 answered 503');
    vi.mocked(getCharacterItems).mockImplementation(async (name) => {
      if (name === 'Sorc') throw down;
      return { items: [worn], mercenary: [] };
    });
    expect(await findSimItem(clipboard('Equip'), { stash: emptyStash, characters: ['Sorc', 'Pal'] })).toMatchObject({
      source: 'equipped',
      holder: 'Pal',
    });

    vi.mocked(getCharacterItems).mockRejectedValue(down);
    await expect(findSimItem(clipboard('Equip'), { stash: emptyStash, characters: ['Nobody'] })).rejects.toBe(down);
  });

  it('reuses a character read for a minute and never keeps a failed one', async () => {
    vi.mocked(getCharacterItems).mockRejectedValueOnce(new Error('timeout')).mockResolvedValue(none);
    await expect(findSimItem(clipboard('Inventory'), { stash: emptyStash, characters: ['Sorc'] })).rejects.toThrow();
    await findSimItem(clipboard('Inventory'), { stash: emptyStash, characters: ['Sorc'] });
    await findSimItem(clipboard('Inventory'), { stash: emptyStash, characters: ['sorc'] });
    expect(getCharacterItems).toHaveBeenCalledTimes(2);

    vi.setSystemTime(Date.now() + CHARACTER_ITEMS_FRESH_MS);
    await findSimItem(clipboard('Inventory'), { stash: emptyStash, characters: ['Sorc'] });
    expect(getCharacterItems).toHaveBeenCalledTimes(3);
  });
});
