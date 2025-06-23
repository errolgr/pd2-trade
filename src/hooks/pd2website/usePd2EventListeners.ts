import { useEffect } from 'react';
import { listen, emit } from '@tauri-apps/api/event';

export function usePd2EventListeners({ updateSettings, findMatchingItems, listSpecificItem, getMarketListings, authData }) {
  useEffect(() => {
    const unlistenPromise = listen('pd2-token-found', (event) => {
      const token = (event.payload as any);
      if (token) {
        updateSettings({ pd2Token: token });
      }
    });

    // Listen for findMatchingItems requests from other windows
    const unlistenFind = listen('pd2-find-matching-items', async (event) => {
      const payload = event.payload as any;
      if (!payload || !payload.item || !payload.requestId) return;
      try {
        const result = await findMatchingItems(payload.item);
        emit('pd2-find-matching-items-result', { result, requestId: payload.requestId });
      } catch (error: any) {
        emit('pd2-find-matching-items-result', { error: error.message, requestId: payload.requestId });
      }
    });

    // Listen for listSpecificItem requests from other windows
    const unlistenList = listen('pd2-list-specific-item', async (event) => {
      const payload = event.payload as any;
      if (!payload || !payload.stashItem || typeof payload.price === 'undefined' || !payload.requestId) return;
      try {
        await listSpecificItem(payload.stashItem, payload.price);
        emit('pd2-list-specific-item-result', { success: true, requestId: payload.requestId });
      } catch (error: any) {
        emit('pd2-list-specific-item-result', { error: error.message, requestId: payload.requestId });
      }
    });

    // Listen for getMarketListings requests from other windows
    const unlistenMarket = listen('pd2-get-market-listings', async (event) => {
      const payload = event.payload as any;
      if (!payload || !payload.query || !payload.requestId) return;
      try {
        const result = await getMarketListings(payload.query);
        emit('pd2-get-market-listings-result', { result, requestId: payload.requestId });
      } catch (error: any) {
        emit('pd2-get-market-listings-result', { error: error.message, requestId: payload.requestId });
      }
    });

    // Listen for getAuthData requests from other windows
    const unlistenGetAuthData = listen('pd2-get-auth-data', async (event) => {
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