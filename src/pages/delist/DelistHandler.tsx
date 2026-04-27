import { useCallback, useEffect, useRef } from 'react';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { buildGetMarketListingByStashItemQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { emit, listen } from '@/lib/browser-events';

interface DelistHandlerProps {
  onShowPopup?: (listings: any[]) => void;
}

const AUTH_WAIT_TIMEOUT = 5000;
const AUTH_POLL_INTERVAL = 200;

const DelistHandler: React.FC<DelistHandlerProps> = ({ onShowPopup }) => {
  const { findMatchingItems, getMarketListings, deleteMarketListing, authData } = usePd2Website();
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

  const handleDelistRef = useRef<(raw: string) => Promise<void>>();

  handleDelistRef.current = async (raw: string) => {
    console.log('[DelistHandler] Received delist-item event');
    if (isDelistingRef.current) return;

    const hasAuth = await waitForAuth();
    if (!hasAuth) {
      emit('toast-event', {
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
        emit('toast-event', {
          title: 'Delist',
          description: 'Item not found in stash.',
          variant: 'error',
        });
        return;
      }

      const query = buildGetMarketListingByStashItemQuery(matchingStashItems, authDataRef.current.user._id);
      if (!query) {
        emit('toast-event', {
          title: 'Delist',
          description: 'No active listings match this item.',
          variant: 'info',
        });
        return;
      }

      const result = await getMarketListings(query);
      const listings = result.data;

      if (listings.length === 0) {
        emit('toast-event', {
          title: 'Delist',
          description: 'No active listings found for this item.',
          variant: 'info',
        });
      } else if (listings.length === 1) {
        await deleteMarketListing(listings[0]._id);
        emit('toast-event', {
          title: 'Delist',
          description: `Removed ${listings[0].item.name} listing.`,
        });
      } else {
        // Multiple matches - emit event for popup
        emit('delist-show-popup', listings);
      }
    } catch (err) {
      console.error('[DelistHandler] Error:', err);
      emit('toast-event', {
        title: 'Delist',
        description: 'Failed to delist item.',
        variant: 'error',
      });
    } finally {
      isDelistingRef.current = false;
    }
  };

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let mounted = true;
    listen<string>('delist-item', ({ payload }) => {
      handleDelistRef.current?.(payload);
    }).then((fn) => {
      if (mounted) {
        unlisten = fn;
      } else {
        fn();
      }
    });
    return () => {
      mounted = false;
      if (unlisten) unlisten();
    };
  }, []);

  return null;
};

export default DelistHandler;
