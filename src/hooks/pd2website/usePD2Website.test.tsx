// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/react';
import { emit as tauriEmit } from '@tauri-apps/api/event';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { reportApiError } from '@/lib/error-reporting';
import { setTelemetryUser } from '@/lib/telemetry';
import { useOptions } from '@/hooks/useOptions';
import { useOAuth } from '@/hooks/useOAuth';
import {
  AccountMismatchError,
  AuthenticationError,
  ChildPd2WebsiteProvider,
  Pd2WebsiteContext,
  Pd2WebsiteProvider,
  handleApiResponse,
  usePd2Website,
} from './usePD2Website';

/** In-memory replacement for the cross-window app event bus, so parent and child providers can talk. */
const bus = vi.hoisted(() => {
  const listeners = new Map<string, Set<(e: { payload: unknown }) => void>>();
  const emitted: { event: string; payload: unknown }[] = [];
  return {
    listeners,
    emitted,
    emit: async (event: string, payload?: unknown) => {
      emitted.push({ event, payload });
      listeners.get(event)?.forEach((cb) => cb({ payload }));
    },
    listen: async (event: string, cb: (e: { payload: unknown }) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
      return () => listeners.get(event)?.delete(cb);
    },
  };
});

vi.mock('@/lib/browser-events', () => ({ emit: bus.emit, listen: bus.listen }));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/error-reporting', () => ({ reportApiError: vi.fn() }));
vi.mock('@/lib/telemetry', () => ({ setTelemetryUser: vi.fn() }));
vi.mock('@sentry/react', () => ({ setUser: vi.fn(), setContext: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ emit: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useOAuth', () => ({ useOAuth: vi.fn() }));
vi.mock('@/hooks/useTradeOffers', () => ({ useTradeOffers: vi.fn() }));
vi.mock('./useSocket', () => ({ useSocket: () => ({ isConnected: false }) }));
vi.mock('@/components/dialogs/SignInDialog', () => ({
  SignInDialog: () => null,
  SIGN_IN_DIALOG_EVENT: 'pd2:show-sign-in-dialog',
}));

import { useTradeOffers } from '@/hooks/useTradeOffers';

const fetchMock = vi.mocked(tauriFetch);
const API = 'https://api.projectdiablo2.com';
const ME_URL = 'https://pd2trader.com/api/auth/oauth/me';

function fakeResponse(status: number, body: unknown, url = `${API}/market/listing`, statusText = '') {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    url,
    text: async () => text,
    json: async () => JSON.parse(text),
  } as unknown as Response;
}

const authData = { user: { _id: 'user-1', username: 'Bob', game: { accounts: ['bobacc'] } } };

let settings: Record<string, unknown>;
const updateSettings = vi.fn();
const refreshTokens = vi.fn();
const startOAuthFlow = vi.fn();
const tradeOffers = {
  incomingOffers: [],
  outgoingOffers: [],
  hiddenOutgoingOffers: [],
  loading: false,
  refresh: vi.fn(),
  revokeOffer: vi.fn(),
  acceptOffer: vi.fn(),
  rejectOffer: vi.fn(),
  unacceptOffer: vi.fn(),
  deleteOutgoingOffer: vi.fn(),
  restoreOutgoingOffer: vi.fn(),
};

/** Route fetch by URL so ordering of effects does not matter. */
let routes: Record<string, () => Response>;

let ctx: NonNullable<React.ContextType<typeof Pd2WebsiteContext>>;
const setCtx = (value: typeof ctx) => {
  ctx = value;
};
function Capture() {
  setCtx(usePd2Website());
  return null;
}

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function renderParent() {
  const view = render(
    <Pd2WebsiteProvider>
      <Capture />
    </Pd2WebsiteProvider>,
  );
  await flush();
  return view;
}

function emittedOf(event: string) {
  return bus.emitted.filter((e) => e.event === event).map((e) => e.payload);
}

beforeEach(() => {
  vi.useFakeTimers();
  bus.listeners.clear();
  bus.emitted.length = 0;
  settings = {
    pd2Token: 'tok',
    pd2RefreshToken: 'refresh-1',
    account: 'bobacc',
    mode: 'softcore',
    ladder: 'ladder',
    lastSeenVersion: '1.2.3',
  };
  vi.mocked(useOptions).mockImplementation(() => ({ settings, updateSettings, isLoading: false }) as never);
  vi.mocked(useOAuth).mockReturnValue({ startOAuthFlow, refreshTokens } as never);
  vi.mocked(useTradeOffers).mockReturnValue(tradeOffers as never);
  refreshTokens.mockResolvedValue(false);
  routes = {
    [ME_URL]: () => fakeResponse(200, authData, ME_URL),
  };
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    const key = Object.keys(routes).find((k) => url.startsWith(k));
    if (!key) throw new Error(`unexpected fetch ${url}`);
    return routes[key]();
  });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('handleApiResponse', () => {
  it('returns parsed JSON for OK responses', async () => {
    await expect(handleApiResponse(fakeResponse(200, { a: 1 }))).resolves.toEqual({ a: 1 });
  });

  it('401 awaits the auth handler and resolves null', async () => {
    const order: string[] = [];
    const onAuthError = vi.fn(async () => {
      await Promise.resolve();
      order.push('handler done');
    });
    const result = await handleApiResponse(fakeResponse(401, 'not json'), onAuthError);
    order.push('returned');
    expect(result).toBeNull();
    expect(order).toEqual(['handler done', 'returned']);
    expect(reportApiError).not.toHaveBeenCalled();
  });

  it('401 without a handler still resolves null', async () => {
    await expect(handleApiResponse(fakeResponse(401, ''))).resolves.toBeNull();
  });

  it('404 on a stash endpoint becomes AccountMismatchError with the account parsed from the path', async () => {
    const err = await handleApiResponse(fakeResponse(404, '', `${API}/game/stash/Some%20Acc?x=1`)).catch((e) => e);
    expect(err).toBeInstanceOf(AccountMismatchError);
    expect(err).toMatchObject({ statusCode: 404, account: 'Some%20Acc', name: 'AccountMismatchError' });
    expect(reportApiError).not.toHaveBeenCalled();
  });

  it('404 elsewhere is a generic error reported with the endpoint', async () => {
    const err = await handleApiResponse(fakeResponse(404, 'nope', `${API}/market/listing/x`, 'Not Found')).catch(
      (e) => e,
    );
    expect(err).not.toBeInstanceOf(AccountMismatchError);
    expect(err.message).toBe('API Error: 404 Not Found\nnope');
    expect(reportApiError).toHaveBeenCalledWith(err, 'pd2-api', '/market/listing/x', 404, {});
  });

  it('includes feathers error fields and a string query in the report context', async () => {
    const body = { name: 'BadRequest', code: 0, className: 'bad-request' };
    await handleApiResponse(fakeResponse(400, body), undefined, 'a=1').catch(() => {});
    expect(vi.mocked(reportApiError).mock.calls[0][4]).toEqual({
      errorName: 'BadRequest',
      errorCode: 0,
      errorClassName: 'bad-request',
      queryString: 'a=1',
    });
  });

  it('falls back to String() for queries that cannot be JSON-serialized', async () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    await handleApiResponse(fakeResponse(500, ''), undefined, cyclic).catch(() => {});
    expect(vi.mocked(reportApiError).mock.calls[0][4]).toEqual({ query: '[object Object]' });
  });
});

describe('error classes', () => {
  it('keep instanceof and default status codes', () => {
    expect(new AuthenticationError('x')).toMatchObject({ statusCode: 401, name: 'AuthenticationError' });
    expect(new AuthenticationError('x')).toBeInstanceOf(Error);
    expect(new AccountMismatchError('x')).toMatchObject({ statusCode: 404, account: undefined });
  });
});

describe('usePd2Website', () => {
  it('throws outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Capture />)).toThrow('usePd2Website must be used within a Pd2WebsiteProvider');
  });
});

describe('Pd2WebsiteProvider auth', () => {
  it('authenticates with the stored token and exposes authData + Sentry/telemetry user', async () => {
    await renderParent();
    const meCall = fetchMock.mock.calls.find(([u]) => u === ME_URL)!;
    expect((meCall[1]!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(ctx.authData).toEqual(authData);
    expect(Sentry.setUser).toHaveBeenLastCalledWith({ id: 'user-1', username: 'Bob' });
    expect(setTelemetryUser).toHaveBeenLastCalledWith({
      id: 'user-1',
      username: 'Bob',
      attributes: { last_seen_version: '1.2.3' },
    });
  });

  it('without a token stays signed out and never calls /me', async () => {
    settings.pd2Token = undefined;
    await renderParent();
    expect(ctx.authData).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(Sentry.setUser).toHaveBeenLastCalledWith(null);
  });

  it('auto-selects the only game account when none is configured', async () => {
    settings.account = undefined;
    await renderParent();
    expect(updateSettings).toHaveBeenCalledWith({ account: 'bobacc' });
  });

  it('leaves account selection to the user when there are several accounts', async () => {
    settings.account = undefined;
    routes[ME_URL] = () =>
      fakeResponse(200, { user: { ...authData.user, game: { accounts: ['a', 'b'] } } }, ME_URL);
    await renderParent();
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('a 401 tries a silent refresh first and skips the sign-in dialog when it succeeds', async () => {
    refreshTokens.mockResolvedValue(true);
    routes[`${API}/market/listing`] = () => fakeResponse(401, { message: 'expired' });
    await renderParent();
    expect(ctx.authData).toEqual(authData);

    await act(async () => {
      await expect(ctx.getMarketListings({} as never)).resolves.toBeNull();
    });
    expect(refreshTokens).toHaveBeenCalledWith('refresh-1');
    expect(ctx.authData).toBeNull();
    expect(emittedOf('pd2:show-sign-in-dialog')).toEqual([]);
  });

  it('shows the sign-in dialog when refresh fails', async () => {
    routes[`${API}/market/listing`] = () => fakeResponse(401, {});
    await renderParent();
    await act(async () => {
      await ctx.getMarketListings({} as never);
    });
    expect(refreshTokens).toHaveBeenCalledTimes(1);
    expect(emittedOf('pd2:show-sign-in-dialog')).toHaveLength(1);
  });

  it('goes straight to sign-in when there is no refresh token', async () => {
    settings.pd2RefreshToken = undefined;
    routes[`${API}/market/listing`] = () => fakeResponse(401, {});
    await renderParent();
    await act(async () => {
      await ctx.getMarketListings({} as never);
    });
    expect(refreshTokens).not.toHaveBeenCalled();
    expect(emittedOf('pd2:show-sign-in-dialog')).toHaveLength(1);
  });

  it('dedupes concurrent 401s and re-arms after 2s', async () => {
    routes[`${API}/market/listing`] = () => fakeResponse(401, {});
    await renderParent();
    await act(async () => {
      await Promise.all([ctx.getMarketListings({} as never), ctx.getMarketListings({} as never)]);
    });
    expect(refreshTokens).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_999);
      await ctx.getMarketListings({} as never);
    });
    expect(refreshTokens).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await ctx.getMarketListings({} as never);
    });
    expect(refreshTokens).toHaveBeenCalledTimes(2);
  });

  it('a 401 invalidates the stash cache so the next lookup refetches', async () => {
    const stashUrl = `${API}/game/stash/bobacc`;
    routes[stashUrl] = () =>
      fakeResponse(200, { items: [{ hash: 'h', name: 'Annihilus', quality: { name: 'Unique' } }] }, stashUrl);
    routes[`${API}/market/listing`] = () => fakeResponse(401, {});
    const view = await renderParent();
    const anni = { name: 'Annihilus', type: 'Small Charm', quality: 'Unique', stats: [] } as never;
    const stashCalls = () => fetchMock.mock.calls.filter(([u]) => String(u).startsWith(stashUrl)).length;

    await act(async () => {
      await ctx.findMatchingItems(anni);
      await ctx.findMatchingItems(anni);
    });
    expect(stashCalls()).toBe(1);

    await act(async () => {
      await ctx.getMarketListings({} as never);
    });
    expect(ctx.authData).toBeNull();
    // A new token (as written by the refresh flow) re-authenticates; the stash must then be fetched fresh.
    settings = { ...settings, pd2Token: 'tok-2' };
    view.rerender(
      <Pd2WebsiteProvider>
        <Capture />
      </Pd2WebsiteProvider>,
    );
    await flush();
    expect(ctx.authData).toEqual(authData);
    await act(async () => {
      await ctx.findMatchingItems(anni);
    });
    expect(stashCalls()).toBe(2);
  });

  it('logout clears tokens, auth state, and toasts', async () => {
    await renderParent();
    await act(async () => {
      await ctx.logout();
    });
    expect(ctx.authData).toBeNull();
    expect(updateSettings).toHaveBeenCalledWith({
      pd2Token: undefined,
      pd2RefreshToken: undefined,
      pd2TokenExpiry: undefined,
    });
    expect(tauriEmit).toHaveBeenCalledWith('toast-event', expect.objectContaining({ description: 'Logged out successfully.' }));
    expect(Sentry.setUser).toHaveBeenLastCalledWith(null);
  });
});

describe('Pd2WebsiteProvider bridge', () => {
  it('publishes a snapshot on change and on request', async () => {
    await renderParent();
    const snapshots = emittedOf('pd2website:snapshot') as { authData: unknown }[];
    expect(snapshots.at(-1)!.authData).toEqual(authData);
    const before = snapshots.length;

    await act(async () => {
      await bus.emit('pd2website:request-snapshot', {});
    });
    await flush();
    expect(emittedOf('pd2website:snapshot')).toHaveLength(before + 1);
  });

  it('answers RPC requests with the handler result', async () => {
    routes[`${API}/market/listing`] = () => fakeResponse(200, { data: ['L'] });
    await renderParent();
    await act(async () => {
      await bus.emit('pd2website:rpc-request', { requestId: 'r1', method: 'getMarketListings', args: [{}] });
    });
    expect(emittedOf('pd2website:rpc-response')).toEqual([{ requestId: 'r1', ok: true, result: { data: ['L'] } }]);
  });

  it('rejects unknown methods and ignores malformed requests', async () => {
    await renderParent();
    await act(async () => {
      await bus.emit('pd2website:rpc-request', { method: 'getMarketListings' });
      await bus.emit('pd2website:rpc-request', { requestId: 'r2', method: 'dropTables', args: [] });
    });
    expect(emittedOf('pd2website:rpc-response')).toEqual([
      { requestId: 'r2', ok: false, error: 'Unknown method: dropTables' },
    ]);
  });

  it('serializes typed error metadata for the child window', async () => {
    const stashUrl = `${API}/game/stash/bobacc`;
    routes[stashUrl] = () => fakeResponse(404, '', stashUrl);
    await renderParent();
    await act(async () => {
      await bus.emit('pd2website:rpc-request', { requestId: 'r3', method: 'findMatchingItems', args: [{}] });
    });
    expect(emittedOf('pd2website:rpc-response')).toEqual([
      expect.objectContaining({
        requestId: 'r3',
        ok: false,
        errorName: 'AccountMismatchError',
        errorStatusCode: 404,
        errorAccount: 'bobacc',
      }),
    ]);
  });

  it('stops listening after unmount', async () => {
    const view = await renderParent();
    view.unmount();
    expect(bus.listeners.get('pd2website:rpc-request')?.size ?? 0).toBe(0);
    expect(bus.listeners.get('pd2website:request-snapshot')?.size ?? 0).toBe(0);
  });
});

describe('ChildPd2WebsiteProvider', () => {
  async function renderChild() {
    const view = render(
      <ChildPd2WebsiteProvider>
        <Capture />
      </ChildPd2WebsiteProvider>,
    );
    await flush();
    return view;
  }

  function respondToLastRequest(response: Record<string, unknown>) {
    const req = emittedOf('pd2website:rpc-request').at(-1) as { requestId: string };
    return act(async () => {
      await bus.emit('pd2website:rpc-response', { requestId: req.requestId, ...response });
    });
  }

  it('requests a snapshot on mount and normalizes offer timestamps to Dates', async () => {
    await renderChild();
    expect(emittedOf('pd2website:request-snapshot')).toHaveLength(1);

    await act(async () => {
      await bus.emit('pd2website:snapshot', {
        authData,
        incomingOffers: [{ id: 'o1', timestamp: '2026-10-01T00:00:00.000Z' }],
        loading: true,
      });
    });
    expect(ctx.authData).toEqual(authData);
    expect(ctx.loading).toBe(true);
    expect(ctx.outgoingOffers).toEqual([]);
    expect(ctx.incomingOffers[0].timestamp).toEqual(new Date('2026-10-01T00:00:00.000Z'));
  });

  it('round-trips RPC calls with method and args', async () => {
    await renderChild();
    const pending = ctx.sendMessage('c1', 'hi', 'u1');
    expect(emittedOf('pd2website:rpc-request').at(-1)).toMatchObject({
      method: 'sendMessage',
      args: ['c1', 'hi', 'u1'],
    });
    await respondToLastRequest({ ok: true, result: { _id: 'm1' } });
    await expect(pending).resolves.toEqual({ _id: 'm1' });
  });

  it('ignores responses for unknown request ids', async () => {
    await renderChild();
    const pending = ctx.getMessages('c1');
    await act(async () => {
      await bus.emit('pd2website:rpc-response', { requestId: 'someone-else', ok: true, result: 'wrong' });
    });
    await respondToLastRequest({ ok: true, result: 'right' });
    await expect(pending).resolves.toBe('right');
  });

  it.each([
    ['AuthenticationError', AuthenticationError, { errorStatusCode: 401 }],
    ['AccountMismatchError', AccountMismatchError, { errorStatusCode: 404, errorAccount: 'acc' }],
  ])('rebuilds %s so instanceof checks work across windows', async (errorName, ErrorClass, meta) => {
    await renderChild();
    const pending = ctx.getMarketListings({} as never).catch((e) => e);
    await respondToLastRequest({ ok: false, error: 'nope', errorName, ...meta });
    const err = await pending;
    expect(err).toBeInstanceOf(ErrorClass);
    expect(err).toMatchObject({ message: 'nope', ...('errorAccount' in meta ? { account: 'acc' } : {}) });
  });

  it('other errors become plain Errors with a default message', async () => {
    await renderChild();
    const assertion = expect(ctx.refresh() as unknown as Promise<void>).rejects.toThrow(/^PD2 RPC request failed$/);
    await respondToLastRequest({ ok: false, errorName: 'TypeError' });
    await assertion;
  });

  it('times out unanswered calls after 20s', async () => {
    await renderChild();
    const pending = ctx.getConversations('u1');
    const assertion = expect(pending).rejects.toThrow('PD2 RPC timeout for getConversations');
    await vi.advanceTimersByTimeAsync(20_000);
    await assertion;
  });

  it('rejects in-flight calls on unmount', async () => {
    const view = await renderChild();
    const assertion = expect(ctx.acceptOffer('L1', 'o1')).rejects.toThrow('ChildPd2WebsiteProvider unmounted');
    view.unmount();
    await assertion;
  });

  it('fire-and-forget methods swallow failures', async () => {
    await renderChild();
    expect(ctx.updateItemByHash('h', {})).toBe(false);
    ctx.deleteOutgoingOffer('o1');
    ctx.restoreOutgoingOffer('o1');
    const reqs = emittedOf('pd2website:rpc-request') as { requestId: string; method: string }[];
    expect(reqs.map((r) => r.method)).toEqual(['updateItemByHash', 'deleteOutgoingOffer', 'restoreOutgoingOffer']);
    await act(async () => {
      for (const r of reqs) await bus.emit('pd2website:rpc-response', { requestId: r.requestId, ok: false, error: 'x' });
    });
    expect(vi.mocked(console.warn).mock.calls.map((c) => c[0])).toEqual([
      '[ChildPd2WebsiteProvider] Failed to update item by hash:',
      '[ChildPd2WebsiteProvider] Failed to delete outgoing offer:',
      '[ChildPd2WebsiteProvider] Failed to restore outgoing offer:',
    ]);
  });

  it('talks to a real parent provider end to end', async () => {
    routes[`${API}/market/listing`] = () => fakeResponse(200, { data: ['from-parent'] });
    let childCtx!: NonNullable<React.ContextType<typeof Pd2WebsiteContext>>;
    const setChildCtx = (value: typeof childCtx) => {
      childCtx = value;
    };
    function ChildCapture() {
      setChildCtx(usePd2Website());
      return null;
    }
    render(
      <>
        <Pd2WebsiteProvider>
          <Capture />
        </Pd2WebsiteProvider>
        <ChildPd2WebsiteProvider>
          <ChildCapture />
        </ChildPd2WebsiteProvider>
      </>,
    );
    await flush();
    await flush();
    expect(childCtx.authData).toEqual(authData);

    let result: unknown;
    await act(async () => {
      result = await childCtx.getMarketListings({ user_id: 'u' } as never);
    });
    expect(result).toEqual({ data: ['from-parent'] });
    expect(String(fetchMock.mock.calls.at(-1)![0])).toBe(`${API}/market/listing?user_id=u`);
  });
});
