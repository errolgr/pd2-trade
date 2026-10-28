import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { useListingMarketPrices } from '@/pages/chat/hooks/useListingMarketPrices';
import { makeDeal, type Deal } from './deal';
import { rareRequest } from './listing-clipboard';
import {
  getRareEntry,
  isRareEntryStale,
  rareEstimatesVersion,
  requestRareEstimate,
  subscribeRareEstimates,
} from './rare-estimates';
import { t } from '@/i18n';

export type { Deal, DealVerdict, DealSource } from './deal';
export { DEAL_THRESHOLDS } from './deal';

interface RareRequest {
  listingId: string;
  key: string;
  text: string;
  realm: string;
}

/**
 * Deal indicators keyed by listing `_id`: asking price vs an estimate.
 * - Uniques, sets, runes and the crawler's base-code items (keys, ubers, essences…): the economy price service
 *   (the chat listing-card prices: user's price window and season, batched + cached per realm and code).
 * - Rares and crafted: the rare appraisal batch endpoint (midpoint of the similar-listings asking band),
 *   cached by item content per realm.
 * A listing is absent while its estimate loads and when none exists (runewords and plain bases have no
 * crawler price). Note-only listings (hr_price 0) get a Deal with the estimate but no ratio/verdict.
 */
export function useDealIndicators(listings: readonly MarketListingEntry[]): ReadonlyMap<string, Deal> {
  const economy = useListingMarketPrices(listings);

  const rareKey = useMemo(() => {
    const requests: RareRequest[] = [];
    for (const listing of listings) {
      // Rare/crafted only: the economy service never prices those, so the two sources never overlap.
      const req = rareRequest(listing);
      if (req) requests.push({ listingId: listing._id, ...req });
    }
    return JSON.stringify(requests);
  }, [listings]);
  const rareVersion = useSyncExternalStore(subscribeRareEstimates, rareEstimatesVersion);

  useEffect(() => {
    const now = Date.now();
    for (const { key, text, realm } of JSON.parse(rareKey) as RareRequest[]) {
      if (isRareEntryStale(key, now)) void requestRareEstimate(key, text, realm);
    }
  }, [rareKey]);

  return useMemo(() => {
    const deals = new Map<string, Deal>();
    const byId = new Map(listings.map((l) => [l._id, l]));
    for (const [listingId, price] of economy) {
      const listing = byId.get(listingId);
      if (!listing) continue;
      const deal = makeDeal(listing.hr_price, {
        hr: price.hr,
        source: 'economy',
        confidence: 'normal',
        detail: t('market:deal.marketAverage', { window: price.window }),
      });
      if (deal) deals.set(listingId, deal);
    }
    for (const { listingId, key } of JSON.parse(rareKey) as RareRequest[]) {
      const listing = byId.get(listingId);
      const estimate = getRareEntry(key)?.estimate;
      if (!listing || !estimate) continue;
      const deal = makeDeal(listing.hr_price, estimate);
      if (deal) deals.set(listingId, deal);
    }
    return deals;
    // rareVersion: the appraisal cache is module state; a settled batch must recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, economy, rareKey, rareVersion]);
}
