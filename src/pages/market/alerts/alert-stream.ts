/**
 * The market watch stream: ONE live search stream of every watched search (`GET /api/market/search/live?q=…`,
 * Server-Sent Events read with fetch like the other overlay streams): parsing, reconnecting with backoff,
 * catching up on each `hello` (the newest listings of every watched search, alerting only those bumped after
 * the last one that search saw) and deduping alerts by search and listing.
 */
import type { MarketAlert, MarketListingSummary, MarketMatch } from './market-api';

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

/** A watched search a `q` of the stream stands for, as it is now. */
export interface WatchTarget {
  id: string;
  name: string;
  /** bumpedAt of the newest listing this search has seen; unset until its first catch-up. */
  lastSeenBumpedAt?: string;
}

/** The alert `target` shows for `listing`. */
export function watchAlert(target: WatchTarget, listing: MarketListingSummary, matchedAt: string): MarketAlert {
  return {
    id: `${target.id}:${listing.id}`,
    savedSearchId: target.id,
    savedSearchName: target.name,
    listingId: listing.id,
    listing,
    matchedAt,
  };
}

const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN);

export interface WatchStreamOptions {
  /** The distinct `q` of the watched searches (1-10). */
  queries: readonly string[];
  /** Opens the stream; rejects with `{ status, retryAfterMs? }` on a non-2xx answer. */
  open: (queries: readonly string[], signal: AbortSignal) => Promise<Response>;
  /** The newest listings of a search, newest bump first. */
  fetchNewest: (q: string) => Promise<MarketListingSummary[]>;
  /** The watched searches `q` stands for right now (renames and seen bumps show without a reconnect). */
  targets: (q: string) => WatchTarget[];
  /** New alerts, oldest first: one live match, or what a (re)connect caught up on. */
  onAlerts: (alerts: MarketAlert[], source: 'live' | 'catch-up') => void;
  /** The newest bump a search has seen (an alert, or what its first catch-up found). */
  onSeen: (searchId: string, bumpedAt: string) => void;
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
 * Keeps the watch stream open until `signal` aborts or the server rejects the searches (400/414: the same
 * searches would be rejected again). After each (re)connect's `hello`, every watched search catches up on the
 * listings bumped since the newest it saw; a search that saw none yet only records its newest.
 */
export async function runWatchStream(options: WatchStreamOptions): Promise<void> {
  const { queries, open, fetchNewest, targets, onAlerts, onSeen, signal } = options;
  const sleep = options.sleep ?? abortableSleep;
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now;
  const idleTimeoutMs = options.idleTimeoutMs ?? STREAM_IDLE_TIMEOUT_MS;
  const seen = options.seen ?? new Set<string>();
  let serverRetryMs = MIN_RECONNECT_MS;
  let attempt = 0;

  const deliver = (alerts: MarketAlert[], source: 'live' | 'catch-up') => {
    const fresh = takeUnseen(seen, alerts);
    if (fresh.length === 0) return;
    for (const alert of fresh) if (alert.listing.bumpedAt) onSeen(alert.savedSearchId, alert.listing.bumpedAt);
    onAlerts(fresh, source);
  };

  const catchUp = async () => {
    const results = await Promise.all(
      queries.map(async (q) => {
        try {
          return { q, listings: await fetchNewest(q) };
        } catch (error) {
          console.warn('[market alerts] catch-up failed:', error);
          return { q, listings: null };
        }
      }),
    );
    // Stopped (watched set changed, alerts off): nothing more to show. A dropped connection still counts.
    if (signal.aborted) return;
    const alerts: MarketAlert[] = [];
    for (const { q, listings } of results) {
      if (!listings?.length) continue;
      const newest = listings.reduce<string | null>(
        (max, l) => (l.bumpedAt && (!max || time(l.bumpedAt) > time(max)) ? l.bumpedAt : max),
        null,
      );
      for (const target of targets(q)) {
        const since = time(target.lastSeenBumpedAt);
        if (Number.isNaN(since)) {
          // First look at this search: what is listed now is not new
          for (const listing of listings) seen.add(`${target.id}:${listing.id}`);
        } else {
          for (const listing of listings)
            if (time(listing.bumpedAt) > since) alerts.push(watchAlert(target, listing, listing.bumpedAt!));
        }
        if (newest) onSeen(target.id, newest);
      }
    }
    deliver(alerts, 'catch-up');
  };

  const onMatch = (data: string) => {
    let match: MarketMatch;
    try {
      match = JSON.parse(data) as MarketMatch;
    } catch (error) {
      console.warn('[market alerts] bad match event:', error);
      return;
    }
    if (!match?.id || typeof match.q !== 'string') return;
    const { q: _q, matchedAt, ...listing } = match;
    const alerts = targets(match.q)
      // An update of a listing older than the newest this search saw is not a new listing
      .filter((target) => !(time(listing.bumpedAt) < time(target.lastSeenBumpedAt)))
      .map((target) => watchAlert(target, listing, matchedAt));
    deliver(alerts, 'live');
  };

  while (!signal.aborted) {
    const current = new AbortController();
    const abortConnection = () => current.abort();
    signal.addEventListener('abort', abortConnection);
    let retryAfterMs: number | null = null;
    let idle: ReturnType<typeof setTimeout> | undefined;
    /** When the stream was accepted; null when it never was. */
    let connectedAt: number | null = null;
    const resetIdle = () => {
      clearTimeout(idle);
      idle = setTimeout(() => current.abort(), idleTimeoutMs);
    };
    try {
      const response = await open(queries, current.signal);
      connectedAt = now();
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Watch stream has no body');
      // Some fetch implementations don't fail a pending read on abort: cancel it so the loop wakes up
      current.signal.addEventListener('abort', () => void reader.cancel().catch(() => {}), { once: true });
      const decoder = new TextDecoder();
      const parser = createSseParser(
        (event) => {
          if (event.event === 'hello') void catchUp();
          else if (event.event === 'market.match') onMatch(event.data);
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
      if (!signal.aborted && !current.signal.aborted) console.warn('[market alerts] stream error:', error);
      const status = statusOf(error);
      if (status === 400 || status === 414) return;
      retryAfterMs = retryAfterOf(error);
    } finally {
      clearTimeout(idle);
      signal.removeEventListener('abort', abortConnection);
      current.abort();
    }
    if (signal.aborted) return;
    // Only a connection that stayed up resets the backoff (accept-then-drop keeps backing off)
    if (connectedAt !== null && now() - connectedAt >= STABLE_CONNECTION_MS) attempt = 0;
    await sleep(reconnectDelay(attempt, serverRetryMs, retryAfterMs, random), signal);
    attempt++;
  }
}
