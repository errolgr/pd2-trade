import { useEffect } from 'react';
import { listen, emit } from '@tauri-apps/api/event';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { ISettings } from '../useOptions';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { MarketListingResponse } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { FindMarketplaceListingsRequest, FindMatchingItemsRequest, GetMarketPlaceListingsRequest } from '@/common/types/Events';
import { Pd2EventType } from '@/common/types/pd2-website/Events';

interface UsePd2EventListenersProps {
  updateSettings: (newSettings: Partial<ISettings>) => void;
  findMatchingItems: (item: PriceCheckItem) => Promise<GameStashItem[]>;
  listSpecificItem: (stashItem: GameStashItem, hrPrice: number, note: string, type: 'exact' | 'note' | 'negotiable') => Promise<void>;
  getMarketListings: (query: MarketListingQuery) => Promise<MarketListingResponse>;
  authData: AuthData;
}

export function usePd2EventListeners({ 
  updateSettings, 
  findMatchingItems, 
  listSpecificItem, 
  getMarketListings, 
  authData 
}: UsePd2EventListenersProps) {
  useEffect(() => {
    const unlistenPromise = listen(Pd2EventType.TOKEN_FOUND, (event) => {
      const token = (event.payload as any);
      if (token) {
        updateSettings({ pd2Token: token });
      }
    });

    // Listen for findMatchingItems requests from other windows
    const unlistenFind = listen<FindMatchingItemsRequest>(Pd2EventType.FIND_MATCHING_ITEMS, async (event) => {
      const payload = event.payload;
      if (!payload || !payload.item || !payload.requestId) return;
      try {
        const result = await findMatchingItems(payload.item);
        emit(Pd2EventType.FIND_MATCHING_ITEMS_RESULT, { result, requestId: payload.requestId });
      } catch (error: any) {
        emit(Pd2EventType.FIND_MATCHING_ITEMS_RESULT, { error: error.message, requestId: payload.requestId });
      }
    });

    // Listen for listSpecificItem requests from other windows
    const unlistenList = listen<FindMarketplaceListingsRequest>(Pd2EventType.LIST_SPECIFIC_ITEM, async (event) => {
      const payload = event.payload;
      if (!payload || !payload.stashItem || !payload.requestId) return;
      try {
        await listSpecificItem(payload.stashItem, payload?.price, payload?.note, payload?.type);
        emit(Pd2EventType.LIST_SPECIFIC_ITEM_RESULT, { success: true, requestId: payload.requestId });
      } catch (error: any) {
        emit(Pd2EventType.LIST_SPECIFIC_ITEM_RESULT, { error: error.message, requestId: payload.requestId });
      }
    });

    // Listen for getMarketListings requests from other windows
    const unlistenMarket = listen<GetMarketPlaceListingsRequest>(Pd2EventType.GET_MARKET_LISTINGS, async (event) => {
      const payload = event.payload;
      if (!payload || !payload.query || !payload.requestId) return;
      try {
        const result = await getMarketListings(payload.query);
        emit(Pd2EventType.GET_MARKET_LISTINGS_RESULT, { result, requestId: payload.requestId });
      } catch (error: any) {
        emit(Pd2EventType.GET_MARKET_LISTINGS_RESULT, { error: error.message, requestId: payload.requestId });
      }
    });

    // Listen for getAuthData requests from other windows
    const unlistenGetAuthData = listen<AuthData>(Pd2EventType.GET_AUTH_DATA, async (event) => {
      const payload = event.payload as any;
      if (!payload || !payload.requestId) return;
      emit(Pd2EventType.GET_AUTH_DATA_RESULT, { authData, requestId: payload.requestId });
    });

    return () => {
      unlistenPromise.then((off) => off());
      unlistenFind.then((off) => off());
      unlistenList.then((off) => off());
      unlistenMarket.then((off) => off());
      unlistenGetAuthData.then((off) => off());
    };
  }, [updateSettings, findMatchingItems, listSpecificItem, getMarketListings, authData]);
} 