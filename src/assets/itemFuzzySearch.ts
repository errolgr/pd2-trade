import { allItems } from './items';
import Fuse from 'fuse.js';

export type ItemType = typeof allItems[0];

export function createItemFuse(itemList: ItemType[] = allItems) {
  return new Fuse(itemList, {
    keys: ['name'],
    threshold: 0.3,
  });
}

/**
 * Fuzzy find item(s) by name from the items list using Fuse.js.
 * @param name The name to search for
 * @param limit The number of results to return (default 1)
 * @returns The best-matching item(s) from the items array
 */
export function fuzzyFindItemByName(name: string, limit = 1, itemList: ItemType[] = allItems) {
  if (!name) return [];
  const fuse = createItemFuse(itemList);
  const results = fuse.search(name, { limit });
  return results.map(r => r.item);
}

// Example usage:
// const result = fuzzyFindItemByName('Gnashr');
// console.log(result); 