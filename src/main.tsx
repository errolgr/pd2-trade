import React from 'react';
import { isTauri } from '@tauri-apps/api/core';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './globals.css';
// UI language: initialized before the first render (bundled resources, synchronous)
import { currentLocale, useTranslation } from '@/i18n';
import { UiLabelsProvider } from '@pd2-trader/ui';
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

/** Translated built-in strings of @pd2-trader/ui components (screen-reader close/more, retry, loading, units). */
const UiLabels: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  return (
    <UiLabelsProvider
      labels={{
        close: t('common:actions.close'),
        more: t('app:ui.more'),
        retry: t('common:actions.retry'),
        loading: t('common:status.loading'),
        gold: (amount) => t('currency:overview.gold', { amount }),
        locale: currentLocale(),
      }}
    >
      {children}
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
