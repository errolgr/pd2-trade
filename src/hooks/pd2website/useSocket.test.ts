// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import io from 'socket.io-client';
import type { ISettings } from '@/hooks/useOptions';
import { useSocket } from './useSocket';

vi.mock('socket.io-client', () => ({ default: vi.fn() }));
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
    // Uncapped: socket.io gives up for good once a capped count of retries fails (a short PD2 outage)
    expect(opts).not.toHaveProperty('reconnectionAttempts');

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

  it('re-authenticates on reconnect and listens on the new transport', () => {
    const { hook, socket } = connectedSocket('tok');
    const onMessage = vi.fn();
    hook.result.current.subscribe('social/message_pushed', onMessage);
    socket.fire('disconnect');
    expect(hook.result.current.isConnected).toBe(false);

    const oldWs = socket.ws;
    socket.io.engine.transport.ws = new FakeWs();
    socket.fire('connect');
    expect(socket.ws.sent[0]).toContain('"accessToken":"tok"');

    socket.ws.deliver('42' + JSON.stringify(['social/message pushed', { _id: 'fresh' }]));
    expect(onMessage).toHaveBeenCalledWith({ _id: 'fresh' });
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

  it('unmount disconnects and stops listening', () => {
    const { hook, socket } = connectedSocket();
    hook.unmount();

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.ws.listeners.size).toBe(0);
  });
});

describe('push events', () => {
  it('reach subscribers of their sanitized name only', () => {
    const { hook, socket } = connectedSocket();
    const msg = { _id: 'm1', content: 'hi' };
    const onMessage = vi.fn();
    const onOther = vi.fn();
    hook.result.current.subscribe('social/message_pushed', onMessage);
    hook.result.current.subscribe('system/notification_pushed', onOther);

    socket.ws.deliver('42' + JSON.stringify(['social/message pushed', msg]));
    expect(onMessage).toHaveBeenCalledWith(msg);
    expect(onOther).not.toHaveBeenCalled();
  });

  it('the auth acknowledgement is not delivered as a push', () => {
    const { hook, socket } = connectedSocket();
    const onAny = vi.fn();
    hook.result.current.subscribe('x_pushed', onAny);
    socket.ws.deliver('430' + JSON.stringify(['x pushed', { accessToken: 'jwt', user: { _id: 'u1' } }]));
    expect(onAny).not.toHaveBeenCalled();
  });

  it('stops delivering after unsubscribe and survives reconnects', () => {
    const { hook, socket } = connectedSocket('a');
    const onMessage = vi.fn();
    const unsubscribe = hook.result.current.subscribe('social/message_pushed', onMessage);

    hook.rerender({ t: 'b' });
    const next = sockets.at(-1)!;
    next.fire('connect');
    expect(next).not.toBe(socket);
    next.ws.deliver('42' + JSON.stringify(['social/message pushed', { _id: 'm2' }]));
    expect(onMessage).toHaveBeenCalledWith({ _id: 'm2' });

    unsubscribe();
    next.ws.deliver('42' + JSON.stringify(['social/message pushed', { _id: 'm3' }]));
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it('a throwing subscriber is logged and does not stop the others', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { hook, socket } = connectedSocket();
    const after = vi.fn();
    hook.result.current.subscribe('offer_pushed', () => {
      throw new Error('boom');
    });
    hook.result.current.subscribe('offer_pushed', after);
    socket.ws.deliver('42' + JSON.stringify(['offer pushed', {}]));
    expect(console.error).toHaveBeenCalledWith('[Socket] Push handler for offer_pushed failed:', new Error('boom'));
    expect(after).toHaveBeenCalledWith({});
  });

  it('ignores non-string, non-numeric-prefixed, malformed, non-push and response frames', () => {
    const { hook, socket } = connectedSocket();
    const onMessage = vi.fn();
    hook.result.current.subscribe('social/message_pushed', onMessage);
    socket.ws.deliver(new ArrayBuffer(2));
    socket.ws.deliver('hello');
    socket.ws.deliver('3probe');
    socket.ws.deliver('430{not json');
    socket.ws.deliver('430' + JSON.stringify(['only-one']));
    socket.ws.deliver('430' + JSON.stringify([null, { ok: true }]));
    socket.ws.deliver('42' + JSON.stringify(['social/message created', { _id: 'm1' }]));
    expect(onMessage).not.toHaveBeenCalled();

    socket.ws.deliver('42' + JSON.stringify(['social/message pushed', { _id: 'm2' }]));
    expect(onMessage).toHaveBeenCalledWith({ _id: 'm2' });
  });
});
