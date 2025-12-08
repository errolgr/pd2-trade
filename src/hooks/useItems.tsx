import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import Fuse from 'fuse.js';
import { allItems } from '../assets/items';
import type { ItemType } from '../assets/itemFuzzySearch';
import { createItemsMapByKey } from '../lib/item-utils';
import { ItemQuality } from '@/common/types/Item';

interface ItemsContextValue {
  items: ItemType[];
  fuse: Fuse<ItemType>;
  itemsMapByKey: Record<string, ItemType>;
  findByName: (name: string, limit?: number, itemQuality?: string) => ItemType[];
  findOneByName: (name: string, itemQuality?: string) => ItemType | null;

}

const ItemsContext = createContext<ItemsContextValue | undefined>(undefined);

export function ItemsProvider({ items = allItems, children }: { items?: ItemType[]; children: ReactNode }) {
  const fuse = useMemo(() => new Fuse(items, {
    keys: ['name'],
    threshold: 0.5,
  }), [items]);

  // Create a map keyed by 'key' for O(1) lookup of unique and set items
  const itemsMapByKey = useMemo(() => createItemsMapByKey(items), [items]);

  const findByName = (name: string, limit = 1, itemQuality?: string) => {
    if (!name) return [];
    
    // For unique or set items, try direct lookup by key first
    if (itemQuality === ItemQuality.Unique || itemQuality === ItemQuality.Set) {
      const directMatch = itemsMapByKey[name];
      if (directMatch) {
        return [directMatch];
      }
    }
    
    // Fallback to fuzzy search
    const results = fuse.search(name, { limit });
    return results.map(r => r.item);
  };

  const findOneByName = (name: string, itemQuality?: string): ItemType | null => {
    if (!name) return null;
    
    // For unique or set items, try direct lookup by key first
    if (itemQuality === ItemQuality.Unique || itemQuality === ItemQuality.Set) {
      const directMatch = itemsMapByKey[name];
      if (directMatch) {
        return directMatch;
      }
    }
    
    // Fallback to fuzzy search
    const results = fuse.search(name, { limit: 1});
    return results.map(r => r.item).pop() || null;
  };

  const value = useMemo(() => ({ items, fuse, itemsMapByKey, findByName, findOneByName }), [items, fuse, itemsMapByKey]);

  return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>;
}

export function useItems() {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error('useItems must be used within an ItemsProvider');
  return ctx;
} 