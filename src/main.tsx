import React from 'react';
import { isTauri } from '@tauri-apps/api/core';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './globals.css';
// UI language: initialized before the first render (bundled resources, synchronous)
import '@/i18n';
import { initDebugLoggingFromSettings } from '@/lib/debug-logger';
import { initTheme } from '@/lib/themes';
import { initUiScale } from '@/lib/ui-scale';
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
import { PANEL_DEFS } from './overlay/registry';
import PrimitivesGallery from './pages/dev/PrimitivesGallery';
import { SignInWindowPage } from './pages/sign-in/SignInPage';
import { SignInProvider } from './hooks/useSignIn';
import { TooltipProvider } from './components/ui/tooltip';

// Apply the cached theme and UI scale before the first render (no flash of the defaults)
initTheme();
initUiScale();

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
const AppRoot: React.FC = () => (
  <DialogProvider>
    <OptionsProvider>
      <OverlayProvider defs={PANEL_DEFS}>
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
                    <OverlayRoot />
                  </NetWorthProvider>
                </WhisperHistoryProvider>
              </Pd2WebsiteProvider>
            </ItemsProvider>
          </TrayProvider>
        </SignInProvider>
      </OverlayProvider>
    </OptionsProvider>
  </DialogProvider>
);

// The native sign-in window (src-tauri commands::open_sign_in_window): only its view, Main runs the sign-in
const signInWindow = new URLSearchParams(window.location.search).get('window') === 'sign-in';

// One TooltipProvider for every surface (panels, settings, toasts): shared delay, instant hand-off between hints
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <TooltipProvider delayDuration={300}>
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
  </TooltipProvider>,
);
