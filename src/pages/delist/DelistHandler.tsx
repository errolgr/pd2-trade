import { useCallback, useEffect, useRef } from 'react';
import { NoAccountSelectedError, usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import {
  buildGetAllUserMarketListingsQuery,
  buildGetMarketListingByStashItemQuery,
} from '@/pages/price-check/lib/tradeUrlBuilder';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { itemDisplayName } from '@/pages/market/lib/listing';
import { confirmToast, showToast, useOverlay } from '@/overlay';
import { matchTradeListings, whisperedItemName, type WhisperedItem } from './trade-match';

const AUTH_WAIT_TIMEOUT = 5000;
const AUTH_POLL_INTERVAL = 200;
/** The user's listings searched for a whispered item (the Manage tab's search fetches as many). */
const TRADE_LISTINGS_LIMIT = 1000;

type DelistFn = (raw: string) => Promise<void>;
type DelistTradeFn = (trade: WhisperedItem) => Promise<void>;

/** The mounted DelistHandler's implementations (they need the Pd2Website/overlay contexts). */
let activeDelist: { item: DelistFn; trade: DelistTradeFn } | null = null;

export interface DelistApi {
  /** Delist the raw clipboard item: deletes a single matching listing, or opens the picker for several. */
  delistItem(raw: string): Promise<void>;
  /**
   * Delist the item of an in-game trade whisper (it names the item, maybe its price): asks to confirm a single
   * matching listing, opens the picker for several, says so when none match. Resolves once that is shown.
   */
  delistTrade(trade: WhisperedItem): Promise<void>;
}

function notMounted(): Promise<void> {
  console.warn('[DelistHandler] delist called while DelistHandler is not mounted');
  return Promise.resolve();
}

const delistApi: DelistApi = {
  delistItem: (raw) => (activeDelist ? activeDelist.item(raw) : notMounted()),
  delistTrade: (trade) => (activeDelist ? activeDelist.trade(trade) : notMounted()),
};

/** Stable delist API; works anywhere (AppController and chat are not children of DelistHandler). */
export function useDelist(): DelistApi {
  return delistApi;
}

const DelistHandler: React.FC = () => {
  const { findMatchingItems, getMarketListings, deleteMarketListing, authData } = usePd2Website();
  const { settings } = useOptions();
  const { openPanel } = useOverlay();
  const isDelistingRef = useRef(false);
  const authDataRef = useRef(authData);

  useEffect(() => {
    authDataRef.current = authData;
  }, [authData]);

  const waitForAuth = useCallback((): Promise<boolean> => {
    if (authDataRef.current) return Promise.resolve(true);
    return new Promise((resolve) => {
      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed += AUTH_POLL_INTERVAL;
        if (authDataRef.current) {
          clearInterval(interval);
          resolve(true);
        } else if (elapsed >= AUTH_WAIT_TIMEOUT) {
          clearInterval(interval);
          resolve(false);
        }
      }, AUTH_POLL_INTERVAL);
    });
  }, []);

  const handleDelistRef = useRef<DelistFn>();

  handleDelistRef.current = async (raw: string) => {
    if (isDelistingRef.current) return;

    const hasAuth = await waitForAuth();
    if (!hasAuth) {
      showToast({
        title: 'Delist',
        description: 'You must be logged in to delist items.',
        variant: 'error',
      });
      return;
    }

    isDelistingRef.current = true;
    try {
      const item: PriceCheckItem = JSON.parse(raw);
      const matchingStashItems = await findMatchingItems(item);

      if (matchingStashItems.length === 0) {
        showToast({
          title: 'Delist',
          description: 'Item not found in stash.',
          variant: 'error',
        });
        return;
      }

      const query = buildGetMarketListingByStashItemQuery(matchingStashItems, authDataRef.current.user._id);
      if (!query) {
        showToast({
          title: 'Delist',
          description: 'No active listings match this item.',
          variant: 'info',
        });
        return;
      }

      const result = await getMarketListings(query);
      const listings = result.data;

      if (listings.length === 0) {
        showToast({
          title: 'Delist',
          description: 'No active listings found for this item.',
          variant: 'info',
        });
      } else if (listings.length === 1) {
        await deleteMarketListing(listings[0]._id);
        showToast({
          title: 'Delist',
          description: `Removed ${listings[0].item.name} listing.`,
        });
      } else {
        // Multiple matches: let the user pick (replaces the list if the picker is already open)
        openPanel('delist', { listings });
      }
    } catch (err) {
      if (err instanceof NoAccountSelectedError) {
        showToast({ title: 'Delist', description: err.message, variant: 'error' });
        return;
      }
      console.error('[DelistHandler] Error:', err);
      showToast({
        title: 'Delist',
        description: 'Failed to delist item.',
        variant: 'error',
      });
    } finally {
      isDelistingRef.current = false;
    }
  };

  const handleDelistTradeRef = useRef<DelistTradeFn>();

  handleDelistTradeRef.current = async (trade: WhisperedItem) => {
    if (isDelistingRef.current) return;

    const hasAuth = await waitForAuth();
    if (!hasAuth) {
      showToast({
        title: 'Delist',
        description: 'You must be logged in to delist items.',
        variant: 'error',
      });
      return;
    }

    isDelistingRef.current = true;
    try {
      // The whisper only names the item: search the user's listings in the current realm (as the Manage tab)
      const result = await getMarketListings(
        buildGetAllUserMarketListingsQuery(
          authDataRef.current.user._id,
          settings?.mode === 'hardcore',
          settings?.ladder === 'ladder',
          TRADE_LISTINGS_LIMIT,
          0,
        ),
      );
      const listings = matchTradeListings(result.data, trade);

      if (listings.length === 0) {
        const name = whisperedItemName(trade);
        showToast({
          title: 'Delist',
          description: name ? `No active listing of yours matches ${name}.` : 'This trade names no item to delist.',
          variant: 'info',
        });
      } else if (listings.length === 1) {
        const [listing] = listings;
        const name = itemDisplayName(listing.item);
        const price = listing.hr_price > 0 ? `${listing.hr_price} HR` : listing.price?.trim();
        // Matched by name only: confirm, as the chat's website-offer "Delete listing" does
        confirmToast({
          title: 'Delete Listing?',
          description: `Are you sure you want to delete the listing for ${name}${price ? ` (${price})` : ''}?`,
          confirmLabel: 'Delete',
          variant: 'warning',
          duration: 10000,
          onConfirm: async () => {
            try {
              await deleteMarketListing(listing._id);
              showToast({ title: 'Delist', description: `Removed ${name} listing.` });
            } catch (err) {
              console.error('[DelistHandler] Delete failed:', err);
              showToast({ title: 'Delist', description: 'Failed to remove listing.', variant: 'error' });
            }
          },
        });
      } else {
        // Several (charms, jewels, runes, rares): the user picks, as for Ctrl+U
        openPanel('delist', { listings });
      }
    } catch (err) {
      console.error('[DelistHandler] Error:', err);
      showToast({
        title: 'Delist',
        description: 'Failed to look up your listings.',
        variant: 'error',
      });
    } finally {
      isDelistingRef.current = false;
    }
  };

  useEffect(() => {
    const impl = {
      item: (raw: string) => handleDelistRef.current!(raw),
      trade: (trade: WhisperedItem) => handleDelistTradeRef.current!(trade),
    };
    activeDelist = impl;
    return () => {
      if (activeDelist === impl) activeDelist = null;
    };
  }, []);

  return null;
};

export default DelistHandler;
