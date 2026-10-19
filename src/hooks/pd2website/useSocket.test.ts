// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import io from 'socket.io-client';
import { emit } from '@/lib/browser-events';
import type { ISettings } from '@/hooks/useOptions';
import { useSocket } from './useSocket';

vi.mock('socket.io-client', () => ({ default: vi.fn() }));
vi.mock('@/lib/browser-events', () => ({ emit: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: () => ({ settings: undefined }) }));

/** Raw engine.io WebSocket stand-in: records sent frames and lets tests push server frames. */
class FakeWs {
  sent: string[] = [];
  listeners = new Set<(e: { data: unknown }) => void>();
  send = vi.fn((frame: string) => {
    this.sent.push(frame);
  });
  addEventListener(_type: string, cb: (e: { data: unknown }) => void) {
    this.listeners.add(cb);
  }
  removeEventListener(_type: string, cb: (e: { data: unknown }) => void) {
    this.listeners.delete(cb);
  }
  deliver(data: unknown) {
    act(() => {
      this.listeners.forEach((cb) => cb({ data }));
    });
  }
}

class FakeSocket {
  handlers = new Map<string, (arg?: unknown) => void>();
  io = { engine: { transport: { ws: new FakeWs() } } };
  disconnect = vi.fn();
  on(event: string, cb: (arg?: unknown) => void) {
    this.handlers.set(event, cb);
    return this;
  }
  get ws() {
    return this.io.engine.transport.ws;
  }
  fire(event: string, arg?: unknown) {
    act(() => this.handlers.get(event)!(arg));
  }
}

let sockets: FakeSocket[];
const ioMock = vi.mocked(io);

function connectedSocket(token = 'tok') {
  const hook = renderHook(({ t }) => useSocket({ settings: { pd2Token: t } as ISettings }), {
    initialProps: { t: token },
  });
  const socket = sockets.at(-1)!;
  socket.fire('connect');
  return { hook, socket };
}

beforeEach(() => {
  vi.useFakeTimers();
  sockets = [];
  ioMock.mockImplementation(() => {
    const s = new FakeSocket();
    sockets.push(s);
    return s as never;
  });
  vi.mocked(emit).mockResolvedValue(undefined);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('connection lifecycle', () => {
  it('does not open a socket without a token', () => {
    const { result } = renderHook(() => useSocket({ settings: {} as ISettings }));
    expect(ioMock).not.toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.getSocket()).toBeNull();
  });

  it('connects over websocket with auto-reconnect and authenticates on connect', () => {
    const { hook, socket } = connectedSocket('tok-A');
    const [url, opts] = ioMock.mock.calls[0];
    expect(url).toBe('wss://api.projectdiablo2.com');
    expect(opts).toMatchObject({ transports: ['websocket'], reconnection: true });

    expect(hook.result.current.isConnected).toBe(true);
    expect(hook.result.current.getSocket()).toBe(socket);
    expect(socket.ws.sent).toEqual([
      '420' + JSON.stringify(['create', 'security/session', { strategy: 'oauth', accessToken: 'tok-A' }]),
    ]);
  });

  it('connect_error surfaces the message and marks disconnected; a later connect clears it', () => {
    const { hook, socket } = connectedSocket();
    socket.fire('connect_error', new Error('websocket error'));
    expect(hook.result.current.isConnected).toBe(false);
    expect(hook.result.current.error).toBe('websocket error');

    socket.fire('connect_error', 'timeout');
    expect(hook.result.current.error).toBe('timeout');

    socket.fire('connect');
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.isConnected).toBe(true);
  });

  it('re-authenticates on reconnect and routes responses from the new transport', async () => {
    const { hook, socket } = connectedSocket('tok');
    socket.fire('disconnect');
    expect(hook.result.current.isConnected).toBe(false);

    const oldWs = socket.ws;
    socket.io.engine.transport.ws = new FakeWs();
    socket.fire('connect');
    expect(socket.ws.sent[0]).toContain('"accessToken":"tok"');

    const pending = hook.result.current.getMessages('c1');
    socket.ws.deliver('430' + JSON.stringify([null, { data: ['fresh'] }]));
    await expect(pending).resolves.toEqual({ data: ['fresh'] });
    expect(oldWs.send).toHaveBeenCalledTimes(1);
  });

  it('a token change tears down the old socket and authenticates a new one', () => {
    const { hook, socket } = connectedSocket('old');
    hook.rerender({ t: 'new' });
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(sockets).toHaveLength(2);
    sockets[1].fire('connect');
    expect(sockets[1].ws.sent[0]).toContain('"accessToken":"new"');
  });

  it('unmount disconnects, rejects in-flight requests, and stops listening', async () => {
    const { hook, socket } = connectedSocket();
    const pending = hook.result.current.getConversations('u1');
    hook.unmount();

    await expect(pending).rejects.toThrow('Socket cleanup');
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.ws.listeners.size).toBe(0);
  });
});

describe('request/response', () => {
  it('rejects immediately while not connected', async () => {
    const { result } = renderHook(() => useSocket({ settings: { pd2Token: 'tok' } as ISettings }));
    await expect(result.current.getConversations('u1')).rejects.toThrow('Socket not connected');
    await expect(result.current.getMessages('c1')).rejects.toThrow('Socket not connected');
    expect(sockets[0].ws.sent).toEqual([]);
  });

  it('sends feathers find frames and resolves responses in FIFO order', async () => {
    const { hook, socket } = connectedSocket();
    const conversations = hook.result.current.getConversations('u1');
    const messages = hook.result.current.getMessages('c1');

    expect(socket.ws.sent.slice(1).map((f) => JSON.parse(f.slice(3)))).toEqual([
      [
        'find',
        'social/conversation',
        {
          participant_ids: 'u1',
          $limit: 100,
          $skip: 0,
          $resolve: { participants: true, unreadCount: true, latestMessage: { sender: true } },
        },
      ],
      [
        'find',
        'social/message',
        { conversation_id: 'c1', $sort: { created_at: 1 }, $limit: 500, $resolve: { sender: true } },
      ],
    ]);
    expect(socket.ws.sent[1].startsWith('420[')).toBe(true);

    socket.ws.deliver('430' + JSON.stringify([null, { total: 1 }]));
    socket.ws.deliver('430' + JSON.stringify([null, { total: 2 }]));
    await expect(conversations).resolves.toEqual({ total: 1 });
    await expect(messages).resolves.toEqual({ total: 2 });
  });

  it('the auth acknowledgement does not consume a pending request', async () => {
    const { hook, socket } = connectedSocket();
    const pending = hook.result.current.getMessages('c1');
    socket.ws.deliver('430' + JSON.stringify([null, { accessToken: 'jwt', user: { _id: 'u1' } }]));
    socket.ws.deliver('430' + JSON.stringify([null, { data: [1] }]));
    await expect(pending).resolves.toEqual({ data: [1] });
  });

  it('push events are re-emitted with a sanitized name and do not consume a pending request', async () => {
    const { hook, socket } = connectedSocket();
    const pending = hook.result.current.getMessages('c1');
    const msg = { _id: 'm1', content: 'hi' };

    socket.ws.deliver('42' + JSON.stringify(['social/message pushed', msg]));
    expect(emit).toHaveBeenCalledWith('socket:social/message_pushed', msg);

    socket.ws.deliver('430' + JSON.stringify([null, { data: [] }]));
    await expect(pending).resolves.toEqual({ data: [] });
  });

  it('a failed push re-emit is swallowed', async () => {
    vi.mocked(emit).mockRejectedValueOnce(new Error('no window'));
    const { socket } = connectedSocket();
    socket.ws.deliver('42' + JSON.stringify(['offer pushed', {}]));
    await vi.advanceTimersByTimeAsync(0);
    expect(console.warn).toHaveBeenCalledWith('[Socket] Failed to emit push event:', new Error('no window'));
  });

  it('ignores non-string, non-numeric-prefixed, malformed, and unsolicited frames', async () => {
    const { hook, socket } = connectedSocket();
    const pending = hook.result.current.getMessages('c1');
    socket.ws.deliver(new ArrayBuffer(2));
    socket.ws.deliver('hello');
    socket.ws.deliver('3probe');
    socket.ws.deliver('430{not json');
    socket.ws.deliver('430' + JSON.stringify(['only-one']));
    socket.ws.deliver('430' + JSON.stringify([null, { ok: true }]));
    await expect(pending).resolves.toEqual({ ok: true });

    socket.ws.deliver('430' + JSON.stringify([null, { stray: true }]));
    expect(console.warn).toHaveBeenCalledWith('[Socket] Received response but no pending requests');
  });

  it('rejects when the server answers with an error string', async () => {
    const { hook, socket } = connectedSocket();
    const pending = hook.result.current.getMessages('c1');
    socket.ws.deliver('430' + JSON.stringify(['Forbidden', null]));
    await expect(pending).rejects.toThrow('Forbidden');
  });

  // BUG: useSocket.ts:104 builds the rejection with `parsedPayload[0].toString()`; feathers errors are objects
  // ({ name, message, code }), so callers only ever see "[object Object]".
  it.fails('rejects with the server error message when the error is a feathers error object', async () => {
    const { hook, socket } = connectedSocket();
    const pending = hook.result.current.getMessages('c1');
    socket.ws.deliver('430' + JSON.stringify([{ name: 'NotFound', message: 'No record found', code: 404 }, null]));
    await expect(pending).rejects.toThrow('No record found');
  });

  it('a null result rejects with "Empty response"', async () => {
    const { hook, socket } = connectedSocket();
    const pending = hook.result.current.getMessages('c1');
    socket.ws.deliver('430' + JSON.stringify([null, null]));
    await expect(pending).rejects.toThrow('Empty response');
  });

  it('times out after 10s and removes the request from the queue', async () => {
    const { hook, socket } = connectedSocket();
    const pending = hook.result.current.getMessages('c1');
    const assertion = expect(pending).rejects.toThrow('Socket request timeout');
    await vi.advanceTimersByTimeAsync(9_999);
    socket.ws.deliver('42' + JSON.stringify(['x pushed', {}]));
    await vi.advanceTimersByTimeAsync(1);
    await assertion;

    socket.ws.deliver('430' + JSON.stringify([null, { late: true }]));
    expect(console.warn).toHaveBeenCalledWith('[Socket] Received response but no pending requests');
  });

  // BUG: useSocket.ts:99 matches responses FIFO with a constant ack id (every frame is sent as "420"), so a late
  // reply to a timed-out request is delivered to whichever request is next in the queue.
  it.fails('a late reply to a timed-out request is not delivered to the next request', async () => {
    const { hook, socket } = connectedSocket();
    const first = hook.result.current.getMessages('c-first');
    first.catch(() => {});
    await vi.advanceTimersByTimeAsync(10_000);

    const second = hook.result.current.getMessages('c-second');
    socket.ws.deliver('430' + JSON.stringify([null, { conversation: 'c-first' }]));
    socket.ws.deliver('430' + JSON.stringify([null, { conversation: 'c-second' }]));
    await expect(second).resolves.toEqual({ conversation: 'c-second' });
  });

  it('disconnect rejects every in-flight request', async () => {
    const { hook, socket } = connectedSocket();
    const a = hook.result.current.getConversations('u1');
    const b = hook.result.current.getMessages('c1');
    socket.fire('disconnect');
    await expect(a).rejects.toThrow('Socket disconnected');
    await expect(b).rejects.toThrow('Socket disconnected');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a send failure rejects that request and leaves the queue aligned', async () => {
    const { hook, socket } = connectedSocket();
    socket.ws.send.mockImplementationOnce(() => {
      throw new Error('CLOSING');
    });
    await expect(hook.result.current.getMessages('c1')).rejects.toThrow('Failed to send message: Error: CLOSING');

    const next = hook.result.current.getMessages('c2');
    socket.ws.deliver('430' + JSON.stringify([null, { for: 'c2' }]));
    await expect(next).resolves.toEqual({ for: 'c2' });
  });
});
