/**
 * Market Watch alerts: while any saved search is watched (and alerts are on), ONE live search stream of all the
 * watched searches runs on pd2trader.com (anonymous unless signed in). Each new match pops a toast with a View
 * action (the market browser on that search, focused on the listing) and plays the market alert sound
 * (Settings → Chat → Sound). Signed in, the stream (then also without a watched search) carries the responses to
 * the user's buy requests (`wtb.response`): a toast with View request and Whisper back. Mounted once, in
 * AppController.
 *
 * The stream reopens when the watched set changes. On every (re)connect each watched search catches up on the
 * listings bumped after the newest it saw (kept per search, so this also covers the time the overlay was closed),
 * and the responses that came while away go to the notification log as missed.
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
import { wtbResponseAt, wtbResponseSeenKey, type WtbResponse } from '@/pages/market/lib/wtb';
import { wtbResponseToast } from '@/pages/market/wtb/wtb-responses';
import { offerDecisionToast } from '@/pages/market/wtb/wtb-offers';
import { upsertMyOffer } from '@/pages/market/wtb/my-offers';
import { publishMarketAlerts, publishWtbResponse } from './alert-events';
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
import { listWtbResponses } from './wtb-api';

/** The watched searches the stream can carry, by `q` (sold-listing searches can't be live). */
function watchedByQuery(searches: readonly SavedSearch[]): Map<string, SavedSearch[]> {
  const byQuery = new Map<string, SavedSearch[]>();
  for (const search of searches) {
    if (!search.watching || search.filters.source !== 'live') continue;
    const q = watchQuery(search.filters);
    if (q.length > MAX_MARKET_QUERY_LENGTH) continue;
    if (!byQuery.has(q) && byQuery.size >= MAX_LIVE_QUERIES) continue;
    byQuery.set(q, [...(byQuery.get(q) ?? []), search]);
  }
  return byQuery;
}

/** Responses read when (re)connecting, for those that came in while away (logged as missed, no toast). */
const RESPONSES_CATCH_UP = 20;

export function useMarketAlerts(): void {
  const { settings, isLoading, updateSettings } = useOptions();
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
  /** The newest response told about (shown or logged): the catch-up after a reconnect skips up to it. */
  const responsesSeenAt = useRef<string | undefined>(undefined);
  useEffect(() => {
    sound.current = { enabled: settings.marketAlertSoundEnabled ?? true, volume: settings.marketAlertVolume ?? 70 };
    toastMs.current = (settings.marketAlertToastSeconds ?? 8) * 1000;
    responsesSeenAt.current = settings.wtbResponsesSeenAt;
  });
  /** Alerts shown this session: a stream restart (e.g. another search watched) never shows one twice. */
  const seen = useRef(new Set<string>());

  // Signed in, the stream also runs without a watched search: it carries the responses to the user's buy requests
  useEffect(() => {
    if (!queryKey && !token) return;
    const controller = new AbortController();
    const onAlerts = (alerts: MarketAlert[]) => {
      alertToasts(alerts, toastMs.current).forEach((toast) => notify('market', toast, { toast: true }));
      if (sound.current.enabled) playNotificationSound(sound.current.volume);
      // The open market panel lights up matching cards of the watched search on screen
      publishMarketAlerts(alerts);
    };
    const markSeen = (at: string) => {
      if (!responsesSeenAt.current || Date.parse(at) > Date.parse(responsesSeenAt.current)) {
        responsesSeenAt.current = at;
        void updateSettings({ wtbResponsesSeenAt: at });
      }
    };
    const onWtbResponse = (response: WtbResponse) => {
      notify('market', wtbResponseToast(response, toastMs.current), {
        toast: true,
        groupKey: `wtb:${response.requestId}`,
      });
      if (sound.current.enabled) playNotificationSound(sound.current.volume);
      publishWtbResponse(response);
      markSeen(wtbResponseAt(response));
    };
    // An offer decided by the buyer (the user sold: accepted / declined) or withdrawn by its seller (the user buys)
    const onWtbOffer = (response: WtbResponse) => {
      if (response.status === 'withdrawn') publishWtbResponse(response);
      else upsertMyOffer(response);
      const toast = offerDecisionToast(response, toastMs.current);
      if (!toast) return;
      notify('market', toast, { toast: true, groupKey: `wtb-offer:${response.id}` });
      if (sound.current.enabled) playNotificationSound(sound.current.volume);
    };
    // Responses that came while away: in the notification log as missed (oldest first), never toasted; the first
    // time ever, only where they start counting
    const catchUpResponses = async () => {
      if (!token) return;
      try {
        const { items } = await listWtbResponses(token, { direction: 'received', limit: RESPONSES_CATCH_UP });
        if (controller.signal.aborted) return;
        const since = responsesSeenAt.current;
        const missed = since
          ? items.filter(
              (r) => Date.parse(wtbResponseAt(r)) > Date.parse(since) && !seen.current.has(wtbResponseSeenKey(r)),
            )
          : [];
        for (const response of [...missed].reverse()) {
          seen.current.add(wtbResponseSeenKey(response));
          notify('market', wtbResponseToast(response, toastMs.current), {
            toast: false,
            groupKey: `wtb:${response.requestId}`,
          });
          publishWtbResponse(response);
        }
        const newest = items.map(wtbResponseAt).sort().at(-1);
        if (newest) markSeen(newest);
        else if (!since) markSeen(new Date().toISOString());
      } catch (error) {
        console.warn('[market alerts] responses catch-up failed:', error);
      }
    };
    void runWatchStream({
      queries: queryKey ? queryKey.split('\n') : [],
      open: (queries, signal) => openLiveSearchStream(queries, signal, token),
      fetchNewest: fetchNewestListings,
      // Read at each event: renames and seen bumps apply without a reconnect
      targets: (q): WatchTarget[] => watchedByQuery(getMarketPrefs().savedSearches).get(q) ?? [],
      onAlerts,
      onSeen: marketStoreActions.markSearchSeen,
      onWtbResponse,
      onWtbOffer,
      onConnected: () => void catchUpResponses(),
      signal: controller.signal,
      seen: seen.current,
    });
    return () => controller.abort();
  }, [queryKey, token, updateSettings]);
}
