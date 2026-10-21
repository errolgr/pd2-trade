/**
 * The live saved-search alert stream (`GET /api/market/saved-searches/stream`, Server-Sent Events read with fetch
 * because `EventSource` cannot send the Bearer token): parsing, reconnecting with backoff, catching up on what
 * was missed while disconnected (`/alerts?since=`) and deduping alerts by id.
 */
import type { MarketAlert } from './saved-search-api';

export interface SseEvent {
  event: string;
  data: string;
  id?: string;
}

/**
 * Incremental SSE parser (WHATWG framing): feed it decoded text chunks of any size; it calls `onEvent` per
 * dispatched event and `onRetry` for a `retry:` field. Comment lines (heartbeats) are skipped.
 */
export function createSseParser(onEvent: (event: SseEvent) => void, onRetry?: (ms: number) => void) {
  let buffer = '';
  let data: string[] = [];
  let event = '';
  let id: string | undefined;

  const line = (text: string) => {
    if (text === '') {
      if (data.length > 0) onEvent({ event: event || 'message', data: data.join('\n'), id });
      data = [];
      event = '';
      return;
    }
    if (text.startsWith(':')) return;
    const colon = text.indexOf(':');
    const field = colon < 0 ? text : text.slice(0, colon);
    let value = colon < 0 ? '' : text.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') data.push(value);
    else if (field === 'event') event = value;
    else if (field === 'id') id = value;
    else if (field === 'retry' && /^\d+$/.test(value)) onRetry?.(Number(value));
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      let match: RegExpExecArray | null;
      const newline = /\r\n|\r|\n/g;
      let start = 0;
      while ((match = newline.exec(buffer))) {
        // A lone \r at the end may be the first half of \r\n: wait for the next chunk
        if (match[0] === '\r' && match.index === buffer.length - 1) break;
        line(buffer.slice(start, match.index));
        start = match.index + match[0].length;
      }
      buffer = buffer.slice(start);
    },
  };
}

/** Alert ids remembered for dedupe (live vs catch-up overlap); the oldest fall off. */
export const SEEN_ALERTS_CAP = 500;
export const MIN_RECONNECT_MS = 1_000;
export const MAX_RECONNECT_MS = 60_000;
/** Server heartbeat is 25 s: no bytes for this long means a dead connection. */
export const STREAM_IDLE_TIMEOUT_MS = 70_000;

/** A connection that stayed up this long was healthy: the next reconnect starts the backoff over. */
export const STABLE_CONNECTION_MS = 30_000;

/**
 * Wait before reconnect `attempt` (0-based): exponential from the server's `retry`, capped, times a random
 * 0.5-1.5 (so clients dropped together, e.g. by a deploy, don't come back together); a Retry-After is the floor.
 */
export function reconnectDelay(
  attempt: number,
  serverRetryMs: number,
  retryAfterMs: number | null,
  random: () => number = Math.random,
): number {
  const base = Math.max(MIN_RECONNECT_MS, serverRetryMs);
  const backoff = Math.min(MAX_RECONNECT_MS, base * 2 ** attempt) * (0.5 + random());
  return Math.round(Math.max(backoff, retryAfterMs ?? 0));
}

/** Marks alerts seen; returns the unseen ones, oldest first. */
export function takeUnseen(seen: Set<string>, alerts: readonly MarketAlert[]): MarketAlert[] {
  const fresh = alerts.filter((a) => !seen.has(a.id)).sort((a, b) => Date.parse(a.matchedAt) - Date.parse(b.matchedAt));
  for (const alert of fresh) seen.add(alert.id);
  if (seen.size > SEEN_ALERTS_CAP) {
    for (const id of [...seen].slice(0, seen.size - SEEN_ALERTS_CAP)) seen.delete(id);
  }
  return fresh;
}

export interface AlertStreamOptions {
  token: string;
  /** Opens the stream; rejects with `{ status, retryAfterMs? }` on a non-2xx answer. */
  open: (token: string, signal: AbortSignal) => Promise<Response>;
  /** Alerts matched after `since` (ISO). */
  catchUp: (token: string, since: string) => Promise<MarketAlert[]>;
  /** New alerts, oldest first: one live alert, or what a reconnect caught up on. */
  onAlerts: (alerts: MarketAlert[], source: 'live' | 'catch-up') => void;
  /** 401: the stream stops (the caller restarts it with a new token). */
  onUnauthorized: () => void;
  signal: AbortSignal;
  /** Shared across restarts so an alert never shows twice. */
  seen?: Set<string>;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  idleTimeoutMs?: number;
  /** Tests: jitter source and clock. */
  random?: () => number;
  now?: () => number;
}

/** Resolves after `ms`, or as soon as `signal` aborts; leaves no listener on `signal` behind either way. */
export function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

const statusOf = (error: unknown) =>
  error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : null;
const retryAfterOf = (error: unknown) =>
  error && typeof error === 'object' && 'retryAfterMs' in error && typeof error.retryAfterMs === 'number'
    ? error.retryAfterMs
    : null;

/**
 * Keeps the alert stream open until `signal` aborts or the token is refused (401). After each (re)connect's
 * `hello`, alerts matched since the last one seen (or since the first connect) are caught up on.
 */
export async function runAlertStream(options: AlertStreamOptions): Promise<void> {
  const { token, open, catchUp, onAlerts, onUnauthorized, signal } = options;
  const sleep = options.sleep ?? abortableSleep;
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now;
  const idleTimeoutMs = options.idleTimeoutMs ?? STREAM_IDLE_TIMEOUT_MS;
  const seen = options.seen ?? new Set<string>();
  /** Newest matchedAt seen (or the first hello's serverTime): where a reconnect catches up from. */
  let since: string | null = null;
  let serverRetryMs = MIN_RECONNECT_MS;
  let attempt = 0;
  let stopped = false;

  const deliver = (alerts: MarketAlert[], source: 'live' | 'catch-up') => {
    const fresh = takeUnseen(seen, alerts);
    if (fresh.length === 0) return;
    const newest = fresh[fresh.length - 1].matchedAt;
    if (!since || Date.parse(newest) > Date.parse(since)) since = newest;
    onAlerts(fresh, source);
  };

  const unauthorized = () => {
    stopped = true;
    onUnauthorized();
  };

  const onHello = async (data: string) => {
    if (since) {
      try {
        deliver(await catchUp(token, since), 'catch-up');
      } catch (error) {
        if (statusOf(error) === 401) unauthorized();
        else console.warn('[market alerts] catch-up failed:', error);
      }
      return;
    }
    try {
      const hello = JSON.parse(data) as { serverTime?: string };
      since = hello.serverTime ?? new Date().toISOString();
    } catch {
      since = new Date().toISOString();
    }
  };

  while (!signal.aborted && !stopped) {
    const connection = new AbortController();
    const abortConnection = () => connection.abort();
    signal.addEventListener('abort', abortConnection);
    let retryAfterMs: number | null = null;
    let idle: ReturnType<typeof setTimeout> | undefined;
    /** When the stream was accepted; null when it never was. */
    let connectedAt: number | null = null;
    const resetIdle = () => {
      clearTimeout(idle);
      idle = setTimeout(() => connection.abort(), idleTimeoutMs);
    };
    try {
      const response = await open(token, connection.signal);
      connectedAt = now();
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Alert stream has no body');
      // Some fetch implementations don't fail a pending read on abort: cancel it so the loop wakes up
      connection.signal.addEventListener('abort', () => void reader.cancel().catch(() => {}), { once: true });
      const decoder = new TextDecoder();
      const parser = createSseParser(
        (event) => {
          if (event.event === 'hello') void onHello(event.data);
          else if (event.event === 'market.alert') {
            try {
              deliver([JSON.parse(event.data) as MarketAlert], 'live');
            } catch (error) {
              console.warn('[market alerts] bad alert event:', error);
            }
          }
        },
        (ms) => {
          serverRetryMs = ms;
        },
      );
      resetIdle();
      for (;;) {
        const { value, done } = await reader.read();
        if (done || stopped) break;
        resetIdle();
        parser.push(decoder.decode(value, { stream: true }));
      }
    } catch (error) {
      if (statusOf(error) === 401) unauthorized();
      retryAfterMs = retryAfterOf(error);
      if (!signal.aborted && !connection.signal.aborted) console.warn('[market alerts] stream error:', error);
    } finally {
      clearTimeout(idle);
      signal.removeEventListener('abort', abortConnection);
      connection.abort();
    }
    if (signal.aborted || stopped) return;
    // Only a connection that stayed up resets the backoff (accept-then-drop keeps backing off)
    if (connectedAt !== null && now() - connectedAt >= STABLE_CONNECTION_MS) attempt = 0;
    await sleep(reconnectDelay(attempt, serverRetryMs, retryAfterMs, random), signal);
    attempt++;
  }
}
