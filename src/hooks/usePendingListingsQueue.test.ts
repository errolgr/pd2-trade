// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item } from '@/pages/price-check/lib/interfaces';
import type { ShortcutFormData } from '@/pages/quick-list/components/types';
import { usePendingListingsQueue } from './usePendingListingsQueue';

const STORAGE_KEY = 'pd2_pending_listings_queue';
const item = (name: string) => ({ name }) as unknown as Item;
const form = { price: 1 } as unknown as ShortcutFormData;

function stored() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('usePendingListingsQueue', () => {
  it('appends listings in order with unique ids', () => {
    const { result } = renderHook(() => usePendingListingsQueue());
    let ids: string[] = [];
    act(() => {
      ids = [
        result.current.addPendingListing(item('Shako'), form),
        result.current.addPendingListing(item('Arachnid'), form),
        result.current.addPendingListing(item('Vipermagi'), form),
      ];
    });

    expect(new Set(ids).size).toBe(3);
    expect(result.current.pendingListings.map((p) => p.item.name)).toEqual(['Shako', 'Arachnid', 'Vipermagi']);
    expect(result.current.getPendingListing(ids[1])?.item.name).toBe('Arachnid');
    expect(result.current.getPendingListing('missing')).toBeUndefined();
  });

  it('removes only the targeted listing, keeping the rest in order', () => {
    const { result } = renderHook(() => usePendingListingsQueue());
    let ids: string[] = [];
    act(() => {
      ids = ['a', 'b', 'c'].map((n) => result.current.addPendingListing(item(n), form));
    });

    act(() => result.current.removePendingListing(ids[1]));

    expect(result.current.pendingListings.map((p) => p.item.name)).toEqual(['a', 'c']);
  });

  it('persists to localStorage with hash sets as arrays and restores them as Sets', () => {
    const first = renderHook(() => usePendingListingsQueue());
    act(() => {
      first.result.current.addPendingListing(item('Shako'), form, new Set(['h1', 'h2']));
      first.result.current.addPendingListing(item('Jah'), form);
    });
    expect(stored()[0].initialMatchingHashes).toEqual(['h1', 'h2']);
    first.unmount();

    const second = renderHook(() => usePendingListingsQueue());
    const [restored, noHashes] = second.result.current.pendingListings;
    expect(restored.item.name).toBe('Shako');
    expect(restored.initialMatchingHashes).toBeInstanceOf(Set);
    expect(restored.initialMatchingHashes?.has('h2')).toBe(true);
    expect(noHashes.initialMatchingHashes).toBeUndefined();
    // The restored queue is written back intact, not clobbered by the empty initial state
    expect(stored()).toHaveLength(2);
  });

  it('starts empty when stored data is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{oops');
    const { result } = renderHook(() => usePendingListingsQueue());
    expect(result.current.pendingListings).toEqual([]);
  });

  it('expires listings not polled for 30s, keeping ones refreshed by updateLastPolled', () => {
    const { result } = renderHook(() => usePendingListingsQueue());
    let polled = '';
    act(() => {
      polled = result.current.addPendingListing(item('polled'), form);
      result.current.addPendingListing(item('stale'), form);
    });

    vi.advanceTimersByTime(20_000);
    act(() => result.current.updateLastPolled(polled));
    vi.advanceTimersByTime(15_000);
    act(() => result.current.cleanupExpiredListings());

    expect(result.current.pendingListings.map((p) => p.item.name)).toEqual(['polled']);
  });

  it('keeps a listing polled exactly under the 30s limit and drops it at the limit', () => {
    const { result } = renderHook(() => usePendingListingsQueue());
    act(() => {
      result.current.addPendingListing(item('x'), form);
    });

    vi.advanceTimersByTime(29_999);
    act(() => result.current.cleanupExpiredListings());
    expect(result.current.pendingListings).toHaveLength(1);

    vi.advanceTimersByTime(1);
    act(() => result.current.cleanupExpiredListings());
    expect(result.current.pendingListings).toHaveLength(0);
  });

  it('gives up on a listing after 15 minutes even if it keeps being polled', () => {
    const { result } = renderHook(() => usePendingListingsQueue());
    let id = '';
    act(() => {
      id = result.current.addPendingListing(item('x'), form);
    });

    for (let elapsed = 0; elapsed < 15 * 60_000; elapsed += 15_000) {
      vi.advanceTimersByTime(15_000);
      act(() => result.current.updateLastPolled(id));
      act(() => result.current.cleanupExpiredListings());
      if (elapsed + 15_000 < 15 * 60_000) expect(result.current.pendingListings).toHaveLength(1);
    }

    expect(result.current.pendingListings).toHaveLength(0);
  });
});
