import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './globals.css';
import * as Sentry from '@sentry/react';
import {DialogProvider} from "@/hooks/useDialog";
import LandingPage, {Providers} from './pages/landing/LandingPage';
import ItemPage from "@/pages/price-check/ItemPage";
import {SettingsPage} from "@/pages/settings/SettingsPage";
import ChangelogPage from "@/pages/change-log/ChangeLogPage";
import { QuickListPage } from './pages/quick-list/QuickListPage';
import { OptionsProvider } from './hooks/useOptions';
import ToastPage from './pages/toast/ToastPage';
import {CurrencyPage} from './pages/currency/CurrencyPage';

Sentry.init({
  dsn: 'https://c5f27188412f60350ae11ef386a2a179@o427910.ingest.us.sentry.io/4508895791939584',
  environment: process.env.NODE_ENV, // Set environment for filtering
  integrations: [
    Sentry.captureConsoleIntegration({levels: ['error']}),
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
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
    if (breadcrumb.category === 'http' && 
        breadcrumb.data?.url?.includes('ipc.localhost')) {
      return null;
    }
    return breadcrumb;
  },
});
console.log(`Sentry initialized in ${process.env.NODE_ENV} mode`);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <BrowserRouter>
    <Routes>
      <Route path="/"
        element={
          <Providers>
          <LandingPage />
          </Providers>
      } />

      <Route path="/item"
        element={<ItemPage />} />

      <Route
        path={"/settings"}
        element={<SettingsPage/>}
      />

      <Route
      path={'/quick-list'}
      element={<QuickListPage/>}
      />

      <Route
        path={"/change-log"}
        element={<OptionsProvider>
            <ChangelogPage/>
        </OptionsProvider>
        }
      />
        <Route
        path={"/toast"}
        element={<ToastPage/>
        }
      />

      <Route
        path={"/currency"}
        element={<CurrencyPage/>}
      />
    </Routes>
  </BrowserRouter>,
);
