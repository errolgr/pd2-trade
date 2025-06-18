import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './globals.css';
import * as Sentry from '@sentry/react';
import {DialogProvider} from "@/hooks/useDialog";
import LandingPage from './pages/landing/LandingPage';
import ItemPage from "@/pages/price-check/ItemPage";
import {SettingsPage} from "@/pages/settings/SettingsPage";

Sentry.init({
  dsn: 'https://c5f27188412f60350ae11ef386a2a179@o427910.ingest.us.sentry.io/4508895791939584',
  integrations: [
    Sentry.captureConsoleIntegration(),
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
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <BrowserRouter>
    <Routes>
      <Route path="/"
        element={
        <DialogProvider>
          <LandingPage />
        </DialogProvider>
      } />

      <Route path="/item"
        element={<ItemPage />} />

      <Route
        path={"/settings"}
        element={<SettingsPage/>}
      />
    </Routes>
  </BrowserRouter>,
);
