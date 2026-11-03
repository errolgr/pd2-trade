import * as Sentry from '@sentry/react';
import { AccountMismatchError, isExpectedApiError } from '@/hooks/pd2website/usePD2Website';
import { normalizeErrorText, pd2Fingerprint } from '@/lib/sentry-grouping';

/** Only release builds report: `vite dev` (localhost, headless test browsers) would otherwise file real issues. */
export const isSentryEnabledForBuild = () => process.env.NODE_ENV === 'production';

export function initSentry(): void {
  Sentry.init({
    dsn: 'https://c5f27188412f60350ae11ef386a2a179@o427910.ingest.us.sentry.io/4508895791939584',
    environment: process.env.NODE_ENV, // Set environment for filtering
    enabled: isSentryEnabledForBuild(),
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
      if (hint.originalException instanceof AccountMismatchError || isExpectedApiError(hint.originalException)) {
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
      // Same for PD2 4xx logged as `console.error('Failed to …:', err.message)`: no exception to check by status.
      if (/\bAPI Error: 4\d\d\b/.test(text)) {
        return null;
      }
      // Group PD2 failures by route + status instead of per user id / account / call site
      const fingerprint = pd2Fingerprint(text, firstException?.type);
      if (fingerprint) event.fingerprint = fingerprint;
      if (event.message) event.message = normalizeErrorText(event.message);
      if (firstException?.value) firstException.value = normalizeErrorText(firstException.value);
      return event;
    },
  });
  console.log(`Sentry initialized in ${process.env.NODE_ENV} mode`);
}
