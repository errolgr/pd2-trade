import { GameData, Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { useCallback } from 'react';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { ISettings } from '../useOptions';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { MarketListingEntry, MarketListingResponse, MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import axiosInstance, { setAxiosAuthToken } from '@/lib/axios';

interface UseMarketActionsProps {
  settings: ISettings;
  authData: AuthData;
  fetchAndCacheStash: () => Promise<GameData>;
  findItemsByName: (stashItems: GameStashItem[], item: PriceCheckItem) => GameStashItem[];
  stashCache: React.MutableRefObject<{ data: GameData; timestamp: number } | null>;
  CACHE_TTL: number;
}

export function useMarketActions({ 
  settings, 
  authData, 
  fetchAndCacheStash, 
  findItemsByName, 
  stashCache, 
  CACHE_TTL
}: UseMarketActionsProps) {
  // Set the auth token for axios
  setAxiosAuthToken(settings.pd2Token);

  // Find matching items
  const findMatchingItems = useCallback(async (item: PriceCheckItem): Promise<GameStashItem[]> => {
    let items: GameStashItem[] = [];
    const now = Date.now();
    if (stashCache.current && (now - stashCache.current.timestamp < CACHE_TTL)) {
      items = stashCache.current.data?.items || [];
      const matching = findItemsByName(items, item);
      if (matching.length > 0) {
        return matching;
      }
    }
    const stashData = await fetchAndCacheStash();
    items = stashData.items|| [];
    const matching = findItemsByName(items, item);
    return matching;
  }, [settings, authData, fetchAndCacheStash, findItemsByName, stashCache, CACHE_TTL]);

  // List specific item (POST /market/listing)
  const listSpecificItem = useCallback(async (stashItem: GameStashItem, hrPrice: number, note: string, type: 'exact' | 'note' | 'negotiable'): Promise<void> => {
    const is_hardcore = settings.mode === 'hardcore';
    const is_ladder = settings.ladder === 'ladder';
    const bumped_at = new Date().toISOString();
    const user_id = authData.user._id;
    const account_id = settings.account.toLowerCase();
    const body = {
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
    };
    await axiosInstance.post('/market/listing', body);
  }, [settings, authData]);

  // Get market listings (GET /market/listing)
  const getMarketListings = useCallback(async (query: MarketListingQuery): Promise<MarketListingResult> => {
    const response = await axiosInstance.get('/market/listing', { params: query });
    return response.data;
  }, []);

  // Generic update market listing (PATCH /market/listing/:hash)
  const updateMarketListing = useCallback(async (hash: string, update: Record<string, any>): Promise<MarketListingEntry> => {
    const response = await axiosInstance.patch(`/market/listing/${hash}`, update);
    return response.data;
  }, []);

  return { findMatchingItems, listSpecificItem, getMarketListings, updateMarketListing };
} 