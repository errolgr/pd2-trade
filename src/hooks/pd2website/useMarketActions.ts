import { GameData, Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { useCallback } from 'react';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { ISettings } from '../useOptions';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { MarketListingEntry, MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import qs from 'qs';
import { handleApiResponse } from './usePD2Website';



interface UseMarketActionsProps {
  settings: ISettings;
  authData: AuthData;
  fetchAndCacheStash: () => Promise<GameData>;
  findItemsByName: (stashItems: GameStashItem[], item: PriceCheckItem) => GameStashItem[];
  stashCache: React.MutableRefObject<{ data: GameData; timestamp: number } | null>;
  CACHE_TTL: number;
}

function buildUrlWithQuery(base: string, query?: Record<string, any>) {
  if (!query) return base;
  const queryString = axiosStyleSerializer(query);
  return queryString ? `${base}?${queryString}` : base;
}


function axiosStyleSerializer(obj) {
  return qs
    .stringify(obj, 
      { 
        arrayFormat:      'brackets',  // foo[]=1&foo[]=2
        encodeValuesOnly: true         // keys like [$in] stay literal}
      }
    )
    // mimic Axios's re-decoding of [] → literal
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
    //—and if you care about spaces-as-plus…
    .replace(/%20/g, '+');
}


export function useMarketActions({ 
  settings, 
  authData, 
  fetchAndCacheStash, 
  findItemsByName, 
  stashCache, 
  CACHE_TTL
}: UseMarketActionsProps) {
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
    const response = await tauriFetch('https://api.projectdiablo2.com/market/listing', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    return await handleApiResponse(response);
  }, [settings, authData]);

  // Get market listings (GET /market/listing)
  const getMarketListings = useCallback(async (query: MarketListingQuery): Promise<MarketListingResult> => {
    const url = buildUrlWithQuery('https://api.projectdiablo2.com/market/listing', query);
    console.log(query);
    const response = await tauriFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
      }
    });
    return await handleApiResponse(response);
  }, [settings]);

  // Generic update market listing (PATCH /market/listing/:hash)
  const updateMarketListing = useCallback(async (hash: string, update: Record<string, any>): Promise<MarketListingEntry> => {
    const response = await tauriFetch(`https://api.projectdiablo2.com/market/listing/${hash}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update)
    });
    return await handleApiResponse(response);
  }, [settings]);

  return { findMatchingItems, listSpecificItem, getMarketListings, updateMarketListing };
} 