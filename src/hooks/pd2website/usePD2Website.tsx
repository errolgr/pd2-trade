import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOptions } from '../useOptions';
import { useStashCache } from './useStashCache';
import { useMarketActions } from './useMarketActions';
import { useSocialActions } from './useSocialActions';
import { useTradeOffers } from '../useTradeOffers';
import { useSocket } from './useSocket';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import * as Sentry from '@sentry/react';
import { Currency, GameData, Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { MarketListingResult, MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { ConversationListResponse, MessageListResponse, Message } from '@/common/types/pd2-website/ChatTypes';
import { TradeMessageData } from '@/components/trade/TradeMessage';
import { emit } from '@tauri-apps/api/event';
import { isTauri } from '@tauri-apps/api/core';
import { invoke } from '@tauri-apps/api/core';
import { GenericToastPayload } from '@/common/types/Events';

// Custom error class for authentication errors
export class AuthenticationError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}
interface Pd2WebsiteContextType {
  open?: () => void; // This seems to be missing from the provider but referenced in context
  findMatchingItems: (item: PriceCheckItem) => Promise<GameStashItem[]>;
  listSpecificItem: (stashItem: GameStashItem, hrPrice: number, note: string, type: 'exact' | 'note') => Promise<MarketListingEntry>;
  getMarketListings: (query: MarketListingQuery) => Promise<MarketListingResult>;
  getMarketListingsArchive: (query: MarketListingQuery) => Promise<MarketListingResult>;
  deleteMarketListing: (listingId: string) => Promise<void>;
  authData: AuthData;
  updateMarketListing: (hash: string, update: Record<string, any>) => Promise<MarketListingEntry>;
  updateItemByHash: (hash: string, update: any) => boolean;
  getCurrencyTab: () => Promise<Currency>;
  deleteConversation: (conversationId: string) => Promise<void>;
  getConversations: (participantId: string) => Promise<ConversationListResponse>;
  getMessages: (conversationId: string) => Promise<MessageListResponse>;
  sendMessage: (conversationId: string, content: string, senderId: string) => Promise<Message>;
  markMessagesAsRead: (messageIds: string[], readerId: string) => Promise<void>;
  createConversation: (participantIds: string[]) => Promise<any>;
  incomingOffers: TradeMessageData[];
  outgoingOffers: TradeMessageData[];
  loading: boolean;
  refresh: () => void;
  revokeOffer: (offerId: string) => Promise<void>;
  acceptOffer: (listingId: string, offerId: string) => Promise<void>;
  rejectOffer: (offerId: string) => Promise<void>;
  unacceptOffer: (listingId: string) => Promise<void>;
}

export const Pd2WebsiteContext = React.createContext<Pd2WebsiteContextType | undefined>(undefined);

export const Pd2WebsiteProvider = ({ children }) => {
  const { updateSettings, settings, isLoading } = useOptions();
  const [authData, setAuthData] = useState<AuthData>(null);
  const isHandlingAuthError = useRef(false);
  const clearStashCacheRef = useRef<(() => void) | null>(null);
  const handleAuthErrorRef = useRef<(() => void | Promise<void>) | null>(null);

  // Stash cache and fetch (RESTful)
  const {
    fetchAndCacheStash,
    findItemsByName,
    stashCache,
    CACHE_TTL,
    updateItemByHash,
    clearStashCache,
  } = useStashCache(authData, settings, handleAuthErrorRef);

  // Store clearStashCache in ref so handleAuthenticationError can use it
  useEffect(() => {
    clearStashCacheRef.current = clearStashCache;
  }, [clearStashCache]);

  // Handler for authentication errors (401)
  const handleAuthenticationError = useCallback(async () => {
    // Prevent multiple simultaneous triggers
    if (isHandlingAuthError.current) {
      return;
    }
    isHandlingAuthError.current = true;

    try {
      // Clear auth data
      setAuthData(null);

      // Clear stash cache using ref
      if (clearStashCacheRef.current) {
        clearStashCacheRef.current();
      }

      // Show toast notification
      if (isTauri()) {
        const toastPayload: GenericToastPayload = {
          title: 'PD2 Trader',
          description: 'Your session has expired. Please reauthenticate.',
          variant: 'warning',
          duration: 5000,
        };
        emit('toast-event', toastPayload);
      }

      // Open auth webview
      if (isTauri()) {
        try {
          await invoke('open_project_diablo2_webview');
        } catch (error) {
          console.error('Failed to open Project Diablo 2 webview:', error);
        }
      }
    } finally {
      // Reset flag after a short delay to allow for retry
      setTimeout(() => {
        isHandlingAuthError.current = false;
      }, 2000);
    }
  }, []);

  // Update the ref so useStashCache can use the handler
  useEffect(() => {
    handleAuthErrorRef.current = handleAuthenticationError;
  }, [handleAuthenticationError]);

  // Market actions (RESTful) - now we can use handleAuthenticationError
  const { findMatchingItems, listSpecificItem, getMarketListings, getMarketListingsArchive, updateMarketListing, deleteMarketListing, getCurrencyTab } = useMarketActions({
    settings,
    authData,
    fetchAndCacheStash,
    findItemsByName,
    stashCache,
    CACHE_TTL,
    onAuthError: handleAuthenticationError,
  });

  // Social actions (RESTful)
  const { deleteConversation, getConversations, getMessages, sendMessage, markMessagesAsRead, createConversation } = useSocialActions({
    settings,
    authData,
    onAuthError: handleAuthenticationError,
  });

  // Socket connection
  const { isConnected } = useSocket({ settings });

  // Trade offers
  const { incomingOffers, outgoingOffers, loading, refresh, revokeOffer, acceptOffer, rejectOffer, unacceptOffer } = useTradeOffers({
    settings,
    authData,
    onAuthError: handleAuthenticationError,
    isConnected,
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
    return await handleApiResponse(response, handleAuthenticationError)
  }, [settings, handleAuthenticationError]);

  // Authenticate when pd2Token changes
  useEffect(() => {
    if (settings?.pd2Token) {
      console.log('fetching new pd2 token and calling authentication');
      authenticate().then((data) => {
        setAuthData(data);
      });
    }
  }, [settings?.pd2Token]);

  // Set Sentry user context when authData changes
  useEffect(() => {
    if (authData?.user && settings?.lastSeenVersion) {
      Sentry.setUser({
        id: authData.user._id,
        username: authData.user.username,
      });
      Sentry.setContext("app", {
        lastSeenVersion: settings?.lastSeenVersion,
      })
    } else {
      Sentry.setUser(null);
    }
  }, [authData, settings]);

  // Update settings when authData changes and account is missing
  useEffect(() => {
    if (!isLoading && !settings.account && authData?.user?.game?.accounts) {
      updateSettings({ account: authData.user.game.accounts[0] });
    }
  }, [authData, settings.account]);

  return (
    <Pd2WebsiteContext.Provider value={{ open, findMatchingItems, listSpecificItem, deleteMarketListing, getMarketListings, getMarketListingsArchive, authData, updateMarketListing, updateItemByHash, getCurrencyTab, deleteConversation, getConversations, getMessages, sendMessage, markMessagesAsRead, createConversation, incomingOffers, outgoingOffers, loading, refresh, revokeOffer, acceptOffer, rejectOffer, unacceptOffer }}>
      {children}
    </Pd2WebsiteContext.Provider>
  );
};

export const usePd2Website = () => {
  const ctx = React.useContext(Pd2WebsiteContext);
  if (!ctx) throw new Error('usePd2Website must be used within a Pd2WebsiteProvider');
  return ctx;
};


export async function handleApiResponse(
  response: Response,
  onAuthError?: () => void | Promise<void>
) {
  if (!response.ok) {
    const errorBody = await response.text();

    // Check for 401 Unauthorized (authentication error)
    if (response.status === 401) {
      // Try to parse error body to confirm it's a JWT expiration
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.name === 'NotAuthenticated' && errorJson.message === 'jwt expired') {
          // Call the authentication error handler if provided
          if (onAuthError) {
            await onAuthError();
          }
          throw new AuthenticationError(
            `Authentication failed: ${errorJson.message}`,
            response.status
          );
        }
      } catch (parseError) {
        // If parsing fails, still treat 401 as auth error
        if (onAuthError) {
          await onAuthError();
        }
        throw new AuthenticationError(
          `Authentication failed: ${response.statusText}`,
          response.status
        );
      }

      // Fallback for other 401 errors
      if (onAuthError) {
        await onAuthError();
      }
      throw new AuthenticationError(
        `Authentication failed: ${response.statusText}`,
        response.status
      );
    }

    // For other errors, throw a regular Error
    throw new Error(
      `API Error: ${response.status} ${response.statusText}\n${errorBody}`
    );
  }
  return response.json();
}