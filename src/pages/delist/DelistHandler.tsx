import { useCallback, useEffect, useRef } from 'react';
import { NoAccountSelectedError, usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { buildGetMarketListingByStashItemQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { showToast, useOverlay } from '@/overlay';
import { t } from '@/i18n';

const AUTH_WAIT_TIMEOUT = 5000;
const AUTH_POLL_INTERVAL = 200;

type DelistFn = (raw: string) => Promise<void>;

/** The mounted DelistHandler's implementation (it needs the Pd2Website/overlay contexts). */
let activeDelist: DelistFn | null = null;

export interface DelistApi {
  /** Delist the raw clipboard item: deletes a single matching listing, or opens the picker for several. */
  delistItem(raw: string): Promise<void>;
}

const delistApi: DelistApi = {
  delistItem: (raw) => {
    if (!activeDelist) {
      console.warn('[DelistHandler] delistItem called while DelistHandler is not mounted');
      return Promise.resolve();
    }
    return activeDelist(raw);
  },
};

/** Stable delist API; works anywhere (AppController is a sibling of DelistHandler, not a child). */
export function useDelist(): DelistApi {
  return delistApi;
}

const DelistHandler: React.FC = () => {
  const { findMatchingItems, getMarketListings, deleteMarketListing, authData } = usePd2Website();
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
      const listings = result.data;

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

  useEffect(() => {
    const impl: DelistFn = (raw) => handleDelistRef.current!(raw);
    activeDelist = impl;
    return () => {
      if (activeDelist === impl) activeDelist = null;
    };
  }, []);

  return null;
};

export default DelistHandler;
