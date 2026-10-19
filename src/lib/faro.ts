/**
 * Grafana Faro bootstrap for every overlay webview.
 *
 * The whole overlay runs in the single Tauri `Main` webview, so there is one Faro instance and session.
 * The `window_label` session attribute and the Faro view name are `Main` in the app and `browser` in
 * browser dev mode (kept stable for existing dashboards); the route (path only) is the Faro page id.
 *
 * Exceptions and crashes are reported by Sentry (see `main.tsx`), so Faro's error and console
 * instrumentations are not installed: Faro handles sessions, views, web vitals, performance timings,
 * product measurements/events (`telemetry.ts`) and fetch/XHR tracing to our own backend.
 *
 * Faro is only initialized when the build-time `VITE_FARO_URL` (collector URL) is set.
 */
import {
  ErrorsInstrumentation,
  getWebInstrumentations,
  initializeFaro,
  TransportItemType,
  type APIEvent,
  type EventEvent,
  type TransportItem,
} from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import { isTauri } from '@tauri-apps/api/core';
import { BACKEND_URL } from '@/lib/pkce';
import { API_BASE_URL as PRICE_API_BASE_URL } from '@/pages/currency/lib/price-api';

const APP_NAME = 'pd2-trader-overlay';

// Not traced / timed by Faro:
// - Tauri IPC traffic (invoke / plugin calls, including @tauri-apps/plugin-http fetches), which goes
//   through `http://ipc.localhost` on Windows and `ipc://localhost` elsewhere.
// - Sentry's own envelope uploads to its ingest endpoint.
const IGNORED_URLS = [/^https?:\/\/ipc\.localhost/, /^ipc:\/\//, /^https:\/\/[^/]+\.sentry\.io\//];

/**
 * `traceparent` is only propagated to our own pd2-price-crawler origins. The projectdiablo2.com API
 * does not allow the header in CORS preflights, so it must never be a target.
 */
function backendOriginPatterns(): RegExp[] {
  const origins = new Set<string>();
  for (const url of [BACKEND_URL, PRICE_API_BASE_URL]) {
    try {
      origins.add(new URL(url).origin);
    } catch {
      // Misconfigured VITE_BACKEND_URL: skip it rather than propagating to an unknown origin.
    }
  }
  return [...origins].map((origin) => new RegExp(`^${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|$)`));
}

/** Drops query string and hash; returns non-URL input unchanged. */
function withoutQuery(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value;
  }
}

/**
 * Overlay URLs carry item payloads in the query string (e.g. `/quick-list?item=...`) and PD2 API
 * requests carry search filters; keep only origin + path in page metadata and in the URL (`name`)
 * of Faro's navigation/resource timing events so they stay low-cardinality and free of user data.
 */
function stripUrlQueries(item: TransportItem<APIEvent>): TransportItem<APIEvent> {
  let result = item;
  const pageUrl = item.meta.page?.url;
  if (pageUrl) {
    result = { ...result, meta: { ...result.meta, page: { ...result.meta.page, url: withoutQuery(pageUrl) } } };
  }
  if (item.type === TransportItemType.EVENT) {
    const event = item.payload as EventEvent;
    if (event.name.startsWith('faro.performance.') && event.attributes?.name) {
      result = {
        ...result,
        payload: { ...event, attributes: { ...event.attributes, name: withoutQuery(event.attributes.name) } },
      };
    }
  }
  return result;
}

export function initFaro(): void {
  const url = import.meta.env.VITE_FARO_URL;
  if (!url) return;

  const windowLabel = isTauri() ? 'Main' : 'browser';

  initializeFaro({
    url,
    app: {
      name: APP_NAME,
      namespace: 'pd2',
      version: __APP_VERSION__,
      environment: import.meta.env.MODE,
    },
    view: { name: windowLabel },
    sessionTracking: {
      session: { attributes: { window_label: windowLabel } },
    },
    pageTracking: {
      generatePageId: (location) => location.pathname,
    },
    ignoreUrls: IGNORED_URLS,
    instrumentations: [
      // No ErrorsInstrumentation / ConsoleInstrumentation: Sentry owns exceptions and console.error.
      ...getWebInstrumentations({ captureConsole: false }).filter(
        (instrumentation) => !(instrumentation instanceof ErrorsInstrumentation),
      ),
      new TracingInstrumentation({
        instrumentationOptions: {
          propagateTraceHeaderCorsUrls: backendOriginPatterns(),
        },
      }),
    ],
    beforeSend: stripUrlQueries,
  });
}
