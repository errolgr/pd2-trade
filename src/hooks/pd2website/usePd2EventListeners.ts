import { useEffect } from 'react';
import { listen, emit } from '@tauri-apps/api/event';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { ISettings } from '../useOptions';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { MarketListingResponse } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { FindMarketplaceListingsRequest, FindMatchingItemsRequest, GetMarketPlaceListingsRequest } from '@/common/types/Events';

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
    const unlistenPromise = listen('pd2-token-found', (event) => {
      const token = (event.payload as any);
      if (token) {
        updateSettings({ pd2Token: token });
      }
    });

    // Listen for findMatchingItems requests from other windows
    const unlistenFind = listen<FindMatchingItemsRequest>('pd2-find-matching-items', async (event) => {
      const payload = event.payload;
      if (!payload || !payload.item || !payload.requestId) return;
      try {
        const result = await findMatchingItems(payload.item);
        emit('pd2-find-matching-items-result', { result, requestId: payload.requestId });
      } catch (error: any) {
        emit('pd2-find-matching-items-result', { error: error.message, requestId: payload.requestId });
      }
    });

    // Listen for listSpecificItem requests from other windows
    const unlistenList = listen<FindMarketplaceListingsRequest>('pd2-list-specific-item', async (event) => {
      const payload = event.payload;
      if (!payload || !payload.stashItem || !payload.requestId) return;
      try {
        await listSpecificItem(payload.stashItem, payload?.price, payload?.note, payload?.type);
        emit('pd2-list-specific-item-result', { success: true, requestId: payload.requestId });
      } catch (error: any) {
        emit('pd2-list-specific-item-result', { error: error.message, requestId: payload.requestId });
      }
    });

    // Listen for getMarketListings requests from other windows
    const unlistenMarket = listen<GetMarketPlaceListingsRequest>('pd2-get-market-listings', async (event) => {
      const payload = event.payload;
      if (!payload || !payload.query || !payload.requestId) return;
      try {
        const result = await getMarketListings(payload.query);
        emit('pd2-get-market-listings-result', { result, requestId: payload.requestId });
      } catch (error: any) {
        emit('pd2-get-market-listings-result', { error: error.message, requestId: payload.requestId });
      }
    });

    // Listen for getAuthData requests from other windows
    const unlistenGetAuthData = listen<AuthData>('pd2-get-auth-data', async (event) => {
      const payload = event.payload as any;
      if (!payload || !payload.requestId) return;
      emit('pd2-get-auth-data-result', { authData, requestId: payload.requestId });
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