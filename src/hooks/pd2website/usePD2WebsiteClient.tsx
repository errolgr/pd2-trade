import { emit, listen } from '@tauri-apps/api/event';
import { v4 as uuidv4 } from 'uuid';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import { Item as PriceCheckItem, Stat } from '@/pages/price-check/lib/interfaces';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { UpdateMarketListingPayload, UpdateMarketListingResultPayload, FindMArketListingResponse, FindMatchingItemsResult, ListSpecificItemResult, UpdateStashItemByHashPayload, UpdateStashItemByHashResultPayload } from '@/common/types/Events';
import { Pd2EventType } from '@/common/types/pd2-website/Events';


export const usePD2WebsiteClient = () => {
  // findMatchingItems via Tauri event
  const findMatchingItems = (item: PriceCheckItem): Promise<GameStashItem[]> => {
    return new Promise((resolve, reject) => {
      const requestId = uuidv4();
      const unlistenPromise = listen<FindMatchingItemsResult>(Pd2EventType.FIND_MATCHING_ITEMS_RESULT, (event) => {
        const payload = event.payload;
        if (payload && payload.requestId === requestId) {
          unlistenPromise.then((off) => off());
          console.log(payload);
          if (payload.error) reject(new Error(payload.error));
          else resolve(payload.result);
        }
      });
      emit(Pd2EventType.FIND_MATCHING_ITEMS, { item, requestId });
    });
  };

  // listSpecificItem via Tauri event
  const listSpecificItem = (
    stashItem: GameStashItem,
     price: number,
    note: string, type: 'note' | 'negotiable' | 'exact'
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const requestId = uuidv4();
      const unlistenPromise = listen<ListSpecificItemResult>(Pd2EventType.LIST_SPECIFIC_ITEM_RESULT, (event) => {
        const payload = event.payload;
        if (payload && payload.requestId === requestId) {
          unlistenPromise.then((off) => off());
          if (payload.error) reject(new Error(payload.error));
          else resolve(!!payload.success);
        }
      });
      emit(Pd2EventType.LIST_SPECIFIC_ITEM, { stashItem, price, requestId, note, type });
    });
  };

  // getMarketListings via Tauri event
  const getMarketListings = (query: MarketListingQuery): Promise<MarketListingResult> => {
    console.debug('[usePD2WebsiteClient] getMarketListings: emitting pd2-get-market-listings', { query });
    return new Promise((resolve, reject) => {
      const requestId = uuidv4();
      const unlistenPromise = listen<FindMArketListingResponse>(Pd2EventType.GET_MARKET_LISTINGS_RESULT, (event) => {
        const payload = event.payload;
        console.debug('[usePD2WebsiteClient] getMarketListings: received pd2-get-market-listings-result', { payload, requestId });
        if (payload && payload.requestId === requestId) {
          unlistenPromise.then((off) => off());
          if (payload.error) {
            console.error('[usePD2WebsiteClient] getMarketListings: error', payload.error);
            reject(new Error(payload.error));
          }
          else {
            console.debug('[usePD2WebsiteClient] getMarketListings: success', payload.result);
            resolve(payload.result[1]);
          }
        }
      });
      emit(Pd2EventType.GET_MARKET_LISTINGS, { query, requestId });
      console.debug('[usePD2WebsiteClient] getMarketListings: emitted pd2-get-market-listings', { query, requestId });
    });
  };

  // getAuthData via Tauri event
  const getAuthData = (): Promise<AuthData | null> => {
    return new Promise((resolve, reject) => {
      const requestId = uuidv4();
      const unlistenPromise = listen<{ authData: AuthData | null; error?: string; requestId: string }>(Pd2EventType.GET_AUTH_DATA_RESULT, (event) => {
        const payload = event.payload;
        if (payload && payload.requestId === requestId) {
          unlistenPromise.then((off) => off());
          if (payload.error) reject(new Error(payload.error));
          else resolve(payload.authData);
        }
      });
      emit(Pd2EventType.GET_AUTH_DATA, { requestId });
    });
  };

  // updateMarketListing via Tauri event
  const updateMarketListing = (hash: string, update: Record<string, any>): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const requestId = uuidv4();
      const unlistenPromise = listen<UpdateMarketListingResultPayload>(Pd2EventType.UPDATE_MARKET_LISTING_RESULT, (event) => {
        const payload = event.payload;
        if (payload && payload.requestId === requestId) {
          unlistenPromise.then((off) => off());
          if (payload.error) reject(new Error(payload.error));
          else resolve(!!payload.success);
        }
      });
      const payload: UpdateMarketListingPayload = { hash, ...update, requestId };
      emit(Pd2EventType.UPDATE_MARKET_LISTING, payload);
    });
  };

  // updateStashItemByHash via Tauri event
  const updateStashItemByHash = (hash: string, update: Record<string, any>): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const requestId = uuidv4();
      const unlistenPromise = listen<UpdateStashItemByHashResultPayload>(Pd2EventType.UPDATE_STASH_ITEM_BY_HASH_RESULT, (event) => {
        const payload = event.payload;
        if (payload && payload.requestId === requestId) {
          unlistenPromise.then((off) => off());
          if (payload.error) reject(new Error(payload.error));
          else resolve(!!payload.success);
        }
      });
      const payload: UpdateStashItemByHashPayload = { hash, update, requestId };
      emit(Pd2EventType.UPDATE_STASH_ITEM_BY_HASH, payload);
    });
  };

  return { findMatchingItems, listSpecificItem, getMarketListings, getAuthData, updateMarketListing, updateStashItemByHash };
}; 