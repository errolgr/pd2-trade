import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { RunePrice } from '@pd2-trader/plugin-sdk';
import { useOptions } from '@/hooks/useOptions';
import { useNetWorth } from '@/hooks/useNetWorth';
import { useShortcuts } from '@/hooks/useShortcuts';
import { fetch as appFetch } from '@/lib/browser-http';
import { getSeasonDateConfig } from '@/lib/seasons';
import { applyTheme, resolveTheme, setExtraThemes } from '@/lib/themes';
import { showToast, useOverlay, type PanelId } from '@/overlay';
import { t } from '@/i18n';
import { fetchItemPriceByName } from '@/pages/currency/lib/price-api';
import { calculateRuneValues, fetchEconomyData, sortItemsByPrice } from '@/pages/price-check/lib/economyService';
import { toNetWorthSummary } from './adapters/net-worth';
import { devLoader } from './dev/unpacked';
import { idbStore } from './host/idb-store';
import { pluginHost } from './host/manager';
import { currentThemeInfo, pluginThemeToTheme, watchTheme } from './host/theme';
import { EMPTY_PLUGINS_SETTINGS, type HostServices } from './host/types';
import { marketplaceApi } from './marketplace/api';
import { MarketplaceClient } from './marketplace/install';
import { usePluginHost } from './ui/hooks';

/** The app's marketplace client (install/update/blocklist); started with the plugin host. */
export const marketplace = new MarketplaceClient({
  api: marketplaceApi,
  manager: pluginHost,
  storage: typeof localStorage === 'undefined' ? undefined : localStorage,
});

const RUNE_CACHE_MS = 10 * 60 * 1000;

/**
 * Mounts the plugin host into the app (once, in main.tsx inside the domain providers): implements the host
 * services the broker proxies from app state, starts installed plugins once settings are loaded, forwards
 * game focus and theme events, registers plugin hotkeys, opens the consent sheet, and applies plugin themes.
 */
export default function PluginHostBridge() {
  const { settings, isLoading, updateSettings } = useOptions();
  const netWorth = useNetWorth();
  const { openPanel, closePanel, gameFocused } = useOverlay();
  const host = usePluginHost();

  // Services read the latest app state through refs: the host starts once and outlives renders.
  const live = useRef({ settings, netWorth, openPanel, updateSettings });
  useLayoutEffect(() => {
    live.current = { settings, netWorth, openPanel, updateSettings };
  });

  const services = useMemo<HostServices>(() => {
    let runeCache: { key: string; at: number; value: Promise<RunePrice[]> } | null = null;
    const mode = () => ({
      ladder: live.current.settings.ladder !== 'non-ladder',
      hardcore: live.current.settings.mode === 'hardcore',
    });
    const priceConfig = () => ({
      isLadder: mode().ladder,
      isHardcore: mode().hardcore,
      ...getSeasonDateConfig(live.current.settings.selectedSeasonId),
    });
    return {
      gameMode: mode,
      runePrices() {
        const key = JSON.stringify(priceConfig());
        if (runeCache && runeCache.key === key && Date.now() - runeCache.at < RUNE_CACHE_MS) return runeCache.value;
        const value = fetchEconomyData(priceConfig()).then((data) =>
          calculateRuneValues(sortItemsByPrice(data.Runes)).map((rune) => ({
            name: rune.name,
            priceHr: rune.price,
            listings: Math.max(0, rune.numListings),
            fixed: !!rune.isFixed,
          })),
        );
        runeCache = { key, at: Date.now(), value };
        value.catch(() => (runeCache = null));
        return value;
      },
      async itemPrice(name) {
        const price = await fetchItemPriceByName(name, { ...priceConfig(), hours: live.current.settings.priceWindowHours });
        if (!price) return null;
        return {
          name: price.itemName,
          medianHr: price.medianPrice ?? null,
          lowHr: price.minPrice ?? null,
          highHr: price.maxPrice ?? null,
          sampleCount: price.sampleCount ?? 0,
          change7dPercent: price.priceChange7Days?.changePercent ?? null,
        };
      },
      netWorthSummary: () => toNetWorthSummary(live.current.netWorth.latest?.valuation ?? null),
      accountProfile() {
        const account = live.current.netWorth.owner?.account ?? live.current.settings.account;
        return account ? { account, characters: [] } : null;
      },
      notify(plugin, notification) {
        showToast({
          title: notification.title,
          description: [notification.body, t('plugins:notify.from', { name: plugin.name })].filter(Boolean).join(' · '),
          variant:
            notification.tone === 'danger'
              ? 'error'
              : notification.tone === 'success' || notification.tone === 'warning'
                ? notification.tone
                : 'default',
        });
      },
      openPanel: (panelId, payload) => live.current.openPanel(panelId as PanelId, payload),
      httpFetch: (url, init) => appFetch(url, init),
      themeInfo: () => currentThemeInfo(),
    };
  }, []);

  // Start once settings are loaded; plugin registry writes go through the settings file.
  useEffect(() => {
    if (isLoading) return;
    void pluginHost.start({
      services,
      devLoader,
      persistence: {
        loadSettings: async () => live.current.settings.plugins ?? EMPTY_PLUGINS_SETTINGS,
        saveSettings: async (plugins) => {
          await live.current.updateSettings({ plugins });
        },
        ...idbStore,
      },
      telemetry: { error: (id, version, kind) => void marketplaceApi.reportError(id, version, kind) },
      onAutoDisabled(plugin, reason) {
        showToast({
          title: t(reason === 'blocklisted' ? 'plugins:disabled.blocklisted' : 'plugins:disabled.failures', {
            name: plugin.name,
          }),
          description: t(reason === 'blocklisted' ? 'plugins:disabled.blocklistedHint' : 'plugins:disabled.failuresHint'),
          variant: 'warning',
        });
      },
    }).then(() => marketplace.start());
    return () => {
      marketplace.stop();
      pluginHost.shutdown();
    };
    // Starts once per load; services are stable and read live state through refs.
  }, [isLoading, services]);

  // B9 events: game focus and theme changes (price check / chat events are emitted at their sources).
  useEffect(() => pluginHost.emit('game.focus', { focused: gameFocused }), [gameFocused]);
  useEffect(() => watchTheme((theme) => pluginHost.emit('theme.changed', theme)), []);

  // Consent sheet: a core panel shown while any install/update asks for consent.
  const consentId = host.consent?.id ?? null;
  useEffect(() => {
    if (consentId === null) closePanel('pluginConsent');
    else openPanel('pluginConsent', undefined, { placement: 'screenCenter' });
  }, [consentId, openPanel, closePanel]);

  // B8: theme plugins join the theme list; re-apply when the selected one (re)loads.
  const themesKey = JSON.stringify(host.themes);
  useEffect(() => {
    setExtraThemes(host.themes.map(pluginThemeToTheme));
    if (!isLoading && settings.themeId?.startsWith('plugin:')) applyTheme(resolveTheme(settings.themeId));
    // themesKey stands in for host.themes (a new array on every snapshot).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themesKey, isLoading, settings.themeId]);

  // B6: plugin command hotkeys (global shortcuts, Tauri only; the palette lists the commands everywhere).
  const commandsKey = JSON.stringify(host.plugins.map((p) => [p.installed.id, p.status, p.installed.hotkeys]));
  const shortcuts = useMemo(
    () =>
      pluginHost
        .commands()
        .filter((c) => c.hotkey?.key)
        .map((c) => ({
          modifier: c.hotkey!.modifier,
          key: c.hotkey!.key,
          handler: () =>
            pluginHost.runCommand(c.pluginId, c.id).catch((error: unknown) =>
              showToast({
                title: t('plugins:command.failed'),
                description: error instanceof Error ? error.message : String(error),
                variant: 'error',
              }),
            ),
        })),
    // commandsKey captures every input of pluginHost.commands().
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commandsKey],
  );
  useShortcuts(shortcuts);

  return null;
}
