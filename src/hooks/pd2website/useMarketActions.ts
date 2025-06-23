import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { useCallback, useRef } from 'react';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { ISettings } from '../useOptions';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import { MarketListingCommand, MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { MarketListingResponse } from '@/common/types/pd2-website/GetMarketListingsResponse';

interface UseMarketActionsProps {
  settings: ISettings;
  authData: AuthData;
  rawSocketRef: React.MutableRefObject<WebSocket | null>;
  fetchAndCacheStash: () => Promise<any>;
  findItemsByName: (stashItems: GameStashItem[], item: PriceCheckItem) => GameStashItem[];
  stashCache: React.MutableRefObject<{ data: any; timestamp: number } | null>;
  CACHE_TTL: number;
  pendingMarketListingsRequest?: React.MutableRefObject<((data: any) => void) | null>;
}

export function useMarketActions({ 
  settings, 
  authData, 
  rawSocketRef, 
  fetchAndCacheStash, 
  findItemsByName, 
  stashCache, 
  CACHE_TTL, 
  pendingMarketListingsRequest: externalPendingMarketListingsRequest 
}: UseMarketActionsProps) {
  // Find matching items
  const findMatchingItems = useCallback(async (item: PriceCheckItem): Promise<GameStashItem[]> => {
    let items: GameStashItem[] = [];
    const now = Date.now();
    if (stashCache.current && (now - stashCache.current.timestamp < CACHE_TTL)) {
      items = stashCache.current.data?.[1]?.items || [];
      const matching = findItemsByName(items, item);
      if (matching.length > 0) {
        return matching;
      }
    }
    const stashData = await fetchAndCacheStash();
    items = stashData?.[1]?.items || [];
    const matching = findItemsByName(items, item);
    return matching;
  }, [settings, authData, fetchAndCacheStash, findItemsByName, stashCache, CACHE_TTL]);

  // List specific item
  const listSpecificItem = useCallback(async (stashItem: GameStashItem, hrPrice: number, note: string, type: 'exact' | 'note' | 'negotiable'): Promise<void> => {
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
        price: type === 'negotiable' ? 'obo' : note,
        bumped_at,
      },
      {},
    ];
    rawSocketRef.current.send('420' + JSON.stringify(command));
  }, [settings, authData, rawSocketRef]);

  // Get market listings
  const internalPendingMarketListingsRequest = useRef<((data: any) => void) | null>(null);
  const pendingMarketListingsRequest = externalPendingMarketListingsRequest || internalPendingMarketListingsRequest;
  const getMarketListings = useCallback(async (query: MarketListingQuery): Promise<MarketListingResponse> => {
    if (!rawSocketRef.current) throw new Error('Socket not connected');
    const command: MarketListingCommand = [
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