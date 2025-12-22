import { useState, useEffect, useCallback, useRef } from 'react';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { ShortcutFormData } from '@/pages/quick-list/components/types';

export interface PendingListing {
  id: string;
  item: PriceCheckItem;
  formData: ShortcutFormData;
  createdAt: number;
  lastPolled: number;
  initialMatchingHashes?: Set<string>; // Store hashes of items found when queued (for detecting new items)
}

const STORAGE_KEY = 'pd2_pending_listings_queue';
const POLL_INTERVAL = 15000; // 15 seconds
const MAX_POLL_ATTEMPTS = 60; // 15 minutes max (60 * 15 seconds)

export function usePendingListingsQueue() {
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert initialMatchingHashes arrays back to Sets
        const restored = parsed.map((p: any) => ({
          ...p,
          initialMatchingHashes: p.initialMatchingHashes ? new Set(p.initialMatchingHashes) : undefined,
        }));
        setPendingListings(restored);
      }
    } catch (err) {
      console.error('Failed to load pending listings from storage:', err);
    }
  }, []);

  // Save to localStorage whenever pendingListings changes
  useEffect(() => {
    try {
      // Convert Sets to arrays for JSON serialization
      const serializable = pendingListings.map((p) => ({
        ...p,
        initialMatchingHashes: p.initialMatchingHashes ? Array.from(p.initialMatchingHashes) : undefined,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (err) {
      console.error('Failed to save pending listings to storage:', err);
    }
  }, [pendingListings]);

  const addPendingListing = useCallback(
    (item: PriceCheckItem, formData: ShortcutFormData, initialMatchingHashes?: Set<string>) => {
      const pendingListing: PendingListing = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        item,
        formData,
        createdAt: Date.now(),
        lastPolled: Date.now(),
        initialMatchingHashes,
      };
      setPendingListings((prev) => [...prev, pendingListing]);
      return pendingListing.id;
    },
    [],
  );

  const removePendingListing = useCallback((id: string) => {
    setPendingListings((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateLastPolled = useCallback((id: string) => {
    setPendingListings((prev) => prev.map((p) => (p.id === id ? { ...p, lastPolled: Date.now() } : p)));
  }, []);

  const getPendingListing = useCallback(
    (id: string) => {
      return pendingListings.find((p) => p.id === id);
    },
    [pendingListings],
  );

  const cleanupExpiredListings = useCallback(() => {
    const now = Date.now();
    setPendingListings((prev) =>
      prev.filter((p) => {
        const age = now - p.createdAt;
        const pollAge = now - p.lastPolled;
        // Remove if older than max poll attempts or hasn't been polled in a while
        return age < MAX_POLL_ATTEMPTS * POLL_INTERVAL && pollAge < POLL_INTERVAL * 2;
      }),
    );
  }, []);

  return {
    pendingListings,
    addPendingListing,
    removePendingListing,
    updateLastPolled,
    getPendingListing,
    cleanupExpiredListings,
    POLL_INTERVAL,
  };
}
