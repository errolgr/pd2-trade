import { useCallback, useRef } from 'react';

export function useMarketActions({ settings, authData, rawSocketRef, fetchAndCacheStash, findItemsByName, stashCache, CACHE_TTL, pendingMarketListingsRequest: externalPendingMarketListingsRequest }) {
  // Find matching items
  const findMatchingItems = useCallback(async (item) => {
    let items = [];
    const now = Date.now();
    if (stashCache.current && (now - stashCache.current.timestamp < CACHE_TTL)) {
      items = stashCache.current.data?.[1]?.items || [];
      const matching = findItemsByName(items, item.name);
      if (matching.length > 0) {
        return matching;
      }
    }
    const stashData = await fetchAndCacheStash();
    items = stashData?.[1]?.items || [];
    const matching = findItemsByName(items, item.name);
    return matching;
  }, [settings, authData, fetchAndCacheStash, findItemsByName, stashCache, CACHE_TTL]);

  // List specific item
  const listSpecificItem = useCallback(async (stashItem, hrPrice, price) => {
    if (!rawSocketRef.current) throw new Error('Socket not connected');
    const is_hardcore = settings.mode === 'hardcore';
    const is_ladder = settings.ladder === 'ladder';
    const bumped_at = new Date().toISOString();
    const user_id = authData.user._id;
    const account_id = settings.account.toLowerCase();
    const command = [
      "create",
      "market/listing",
      {
        user_id,
        type: "item",
        is_hardcore,
        is_ladder,
        item: {
          ...stashItem,
          account_id,
          is_hardcore,
          is_ladder,
        },
        hr_price: hrPrice,
        price: price,
        bumped_at,
      },
      {},
    ];
    rawSocketRef.current.send('420' + JSON.stringify(command));
  }, [settings, authData, rawSocketRef]);

  // Get market listings
  const internalPendingMarketListingsRequest = useRef(null);
  const pendingMarketListingsRequest = externalPendingMarketListingsRequest || internalPendingMarketListingsRequest;
  const getMarketListings = useCallback(async (query) => {
    if (!rawSocketRef.current) throw new Error('Socket not connected');
    const command = [
      "find",
      "market/listing",
      query
    ];
    rawSocketRef.current.send('424' + JSON.stringify(command));
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for market listings')), 10000);
      pendingMarketListingsRequest.current = (data) => {
        clearTimeout(timeout);
        resolve(data);
      };
    });
  }, [rawSocketRef, pendingMarketListingsRequest]);

  return { findMatchingItems, listSpecificItem, getMarketListings, pendingMarketListingsRequest };
} 