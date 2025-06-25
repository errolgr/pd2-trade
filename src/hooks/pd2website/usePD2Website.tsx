import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { useOptions } from '../useOptions';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import { usePd2Socket } from './usePd2Socket';
import { useStashCache } from './useStashCache';
import { useMarketActions } from './useMarketActions';
import { usePd2EventListeners } from './usePd2EventListeners';
import { invoke } from '@tauri-apps/api/core';
import { jwtDecode } from 'jwt-decode';

export const Pd2WebsiteContext = React.createContext(undefined);

export const Pd2WebsiteProvider = ({ children }) => {
  const { updateSettings, settings, isLoading } = useOptions();
  const [authData, setAuthData] = useState(null);

  // Create the shared refs for pending requests
  const pendingMarketListingsRequest = useRef(null);
  const pendingStashRequest = useRef(null);

  // Socket connection and auth
  const { socket, rawSocketRef } = usePd2Socket(settings, updateSettings, setAuthData, pendingMarketListingsRequest, pendingStashRequest);

  // Stash cache and fetch
  const {
    fetchAndCacheStash,
    findItemsByName,
    stashCache,
    CACHE_TTL,
    updateItemByHash,
  } = useStashCache(rawSocketRef, authData, settings, pendingStashRequest);

  // Market actions (real, using shared ref)
  const { findMatchingItems, listSpecificItem, getMarketListings, updateMarketListing } = useMarketActions({
    settings,
    authData,
    rawSocketRef,
    fetchAndCacheStash,
    findItemsByName,
    stashCache,
    CACHE_TTL,
    pendingMarketListingsRequest,
  });

  // Event listeners
  usePd2EventListeners({ updateSettings, findMatchingItems, listSpecificItem, getMarketListings, authData, updateMarketListing, updateItemByHash });

  // Open webview
  const open = async () => {
    try {
      await invoke('open_project_diablo2_webview');
    } catch (error) {
      console.error('Failed to open Project Diablo 2 webview:', error);
      throw error;
    }
  };

  // Effect to check pd2Token validity and open webview if needed
  useEffect(() => {
    if (isLoading) return; 

    if (!settings?.pd2Token) {
      open();
      return;
    }
    try {
      const payload: { exp?: number } = jwtDecode(settings.pd2Token);
      const exp = payload.exp;
      if (!exp) {
        open();
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      const fiveHours = 5 * 60 * 60;
      if (exp < now + fiveHours) {
        open();
      }
    } catch (e) {
      open();
    }
  }, [settings?.pd2Token, isLoading]);

  return (
    <Pd2WebsiteContext.Provider value={{ socket, open, findMatchingItems, listSpecificItem, getMarketListings, authData, updateMarketListing, updateItemByHash }}>
      {children}
    </Pd2WebsiteContext.Provider>
  );
};

export const usePd2Website = () => {
  const ctx = React.useContext(Pd2WebsiteContext);
  if (!ctx) throw new Error('usePd2Website must be used within a Pd2WebsiteProvider');
  return ctx;
};