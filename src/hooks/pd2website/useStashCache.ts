import { useCallback, useRef } from 'react';

export function useStashCache(rawSocketRef, authData, settings, pendingStashRequest) {
  const stashCache = useRef(null);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Helper: fetch stash from server and update cache
  const fetchAndCacheStash = useCallback(async () => {
    if (!rawSocketRef.current || !authData) throw new Error('Socket not connected or not authenticated');
    const is_hardcore = settings.mode === 'hardcore';
    const is_ladder = settings.ladder === 'ladder';
    const stashRequest = ["get","game/stash",authData.user.game.accounts[0], { softcore: !is_hardcore, ladder: is_ladder }];
    rawSocketRef.current.send('4215' + JSON.stringify(stashRequest));
    const stashData = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for stash')), 10000);
      pendingStashRequest.current = (data) => {
        clearTimeout(timeout);
        resolve(data);
      };
    });
    stashCache.current = { data: stashData, timestamp: Date.now() };
    return stashData;
  }, [settings, authData, rawSocketRef]);

  // Helper: find items by name only
  function findItemsByName(stashItems, itemName) {
    return stashItems.filter((stashItem) => stashItem.name.toLowerCase() === itemName.toLowerCase().trim());
  }

  return { fetchAndCacheStash, findItemsByName, stashCache, CACHE_TTL };
} 