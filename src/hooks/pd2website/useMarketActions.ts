import { Currency, GameData, Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { useCallback } from 'react';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { ISettings } from '../useOptions';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { MarketListingEntry, MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { fetch as tauriFetch } from '@/lib/browser-http';
import qs from 'qs';
import { handleApiResponse } from './usePD2Website';

interface UseMarketActionsReturn {
  findMatchingItems: (item: PriceCheckItem) => Promise<GameStashItem[]>;
  listSpecificItem: (stashItem: GameStashItem, hrPrice: number, note: string, type: 'exact' | 'note') => Promise<MarketListingEntry>;
  getMarketListings: (query: MarketListingQuery) => Promise<MarketListingResult>;
  getMarketListingsArchive: (query: MarketListingQuery) => Promise<MarketListingResult>;
  updateMarketListing: (hash: string, update: Record<string, any>) => Promise<MarketListingEntry>;
  deleteMarketListing: (hash: string) => Promise<void>;
  getCurrencyTab: () => Promise<Currency>;
}

interface UseMarketActionsProps {
  settings: ISettings;
  authData: AuthData;
  fetchAndCacheStash: () => Promise<GameData>;
  findItemsByName: (stashItems: GameStashItem[], item: PriceCheckItem) => GameStashItem[];
  stashCache: React.MutableRefObject<{ data: GameData; timestamp: number } | null>;
  CACHE_TTL: number;
  onAuthError?: () => void | Promise<void>;
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
        arrayFormat:      'indices',  // foo[]=1&foo[]=2
        encodeValuesOnly: true         // keys like [$in] stay literal}
      }
    )
}


export function useMarketActions({ 
  settings, 
  authData, 
  fetchAndCacheStash, 
  findItemsByName, 
  stashCache, 
  CACHE_TTL,
  onAuthError
}: UseMarketActionsProps): UseMarketActionsReturn {
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
    items = stashData.items || [];
    const matching = findItemsByName(items, item);
    return matching;
  }, [settings, authData, fetchAndCacheStash, findItemsByName, stashCache, CACHE_TTL]);

    const getCurrencyTab = useCallback(async (): Promise<Currency> => {
    if (!authData) {
      throw new Error('Not authenticated');
    }
    let curr: Currency;
    const now = Date.now();
    if (stashCache.current && (now - stashCache.current.timestamp < CACHE_TTL)) {
      curr = stashCache.current.data?.currency;
      if (curr) {
        return curr;
      }
    }
    const stashData = await fetchAndCacheStash();
    curr = stashData.currency;
    return curr;
  }, [settings, authData, fetchAndCacheStash, findItemsByName, stashCache, CACHE_TTL]);

  // List specific item (POST /market/listing)
  const listSpecificItem = useCallback(async (stashItem: GameStashItem, hrPrice: number, note: string, type: 'exact' | 'note'): Promise<MarketListingEntry> => {
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
      },
      hr_price: hrPrice,
      price: note,
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
    return await handleApiResponse(response, onAuthError);
  }, [settings, authData, onAuthError]);

  // Get market listings (GET /market/listing)
  const getMarketListings = useCallback(async (query: MarketListingQuery): Promise<MarketListingResult> => {
    const url = buildUrlWithQuery('https://api.projectdiablo2.com/market/listing', query);
    const response = await tauriFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
      }
    });
    return await handleApiResponse(response, onAuthError);
  }, [settings, onAuthError]);

  // Get archived market listings (GET /market/listingArchive)
  const getMarketListingsArchive = useCallback(async (query: MarketListingQuery): Promise<MarketListingResult> => {
    const url = buildUrlWithQuery('https://api.projectdiablo2.com/market/listingArchive', query);
    const response = await tauriFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
      }
    });
    return await handleApiResponse(response, onAuthError);
  }, [settings, onAuthError]);

  // Generic update market listing (PATCH /market/listing/:listingId)
  const updateMarketListing = useCallback(async (listingId: string, update: Record<string, any>): Promise<MarketListingEntry> => {
    const response = await tauriFetch(`https://api.projectdiablo2.com/market/listing/${listingId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update)
    });
    return await handleApiResponse(response, onAuthError);
  }, [settings, onAuthError]);

  // Delete market listing (DELETE /market/listing/:listingId)
  const deleteMarketListing = useCallback(async (listingId: string): Promise<void> => {
    const response = await tauriFetch(`https://api.projectdiablo2.com/market/listing/${listingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
      }
    });
    await handleApiResponse(response, onAuthError);
  }, [settings, onAuthError]);

  return { findMatchingItems, listSpecificItem, getMarketListings, getMarketListingsArchive, updateMarketListing, deleteMarketListing, getCurrencyTab };
} 
