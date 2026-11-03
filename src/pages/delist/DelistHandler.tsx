import { useCallback, useEffect, useRef } from 'react';
import { NoAccountSelectedError, usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { isListingDeleted, subscribeListingDeleted } from '@/hooks/pd2website/listing-events';
import { useOptions } from '@/hooks/useOptions';
import {
  buildGetAllUserMarketListingsQuery,
  buildGetMarketListingByStashItemQuery,
} from '@/pages/price-check/lib/tradeUrlBuilder';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { itemDisplayName } from '@/pages/market/lib/listing';
import { confirmToast, showToast, useOverlay } from '@/overlay';
import { t } from '@/i18n';
import { matchTradeListings, TRADE_LISTINGS_LIMIT, whisperedItemName, type WhisperedItem } from './trade-match';

const AUTH_WAIT_TIMEOUT = 5000;
const AUTH_POLL_INTERVAL = 200;

type DelistFn = (raw: string) => Promise<void>;
type DelistTradeFn = (trade: WhisperedItem, onDeleted?: () => void) => Promise<void>;

/** The mounted DelistHandler's implementations (they need the Pd2Website/overlay contexts). */
let activeDelist: { item: DelistFn; trade: DelistTradeFn } | null = null;

export interface DelistApi {
  /** Delist the raw clipboard item: deletes a single matching listing, or opens the picker for several. */
  delistItem(raw: string): Promise<void>;
  /**
   * Delist the item of an in-game trade whisper (it names the item, maybe its price): asks to confirm a single
   * matching listing, opens the picker for several, says so when none match. Resolves once that is shown;
   * `onDeleted` runs once one of the matched listings is deleted (confirmed, or picked), until the next call.
   */
  delistTrade(trade: WhisperedItem, onDeleted?: () => void): Promise<void>;
}

function notMounted(): Promise<void> {
  console.warn('[DelistHandler] delist called while DelistHandler is not mounted');
  return Promise.resolve();
}

const delistApi: DelistApi = {
  delistItem: (raw) => (activeDelist ? activeDelist.item(raw) : notMounted()),
  delistTrade: (trade, onDeleted) => (activeDelist ? activeDelist.trade(trade, onDeleted) : notMounted()),
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
        title: t('quickList:delist.title'),
        description: t('quickList:delist.mustLogIn'),
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
          title: t('quickList:delist.title'),
          description: t('quickList:delist.notInStash'),
          variant: 'error',
        });
        return;
      }

      const query = buildGetMarketListingByStashItemQuery(matchingStashItems, authDataRef.current.user._id);
      if (!query) {
        showToast({
          title: t('quickList:delist.title'),
          description: t('quickList:delist.noMatchingListings'),
          variant: 'info',
        });
        return;
      }

      const result = await getMarketListings(query);
      const listings = result.data.filter((listing) => !isListingDeleted(listing._id));

      if (listings.length === 0) {
        showToast({
          title: t('quickList:delist.title'),
          description: t('quickList:delist.noListingsFound'),
          variant: 'info',
        });
      } else if (listings.length === 1) {
        await deleteMarketListing(listings[0]._id);
        showToast({
          title: t('quickList:delist.title'),
          description: t('quickList:delist.removed', { name: listings[0].item.name }),
        });
      } else {
        // Multiple matches: let the user pick (replaces the list if the picker is already open)
        openPanel('delist', { listings });
      }
    } catch (err) {
      if (err instanceof NoAccountSelectedError) {
        showToast({ title: t('quickList:delist.title'), description: err.message, variant: 'error' });
        return;
      }
      console.error('[DelistHandler] Error:', err);
      showToast({
        title: t('quickList:delist.title'),
        description: t('quickList:delist.failed'),
        variant: 'error',
      });
    } finally {
      isDelistingRef.current = false;
    }
  };

  const handleDelistTradeRef = useRef<DelistTradeFn>();
  // The last trade delist's wait for one of its listings to go
  const stopWaitingRef = useRef<() => void>();
  useEffect(() => () => stopWaitingRef.current?.(), []);

  handleDelistTradeRef.current = async (trade: WhisperedItem, onDeleted?: () => void) => {
    if (isDelistingRef.current) return;
    stopWaitingRef.current?.();
    stopWaitingRef.current = undefined;

    const hasAuth = await waitForAuth();
    if (!hasAuth) {
      showToast({
        title: t('quickList:delist.title'),
        description: t('quickList:delist.mustLogIn'),
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
      const listings = matchTradeListings(
        result.data.filter((listing) => !isListingDeleted(listing._id)),
        trade,
      );

      if (onDeleted && listings.length > 0) {
        // Deleted here after the confirm, or from the picker: either way deleteMarketListing announces it
        const ids = new Set(listings.map((listing) => listing._id));
        const stop = subscribeListingDeleted((listingId) => {
          if (!ids.has(listingId)) return;
          stop();
          if (stopWaitingRef.current === stop) stopWaitingRef.current = undefined;
          onDeleted();
        });
        stopWaitingRef.current = stop;
      }
      if (listings.length === 0) {
        const name = whisperedItemName(trade);
        showToast({
          title: t('quickList:delist.title'),
          description: name ? t('quickList:delist.tradeNoMatch', { name }) : t('quickList:delist.tradeNoItem'),
          variant: 'info',
        });
      } else if (listings.length === 1) {
        const [listing] = listings;
        const name = itemDisplayName(listing.item);
        const price =
          listing.hr_price > 0 ? t('quickList:delist.hrPrice', { price: listing.hr_price }) : listing.price?.trim();
        // Matched by name only: confirm, as the chat's website-offer "Delete listing" does
        confirmToast({
          title: t('chat:deals.deleteListingTitle'),
          description: price
            ? t('quickList:delist.confirmDeleteWithPrice', { name, price })
            : t('chat:deals.deleteListingConfirm', { item: name }),
          confirmLabel: t('common:actions.delete'),
          variant: 'warning',
          duration: 10000,
          onConfirm: async () => {
            try {
              await deleteMarketListing(listing._id);
              showToast({ title: t('quickList:delist.title'), description: t('quickList:delist.removed', { name }) });
            } catch (err) {
              console.error('[DelistHandler] Delete failed:', err);
              showToast({
                title: t('quickList:delist.title'),
                description: t('quickList:delist.removeFailed'),
                variant: 'error',
              });
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
        title: t('quickList:delist.title'),
        description: t('quickList:delist.lookupFailed'),
        variant: 'error',
      });
    } finally {
      isDelistingRef.current = false;
    }
  };

  useEffect(() => {
    const impl = {
      item: (raw: string) => handleDelistRef.current!(raw),
      trade: (trade: WhisperedItem, onDeleted?: () => void) => handleDelistTradeRef.current!(trade, onDeleted),
    };
    activeDelist = impl;
    return () => {
      if (activeDelist === impl) activeDelist = null;
    };
  }, []);

  return null;
};

export default DelistHandler;
