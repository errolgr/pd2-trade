import { useEffect, useState, useSyncExternalStore } from 'react';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { useOptions } from '@/hooks/useOptions';
import { getSeasonDateConfig } from '@/lib/seasons';
import { fetchRareHistory, type RareHistory } from '@/lib/rare-appraisal-api';
import { reportApiError } from '@/lib/error-reporting';
import { listingPriceCode } from '@/pages/chat/lib/price-codes';
import type { SparklineQuery } from '@/pages/price-check/components/PriceSparkline';
import { rareRequest } from './listing-clipboard';
import {
  getRareEntry,
  isRareEntryStale,
  rareEstimatesVersion,
  requestRareEstimate,
  subscribeRareEstimates,
} from './rare-estimates';

/**
 * Price history of a listing's item:
 * - economy items (uniques, sets, runes…): the 30-day daily price line (`GET /item-prices/history/:baseCode`),
 *   rendered by the price check's PriceSparkline (which fetches and caches it);
 * - rares/crafted: earlier market listings of the same item (`GET /api/rare-history/:fingerprint`, the
 *   fingerprint from the rare appraisal); `none` when the item was never seen or is too generic (weak);
 * - anything else: none.
 */
export type PriceHistoryState =
  | { kind: 'none' }
  | { kind: 'economy'; query: SparklineQuery }
  | { kind: 'rare'; status: 'loading' }
  | { kind: 'rare'; status: 'ready'; history: RareHistory };

/** One lookup per fingerprint for the app's lifetime; failed lookups are retried on the next open. */
const historyCache = new Map<string, Promise<RareHistory | null>>();

function loadRareHistory(id: string): Promise<RareHistory | null> {
  let pending = historyCache.get(id);
  if (!pending) {
    pending = fetchRareHistory(id).catch((err: unknown) => {
      historyCache.delete(id);
      reportApiError(err instanceof Error ? err : new Error(String(err)), 'rare-appraisal-api', 'api/rare-history');
      return null;
    });
    historyCache.set(id, pending);
  }
  return pending;
}

const NONE: PriceHistoryState = { kind: 'none' };

export function usePriceHistory(listing: MarketListingEntry | null | undefined): PriceHistoryState {
  const { settings } = useOptions();
  const { startDate: seasonStart, endDate: seasonEnd } = getSeasonDateConfig(settings.selectedSeasonId);
  const baseCode = listing?.item ? listingPriceCode(listing.item) : null;
  const rare = listing && !baseCode ? rareRequest(listing) : null;
  const rareKey = rare?.key ?? null;

  useSyncExternalStore(subscribeRareEstimates, rareEstimatesVersion);
  useEffect(() => {
    if (rare && isRareEntryStale(rare.key)) void requestRareEstimate(rare.key, rare.text, rare.realm);
    // rare is derived from rareKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rareKey]);
  const entry = rareKey ? getRareEntry(rareKey) : undefined;
  const appraisalId = entry?.appraisalId ?? null;

  const [loaded, setLoaded] = useState<{ id: string; history: RareHistory | null } | null>(null);
  useEffect(() => {
    if (!appraisalId) return;
    let cancelled = false;
    void loadRareHistory(appraisalId).then((history) => {
      if (!cancelled) setLoaded({ id: appraisalId, history });
    });
    return () => {
      cancelled = true;
    };
  }, [appraisalId]);

  if (!listing) return NONE;
  if (baseCode) {
    return {
      kind: 'economy',
      query: {
        baseCode,
        isLadder: listing.is_ladder,
        isHardcore: listing.is_hardcore,
        ...(seasonStart ? { seasonStart } : {}),
        ...(seasonEnd ? { seasonEnd } : {}),
      },
    };
  }
  if (!rareKey) return NONE;
  // Appraisal pending: the fingerprint is not known yet.
  if (!entry) return { kind: 'rare', status: 'loading' };
  if (!appraisalId) return NONE;
  if (loaded?.id !== appraisalId) return { kind: 'rare', status: 'loading' };
  const history = loaded.history;
  return history && !history.weak && history.listings.length > 0 ? { kind: 'rare', status: 'ready', history } : NONE;
}
