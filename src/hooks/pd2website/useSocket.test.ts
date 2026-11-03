// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import io from 'socket.io-client';
import type { ISettings } from '@/hooks/useOptions';
import { SOCKET_REQUEST_TIMEOUT_MS, SocketRequestError, useSocket } from './useSocket';

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

type Ack = (err: unknown, data?: unknown) => void;

class FakeSocket {
  handlers = new Map<string, (arg?: unknown) => void>();
  io = { engine: { transport: { ws: new FakeWs() } } };
  disconnect = vi.fn();
  /** Every emit, ack callback last (socket.io's convention). */
  emit = vi.fn((..._args: unknown[]) => this);
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
  /** Emits of the given method + service path. */
  calls(method: string, path: string) {
    return this.emit.mock.calls.filter(([m, p]) => m === method && p === path);
  }
  /** Answers the n-th emit of method + path through its ack callback. */
  answer(method: string, path: string, err: unknown, data?: unknown, n = -1) {
    const call = this.calls(method, path).at(n)!;
    (call.at(-1) as Ack)(err, data);
  }
  signIn(err: unknown = null) {
    this.answer('create', 'security/session', err, err ? undefined : { accessToken: 'jwt', user: { _id: 'u1' } });
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
    expect(socket.emit).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith(
      'create',
      'security/session',
      { strategy: 'oauth', accessToken: 'tok-A' },
      expect.any(Function),
    );
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
    expect(socket.calls('create', 'security/session')).toHaveLength(2);
    expect(socket.calls('create', 'security/session')[1][2]).toEqual({ strategy: 'oauth', accessToken: 'tok' });

    socket.ws.deliver('42' + JSON.stringify(['social/message pushed', { _id: 'fresh' }]));
    expect(onMessage).toHaveBeenCalledWith({ _id: 'fresh' });
    expect(oldWs.listeners.size).toBe(0);
  });

  it('a token change tears down the old socket and authenticates a new one', () => {
    const { hook, socket } = connectedSocket('old');
    hook.rerender({ t: 'new' });
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(sockets).toHaveLength(2);
    sockets[1].fire('connect');
    expect(sockets[1].emit).toHaveBeenCalledWith(
      'create',
      'security/session',
      { strategy: 'oauth', accessToken: 'new' },
      expect.any(Function),
    );
  });

  it('unmount disconnects and stops listening', () => {
    const { hook, socket } = connectedSocket();
    hook.unmount();

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.ws.listeners.size).toBe(0);
  });
});

describe('request', () => {
  it('waits for the sign-in, then calls the service and resolves with its answer', async () => {
    const { hook, socket } = connectedSocket();
    const answer = hook.result.current.request('get', 'game/character', 'Doreetd', {});
    await Promise.resolve();
    expect(socket.calls('get', 'game/character')).toHaveLength(0);

    socket.signIn();
    await vi.waitFor(() => expect(socket.calls('get', 'game/character')).toHaveLength(1));
    expect(socket.calls('get', 'game/character')[0].slice(0, 4)).toEqual(['get', 'game/character', 'Doreetd', {}]);
    socket.answer('get', 'game/character', null, { items: [] });
    await expect(answer).resolves.toEqual({ items: [] });
  });

  it("rejects with PD2's error message and code", async () => {
    const { hook, socket } = connectedSocket();
    socket.signIn();
    const answer = hook.result.current.request('get', 'game/character', 'Nobody', {});
    await vi.waitFor(() => expect(socket.calls('get', 'game/character')).toHaveLength(1));
    socket.answer('get', 'game/character', { name: 'NotFound', message: 'No record found', code: 404 });
    const err = await answer.catch((e) => e);
    expect(err).toBeInstanceOf(SocketRequestError);
    expect(err).toMatchObject({ message: 'No record found', code: 404 });
  });

  it('a refused sign-in fails the call without sending it', async () => {
    const { hook, socket } = connectedSocket();
    socket.signIn({ name: 'NotAuthenticated', message: 'jwt expired', code: 401 });
    await expect(hook.result.current.request('get', 'game/character', 'Doreetd', {})).rejects.toMatchObject({
      code: 401,
    });
    expect(socket.calls('get', 'game/character')).toHaveLength(0);
  });

  it('gives up when PD2 does not answer in time', async () => {
    const { hook, socket } = connectedSocket();
    socket.signIn();
    const answer = hook.result.current.request('get', 'game/character', 'Doreetd', {}).catch((e) => e);
    await vi.advanceTimersByTimeAsync(SOCKET_REQUEST_TIMEOUT_MS);
    expect(await answer).toBeInstanceOf(SocketRequestError);
  });

  it('a call made while reconnecting waits for the new connection to sign in', async () => {
    const { hook, socket } = connectedSocket();
    socket.signIn();
    socket.fire('disconnect');
    const answer = hook.result.current.request('get', 'game/character', 'Doreetd', {});
    await Promise.resolve();
    expect(socket.calls('get', 'game/character')).toHaveLength(0);

    socket.io.engine.transport.ws = new FakeWs();
    socket.fire('connect');
    socket.signIn();
    await vi.waitFor(() => expect(socket.calls('get', 'game/character')).toHaveLength(1));
    socket.answer('get', 'game/character', null, { ok: true });
    await expect(answer).resolves.toEqual({ ok: true });
  });

  it('fails right away without a socket', async () => {
    const { result } = renderHook(() => useSocket({ settings: {} as ISettings }));
    await expect(result.current.request('get', 'game/character', 'x', {})).rejects.toBeInstanceOf(SocketRequestError);
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
