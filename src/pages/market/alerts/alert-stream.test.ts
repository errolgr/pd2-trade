import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  abortableSleep,
  createSseParser,
  MAX_RECONNECT_MS,
  reconnectDelay,
  runWatchStream,
  SEEN_ALERTS_CAP,
  type SseEvent,
  takeUnseen,
  type WatchStreamOptions,
  type WatchTarget,
} from './alert-stream';
import type { MarketAlert, MarketListingSummary } from './market-api';

const listing = (id: string, bumpedAt: string | null): MarketListingSummary => ({
  id,
  isLadder: true,
  isHardcore: false,
  name: 'Harlequin Crest',
  baseName: 'Shako',
  baseCode: 'uap',
  typeCode: 'helm',
  quality: 'Unique',
  price: '2 ist',
  hrPrice: 0.5,
  bumpedAt,
  seller: 'Gheed',
  status: 'active',
  soldHr: null,
});

const alert = (id: string, matchedAt: string): MarketAlert => ({
  id,
  savedSearchId: 's1',
  savedSearchName: 'Cheap Shako',
  listingId: `l-${id}`,
  matchedAt,
  listing: listing(`l-${id}`, matchedAt),
});

const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const hello = (serverTime: string) =>
  frame('hello', { serverTime, events: ['market.match'], heartbeatSeconds: 25, searches: [] });
const match = (q: string, id: string, bumpedAt: string | null) =>
  frame('market.match', { ...listing(id, bumpedAt), matchedAt: bumpedAt ?? '2026-10-21T08:00:00Z', q });

/** A stream response that sends `chunks`, then stays open until `end()` (or ends right away with `close`). */
function streamResponse(chunks: string[], close = false) {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      const encoder = new TextEncoder();
      for (const chunk of chunks) c.enqueue(encoder.encode(chunk));
      if (close) c.close();
    },
  });
  return {
    response: new Response(body),
    end: () => {
      try {
        controller.close();
      } catch {
        // already cancelled by the abort
      }
    },
  };
}

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('createSseParser', () => {
  const parse = (chunks: string[]) => {
    const events: SseEvent[] = [];
    const retries: number[] = [];
    const parser = createSseParser(
      (e) => events.push(e),
      (ms) => retries.push(ms),
    );
    chunks.forEach((c) => parser.push(c));
    return { events, retries };
  };

  it('dispatches events split across chunks, with CRLF line ends, multi-line data and comments', () => {
    const { events, retries } = parse([
      'retry: 3000\r\n: heartbeat\r\nevent: hel',
      'lo\r\nid: 1\r\ndata: {"a":',
      '1}\r\n\r',
      '\ndata: line1\ndata: line2\n\n',
    ]);
    expect(retries).toEqual([3000]);
    expect(events).toEqual([
      { event: 'hello', data: '{"a":1}', id: '1' },
      { event: 'message', data: 'line1\nline2', id: '1' },
    ]);
  });

  it('ignores events without data and keeps an unfinished event for the next chunk', () => {
    const { events } = parse(['event: ping\n\n', 'event: market.alert\ndata: x']);
    expect(events).toEqual([]);
  });
});

describe('takeUnseen / reconnectDelay', () => {
  it('returns unseen alerts oldest first and remembers them, capped', () => {
    const seen = new Set<string>(['a']);
    const fresh = takeUnseen(seen, [
      alert('c', '2026-10-21T08:03:00Z'),
      alert('a', '2026-10-21T08:01:00Z'),
      alert('b', '2026-10-21T08:02:00Z'),
    ]);
    expect(fresh.map((a) => a.id)).toEqual(['b', 'c']);
    expect(takeUnseen(seen, [alert('b', '2026-10-21T08:02:00Z')])).toEqual([]);

    const many = Array.from({ length: SEEN_ALERTS_CAP + 5 }, (_, i) => alert(`x${i}`, '2026-10-21T08:00:00Z'));
    takeUnseen(seen, many);
    expect(seen.size).toBe(SEEN_ALERTS_CAP);
  });

  const mid = () => 0.5;
  it('backs off exponentially from the server retry, capped, and honours Retry-After', () => {
    expect(reconnectDelay(0, 3000, null, mid)).toBe(3000);
    expect(reconnectDelay(2, 3000, null, mid)).toBe(12_000);
    expect(reconnectDelay(10, 3000, null, mid)).toBe(MAX_RECONNECT_MS);
    expect(reconnectDelay(0, 3000, 120_000, mid)).toBe(120_000);
  });

  it('spreads reconnects by a random 0.5-1.5x so dropped clients do not return together', () => {
    expect(reconnectDelay(1, 3000, null, () => 0)).toBe(3000);
    expect(reconnectDelay(1, 3000, null, () => 0.999)).toBe(Math.round(6000 * 1.499));
    expect(reconnectDelay(10, 3000, null, () => 0)).toBe(MAX_RECONNECT_MS / 2);
  });
});

/** Watched searches by id, with the `lastSeenBumpedAt` the store keeps (onSeen moves it forward). */
function watches(initial: Record<string, WatchTarget[]>) {
  const byQuery = initial;
  const onSeen = vi.fn((id: string, bumpedAt: string) => {
    for (const targets of Object.values(byQuery))
      for (const target of targets)
        if (target.id === id && !(Date.parse(target.lastSeenBumpedAt ?? '') >= Date.parse(bumpedAt)))
          target.lastSeenBumpedAt = bumpedAt;
  });
  return { targets: (q: string) => byQuery[q] ?? [], onSeen, byQuery };
}

const run = (options: Partial<WatchStreamOptions> & Pick<WatchStreamOptions, 'open'>) =>
  runWatchStream({
    queries: ['q1'],
    fetchNewest: vi.fn().mockResolvedValue([]),
    targets: () => [],
    onAlerts: vi.fn(),
    onSeen: vi.fn(),
    signal: new AbortController().signal,
    sleep: async () => {},
    ...options,
  });

describe('runWatchStream', () => {
  it('opens one stream for all searches and alerts each live match for every search its q stands for, once', async () => {
    const stream = streamResponse([
      hello('2026-10-21T08:00:00Z'),
      match('q1', 'l1', '2026-10-21T08:01:00Z'),
      match('q1', 'l1', '2026-10-21T08:01:00Z'),
      match('q2', 'l2', '2026-10-21T08:02:00Z'),
      match('q-unknown', 'l3', '2026-10-21T08:03:00Z'),
    ]);
    const open = vi.fn().mockResolvedValue(stream.response);
    const w = watches({
      q1: [{ id: 's1', name: 'Cheap Shako' }],
      q2: [
        { id: 's2', name: 'Spirit' },
        { id: 's3', name: 'Spirit again' },
      ],
    });
    const delivered: [string[], string][] = [];
    const controller = new AbortController();
    const done = run({
      queries: ['q1', 'q2'],
      open,
      targets: w.targets,
      onSeen: w.onSeen,
      onAlerts: (alerts, source) => delivered.push([alerts.map((a) => a.id), source]),
      signal: controller.signal,
    });
    await flush();

    expect(open).toHaveBeenCalledExactlyOnceWith(['q1', 'q2'], expect.any(AbortSignal));
    expect(delivered).toEqual([
      [['s1:l1'], 'live'],
      [['s2:l2', 's3:l2'], 'live'],
    ]);
    expect(w.byQuery.q2[1].lastSeenBumpedAt).toBe('2026-10-21T08:02:00Z');

    controller.abort();
    stream.end();
    await done;
  });

  it("first hello only records each search's newest listing; a reconnect alerts only what was bumped after it", async () => {
    const first = streamResponse([hello('2026-10-21T08:00:00Z')], true);
    const second = streamResponse([hello('2026-10-21T08:30:00Z')]);
    const open = vi.fn().mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response);
    const fetchNewest = vi
      .fn()
      .mockResolvedValueOnce([listing('old2', '2026-10-21T07:50:00Z'), listing('old1', '2026-10-21T07:40:00Z')])
      .mockResolvedValueOnce([
        listing('new2', '2026-10-21T08:20:00Z'),
        listing('new1', '2026-10-21T08:10:00Z'),
        listing('old2', '2026-10-21T07:50:00Z'),
        listing('old1', '2026-10-21T07:40:00Z'),
      ]);
    const w = watches({ q1: [{ id: 's1', name: 'Cheap Shako' }] });
    const delivered: [string[], string][] = [];
    const controller = new AbortController();
    const done = run({
      open,
      fetchNewest,
      targets: w.targets,
      onSeen: w.onSeen,
      onAlerts: (alerts, source) => delivered.push([alerts.map((a) => a.id), source]),
      signal: controller.signal,
    });
    await flush();
    await flush();

    expect(fetchNewest).toHaveBeenCalledTimes(2);
    expect(fetchNewest).toHaveBeenCalledWith('q1');
    expect(delivered).toEqual([[['s1:new1', 's1:new2'], 'catch-up']]);
    expect(w.byQuery.q1[0].lastSeenBumpedAt).toBe('2026-10-21T08:20:00Z');

    controller.abort();
    second.end();
    await done;
  });

  it('a catch-up after restart alerts listings bumped after the persisted last seen, deduped with live', async () => {
    const stream = streamResponse([hello('2026-10-21T09:00:00Z'), match('q1', 'new1', '2026-10-21T08:10:00Z')]);
    let resolveNewest!: (listings: ReturnType<typeof listing>[]) => void;
    const fetchNewest = vi.fn(() => new Promise<ReturnType<typeof listing>[]>((r) => (resolveNewest = r)));
    const w = watches({ q1: [{ id: 's1', name: 'Cheap Shako', lastSeenBumpedAt: '2026-10-21T08:00:00Z' }] });
    const delivered: string[][] = [];
    const controller = new AbortController();
    const done = run({
      open: vi.fn().mockResolvedValue(stream.response),
      fetchNewest,
      targets: w.targets,
      onSeen: w.onSeen,
      onAlerts: (alerts) => delivered.push(alerts.map((a) => a.id)),
      signal: controller.signal,
    });
    await flush();
    resolveNewest([
      listing('new2', '2026-10-21T08:20:00Z'),
      listing('new1', '2026-10-21T08:10:00Z'),
      listing('seen', '2026-10-21T08:00:00Z'),
    ]);
    await flush();
    expect(delivered).toEqual([['s1:new1'], ['s1:new2']]);
    controller.abort();
    stream.end();
    await done;
  });

  it('skips a live update of a listing older than the newest the search saw', async () => {
    const stream = streamResponse([
      match('q1', 'older', '2026-10-21T07:00:00Z'),
      match('q1', 'unknown-bump', null),
      match('q1', 'newer', '2026-10-21T08:05:00Z'),
    ]);
    const w = watches({ q1: [{ id: 's1', name: 'Cheap Shako', lastSeenBumpedAt: '2026-10-21T08:00:00Z' }] });
    const onAlerts = vi.fn();
    const controller = new AbortController();
    const done = run({
      open: vi.fn().mockResolvedValue(stream.response),
      targets: w.targets,
      onSeen: w.onSeen,
      onAlerts,
      signal: controller.signal,
    });
    await flush();
    expect(onAlerts.mock.calls.map(([alerts]) => alerts.map((a: MarketAlert) => a.id))).toEqual([
      ['s1:unknown-bump'],
      ['s1:newer'],
    ]);
    controller.abort();
    stream.end();
    await done;
  });

  it('a failed catch-up of one search does not stop the others', async () => {
    const stream = streamResponse([hello('2026-10-21T09:00:00Z')]);
    const fetchNewest = vi.fn(async (q: string) => {
      if (q === 'q1') throw new Error('rate limited');
      return [listing('n', '2026-10-21T08:30:00Z')];
    });
    const w = watches({
      q1: [{ id: 's1', name: 'a', lastSeenBumpedAt: '2026-10-21T08:00:00Z' }],
      q2: [{ id: 's2', name: 'b', lastSeenBumpedAt: '2026-10-21T08:00:00Z' }],
    });
    const onAlerts = vi.fn();
    const controller = new AbortController();
    const done = run({
      queries: ['q1', 'q2'],
      open: vi.fn().mockResolvedValue(stream.response),
      fetchNewest,
      targets: w.targets,
      onSeen: w.onSeen,
      onAlerts,
      signal: controller.signal,
    });
    await flush();
    expect(onAlerts).toHaveBeenCalledExactlyOnceWith([expect.objectContaining({ id: 's2:n' })], 'catch-up');
    expect(w.byQuery.q1[0].lastSeenBumpedAt).toBe('2026-10-21T08:00:00Z');
    controller.abort();
    stream.end();
    await done;
  });

  it('stops when the server refuses the searches (400) and waits Retry-After on a 429', async () => {
    const sleeps: number[] = [];
    const open = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('busy'), { status: 429, retryAfterMs: 30_000 }))
      .mockRejectedValueOnce(Object.assign(new Error('q[1] is not valid'), { status: 400 }));
    await run({
      open,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(sleeps).toEqual([30_000]);
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('backs off and retries on network errors and 5xx', async () => {
    const sleeps: number[] = [];
    const controller = new AbortController();
    const open = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(Object.assign(new Error('down'), { status: 503 }))
      .mockImplementationOnce(async () => {
        controller.abort();
        throw new TypeError('Failed to fetch');
      });
    await run({
      open,
      signal: controller.signal,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      random: () => 0.5,
    });
    expect(open).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([1000, 2000]);
  });

  it('reconnects when the connection goes silent (no heartbeat)', async () => {
    vi.useFakeTimers();
    const silent = streamResponse([hello('2026-10-21T08:00:00Z')]);
    const next = streamResponse([]);
    const open = vi.fn().mockResolvedValueOnce(silent.response).mockResolvedValueOnce(next.response);
    const controller = new AbortController();
    const done = run({ open, signal: controller.signal, idleTimeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1500);
    expect(open).toHaveBeenCalledTimes(2);
    controller.abort();
    next.end();
    await vi.advanceTimersByTimeAsync(0);
    await done;
  });
});

describe('runWatchStream backoff', () => {
  /** Streams that accept, say hello, and drop. */
  const dropping = () => streamResponse([hello('2026-10-21T08:00:00Z')], true).response;

  it('keeps backing off when the server accepts and drops right away (no reset on hello)', async () => {
    const sleeps: number[] = [];
    const controller = new AbortController();
    const open = vi.fn().mockImplementation(async () => {
      if (open.mock.calls.length >= 4) controller.abort();
      return dropping();
    });
    await run({
      open,
      signal: controller.signal,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      random: () => 0.5,
      now: () => 0,
    });
    expect(sleeps).toEqual([1000, 2000, 4000]);
  });

  it('starts the backoff over after a connection that stayed up 30 s', async () => {
    const sleeps: number[] = [];
    const controller = new AbortController();
    const open = vi.fn().mockImplementation(async () => {
      if (open.mock.calls.length >= 4) controller.abort();
      return dropping();
    });
    // now(): at each connect, then when its drop is handled; the 3rd connection lived 30 s
    const now = vi
      .fn(() => 0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(30_000);
    await run({
      open,
      signal: controller.signal,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      random: () => 0.5,
      now,
    });
    expect(sleeps).toEqual([1000, 2000, 1000]);
  });
});

describe('abortableSleep', () => {
  it('removes its abort listener when the timer fires, and resolves early on abort', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const done = vi.fn();
    void abortableSleep(1000, controller.signal).then(done);
    await vi.advanceTimersByTimeAsync(1000);
    expect(done).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));

    const early = vi.fn();
    void abortableSleep(60_000, controller.signal).then(early);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(early).toHaveBeenCalled();
  });
});
