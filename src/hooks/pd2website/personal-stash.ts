import type { Item as GameStashItem, Location } from '@/common/types/pd2-website/GameStashResponse';
import { getAccountCharacters } from '@/lib/builds-api';
import type { SocketRequest } from './useSocket';

/** Personal stash items by the lowercase name of the character holding them. */
export type PersonalStashes = Map<string, GameStashItem[]>;

/**
 * PD2 reports a character's personal stash as "Shared Stash" page 0 (the shared stash's own pages are 1-9), both
 * in `game/character` and in listings made from it; "Stash" is the game's own name for it.
 */
export function isPersonalStashLocation(location: Pick<Location, 'storage' | 'stash_page'> | null | undefined) {
  const storage = location?.storage ?? '';
  return /^(personal )?stash$/i.test(storage) || (/^shared stash$/i.test(storage) && location?.stash_page === 0);
}

interface CharacterResponse {
  character?: { name?: string };
  items?: GameStashItem[];
}

/**
 * The personal stashes of the account's characters in the given mode (inventory, cube, equipment and the
 * mercenary are left out). PD2 sends a personal stash only to its owner's signed-in socket; REST leaves it out.
 *
 * A character that can't be read keeps its stash from `previous`, and so does every character when the account's
 * character list can't be read: a stash that briefly fails to load must not look emptied (auto-delist would take
 * its items for removed).
 */
export async function fetchPersonalStashes(
  request: SocketRequest,
  account: string,
  mode: { hardcore: boolean; ladder: boolean },
  previous: PersonalStashes,
): Promise<PersonalStashes> {
  let characters;
  try {
    characters = await getAccountCharacters(account);
  } catch (error) {
    console.warn('[PersonalStash] Character list unavailable, keeping the last read:', error);
    return previous;
  }
  const names = (characters ?? [])
    .filter((character) => character.hardcore === mode.hardcore && character.ladder === mode.ladder)
    .map((character) => character.name);

  const reads = await Promise.allSettled(
    names.map((name) => request<CharacterResponse>('get', 'game/character', name, {})),
  );
  const stashes: PersonalStashes = new Map();
  reads.forEach((read, index) => {
    const key = names[index].toLowerCase();
    if (read.status === 'rejected') {
      console.warn(`[PersonalStash] ${names[index]} unavailable, keeping the last read:`, read.reason);
      const kept = previous.get(key);
      if (kept) stashes.set(key, kept);
      return;
    }
    const characterId = (read.value?.character?.name ?? names[index]).toLowerCase();
    const items = (read.value?.items ?? [])
      .filter((item) => isPersonalStashLocation(item.location))
      .map((item) => ({ ...item, character_id: characterId }));
    stashes.set(key, items);
  });
  return stashes;
}
