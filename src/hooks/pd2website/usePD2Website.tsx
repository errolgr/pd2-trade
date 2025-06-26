import React, { useState, useEffect, useCallback } from 'react';
import { useOptions } from '../useOptions';
import { useStashCache } from './useStashCache';
import { useMarketActions } from './useMarketActions';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';

export const Pd2WebsiteContext = React.createContext(undefined);

export const Pd2WebsiteProvider = ({ children }) => {
  const { updateSettings, settings, isLoading } = useOptions();
  const [authData, setAuthData] = useState<AuthData>(null);

  // Stash cache and fetch (RESTful)
  const {
    fetchAndCacheStash,
    findItemsByName,
    stashCache,
    CACHE_TTL,
    updateItemByHash,
  } = useStashCache(authData, settings);

  // Market actions (RESTful)
  const { findMatchingItems, listSpecificItem, getMarketListings, updateMarketListing } = useMarketActions({
    settings,
    authData,
    fetchAndCacheStash,
    findItemsByName,
    stashCache,
    CACHE_TTL,
  });

  const authenticate = useCallback(async (): Promise<AuthData> => {
    const response = await tauriFetch('https://api.projectdiablo2.com/security/session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ strategy: 'jwt', accessToken: settings.pd2Token })
    });
    return await response.json();
  }, [settings]);

  // Authenticate when pd2Token changes
  useEffect(() => {
    if (settings?.pd2Token) {
      console.log('fetching new pd2 token and calling authentication');
      authenticate().then((data) => {
        setAuthData(data);
      });
    }
  }, [settings?.pd2Token]);

  // Update settings when authData changes and account is missing
  useEffect(() => {
    if (!settings.account && authData?.user?.game?.accounts) {
      updateSettings({ account: authData.user.game.accounts[0] });
    }
  }, [authData, settings.account]);

  return (
    <Pd2WebsiteContext.Provider value={{ open, findMatchingItems, listSpecificItem, getMarketListings, authData, updateMarketListing, updateItemByHash }}>
      {children}
    </Pd2WebsiteContext.Provider>
  );
};

export const usePd2Website = () => {
  const ctx = React.useContext(Pd2WebsiteContext);
  if (!ctx) throw new Error('usePd2Website must be used within a Pd2WebsiteProvider');
  return ctx;
};

