import React from 'react';
import ReactDOM from 'react-dom/client';
import './globals.css';
import 'animate.css';
import * as Sentry from '@sentry/react';
import { AccountMismatchError } from '@/hooks/pd2website/usePD2Website';
import MainWindow, { Providers } from './MainWindow';
import { MainLayout } from './components/layout/MainLayout';

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
      // Also check by error name in case the instance check doesn't work
      if (event.exception?.values?.[0]?.type === 'AccountMismatchError') {
        return null;
      }
      return event;
    },
  });
  console.log(`Sentry initialized in ${process.env.NODE_ENV} mode`);
}, 1000);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Providers>
    <MainLayout>
      <MainWindow />
    </MainLayout>
  </Providers>,
);
