import { useState, useEffect, useRef } from 'react';
import { fetchItemPriceByName, AveragePriceResponse } from '@/pages/currency/lib/price-api';
import { useOptions } from './useOptions';

/**
 * Custom hook that fetches prices for an array of item names
 * Returns an object with prices Map and loading states per item
 */
export function useDebouncedItemPrices(itemNames: string[]): {
  prices: Map<string, AveragePriceResponse>;
  loadingItems: Set<string>;
} {
  const { settings } = useOptions();
  const [prices, setPrices] = useState<Map<string, AveragePriceResponse>>(new Map());
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const pricesRef = useRef<Map<string, AveragePriceResponse>>(new Map());

  // Keep ref in sync with state
  useEffect(() => {
    pricesRef.current = prices;
  }, [prices]);

  // Track items that are currently being fetched to prevent duplicate requests
  const fetchingItemsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Don't fetch if no items
    if (itemNames.length === 0) {
      setLoadingItems(new Set());
      fetchingItemsRef.current.clear();
      return;
    }

    // Filter out items that already have prices or are currently being fetched
    const itemsToFetch = itemNames.filter(
      (name) => !pricesRef.current.has(name) && !fetchingItemsRef.current.has(name),
    );

    // Don't fetch if all items already have prices or are being fetched
    if (itemsToFetch.length === 0) {
      // Update loading items to only include items that are actually being fetched
      setLoadingItems((prev) => {
        const newSet = new Set<string>();
        itemNames.forEach((name) => {
          if (fetchingItemsRef.current.has(name)) {
            newSet.add(name);
          }
        });
        return newSet;
      });
      return;
    }

    // Mark items as being fetched
    itemsToFetch.forEach((name) => {
      fetchingItemsRef.current.add(name);
    });

    // Set loading state for items being fetched
    setLoadingItems(new Set(itemsToFetch));

    // Create new abort controller for this batch
    abortControllerRef.current = new AbortController();

    // Fetch immediately
    (async () => {
      try {
        const isLadder = settings?.ladder === 'ladder';
        const isHardcore = settings?.mode === 'hardcore';

        // Fetch prices for items that need fetching in parallel
        const pricePromises = itemsToFetch.map(async (itemName) => {
          try {
            const priceData = await fetchItemPriceByName(itemName, {
              isLadder,
              isHardcore,
            });
            return { itemName, priceData };
          } catch (error) {
            // Ignore individual item errors, just return null
            console.error(`Error fetching price for ${itemName}:`, error);
            return { itemName, priceData: null };
          }
        });

        const results = await Promise.all(pricePromises);

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        // Update prices map with new data
        setPrices((prevPrices) => {
          const newPrices = new Map(prevPrices);
          results.forEach(({ itemName, priceData }) => {
            if (priceData) {
              newPrices.set(itemName, priceData);
            }
            // Remove from fetching set once we have a result (success or failure)
            fetchingItemsRef.current.delete(itemName);
          });
          return newPrices;
        });
      } catch (error) {
        console.error('Error fetching item prices:', error);
        // Remove from fetching set on error
        itemsToFetch.forEach((name) => {
          fetchingItemsRef.current.delete(name);
        });
        // Don't update prices on error, keep existing ones
      } finally {
        // Clear loading state for fetched items
        setLoadingItems((prev) => {
          const newSet = new Set(prev);
          itemsToFetch.forEach((name) => newSet.delete(name));
          return newSet;
        });
      }
    })();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        // Remove from fetching set on abort
        itemsToFetch.forEach((name) => {
          fetchingItemsRef.current.delete(name);
        });
      }
    };
  }, [itemNames, settings?.ladder, settings?.mode]);

  return { prices, loadingItems };
}
