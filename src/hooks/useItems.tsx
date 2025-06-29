import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import Fuse from 'fuse.js';
import { allItems } from '../assets/items';
import type { ItemType } from '../assets/itemFuzzySearch';

interface ItemsContextValue {
  items: ItemType[];
  fuse: Fuse<ItemType>;
  findByName: (name: string, limit?: number) => ItemType[];
  findOneByName: (name: string, limit?: number) => ItemType;

}

const ItemsContext = createContext<ItemsContextValue | undefined>(undefined);

export function ItemsProvider({ items = allItems, children }: { items?: ItemType[]; children: ReactNode }) {
  const fuse = useMemo(() => new Fuse(items, {
    keys: ['name'],
    threshold: 0.5,
  }), [items]);

  const findByName = (name: string, limit = 1) => {
    if (!name) return [];
    const results = fuse.search(name, { limit });
    return results.map(r => r.item);
  };

  const findOneByName = (name: string) => {
    if (!name) return null;
    const results = fuse.search(name, { limit: 1});
    return results.map(r => r.item).pop();
  };

  const value = useMemo(() => ({ items, fuse, findByName, findOneByName }), [items, fuse]);

  return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>;
}

export function useItems() {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error('useItems must be used within an ItemsProvider');
  return ctx;
} 