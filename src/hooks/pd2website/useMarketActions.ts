import { GameData, Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { ISettings } from '../useOptions';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import { MarketListingFindQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import { MarketListingEntry, MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketApi, MarketFavorite } from '@/pages/market/lib/types';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { searchMarketListings } from '@/lib/market-search-api';
import qs from 'qs';
import { AuthenticationError, handleApiResponse } from './usePD2Website';

interface UseMarketActionsReturn {
  findMatchingItems: (item: PriceCheckItem) => Promise<GameStashItem[]>;
  listSpecificItem: (
    stashItem: GameStashItem,
    hrPrice: number,
    note: string,
    type: 'exact' | 'note',
  ) => Promise<MarketListingEntry>;
  getMarketListings: (query: MarketListingFindQuery) => Promise<MarketListingResult>;
  getMarketListingsArchive: (query: MarketListingFindQuery) => Promise<MarketListingResult>;
  updateMarketListing: (hash: string, update: Record<string, any>) => Promise<MarketListingEntry>;
  deleteMarketListing: (hash: string) => Promise<void>;
  bumpAllMarketListings: (userId: string) => Promise<void>;
  getFavorites: MarketApi['getFavorites'];
  addFavorite: MarketApi['addFavorite'];
  removeFavorite: MarketApi['removeFavorite'];
  getListing: MarketApi['getListing'];
  createOffer: NonNullable<MarketApi['createOffer']>;
  /** The market browser's API surface, stable while the token is. */
  marketApi: MarketApi;
}

interface UseMarketActionsProps {
  settings: ISettings;
  authData: AuthData;
  fetchAndCacheStash: () => Promise<GameData>;
  findItemsByName: (stashItems: GameStashItem[], item: PriceCheckItem) => GameStashItem[];
  stashCache: React.MutableRefObject<{ data: GameData; timestamp: number } | null>;
  CACHE_TTL: number;
  onAuthError?: () => void | Promise<void>;
  /** Called after an offer was made (the offers lists refetch); read when it fires, so it may change freely. */
  onOfferCreated?: () => void | Promise<void>;
}

function buildUrlWithQuery(base: string, query?: Record<string, any>) {
  if (!query) return base;
  const queryString = axiosStyleSerializer(query);
  return queryString ? `${base}?${queryString}` : base;
}

function axiosStyleSerializer(obj) {
  return qs.stringify(obj, {
    arrayFormat: 'indices', // foo[]=1&foo[]=2
    encodeValuesOnly: true, // keys like [$in] stay literal}
  });
}

/**
 * PD2 returns some listings without an `item` (nothing to show, price or link); drop them here so every
 * MarketListingEntry downstream has one. null (a 401) passes through.
 */
function withItems(result: MarketListingResult | null): MarketListingResult | null {
  return result && { ...result, data: result.data.filter((listing) => listing.item) };
}

export function useMarketActions({
  settings,
  authData,
  fetchAndCacheStash,
  findItemsByName,
  stashCache,
  CACHE_TTL,
  onAuthError,
  onOfferCreated,
}: UseMarketActionsProps): UseMarketActionsReturn {
  const onOfferCreatedRef = useRef(onOfferCreated);
  useEffect(() => {
    onOfferCreatedRef.current = onOfferCreated;
  }, [onOfferCreated]);

  // Find matching items
  const findMatchingItems = useCallback(
    async (item: PriceCheckItem): Promise<GameStashItem[]> => {
      let items: GameStashItem[] = [];
      const now = Date.now();
      if (stashCache.current && now - stashCache.current.timestamp < CACHE_TTL) {
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
    },
    [settings, authData, fetchAndCacheStash, findItemsByName, stashCache, CACHE_TTL],
  );

  // List specific item (POST /market/listing)
  const listSpecificItem = useCallback(
    async (
      stashItem: GameStashItem,
      hrPrice: number,
      note: string,
      type: 'exact' | 'note',
    ): Promise<MarketListingEntry> => {
      const is_hardcore = settings.mode === 'hardcore';
      const is_ladder = settings.ladder === 'ladder';
      const bumped_at = new Date().toISOString();
      const user_id = authData.user._id;
      const account_id = settings.account.toLowerCase();
      const body = {
        user_id,
        type: 'item',
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
          Authorization: `Bearer ${settings.pd2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return await handleApiResponse(response, onAuthError, body);
    },
    [settings, authData, onAuthError],
  );

  // Get market listings (GET /market/listing)
  const getMarketListings = useCallback(
    async (query: MarketListingFindQuery): Promise<MarketListingResult> => {
      const url = buildUrlWithQuery('https://api.projectdiablo2.com/market/listing', query);
      const response = await tauriFetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${settings.pd2Token}`,
        },
      });
      return withItems(await handleApiResponse(response, onAuthError, query));
    },
    [settings.pd2Token, onAuthError],
  );

  // Get archived market listings (GET /market/listingArchive)
  const getMarketListingsArchive = useCallback(
    async (query: MarketListingFindQuery): Promise<MarketListingResult> => {
      const url = buildUrlWithQuery('https://api.projectdiablo2.com/market/listingArchive', query);
      const response = await tauriFetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${settings.pd2Token}`,
        },
      });
      return withItems(await handleApiResponse(response, onAuthError, query));
    },
    [settings.pd2Token, onAuthError],
  );

  // Generic update market listing (PATCH /market/listing/:listingId)
  const updateMarketListing = useCallback(
    async (listingId: string, update: Record<string, any>): Promise<MarketListingEntry> => {
      const response = await tauriFetch(`https://api.projectdiablo2.com/market/listing/${listingId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${settings.pd2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      });
      return await handleApiResponse(response, onAuthError, { listingId, update });
    },
    [settings, onAuthError],
  );

  // Delete market listing (DELETE /market/listing/:listingId)
  const deleteMarketListing = useCallback(
    async (listingId: string): Promise<void> => {
      const response = await tauriFetch(`https://api.projectdiablo2.com/market/listing/${listingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${settings.pd2Token}`,
        },
      });
      // Already gone (sold, expired, or removed elsewhere): what the user asked for
      if (response.status === 404) return;
      await handleApiResponse(response, onAuthError, { listingId });
    },
    [settings, onAuthError],
  );

  // Bump all market listings (PATCH /market/listing with user_id query param)
  const bumpAllMarketListings = useCallback(
    async (userId: string): Promise<void> => {
      const query = { user_id: userId };
      const url = buildUrlWithQuery('https://api.projectdiablo2.com/market/listing', query);
      const body = { bumped_at: new Date().toISOString() };
      const response = await tauriFetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${settings.pd2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      await handleApiResponse(response, onAuthError, { query, body });
    },
    [settings, onAuthError],
  );

  // The user's site favorites, newest first, each with its listing and seller (GET /market/favorite)
  const getFavorites = useCallback(
    async ({ limit = 50, skip = 0 }: { limit?: number; skip?: number } = {}): Promise<{
      total: number;
      data: MarketFavorite[];
    }> => {
      const query = { $limit: limit, $skip: skip, $sort: { updated_at: -1 }, $resolve: { listing: { user: true } } };
      const url = buildUrlWithQuery('https://api.projectdiablo2.com/market/favorite', query);
      const response = await tauriFetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${settings.pd2Token}`,
        },
      });
      const page: { total: number; data: MarketFavorite[] } | null = await handleApiResponse(
        response,
        onAuthError,
        query,
      );
      // A favorite whose listing came without an item stays (the star still toggles); its listing has no card
      return (
        page && {
          ...page,
          data: page.data.map((f) => (f.listing && !f.listing.item ? { ...f, listing: undefined } : f)),
        }
      );
    },
    [settings.pd2Token, onAuthError],
  );

  // Favorite a listing (POST /market/favorite)
  const addFavorite = useCallback(
    async (listingId: string, sellerId: string): Promise<MarketFavorite> => {
      const body = { listing_id: listingId, seller_id: sellerId };
      const response = await tauriFetch('https://api.projectdiablo2.com/market/favorite', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.pd2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      return await handleApiResponse(response, onAuthError, body);
    },
    [settings.pd2Token, onAuthError],
  );

  // Unfavorite (DELETE /market/favorite/:favoriteId)
  const removeFavorite = useCallback(
    async (favoriteId: string): Promise<void> => {
      const response = await tauriFetch(
        `https://api.projectdiablo2.com/market/favorite/${encodeURIComponent(favoriteId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${settings.pd2Token}`,
          },
        },
      );
      await handleApiResponse(response, onAuthError, { favoriteId });
    },
    [settings.pd2Token, onAuthError],
  );

  // Make an offer, as the site's Offer form does (POST /market/offer)
  const createOffer = useCallback(
    async (listingId: string, offer: { price: string; hrPrice?: number }): Promise<unknown> => {
      const body = { listing_id: listingId, offer: offer.price, hr_offer: offer.hrPrice };
      const response = await tauriFetch('https://api.projectdiablo2.com/market/offer', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.pd2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const created = await handleApiResponse(response, onAuthError, body);
      // null: a 401, the sign-in flow takes over
      if (created !== null) void onOfferCreatedRef.current?.();
      return created;
    },
    [settings.pd2Token, onAuthError],
  );

  // One listing as PD2 has it now (GET /market/listing/:id); null when PD2 no longer has it, or has it
  // without an item (nothing left to offer on or whisper about)
  const getListing = useCallback(
    async (listingId: string): Promise<MarketListingEntry | null> => {
      const query = { $resolve: { user: { in_game_account: true } } };
      const url = buildUrlWithQuery(
        `https://api.projectdiablo2.com/market/listing/${encodeURIComponent(listingId)}`,
        query,
      );
      const response = await tauriFetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${settings.pd2Token}`,
        },
      });
      if (response.status === 404) return null;
      const listing: MarketListingEntry | null = await handleApiResponse(response, onAuthError, { listingId });
      // 401: re-authentication started; that isn't "gone"
      if (!listing) throw new AuthenticationError('Sign in to PD2 to check this listing');
      return listing.item ? listing : null;
    },
    [settings.pd2Token, onAuthError],
  );

  const marketApi = useMemo<MarketApi>(
    () => ({
      searchListings: searchMarketListings,
      getListing,
      getMarketListings,
      getMarketListingsArchive,
      getFavorites,
      addFavorite,
      removeFavorite,
      createOffer,
    }),
    [getListing, getMarketListings, getMarketListingsArchive, getFavorites, addFavorite, removeFavorite, createOffer],
  );

  return {
    findMatchingItems,
    listSpecificItem,
    getMarketListings,
    getMarketListingsArchive,
    updateMarketListing,
    deleteMarketListing,
    bumpAllMarketListings,
    getFavorites,
    addFavorite,
    removeFavorite,
    getListing,
    createOffer,
    marketApi,
  };
}
