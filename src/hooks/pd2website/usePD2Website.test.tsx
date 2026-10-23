// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@/overlay';
import * as Sentry from '@sentry/react';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { reportApiError } from '@/lib/error-reporting';
import { setTelemetryUser } from '@/lib/telemetry';
import { useOptions } from '@/hooks/useOptions';
import { useOAuth } from '@/hooks/useOAuth';
import {
  AccountMismatchError,
  AuthenticationError,
  Pd2WebsiteContext,
  Pd2WebsiteProvider,
  handleApiResponse,
  usePd2Website,
} from './usePD2Website';

const openPanel = vi.hoisted(() => vi.fn());
const socket = vi.hoisted(() => ({ isConnected: false, subscribe: vi.fn() }));

vi.mock('@/overlay', () => ({ showToast: vi.fn(), useOverlay: () => ({ openPanel }) }));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/error-reporting', () => ({ reportApiError: vi.fn() }));
vi.mock('@/lib/telemetry', () => ({ setTelemetryUser: vi.fn() }));
vi.mock('@sentry/react', () => ({ setUser: vi.fn(), setContext: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useOAuth', () => ({ useOAuth: vi.fn() }));
vi.mock('@/hooks/useTradeOffers', () => ({ useTradeOffers: vi.fn() }));
vi.mock('./useSocket', () => ({ useSocket: () => socket }));

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
let routes: Record<string, (init?: RequestInit) => Response | Promise<Response>>;
/** PD2 refuses the current token too (/me 401): the session is really over. */
const refuseSession = () => {
  routes[ME_URL] = () => fakeResponse(401, {}, ME_URL);
};
const bearer = (init?: RequestInit) => (init?.headers as Record<string, string> | undefined)?.Authorization;

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

beforeEach(() => {
  vi.useFakeTimers();
  socket.isConnected = false;
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
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    const key = Object.keys(routes).find((k) => url.startsWith(k));
    if (!key) throw new Error(`unexpected fetch ${url}`);
    return routes[key](init);
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

  it('401 logs which endpoint refused the token', async () => {
    await handleApiResponse(fakeResponse(401, { message: 'jwt expired' }, `${API}/market/favorite?$limit=50`));
    expect(console.warn).toHaveBeenCalledWith(
      '[API] Authentication required (401):',
      'jwt expired',
      '/market/favorite',
    );
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
    routes[ME_URL] = () => fakeResponse(200, { user: { ...authData.user, game: { accounts: ['a', 'b'] } } }, ME_URL);
    await renderParent();
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('a 401 keeps the session when PD2 still accepts the current token (no refresh, no sign-in)', async () => {
    routes[`${API}/market/listing`] = () => fakeResponse(401, {});
    const view = await renderParent();
    // Signed in again since the failed request was sent: the re-check uses the new token
    settings = { ...settings, pd2Token: 'tok-2' };
    view.rerender(
      <Pd2WebsiteProvider>
        <Capture />
      </Pd2WebsiteProvider>,
    );
    await flush();
    fetchMock.mockClear();

    await act(async () => {
      await expect(ctx.getMarketListings({} as never)).resolves.toBeNull();
    });
    const recheck = fetchMock.mock.calls.find(([u]) => u === ME_URL)!;
    expect(bearer(recheck[1])).toBe('Bearer tok-2');
    expect(ctx.authData).toEqual(authData);
    expect(refreshTokens).not.toHaveBeenCalled();
    expect(openPanel).not.toHaveBeenCalled();
  });

  it("a /me answer for a replaced token doesn't sign the newer session out", async () => {
    const stale = Promise.withResolvers<Response>();
    routes[ME_URL] = (init) => (bearer(init) === 'Bearer tok' ? stale.promise : fakeResponse(200, authData, ME_URL));
    const view = await renderParent();

    settings = { ...settings, pd2Token: 'tok-2' };
    view.rerender(
      <Pd2WebsiteProvider>
        <Capture />
      </Pd2WebsiteProvider>,
    );
    await flush();
    expect(ctx.authData).toEqual(authData);

    // The old token's /me finally answers 401
    await act(async () => {
      stale.resolve(fakeResponse(401, {}, ME_URL));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(ctx.authData).toEqual(authData);
    expect(openPanel).not.toHaveBeenCalled();
  });

  it('a 401 tries a silent refresh first and skips the sign-in dialog when it succeeds', async () => {
    refreshTokens.mockResolvedValue(true);
    routes[`${API}/market/listing`] = () => fakeResponse(401, { message: 'expired' });
    await renderParent();
    expect(ctx.authData).toEqual(authData);
    refuseSession();

    await act(async () => {
      await expect(ctx.getMarketListings({} as never)).resolves.toBeNull();
    });
    expect(refreshTokens).toHaveBeenCalledWith('refresh-1');
    expect(ctx.authData).toBeNull();
    expect(openPanel).not.toHaveBeenCalled();
  });

  it('shows the sign-in dialog when refresh fails', async () => {
    routes[`${API}/market/listing`] = () => fakeResponse(401, {});
    await renderParent();
    refuseSession();
    await act(async () => {
      await ctx.getMarketListings({} as never);
    });
    expect(refreshTokens).toHaveBeenCalledTimes(1);
    expect(openPanel).toHaveBeenCalledTimes(1);
    expect(openPanel).toHaveBeenCalledWith('signIn');
  });

  it('goes straight to sign-in when there is no refresh token', async () => {
    settings.pd2RefreshToken = undefined;
    routes[`${API}/market/listing`] = () => fakeResponse(401, {});
    await renderParent();
    refuseSession();
    await act(async () => {
      await ctx.getMarketListings({} as never);
    });
    expect(refreshTokens).not.toHaveBeenCalled();
    expect(openPanel).toHaveBeenCalledWith('signIn');
  });

  it('dedupes concurrent 401s and re-arms after 2s', async () => {
    routes[`${API}/market/listing`] = () => fakeResponse(401, {});
    await renderParent();
    refuseSession();
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

    refuseSession();
    await act(async () => {
      await ctx.getMarketListings({} as never);
    });
    expect(ctx.authData).toBeNull();
    // A new token (as written by the refresh flow) re-authenticates; the stash must then be fetched fresh.
    routes[ME_URL] = () => fakeResponse(200, authData, ME_URL);
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
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Logged out successfully.' }));
    expect(Sentry.setUser).toHaveBeenLastCalledWith(null);
  });
});

describe('Pd2WebsiteProvider socket', () => {
  it("exposes the provider socket's connection state and push subscription", async () => {
    socket.isConnected = true;
    await renderParent();
    expect(ctx.isConnected).toBe(true);
    expect(ctx.subscribeSocket).toBe(socket.subscribe);
  });
});
