/**
 * Horadric Sim → overlay intents (`GET /api/overlay/intents/stream`): the website pushes "open this report /
 * planner" and "your sim finished" to the signed-in overlay. Server-Sent Events read with fetch (`EventSource`
 * cannot send the Bearer token), the same way as the saved-search alert stream, whose parser and backoff it reuses.
 * The server replays undelivered intents on connect (finished/failed/cancelled sims 24 h, open requests 5 min) with
 * `replay: true`, so there is no catch-up request.
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import {
  abortableSleep,
  createSseParser,
  MIN_RECONNECT_MS,
  reconnectDelay,
  STABLE_CONNECTION_MS,
  STREAM_IDLE_TIMEOUT_MS,
} from '@/pages/market/alerts/alert-stream';

/** `event: intent` on the stream. */
export interface OverlayIntent {
  id: string;
  kind: 'report_ready' | 'job_failed' | 'job_cancelled' | 'open_report' | 'open_planner';
  title: string;
  lines: string[];
  /** Absolute https URL on pd2trader.com. */
  url: string;
  createdAt: string;
  /** Sent from the on-connect backlog (happened while the overlay was away); live intents omit it. */
  replay?: boolean;
}

/** Kinds about one of the user's sims finishing: the away summary groups these, the Sim panel refetches on them. */
export const SIM_RESULT_KINDS: readonly OverlayIntent['kind'][] = ['report_ready', 'job_failed', 'job_cancelled'];

type IntentListener = (intent: OverlayIntent) => void;
const listeners = new Set<IntentListener>();

/** Every intent the one stream (useOverlayIntents) receives, for in-app listeners such as the Sim panel. */
export function subscribeIntents(listener: IntentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishIntent(intent: OverlayIntent): void {
  for (const listener of [...listeners]) listener(intent);
}

export class OverlayIntentStreamError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = 'OverlayIntentStreamError';
  }
}

/** Opens the intent stream (`text/event-stream`); throws OverlayIntentStreamError on a non-2xx answer. */
export async function openIntentStream(token: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch(`${BACKEND_URL}/api/overlay/intents/stream`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
    signal,
  });
  if (!response.ok) {
    const retryAfter = Number(response.headers?.get('retry-after'));
    throw new OverlayIntentStreamError(
      `Overlay intents ${response.status}`,
      response.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null,
    );
  }
  return response;
}

/** Answers that won't change by retrying with the same token: signed out (401), no beta access (403), sim off (404). */
const FINAL_STATUSES = [401, 403, 404];

function isIntent(value: unknown): value is OverlayIntent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<OverlayIntent>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.url === 'string' &&
    /^https:\/\//.test(v.url) &&
    Array.isArray(v.lines)
  );
}

export interface IntentStreamOptions {
  token: string;
  open?: (token: string, signal: AbortSignal) => Promise<Response>;
  onIntent: (intent: OverlayIntent) => void;
  /** Each time a connection opens (the server's backlog follows right after). */
  onConnect?: () => void;
  /** 401/403/404: the stream stops for this token. */
  onRefused?: (status: number) => void;
  signal: AbortSignal;
  /** Intent ids already shown, shared across restarts so one never shows twice. */
  seen?: Set<string>;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  random?: () => number;
  now?: () => number;
}

/** Keeps the intent stream open until `signal` aborts or the server refuses the token (see FINAL_STATUSES). */
export async function runIntentStream(options: IntentStreamOptions): Promise<void> {
  const { token, onIntent, signal } = options;
  const open = options.open ?? openIntentStream;
  const sleep = options.sleep ?? abortableSleep;
  const now = options.now ?? Date.now;
  const seen = options.seen ?? new Set<string>();
  let serverRetryMs = MIN_RECONNECT_MS;
  let attempt = 0;

  while (!signal.aborted) {
    const current = new AbortController();
    const abortConnection = () => current.abort();
    signal.addEventListener('abort', abortConnection);
    let retryAfterMs: number | null = null;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let connectedAt: number | null = null;
    const resetIdle = () => {
      clearTimeout(idle);
      idle = setTimeout(() => current.abort(), STREAM_IDLE_TIMEOUT_MS);
    };
    try {
      const response = await open(token, current.signal);
      connectedAt = now();
      options.onConnect?.();
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Intent stream has no body');
      current.signal.addEventListener('abort', () => void reader.cancel().catch(() => {}), { once: true });
      const decoder = new TextDecoder();
      const parser = createSseParser(
        (event) => {
          if (event.event !== 'intent') return;
          try {
            const intent: unknown = JSON.parse(event.data);
            if (!isIntent(intent) || seen.has(intent.id)) return;
            seen.add(intent.id);
            onIntent(intent);
          } catch (error) {
            console.warn('[overlay intents] bad intent event:', error);
          }
        },
        (ms) => {
          serverRetryMs = ms;
        },
      );
      resetIdle();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        resetIdle();
        parser.push(decoder.decode(value, { stream: true }));
      }
    } catch (error) {
      if (error instanceof OverlayIntentStreamError) {
        if (FINAL_STATUSES.includes(error.status)) {
          options.onRefused?.(error.status);
          return;
        }
        retryAfterMs = error.retryAfterMs;
      } else if (!signal.aborted && !current.signal.aborted) {
        console.warn('[overlay intents] stream error:', error);
      }
    } finally {
      clearTimeout(idle);
      signal.removeEventListener('abort', abortConnection);
      current.abort();
    }
    if (signal.aborted) return;
    if (connectedAt !== null && now() - connectedAt >= STABLE_CONNECTION_MS) attempt = 0;
    await sleep(reconnectDelay(attempt, serverRetryMs, retryAfterMs, options.random), signal);
    attempt++;
  }
}
