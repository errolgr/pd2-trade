/**
 * Finds PD2's copy of a price-checked item for a Horadric Sim export: the export takes PD2's item JSON, and the
 * clipboard item isn't that. PD2 has it in the stash (shared or personal) or on a character: in the inventory,
 * the cube, worn, or on the mercenary (`game/character`, public).
 */
import type { GameData, Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { isPersonalStashLocation } from '@/hooks/pd2website/personal-stash';
import { type CharacterItems, getCharacterItems } from '@/lib/builds-api';
import { isStashItem } from '@/lib/item-utils';
import { isSimCandidate } from '@/lib/sim-export-api';
import { matchStashItem } from '@/lib/sim-item-match';
import type { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';

export type SimItemSource = 'stash' | 'inventory' | 'cube' | 'equipped' | 'mercenary';

export interface FoundSimItem {
  item: GameStashItem;
  source: SimItemSource;
  /** The character holding it; absent for the shared stash. */
  holder?: string;
}

/** How long a character's items serve repeat lookups (PD2 only has what the game last saved anyway). */
export const CHARACTER_ITEMS_FRESH_MS = 60_000;

const characterItems = new Map<string, { at: number; request: Promise<CharacterItems> }>();

/** A character's saved items, shared by lookups for CHARACTER_ITEMS_FRESH_MS; a failed read is never kept. */
export function loadCharacterItems(name: string): Promise<CharacterItems> {
  const key = name.toLowerCase();
  const cached = characterItems.get(key);
  if (cached && Date.now() - cached.at < CHARACTER_ITEMS_FRESH_MS) return cached.request;
  const entry = { at: Date.now(), request: getCharacterItems(name) };
  characterItems.set(key, entry);
  entry.request.catch(() => {
    if (characterItems.get(key) === entry) characterItems.delete(key);
  });
  return entry.request;
}

/** Test seam: forget every character's items. */
export function clearCharacterItemsCache() {
  characterItems.clear();
}

function onCharacter(item: PriceCheckItem, name: string, { items, mercenary }: CharacterItems): FoundSimItem | null {
  const own = matchStashItem(item, items.filter(isSimCandidate));
  if (own) {
    const { location } = own;
    const source: SimItemSource =
      location?.zone === 'Equipped'
        ? 'equipped'
        : location?.storage === 'Cube'
          ? 'cube'
          : isPersonalStashLocation(location)
            ? 'stash'
            : 'inventory';
    return { item: own, source, holder: name };
  }
  const merc = matchStashItem(item, mercenary.filter(isSimCandidate));
  return merc && { item: merc, source: 'mercenary', holder: name };
}

/** The first character (in `names` order) holding `item`; the first one is read alone, the rest together. */
async function findOnCharacters(
  item: PriceCheckItem,
  names: string[],
  errors: unknown[],
): Promise<FoundSimItem | null> {
  const read = (name: string) =>
    loadCharacterItems(name).then(
      (items) => onCharacter(item, name, items),
      (error) => {
        console.warn(`[SimItem] PD2 couldn't read ${name}:`, error);
        errors.push(error);
        return null;
      },
    );
  const [first, ...rest] = names;
  if (!first) return null;
  return (await read(first)) ?? (await Promise.all(rest.map(read))).find(Boolean) ?? null;
}

async function findInStash(item: PriceCheckItem, stash: () => Promise<GameData>, errors: unknown[]) {
  try {
    const data = await stash();
    const found = matchStashItem(item, (data.items ?? []).filter(isSimCandidate));
    return found && { item: found, source: 'stash' as const, holder: found.character_id };
  } catch (error) {
    errors.push(error);
    return null;
  }
}

/**
 * PD2's copy of `item`, null when PD2 has none (yet: it sees an item once the game saved it). Where the
 * clipboard says it is gets looked at first: the stash for a stash item, else `characters` in order (put the
 * likely holder first). A source that can't be read is skipped; with nothing found, the first such error is thrown.
 */
export async function findSimItem(
  item: PriceCheckItem,
  { stash, characters }: { stash: () => Promise<GameData>; characters: string[] },
): Promise<FoundSimItem | null> {
  const errors: unknown[] = [];
  const sources = [() => findInStash(item, stash, errors), () => findOnCharacters(item, characters, errors)];
  if (!isStashItem(item)) sources.reverse();
  for (const source of sources) {
    const found = await source();
    if (found) return found;
  }
  if (errors.length > 0) throw errors[0];
  return null;
}
