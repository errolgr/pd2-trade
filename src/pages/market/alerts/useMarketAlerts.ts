/**
 * Market Watch / saved-search alerts: keeps the saved searches synced with pd2trader.com for the signed-in PD2
 * token, and while any of them alerts (and alerts are on) listens on the server's live alert stream. Each new
 * match pops a toast with a View action (the market browser on that search, focused on the listing) and plays
 * the market alert sound (Settings → Chat → Sound). Mounted once, in AppController.
 *
 * The server matches every listing PD2 adds or bumps (about every 15 s) and keeps alerts for 30 days: after a
 * reconnect, missed ones are caught up on. A 401 (list, edit or stream) stops everything sent with that token:
 * the token is refreshed once, and when that fails (or the refreshed token is refused too) the sign-in panel
 * opens. Nothing is sent again until the token changes.
 */
import { useEffect, useRef, useState } from 'react';
import { useOAuth } from '@/hooks/useOAuth';
import { useOptions } from '@/hooks/useOptions';
import { playNotificationSound } from '@/hooks/useSocketNotifications';
import { showToast, useOverlay } from '@/overlay';
import { refuseSavedSearchToken, syncSavedSearches, useMarketStore } from '@/pages/market/store/useMarketStore';
import { publishMarketAlerts } from './alert-events';
import { alertToasts } from './alert-logic';
import { runAlertStream } from './alert-stream';
import { listMarketAlerts, type MarketAlert, openAlertStream } from './saved-search-api';

export function useMarketAlerts(): void {
  const { settings, isLoading } = useOptions();
  const token = isLoading ? undefined : settings.pd2Token;
  const { savedSearches, alertsEnabled, syncStatus } = useMarketStore();
  const { refreshTokens } = useOAuth();
  const { openPanel } = useOverlay();

  /** The token pd2trader.com refused (401): nothing is sent with it again. */
  const [refusedToken, setRefusedToken] = useState<string | null>(null);

  useEffect(() => {
    syncSavedSearches(token ?? null, token ? () => setRefusedToken(token) : undefined);
  }, [token]);

  /** A refresh started because `from` was refused; `to` is the token it brought. */
  const recovery = useRef<{ from: string; to: string | null } | null>(null);
  /** The token now: a refresh that fails after the user signed in some other way must not prompt again. */
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
    const current = recovery.current;
    if (current && !current.to && token && token !== current.from) current.to = token;
  }, [token]);
  // The refreshed token works: recovery is over, a later 401 on it gets its own refresh
  useEffect(() => {
    if (syncStatus === 'ready' && recovery.current?.to === token) recovery.current = null;
  }, [syncStatus, token]);

  const refreshToken = settings.pd2RefreshToken;
  /** The refused token already acted on: one refresh or sign-in prompt per token, whatever re-renders. */
  const handledToken = useRef<string | null>(null);
  useEffect(() => {
    if (!token || token !== refusedToken || handledToken.current === token) return;
    handledToken.current = token;
    // A token our own refresh just brought being refused too: refreshing again would loop
    if (refreshToken && recovery.current?.to !== token) {
      recovery.current = { from: token, to: null };
      void refreshTokens(refreshToken).then((refreshed) => {
        if (refreshed) return; // the new token restarts the sync and the stream
        recovery.current = null;
        // Signed in (or out) some other way while the refresh ran: that session decides
        if (tokenRef.current !== token) return;
        openPanel('signIn');
      });
      return;
    }
    console.log('[market alerts] pd2trader.com refused the PD2 token; asking to sign in again');
    recovery.current = null;
    openPanel('signIn');
  }, [token, refusedToken, refreshToken, refreshTokens, openPanel]);

  const watching = alertsEnabled && savedSearches.some((s) => s.alert);
  const active = !!token && watching && token !== refusedToken;

  const sound = useRef({ enabled: true, volume: 70 });
  useEffect(() => {
    sound.current = { enabled: settings.marketAlertSoundEnabled ?? true, volume: settings.marketAlertVolume ?? 70 };
  });
  /** Alert ids shown this session: a stream restart (e.g. alerts toggled) never shows one twice. */
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!active || !token) return;
    const controller = new AbortController();
    const onAlerts = (alerts: MarketAlert[]) => {
      alertToasts(alerts).forEach((toast) => showToast(toast));
      if (sound.current.enabled) playNotificationSound(sound.current.volume);
      // The open market panel lights up matching cards of the watched search on screen
      publishMarketAlerts(alerts);
    };
    void runAlertStream({
      token,
      open: openAlertStream,
      catchUp: async (t, since) => (await listMarketAlerts(t, since)).items,
      onAlerts,
      onUnauthorized: () => {
        setRefusedToken(token);
        refuseSavedSearchToken(token);
      },
      signal: controller.signal,
      seen: seen.current,
    });
    return () => controller.abort();
  }, [active, token]);
}
