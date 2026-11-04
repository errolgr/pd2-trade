import React from 'react';
import { isTauri } from '@tauri-apps/api/core';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './globals.css';
// UI language: initialized before the first render (bundled resources, synchronous)
import { currentLocale, useTranslation } from '@/i18n';
import { D2LabelsProvider, UiLabelsProvider, type D2Labels } from '@pd2-trader/ui';
import { initDebugLoggingFromSettings } from '@/lib/debug-logger';
import { initTheme } from '@/lib/themes';
import { initTelemetryFromSettings } from '@/lib/telemetry-opt-out';
import { Pd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { OptionsProvider } from './hooks/useOptions';
import { DialogProvider } from './hooks/useDialog';
import { TrayProvider } from './hooks/useTray';
import { ItemsProvider } from './hooks/useItems';
import { NetWorthProvider } from './hooks/useNetWorth';
import { WhisperHistoryProvider } from './hooks/useWhisperHistory';
import { GlobalErrorHandler } from './components/GlobalErrorHandler';
import AppController from './pages/landing/AppController';
import DelistHandler from './pages/delist/DelistHandler';
import StashAutoDelistController from './pages/delist/StashAutoDelistController';
import NetWorthOverlayController from './pages/net-worth/NetWorthOverlayController';
import CorruptedZoneTimerController from './pages/corrupted-zones/CorruptedZoneTimerController';
import { OverlayProvider, OverlayRoot } from './overlay';
import { usePanelDefs } from './overlay/registry';
import PluginHostBridge from './plugins/PluginHostBridge';
import PrimitivesGallery from './pages/dev/PrimitivesGallery';
import { SignInWindowPage } from './pages/sign-in/SignInPage';
import { SignInProvider } from './hooks/useSignIn';

// Apply the cached theme before the first render (no flash of the default theme)
initTheme();

// Initialize debug logging if enabled in settings
initDebugLoggingFromSettings();

// Sentry (errors/traces/replay) and Grafana Faro (metrics/events), unless the user opted out of telemetry
initTelemetryFromSettings();

// Suppress the native WebView context menu (Reload/Inspect/etc.) on all overlay windows; browser mode keeps it
// (Inspect / DevTools)
if (isTauri()) document.addEventListener('contextmenu', (e) => e.preventDefault());

/**
 * The single overlay window: every provider mounted once, every UI surface a panel.
 * OverlayProvider sits above the domain providers so they (sign-in, tray settings, net worth) can open panels.
 */
/** Core panels plus enabled plugins' panels (`plugin:<id>:<panel>`). */
const OverlayWithPlugins: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <OverlayProvider defs={usePanelDefs()}>{children}</OverlayProvider>
);

const AppRoot: React.FC = () => (
  <DialogProvider>
    <OptionsProvider>
      <OverlayWithPlugins>
        <SignInProvider>
          <TrayProvider>
            <ItemsProvider>
              <Pd2WebsiteProvider>
                <WhisperHistoryProvider>
                  <NetWorthProvider>
                    <GlobalErrorHandler />
                    <AppController />
                    <DelistHandler />
                    <StashAutoDelistController />
                    <NetWorthOverlayController />
                    <CorruptedZoneTimerController />
                    <PluginHostBridge />
                    <OverlayRoot />
                  </NetWorthProvider>
                </WhisperHistoryProvider>
              </Pd2WebsiteProvider>
            </ItemsProvider>
          </TrayProvider>
        </SignInProvider>
      </OverlayWithPlugins>
    </OptionsProvider>
  </DialogProvider>
);

// The native sign-in window (src-tauri commands::open_sign_in_window): only its view, Main runs the sign-in
const signInWindow = new URLSearchParams(window.location.search).get('window') === 'sign-in';

/**
 * Translated built-in strings of @pd2-trader/ui components (screen-reader close/more, retry, loading, units, table,
 * combobox and number-input chrome) and of its D2 components (game strings: qualities, classes, tooltip lines, slots).
 */
const UiLabels: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  // D2 counts arrive locale-formatted ("1,234"): the digits pick the plural form, the string is what's shown
  const counted = (key: string, value: string) => t(key, { count: Number(value.replace(/\D/g, '')) || 0, value });
  const d2: D2Labels = {
    quality: (quality) => t(`app:d2.quality.${quality}`),
    className: (cls) => t(`app:d2.class.${cls}`),
    level: (level) => t('app:d2.level', { level }),
    ladder: t('app:d2.ladder'),
    nonLadder: t('app:d2.nonLadder'),
    softcore: t('app:d2.softcore'),
    hardcore: t('app:d2.hardcore'),
    ladderShort: t('app:d2.ladderShort'),
    nonLadderShort: t('app:d2.nonLadderShort'),
    softcoreShort: t('app:d2.softcoreShort'),
    hardcoreShort: t('app:d2.hardcoreShort'),
    classic: t('app:d2.classic'),
    season: (season) => t('app:d2.season', { season }),
    seasonShort: (season) => t('app:d2.seasonShort', { season }),
    dead: t('app:d2.dead'),
    defense: t('app:d2.defense'),
    oneHandDamage: t('app:d2.oneHandDamage'),
    twoHandDamage: t('app:d2.twoHandDamage'),
    throwDamage: t('app:d2.throwDamage'),
    durability: (current, max) => t('app:d2.durability', { current, max }),
    requiredLevel: (value) => t('app:d2.requiredLevel', { value }),
    requiredStrength: (value) => t('app:d2.requiredStrength', { value }),
    requiredDexterity: (value) => t('app:d2.requiredDexterity', { value }),
    itemLevel: (value) => t('app:d2.itemLevel', { value }),
    ethereal: t('app:d2.ethereal'),
    etherealShort: t('app:d2.etherealShort'),
    socketed: (value) => t('app:d2.socketed', { value }),
    corrupted: t('app:d2.corrupted'),
    unidentified: t('app:d2.unidentified'),
    setPieces: (value) => counted('app:d2.setPieces', value),
    emptySocket: t('app:d2.emptySocket'),
    empty: t('app:d2.empty'),
    slot: (slot) => t(`app:d2.slot.${slot === 'ring-left' || slot === 'ring-right' ? 'ring' : slot}`),
    element: (element) => t(`app:d2.element.${element}`),
    affix: (kind) => t(`app:d2.affix.${kind}`),
    breakpointKind: (kind) => t(`app:d2.breakpoint.${kind}`),
    frames: (value) => counted('app:d2.frames', value),
    framesShort: (value) => t('app:d2.framesShort', { value }),
    toNext: (value) => t('app:d2.toNext', { value }),
    maxed: t('app:d2.maxed'),
    runes: t('app:d2.runes'),
    runeTier: (tier) => t(`app:d2.runeTier.${tier}`),
    listings: (value) => counted('app:d2.listings', value),
    more: (value) => t('app:d2.more', { value }),
    sockets: (value) => counted('app:d2.sockets', value),
    tier: (tier) => t('app:d2.tier', { tier }),
    corruptedZone: t('app:d2.corruptedZone'),
    offerStatus: (status) => t(`app:d2.offerStatus.${status}`),
    online: t('app:d2.online'),
    away: t('app:d2.away'),
    offline: t('app:d2.offline'),
    mercenary: t('app:d2.mercenary'),
    act: (act) => t('app:d2.act', { act }),
    overCap: (value) => t('app:d2.overCap', { value }),
    maxRes: (value) => t('app:d2.maxRes', { value }),
    runsReady: (value) => counted('app:d2.runsReady', value),
    price: t('app:d2.price'),
    volume: t('app:d2.volume'),
  };
  return (
    <UiLabelsProvider
      labels={{
        close: t('common:actions.close'),
        more: t('app:ui.more'),
        retry: t('common:actions.retry'),
        loading: t('common:status.loading'),
        gold: (amount) => t('currency:overview.gold', { amount }),
        locale: currentLocale(),
        pagination: t('app:ui.pagination'),
        previous: t('common:actions.previous'),
        next: t('common:actions.next'),
        previousPage: t('app:ui.previousPage'),
        nextPage: t('app:ui.nextPage'),
        morePages: t('app:ui.morePages'),
        copy: t('common:actions.copy'),
        copied: t('common:actions.copied'),
        copyFailed: t('app:ui.copyFailed'),
        toggleSidebar: t('app:ui.toggleSidebar'),
        sidebar: t('app:ui.sidebar'),
        filterRows: t('app:ui.filterRows'),
        columns: t('app:ui.columns'),
        toggleColumns: t('app:ui.toggleColumns'),
        noResults: t('common:status.noResults'),
        selectAll: t('app:ui.selectAll'),
        selectRow: t('app:ui.selectRow'),
        rowsSelected: (selected, total) => t('app:ui.rowsSelected', { selected, total }),
        rowsPerPage: t('app:ui.rowsPerPage'),
        pageOf: (page, count) => t('app:ui.pageOf', { page, count }),
        optional: t('app:ui.optional'),
        clear: t('common:actions.clear'),
        searchPlaceholder: t('app:ui.searchPlaceholder'),
        noMatches: t('app:ui.noMatches'),
        otherMatches: t('app:ui.otherMatches'),
        moreMatches: (count) => t('app:ui.moreMatches', { count }),
        decrease: (label) => t('app:ui.decrease', { label }),
        increase: (label) => t('app:ui.increase', { label }),
        bigStep: (step) => t('app:ui.bigStep', { step }),
        numberMin: (min) => t('app:ui.numberMin', { min }),
        numberMax: (max) => t('app:ui.numberMax', { max }),
        wholeNumber: t('app:ui.wholeNumber'),
      }}
    >
      <D2LabelsProvider labels={d2}>{children}</D2LabelsProvider>
    </UiLabelsProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <UiLabels>
    {signInWindow ? (
      <SignInWindowPage />
    ) : (
      <BrowserRouter>
        <Routes>
          <Route path="/"
            element={<AppRoot />} />
          {/* Browser mode: open straight into the market or builds panel (see overlay/browser-launch.ts) */}
          <Route path="/market"
            element={<AppRoot />} />
          <Route path="/builds"
            element={<AppRoot />} />
          {/* Dev-only primitives gallery (screenshot harness); tree-shaken from production builds */}
          {process.env.NODE_ENV !== 'production' && (
            <Route
              path="/dev/gallery"
              element={
                <OptionsProvider>
                  <PrimitivesGallery />
                </OptionsProvider>
              }
            />
          )}
        </Routes>
      </BrowserRouter>
    )}
  </UiLabels>,
);
