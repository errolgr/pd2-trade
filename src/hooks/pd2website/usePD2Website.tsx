import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOptions } from '../useOptions';
import { useStashCache } from './useStashCache';
import { useMarketActions } from './useMarketActions';
import { useSocialActions, type SocialActions } from './useSocialActions';
import { useTradeOffers, type TradeOffer } from '../useTradeOffers';
import { useSocket, type SubscribeSocket } from './useSocket';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import * as Sentry from '@sentry/react';
import { setTelemetryUser } from '@/lib/telemetry';
import { reportApiError } from '@/lib/error-reporting';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { MarketListingFindQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import type { MarketApi } from '@/pages/market/lib/types';
import { MarketListingResult, MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { useOAuth } from '../useOAuth';
import { GenericToastPayload } from '@/common/types/Events';
import { BACKEND_URL } from '@/lib/pkce';
import { showToast, useOverlay } from '@/overlay';

interface Pd2WebsiteProviderProps {
  children: React.ReactNode;
}

// Custom error class for authentication errors
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
  ) {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

// Custom error class for account mismatch errors (404 on stash endpoints)
export class AccountMismatchError extends Error {
  constructor(
    message: string,
    public statusCode: number = 404,
    public account?: string,
  ) {
    super(message);
    this.name = 'AccountMismatchError';
    Object.setPrototypeOf(this, AccountMismatchError.prototype);
  }
}

interface Pd2WebsiteContextType extends SocialActions {
  findMatchingItems: (item: PriceCheckItem) => Promise<GameStashItem[]>;
  listSpecificItem: (
    stashItem: GameStashItem,
    hrPrice: number,
    note: string,
    type: 'exact' | 'note',
  ) => Promise<MarketListingEntry>;
  getMarketListings: (query: MarketListingFindQuery) => Promise<MarketListingResult>;
  getMarketListingsArchive: (query: MarketListingFindQuery) => Promise<MarketListingResult>;
  /** The market browser's PD2 surface (listings, archive, favorites, seller lookup, offers); stable per token. */
  marketApi: MarketApi;
  deleteMarketListing: (listingId: string) => Promise<void>;
  bumpAllMarketListings: (userId: string) => Promise<void>;
  authData: AuthData;
  updateMarketListing: (hash: string, update: Record<string, any>) => Promise<MarketListingEntry>;
  updateItemByHash: (hash: string, update: any) => boolean;
  incomingOffers: TradeOffer[];
  outgoingOffers: TradeOffer[];
  hiddenOutgoingOffers: TradeOffer[];
  loading: boolean;
  refresh: () => Promise<void>;
  revokeOffer: (offerId: string) => Promise<void>;
  acceptOffer: (listingId: string, offerId: string) => Promise<void>;
  rejectOffer: (offerId: string) => Promise<void>;
  unacceptOffer: (listingId: string) => Promise<void>;
  deleteOutgoingOffer: (offerId: string) => void;
  restoreOutgoingOffer: (offerId: string) => void;
  logout: () => Promise<void>;
  startOAuthFlow: () => Promise<string | false>;
  /** The provider's PD2 socket: connection state and server push events. */
  isConnected: boolean;
  subscribeSocket: SubscribeSocket;
}

export const Pd2WebsiteContext = React.createContext<Pd2WebsiteContextType | undefined>(undefined);

export const Pd2WebsiteProvider = ({ children }: Pd2WebsiteProviderProps) => {
  const { updateSettings, settings, isLoading } = useOptions();
  const { openPanel } = useOverlay();
  const { startOAuthFlow, refreshTokens } = useOAuth();
  const [authData, setAuthData] = useState<AuthData>(null);
  const isHandlingAuthError = useRef(false);
  const clearStashCacheRef = useRef<(() => void) | null>(null);
  const handleAuthErrorRef = useRef<(() => void | Promise<void>) | null>(null);
  const refreshTokenValueRef = useRef<string | undefined>(settings?.pd2RefreshToken);

  // Keep refresh token ref up to date
  useEffect(() => {
    refreshTokenValueRef.current = settings?.pd2RefreshToken;
  }, [settings?.pd2RefreshToken]);

  // Stash cache and fetch (RESTful)
  const { fetchAndCacheStash, findItemsByName, stashCache, CACHE_TTL, updateItemByHash, clearStashCache } =
    useStashCache(authData, settings, handleAuthErrorRef);

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

      // Try silent token refresh first
      if (refreshTokenValueRef.current) {
        const success = await refreshTokens(refreshTokenValueRef.current);
        if (success) return;
      }

      // Refresh failed or unavailable — ask the user to sign in
      openPanel('signIn');
    } finally {
      // Reset flag after a short delay to allow for retry
      setTimeout(() => {
        isHandlingAuthError.current = false;
      }, 2000);
    }
  }, [refreshTokens, openPanel]);

  // Logout function to manually trigger re-authentication
  const logout = useCallback(async () => {
    console.log('[Pd2WebsiteProvider] Logout initiated');

    // Clear auth data
    console.log('[Pd2WebsiteProvider] Clearing auth data and stash cache');
    setAuthData(null);

    // Clear stash cache using ref
    if (clearStashCacheRef.current) {
      clearStashCacheRef.current();
    }

    // Clear all auth tokens
    console.log('[Pd2WebsiteProvider] Clearing stored tokens');
    await updateSettings({
      pd2Token: undefined,
      pd2RefreshToken: undefined,
      pd2TokenExpiry: undefined,
    });

    // Show toast notification
    const toastPayload: GenericToastPayload = {
      title: 'PD2 Trader',
      description: 'Logged out successfully.',
      variant: 'default',
      duration: 3000,
    };
    showToast(toastPayload);
  }, [updateSettings]);

  // Update the ref so useStashCache can use the handler
  useEffect(() => {
    handleAuthErrorRef.current = handleAuthenticationError;
  }, [handleAuthenticationError]);

  // Market actions (RESTful) - now we can use handleAuthenticationError
  const {
    findMatchingItems,
    listSpecificItem,
    getMarketListings,
    getMarketListingsArchive,
    updateMarketListing,
    deleteMarketListing,
    bumpAllMarketListings,
    marketApi,
  } = useMarketActions({
    settings,
    authData,
    fetchAndCacheStash,
    findItemsByName,
    stashCache,
    CACHE_TTL,
    onAuthError: handleAuthenticationError,
  });

  // Social actions (RESTful)
  const { deleteConversation, getConversations, getMessages, sendMessage, markMessagesAsRead, createConversation } =
    useSocialActions({
      settings,
      onAuthError: handleAuthenticationError,
    });

  // Socket connection
  const { isConnected, subscribe: subscribeSocket } = useSocket({ settings });

  // Trade offers
  const {
    incomingOffers,
    outgoingOffers,
    hiddenOutgoingOffers,
    loading,
    refresh,
    revokeOffer,
    acceptOffer,
    rejectOffer,
    unacceptOffer,
    deleteOutgoingOffer,
    restoreOutgoingOffer,
  } = useTradeOffers({
    settings,
    authData,
    onAuthError: handleAuthenticationError,
  });

  const authenticate = useCallback(async (): Promise<AuthData> => {
    const token = settings?.pd2Token;
    if (!token) {
      throw new AuthenticationError('Missing token', 401);
    }
    const response = await tauriFetch(`${BACKEND_URL}/api/auth/oauth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await handleApiResponse(response, handleAuthenticationError);
  }, [settings, handleAuthenticationError]);

  // Authenticate when pd2Token changes
  useEffect(() => {
    if (settings?.pd2Token) {
      authenticate().then((data) => {
        setAuthData(data);
      });
    } else {
      setAuthData(null);
    }
  }, [settings?.pd2Token]);

  // Set Sentry (and Faro telemetry) user context when authData changes
  useEffect(() => {
    if (authData?.user && settings?.lastSeenVersion) {
      Sentry.setUser({
        id: authData.user._id,
        username: authData.user.username,
      });
      Sentry.setContext('app', {
        lastSeenVersion: settings?.lastSeenVersion,
      });
      setTelemetryUser({
        id: authData.user._id,
        username: authData.user.username,
        attributes: { last_seen_version: settings.lastSeenVersion },
      });
    } else {
      Sentry.setUser(null);
      setTelemetryUser(null);
    }
  }, [authData, settings]);

  // Update settings when authData changes and account is missing
  useEffect(() => {
    if (!isLoading && !settings.account && authData?.user?.game?.accounts) {
      const accounts = authData.user.game.accounts;
      if (accounts.length === 1) {
        updateSettings({ account: accounts[0] });
      }
      // Multiple accounts are handled by the sign-in page account selector
    }
  }, [authData, settings.account]);

  return (
    <Pd2WebsiteContext.Provider
      value={{
        findMatchingItems,
        listSpecificItem,
        deleteMarketListing,
        bumpAllMarketListings,
        getMarketListings,
        getMarketListingsArchive,
        marketApi,
        authData,
        updateMarketListing,
        updateItemByHash,
        deleteConversation,
        getConversations,
        getMessages,
        sendMessage,
        markMessagesAsRead,
        createConversation,
        incomingOffers,
        outgoingOffers,
        hiddenOutgoingOffers,
        loading,
        refresh,
        revokeOffer,
        acceptOffer,
        rejectOffer,
        unacceptOffer,
        deleteOutgoingOffer,
        restoreOutgoingOffer,
        logout,
        startOAuthFlow,
        isConnected,
        subscribeSocket,
      }}
    >
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
  onAuthError?: () => void | Promise<void>,
  query?: Record<string, any> | string | null,
) {
  if (!response.ok) {
    const errorBody = await response.text();
    let errorJson: any = null;

    // Try to parse error body
    try {
      errorJson = JSON.parse(errorBody);
    } catch {
      // If parsing fails, continue with text error body
    }

    // Check for 401 Unauthorized (authentication error)
    // These are expected (token expiration / invalid token) and should be handled silently
    if (response.status === 401) {
      const errorMessage = errorJson?.message || response.statusText;
      console.warn('[API] Authentication required (401):', errorMessage);

      // Call the authentication error handler if provided (triggers re-auth flow)
      if (onAuthError) {
        await onAuthError();
      }
      // Return null instead of throwing - 401 errors are expected and handled via onAuthError
      // The calling code should handle null returns gracefully
      return null;
    }

    // Extract endpoint from response URL if available
    const url = new URL(response.url);
    const endpoint = url.pathname;

    // Check for 404 Not Found on stash endpoints (account mismatch)
    // This happens when the logged-in account doesn't match the in-game account
    if (response.status === 404 && endpoint.includes('/game/stash/')) {
      const errorMessage = errorJson?.message || 'Account not found';
      const account = endpoint.split('/game/stash/')[1]?.split('?')[0];
      console.warn('[API] Account mismatch (404):', errorMessage, account ? `Account: ${account}` : '');

      // Throw a custom error that can be caught and handled with a user-friendly message
      throw new AccountMismatchError(
        `The account "${account || 'unknown'}" is not associated with your logged-in account. Please check your account settings.`,
        404,
        account,
      );
    }

    // Create error with context
    const error = new Error(`API Error: ${response.status} ${response.statusText}${errorBody ? `\n${errorBody}` : ''}`);

    // Prepare additional context including query
    const additionalContext: Record<string, any> = {
      ...(errorJson?.name && { errorName: errorJson.name }),
      ...(errorJson?.code !== undefined && { errorCode: errorJson.code }),
      ...(errorJson?.className && { errorClassName: errorJson.className }),
    };

    // Add query to context for debugging
    if (query !== null && query !== undefined) {
      if (typeof query === 'string') {
        additionalContext.queryString = query;
      } else if (typeof query === 'object') {
        // Stringify the query object for logging
        try {
          additionalContext.query = JSON.stringify(query);
        } catch {
          additionalContext.query = String(query);
        }
      }
    }

    // Report to Sentry (only for 5xx errors, 4xx are expected)
    reportApiError(error, 'pd2-api', endpoint, response.status, additionalContext);

    // Throw the error
    throw error;
  }
  return response.json();
}
