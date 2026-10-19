// @vitest-environment happy-dom
import * as React from 'react';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ItemType } from '@/assets/itemFuzzySearch';
import { ItemQuality } from '@/common/types/Item';
import { ItemsProvider, useItems } from './useItems';

afterEach(cleanup);

// `key` is the stable identifier for uniques/sets; `name` is what Fuse searches.
const items = [
  { key: "Harlequin Crest", name: 'Shako', kind: 'item.unique' },
  { key: "Tal Rasha's Horadric Crest", name: "Tal Rasha's Horadric Crest", kind: 'item.set' },
  { key: 'Shako', name: 'Shako Base', kind: 'item.base' },
  { key: 'Arachnid Mesh', name: 'Arachnid Mesh', kind: 'item.unique' },
] as unknown as ItemType[];

function renderItems(list: ItemType[] = items) {
  return renderHook(() => useItems(), {
    wrapper: ({ children }: { children: React.ReactNode }) => <ItemsProvider items={list}>{children}</ItemsProvider>,
  });
}

describe('useItems', () => {
  it('resolves uniques and sets by exact key before fuzzy name search', () => {
    const { result } = renderItems();

    expect(result.current.findOneByName('Harlequin Crest', ItemQuality.Unique)?.name).toBe('Shako');
    expect(result.current.findByName('Harlequin Crest', 5, ItemQuality.Set)).toEqual([items[0]]);
  });

  it('ignores the key lookup for other qualities and falls back to fuzzy name search', () => {
    const { result } = renderItems();

    // 'Shako' is a key of the base item, but a Magic item must be matched by name
    expect(result.current.findOneByName('Shako', ItemQuality.Magic)?.name).toBe('Shako');
    expect(result.current.findOneByName('Arachnid Mesh')?.key).toBe('Arachnid Mesh');
  });

  it('falls back to fuzzy search when a unique key is not found', () => {
    const { result } = renderItems();
    expect(result.current.findOneByName('Arachnid Mesj', ItemQuality.Unique)?.key).toBe('Arachnid Mesh');
  });

  it('limits fuzzy results and returns nothing for empty or unmatched names', () => {
    const { result } = renderItems();

    expect(result.current.findByName('Shako', 1)).toHaveLength(1);
    expect(result.current.findByName('Shako', 2).map((i) => i.name)).toEqual(['Shako', 'Shako Base']);
    expect(result.current.findByName('')).toEqual([]);
    expect(result.current.findOneByName('')).toBeNull();
    expect(result.current.findOneByName('zzzzzzzzzzzzzzzz')).toBeNull();
  });

  it('indexes items by key', () => {
    const { result } = renderItems();
    expect(result.current.itemsMapByKey["Tal Rasha's Horadric Crest"]).toBe(items[1]);
  });

  it('defaults to the bundled item list', () => {
    const { result } = renderHook(() => useItems(), {
      wrapper: ({ children }: { children: React.ReactNode }) => <ItemsProvider>{children}</ItemsProvider>,
    });
    expect(result.current.findOneByName('The Gnasher', ItemQuality.Unique)?.key).toBe('The Gnasher');
  });

  it('throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useItems())).toThrow('useItems must be used within an ItemsProvider');
  });
});
