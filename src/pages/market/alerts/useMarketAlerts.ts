/**
 * Saved-search alerts: while a PD2 token is set, every ALERT_POLL_MS polls the newest listings of each alerting saved
 * search (at most MAX_ALERT_SEARCHES, one request at a time) and toasts the new matches, with a View action
 * that opens the market browser on that search, focused on the newest one. Mounted once, in AppController.
 *
 * The first poll of each search after launch (or after its filters change) only records what is listed. A rate
 * limit (429) waits the server's retry-after or a doubling backoff; a 401 pauses until the token changes.
 *
 * Gated on the PD2 token alone, like the market panel's own searches: `authData` (the pd2trader.com backend
 * sign-in) is not needed for the PD2 listing API and stays null whenever that sign-in fails or is pending (e.g.
 * a website token passed via `?token=` in browser dev mode, or a network error at launch).
 */
import { useEffect, useRef } from 'react';
import { ToastActionType } from '@/common/types/Events';
import type { MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { useOptions } from '@/hooks/useOptions';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { showToast } from '@/overlay';
import { defaultFilters, mergeFilters, withSource } from '@/pages/market/lib/defaults';
import { buildListingQuery } from '@/pages/market/lib/query';
import { rateLimitDelayMs } from '@/pages/market/lib/rate-limit';
import { matchesClientFilters, scoreListings } from '@/pages/market/lib/search';
import type { MarketFilters, SavedSearch } from '@/pages/market/lib/types';
import { useMarketStore } from '@/pages/market/store/useMarketStore';
import {
  ALERT_PAGE_SIZE,
  ALERT_POLL_MS,
  alertingSearches,
  alertToastText,
  diffListings,
  filtersFingerprint,
  rateLimitBackoff,
  type SeenState,
} from './alert-logic';

/** A saved search as polled: live listings, newest bumped first. */
function alertFilters(search: SavedSearch, mode: { hardcore: boolean; ladder: boolean }): MarketFilters {
  const merged = withSource(mergeFilters(defaultFilters(mode), search.filters), 'live');
  return { ...merged, sort: { by: 'bumped', dir: 'desc' } };
}

export function useMarketAlerts(): void {
  const { settings, isLoading } = useOptions();
  const { marketApi } = usePd2Website();
  const { savedSearches, alertsEnabled, loaded } = useMarketStore();

  const token = isLoading ? undefined : settings.pd2Token;
  const searches = loaded ? alertingSearches({ savedSearches, alertsEnabled }) : [];
  const active = !!token && searches.length > 0;

  // The poll loop reads the latest of these; it restarts only when it turns on/off or the sign-in changes
  const current = {
    searches,
    marketApi,
    mode: { hardcore: settings.mode === 'hardcore', ladder: settings.ladder === 'ladder' },
  };
  const latest = useRef(current);
  useEffect(() => {
    latest.current = current;
  });
  /** Per saved search id: the listing ids already seen. Kept across pauses (a resumed poll is no first poll). */
  const seen = useRef(new Map<string, SeenState>());

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let backoffMs = 0;

    const poll = async () => {
      const { searches: polled, mode } = latest.current;
      const ids = new Set(polled.map((s) => s.id));
      for (const id of seen.current.keys()) if (!ids.has(id)) seen.current.delete(id);

      for (const search of polled) {
        if (stopped) return;
        const filters = alertFilters(search, mode);
        const query = buildListingQuery(filters, { limit: ALERT_PAGE_SIZE, skip: 0 });
        // null: a 401 (the API helpers resolve null and start the sign-in flow)
        let result: MarketListingResult | null;
        try {
          result = await latest.current.marketApi.getMarketListings(query);
        } catch (error) {
          const retryAfter = rateLimitDelayMs(error);
          if (retryAfter !== null) {
            backoffMs = rateLimitBackoff(backoffMs, retryAfter);
            return; // the rest of this round waits too
          }
          console.warn('[market alerts] poll failed:', search.name, error);
          continue;
        }
        // 401: the sign-in flow has started; a new token (refresh or sign-in) restarts this loop
        if (!result) {
          stopped = true;
          return;
        }
        backoffMs = 0;
        if (stopped) return;

        const listings = result.data ?? [];
        const matching = new Set(
          scoreListings(listings, filters)
            .filter((scored) => matchesClientFilters(scored, filters))
            .map((scored) => scored.listing._id),
        );
        const { next, fresh } = diffListings(
          seen.current.get(search.id),
          filtersFingerprint(filters),
          listings,
          (listing) => matching.has(listing._id),
        );
        seen.current.set(search.id, next);
        if (fresh.length > 0) {
          showToast({
            ...alertToastText(search, fresh),
            action: {
              label: 'View',
              type: ToastActionType.OPEN_MARKET_PANEL,
              data: { savedSearchId: search.id, focusListingId: fresh[0]._id, tab: 'search' },
            },
          });
        }
      }
    };

    const schedule = (ms: number) => {
      timer = setTimeout(async () => {
        await poll();
        if (!stopped) schedule(backoffMs || ALERT_POLL_MS);
      }, ms);
    };
    // First round right away: it seeds what is listed now
    schedule(0);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [active, token]);
}
