/**
 * Market Watch alerts: while any saved search is watched (and alerts are on), ONE live search stream of all the
 * watched searches runs on pd2trader.com (anonymous: no sign-in needed). Each new match pops a toast with a View
 * action (the market browser on that search, focused on the listing) and plays the market alert sound
 * (Settings → Chat → Sound). Mounted once, in AppController.
 *
 * The stream reopens when the watched set changes. On every (re)connect each watched search catches up on the
 * listings bumped after the newest it saw (kept per search, so this also covers the time the overlay was closed).
 * Signed in, the saved searches still kept on pd2trader.com (deprecated) are imported once.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { playNotificationSound } from '@/hooks/useSocketNotifications';
import { notify } from '@/overlay';
import type { SavedSearch } from '@/pages/market/lib/types';
import {
  getMarketPrefs,
  importServerSavedSearches,
  marketStoreActions,
  useMarketStore,
} from '@/pages/market/store/useMarketStore';
import { publishMarketAlerts } from './alert-events';
import { alertToasts } from './alert-logic';
import { runWatchStream, type WatchTarget } from './alert-stream';
import {
  fetchNewestListings,
  MAX_LIVE_QUERIES,
  MAX_MARKET_QUERY_LENGTH,
  type MarketAlert,
  openLiveSearchStream,
  watchQuery,
} from './market-api';

/** The watched searches the stream can carry, by `q` (sold-listing searches can't be live). */
function watchedByQuery(searches: readonly SavedSearch[]): Map<string, SavedSearch[]> {
  const byQuery = new Map<string, SavedSearch[]>();
  for (const search of searches) {
    if (!search.watching || search.filters.source === 'archive') continue;
    const q = watchQuery(search.filters);
    if (q.length > MAX_MARKET_QUERY_LENGTH) continue;
    if (!byQuery.has(q) && byQuery.size >= MAX_LIVE_QUERIES) continue;
    byQuery.set(q, [...(byQuery.get(q) ?? []), search]);
  }
  return byQuery;
}

export function useMarketAlerts(): void {
  const { settings, isLoading } = useOptions();
  const token = isLoading ? undefined : settings.pd2Token;
  const { savedSearches, savedSearchesImported, alertsEnabled, loaded } = useMarketStore();

  // Signed in: bring over the saved searches kept on pd2trader.com, once (a failure retries on the next sign-in)
  useEffect(() => {
    if (token && loaded && !savedSearchesImported) void importServerSavedSearches(token);
  }, [token, loaded, savedSearchesImported]);

  /** The watched searches' `q`, sorted: the stream restarts only when this set changes. */
  const queryKey = useMemo(
    () => (alertsEnabled ? [...watchedByQuery(savedSearches).keys()].sort().join('\n') : ''),
    [alertsEnabled, savedSearches],
  );

  const sound = useRef({ enabled: true, volume: 70 });
  const toastMs = useRef(8_000);
  useEffect(() => {
    sound.current = { enabled: settings.marketAlertSoundEnabled ?? true, volume: settings.marketAlertVolume ?? 70 };
    toastMs.current = (settings.marketAlertToastSeconds ?? 8) * 1000;
  });
  /** Alerts shown this session: a stream restart (e.g. another search watched) never shows one twice. */
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!queryKey) return;
    const controller = new AbortController();
    const onAlerts = (alerts: MarketAlert[]) => {
      alertToasts(alerts, toastMs.current).forEach((toast) => notify('market', toast, { toast: true }));
      if (sound.current.enabled) playNotificationSound(sound.current.volume);
      // The open market panel lights up matching cards of the watched search on screen
      publishMarketAlerts(alerts);
    };
    void runWatchStream({
      queries: queryKey.split('\n'),
      open: openLiveSearchStream,
      fetchNewest: fetchNewestListings,
      // Read at each event: renames and seen bumps apply without a reconnect
      targets: (q): WatchTarget[] => watchedByQuery(getMarketPrefs().savedSearches).get(q) ?? [],
      onAlerts,
      onSeen: marketStoreActions.markSearchSeen,
      signal: controller.signal,
      seen: seen.current,
    });
    return () => controller.abort();
  }, [queryKey]);
}
