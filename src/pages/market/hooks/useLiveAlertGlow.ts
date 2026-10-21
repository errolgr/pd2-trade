import { useEffect, useState } from 'react';
import { subscribeMarketAlerts } from '../alerts/alert-events';
import { findWatch } from '../alerts/alert-logic';
import type { MarketFilters, SavedSearch } from '../lib/types';

/** Listings that just matched a live alert of the search on screen; `nonce` tells batches apart. */
export interface AlertGlow {
  ids: ReadonlySet<string>;
  nonce: number;
}

const NONE: AlertGlow = { ids: new Set(), nonce: 0 };

/** The latest live-alert batch for the watched search matching `filters` (empty when it isn't watched). */
export function useLiveAlertGlow(filters: MarketFilters | null, savedSearches: readonly SavedSearch[]): AlertGlow {
  const [glow, setGlow] = useState<AlertGlow>(NONE);
  const watchId = filters ? findWatch(savedSearches, filters).watching?.id : undefined;
  useEffect(() => {
    if (!watchId) return;
    return subscribeMarketAlerts((alerts) => {
      const ids = alerts.filter((a) => a.savedSearchId === watchId).map((a) => a.listingId);
      if (ids.length) setGlow((prev) => ({ ids: new Set(ids), nonce: prev.nonce + 1 }));
    });
  }, [watchId]);
  return glow;
}
