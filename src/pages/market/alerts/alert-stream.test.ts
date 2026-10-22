import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  abortableSleep,
  createSseParser,
  MAX_RECONNECT_MS,
  reconnectDelay,
  runAlertStream,
  SEEN_ALERTS_CAP,
  type SseEvent,
  takeUnseen,
} from './alert-stream';
import type { MarketAlert } from './saved-search-api';

const alert = (id: string, matchedAt: string, over: Partial<MarketAlert> = {}): MarketAlert => ({
  id,
  savedSearchId: 's1',
  savedSearchName: 'Cheap Shako',
  listingId: `l-${id}`,
  matchedAt,
  listing: {
    id: `l-${id}`,
    isLadder: true,
    isHardcore: false,
    name: 'Harlequin Crest',
    baseName: 'Shako',
    baseCode: 'uap',
    typeCode: 'helm',
    quality: 'Unique',
    price: '2 ist',
    hrPrice: 0.5,
    bumpedAt: matchedAt,
    seller: 'Gheed',
    status: 'active',
    soldHr: null,
  },
  ...over,
});

const frame = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const hello = (serverTime: string) => frame('hello', { serverTime, events: ['market.alert'], heartbeatSeconds: 25 });

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

describe('runAlertStream', () => {
  it('delivers live alerts once, reconnects after the stream ends and catches up since the newest seen', async () => {
    const first = streamResponse(
      [
        'retry: 2000\n',
        hello('2026-10-21T08:00:00Z'),
        frame('market.alert', alert('a1', '2026-10-21T08:01:00Z')),
        frame('market.alert', alert('a1', '2026-10-21T08:01:00Z')),
      ],
      true,
    );
    const second = streamResponse([hello('2026-10-21T08:10:00Z')]);
    const open = vi.fn().mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response);
    const catchUp = vi
      .fn()
      .mockResolvedValue([
        alert('a3', '2026-10-21T08:05:00Z'),
        alert('a1', '2026-10-21T08:01:00Z'),
        alert('a2', '2026-10-21T08:04:00Z'),
      ]);
    const delivered: [string[], string][] = [];
    const sleeps: number[] = [];
    const controller = new AbortController();

    const done = runAlertStream({
      token: 'tok',
      open,
      catchUp,
      onAlerts: (alerts, source) => delivered.push([alerts.map((a) => a.id), source]),
      onUnauthorized: vi.fn(),
      signal: controller.signal,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      random: () => 0.5,
    });
    await flush();
    await flush();

    expect(open).toHaveBeenCalledTimes(2);
    expect(sleeps).toEqual([2000]);
    expect(catchUp).toHaveBeenCalledWith('tok', '2026-10-21T08:01:00Z');
    expect(delivered).toEqual([
      [['a1'], 'live'],
      [['a2', 'a3'], 'catch-up'],
    ]);

    controller.abort();
    second.end();
    await done;
  });

  it('does not catch up on the first connect (only from its hello on)', async () => {
    const stream = streamResponse([hello('2026-10-21T08:00:00Z')]);
    const catchUp = vi.fn();
    const controller = new AbortController();
    const done = runAlertStream({
      token: 'tok',
      open: vi.fn().mockResolvedValue(stream.response),
      catchUp,
      onAlerts: vi.fn(),
      onUnauthorized: vi.fn(),
      signal: controller.signal,
    });
    await flush();
    expect(catchUp).not.toHaveBeenCalled();
    controller.abort();
    stream.end();
    await done;
  });

  it('stops on a 401 and waits Retry-After on a 429', async () => {
    const onUnauthorized = vi.fn();
    const sleeps: number[] = [];
    const open = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('busy'), { status: 429, retryAfterMs: 30_000 }))
      .mockRejectedValueOnce(Object.assign(new Error('nope'), { status: 401 }));
    await runAlertStream({
      token: 'tok',
      open,
      catchUp: vi.fn(),
      onAlerts: vi.fn(),
      onUnauthorized,
      signal: new AbortController().signal,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(sleeps).toEqual([30_000]);
    expect(open).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('reconnects when the connection goes silent (no heartbeat)', async () => {
    vi.useFakeTimers();
    const silent = streamResponse([hello('2026-10-21T08:00:00Z')]);
    const next = streamResponse([]);
    const open = vi.fn().mockResolvedValueOnce(silent.response).mockResolvedValueOnce(next.response);
    const controller = new AbortController();
    const done = runAlertStream({
      token: 'tok',
      open,
      catchUp: vi.fn().mockResolvedValue([]),
      onAlerts: vi.fn(),
      onUnauthorized: vi.fn(),
      signal: controller.signal,
      idleTimeoutMs: 1000,
      sleep: async () => {},
    });
    await vi.advanceTimersByTimeAsync(1500);
    expect(open).toHaveBeenCalledTimes(2);
    controller.abort();
    next.end();
    await vi.advanceTimersByTimeAsync(0);
    await done;
  });
});

describe('runAlertStream backoff', () => {
  /** Streams that accept, say hello, and drop. */
  const dropping = () => streamResponse([hello('2026-10-21T08:00:00Z')], true).response;

  it('keeps backing off when the server accepts and drops right away (no reset on hello)', async () => {
    const sleeps: number[] = [];
    const controller = new AbortController();
    const open = vi.fn().mockImplementation(async () => {
      if (open.mock.calls.length >= 4) controller.abort();
      return dropping();
    });
    await runAlertStream({
      token: 'tok',
      open,
      catchUp: vi.fn().mockResolvedValue([]),
      onAlerts: vi.fn(),
      onUnauthorized: vi.fn(),
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
    await runAlertStream({
      token: 'tok',
      open,
      catchUp: vi.fn().mockResolvedValue([]),
      onAlerts: vi.fn(),
      onUnauthorized: vi.fn(),
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
