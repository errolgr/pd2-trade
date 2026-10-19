import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './globals.css';
import * as Sentry from '@sentry/react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WindowTitles } from '@/lib/window-titles';
import { initDebugLoggingFromSettings } from '@/lib/debug-logger';
import { initTheme } from '@/lib/themes';
import { initFaro } from '@/lib/faro';
import { AccountMismatchError } from '@/hooks/pd2website/usePD2Website';
import LandingPage, { Providers } from './pages/landing/LandingPage';
import ItemPage from '@/pages/price-check/ItemPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import ChangelogPage from '@/pages/change-log/ChangeLogPage';
import { QuickListPage } from './pages/quick-list/QuickListPage';
import { OptionsProvider } from './hooks/useOptions';
import ToastPage from './pages/toast/ToastPage';
import { CurrencyPage } from './pages/currency/CurrencyPage';
import { GlobalErrorHandler } from './components/GlobalErrorHandler';
import ChatButtonPage from './pages/chat/ChatButtonPage';
import TradeMessagesPage from './pages/trade-messages/TradeMessagesPage';
import ChatPage from './pages/chat/ChatPage';
import SignInPage from './pages/sign-in/SignInPage';
import { DelistPage } from './pages/delist/DelistPage';
import NetWorthTickerPage from './pages/net-worth/NetWorthTickerPage';
import NetWorthPanelPage from './pages/net-worth/NetWorthPanelPage';
import PrimitivesGallery from './pages/dev/PrimitivesGallery';

// Task Manager names each WebView2 process after its page title
if (isTauri()) {
  const { label } = getCurrentWindow();
  document.title = WindowTitles[label as keyof typeof WindowTitles] ?? WindowTitles.PREFIX;
}

// Apply the cached theme before the first render (no flash of the default theme)
initTheme();

// Grafana Faro (metrics/events/web vitals/traces; errors stay with Sentry) when VITE_FARO_URL is set
initFaro();

// Initialize debug logging if enabled in settings
initDebugLoggingFromSettings();

// Initialize Sentry asynchronously to avoid blocking application startup
setTimeout(() => {
  Sentry.init({
    dsn: 'https://c5f27188412f60350ae11ef386a2a179@o427910.ingest.us.sentry.io/4508895791939584',
    environment: process.env.NODE_ENV, // Set environment for filtering
    integrations: [
      Sentry.captureConsoleIntegration({ levels: ['error'] }),
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ['localhost'],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    // Breadcrumb filtering to ignore cursor position API calls
    beforeBreadcrumb(breadcrumb) {
      // Ignore tauri API calls to reduce noise in Sentry
      if (breadcrumb.category === 'http' && breadcrumb.data?.url?.includes('ipc.localhost')) {
        return null;
      }
      return breadcrumb;
    },
    // Filter out expected errors that shouldn't be reported to Sentry
    beforeSend(event, hint) {
      // Don't report AccountMismatchError - these are expected user errors
      if (hint.originalException instanceof AccountMismatchError) {
        return null;
      }
      const firstException = event.exception?.values?.[0];
      // Also check by error name in case the instance check doesn't work
      if (firstException?.type === 'AccountMismatchError' || firstException?.type === 'AuthenticationError') {
        return null;
      }
      // captureConsoleIntegration reports console.error(msg) as a message event with no exception;
      // catch account-mismatch text there too so each username doesn't become its own issue.
      const text = event.message ?? firstException?.value ?? '';
      if (text.includes('is not associated with your logged-in account')) {
        return null;
      }
      return event;
    },
  });
  console.log(`Sentry initialized in ${process.env.NODE_ENV} mode`);
}, 1000);

// Suppress the native WebView context menu (Reload/Inspect/etc.) on all overlay windows
document.addEventListener('contextmenu', (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <BrowserRouter>
    <Routes>
      <Route
        path="/"
        element={
          <Providers>
            <GlobalErrorHandler />
            <LandingPage />
          </Providers>
        }
      />

      <Route path="/item"
        element={<ItemPage />} />

      <Route path={'/settings'}
        element={<SettingsPage />} />

      <Route path={'/quick-list'}
        element={<QuickListPage />} />

      <Route
        path={'/change-log'}
        element={
          <OptionsProvider>
            <ChangelogPage />
          </OptionsProvider>
        }
      />
      <Route path={'/toast'}
        element={<ToastPage />} />

      <Route path={'/currency'}
        element={<CurrencyPage />} />

      <Route path={'/chat'}
        element={<ChatPage />} />

      <Route path={'/chat-button'}
        element={<ChatButtonPage />} />

      <Route path={'/trade-messages'}
        element={<TradeMessagesPage />} />

      <Route path={'/sign-in'}
        element={<SignInPage />} />

      <Route path={'/delist'}
        element={<DelistPage />} />

      <Route path={'/net-worth-ticker'}
        element={<NetWorthTickerPage />} />

      <Route path={'/net-worth-panel'}
        element={<NetWorthPanelPage />} />
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
  </BrowserRouter>,
);
