// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@/overlay';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { useOptions } from '@/hooks/useOptions';
import { BACKEND_URL } from '@/lib/pkce';
import type { GenericToastPayload } from '@/common/types/Events';
import { useOAuth } from './useOAuth';

vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => true), invoke: vi.fn() }));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));

const NOW = new Date('2026-10-18T12:00:00Z').getTime();
const POLL_URL = `${BACKEND_URL}/api/auth/oauth/poll/state-123`;

const updateSettings = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function toasts(): GenericToastPayload[] {
  return vi.mocked(showToast).mock.calls.map(([payload]) => payload as GenericToastPayload);
}

/** Route fetch by URL; `poll` is consulted for every poll request in order (last entry repeats). */
function routeFetch(
  poll: Array<Response | Error>,
  start: Response = jsonResponse({ authUrl: 'https://auth', state: 'state-123' }),
) {
  let pollIndex = 0;
  vi.mocked(tauriFetch).mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith('/api/auth/oauth/start')) return start;
    if (url === POLL_URL) {
      const next = poll[Math.min(pollIndex++, poll.length - 1)];
      if (next instanceof Error) throw next;
      return next;
    }
    throw new Error(`unexpected fetch ${url}`);
  });
}

function pollCount() {
  return vi.mocked(tauriFetch).mock.calls.filter(([url]) => url === POLL_URL).length;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(isTauri).mockReturnValue(true);
  updateSettings.mockReset().mockResolvedValue(undefined);
  vi.mocked(useOptions).mockReturnValue({
    isOpen: false,
    setIsOpen: vi.fn(),
    isLoading: false,
    settings: {} as never,
    updateSettings,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useOAuth startOAuthFlow', () => {
  it('keeps polling through 404s and network errors, then stores tokens with an absolute expiry', async () => {
    routeFetch([
      jsonResponse(null, 404),
      new Error('offline'),
      jsonResponse(null, 500),
      jsonResponse({ accessToken: 'acc', refreshToken: 'ref', expiresIn: 3600 }),
    ]);
    const { result } = renderHook(() => useOAuth());

    let outcome: string | false | undefined;
    await act(async () => {
      const pending = result.current.startOAuthFlow().then((v) => (outcome = v));
      await vi.advanceTimersByTimeAsync(2000 * 4);
      await pending;
    });

    expect(outcome).toBe('acc');
    expect(pollCount()).toBe(4);
    expect(invoke).toHaveBeenCalledWith('open_oauth_url', { url: 'https://auth' });
    expect(updateSettings).toHaveBeenCalledWith({
      pd2Token: 'acc',
      pd2RefreshToken: 'ref',
      pd2TokenExpiry: NOW + 2000 * 4 + 3600 * 1000,
    });
    expect(toasts().map((t) => t.description)).toEqual(['Authentication successful!']);
  });

  it('opens a browser tab outside Tauri', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    routeFetch([jsonResponse({ accessToken: 'acc', expiresIn: 60 })]);
    const { result } = renderHook(() => useOAuth());

    await act(async () => {
      const pending = result.current.startOAuthFlow();
      await vi.advanceTimersByTimeAsync(2000);
      await pending;
    });

    expect(open).toHaveBeenCalledWith('https://auth', '_blank', 'noopener,noreferrer');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('times out after 10 minutes with a warning toast and stores nothing', async () => {
    routeFetch([jsonResponse(null, 404)]);
    const { result } = renderHook(() => useOAuth());

    let outcome: string | false | undefined;
    await act(async () => {
      const pending = result.current.startOAuthFlow().then((v) => (outcome = v));
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000 - 1);
      expect(outcome).toBeUndefined();
      await vi.advanceTimersByTimeAsync(2000);
      await pending;
    });

    expect(outcome).toBe(false);
    expect(pollCount()).toBe(300);
    expect(updateSettings).not.toHaveBeenCalled();
    expect(toasts()).toEqual([
      expect.objectContaining({ variant: 'warning', description: 'Login timed out. Please try again.' }),
    ]);
  });

  it('rejects a concurrent second flow, and allows a new flow once the first finishes', async () => {
    routeFetch([jsonResponse({ accessToken: 'acc', expiresIn: 60 })]);
    const { result } = renderHook(() => useOAuth());

    await act(async () => {
      const first = result.current.startOAuthFlow();
      await expect(result.current.startOAuthFlow()).resolves.toBe(false);
      await vi.advanceTimersByTimeAsync(2000);
      await expect(first).resolves.toBe('acc');
    });

    vi.mocked(tauriFetch).mockClear();
    await act(async () => {
      const again = result.current.startOAuthFlow();
      await vi.advanceTimersByTimeAsync(2000);
      await expect(again).resolves.toBe('acc');
    });
    expect(pollCount()).toBe(1);
  });

  it('reports failure and releases the lock when the backend refuses to start', async () => {
    routeFetch([], jsonResponse(null, 503));
    const { result } = renderHook(() => useOAuth());

    await act(async () => {
      await expect(result.current.startOAuthFlow()).resolves.toBe(false);
    });
    expect(pollCount()).toBe(0);
    expect(toasts()).toEqual([
      expect.objectContaining({ variant: 'error', description: 'Authentication failed. Please try again.' }),
    ]);

    routeFetch([jsonResponse({ accessToken: 'acc2', expiresIn: 60 })]);
    await act(async () => {
      const retry = result.current.startOAuthFlow();
      await vi.advanceTimersByTimeAsync(2000);
      await expect(retry).resolves.toBe('acc2');
    });
  });

  it('stops polling as soon as the caller aborts, stays silent, and lets a new flow start right away', async () => {
    routeFetch([jsonResponse(null, 404)]);
    const { result } = renderHook(() => useOAuth());
    const closed = new AbortController();

    let outcome: string | false | undefined;
    await act(async () => {
      const pending = result.current.startOAuthFlow(closed.signal).then((v) => (outcome = v));
      await vi.advanceTimersByTimeAsync(2000);
      expect(pollCount()).toBe(1);
      closed.abort();
      await pending;
    });
    expect(outcome).toBe(false);

    routeFetch([jsonResponse({ accessToken: 'acc', expiresIn: 60 })]);
    vi.mocked(tauriFetch).mockClear();
    await act(async () => {
      const again = result.current.startOAuthFlow(new AbortController().signal);
      await vi.advanceTimersByTimeAsync(2000);
      await expect(again).resolves.toBe('acc');
    });
    // The aborted flow never polled again; only the new flow did.
    expect(pollCount()).toBe(1);
    expect(toasts().map((t) => t.description)).toEqual(['Authentication successful!']);
  });

  it('ignores tokens that arrive after the caller aborted', async () => {
    const late = Promise.withResolvers<Response>();
    vi.mocked(tauriFetch).mockImplementation(async (input) =>
      String(input) === POLL_URL ? late.promise : jsonResponse({ authUrl: 'https://auth', state: 'state-123' }),
    );
    const { result } = renderHook(() => useOAuth());
    const closed = new AbortController();

    await act(async () => {
      const pending = result.current.startOAuthFlow(closed.signal);
      await vi.advanceTimersByTimeAsync(2000);
      expect(pollCount()).toBe(1);
      closed.abort();
      late.resolve(jsonResponse({ accessToken: 'late', expiresIn: 60 }));
      await expect(pending).resolves.toBe(false);
    });

    expect(updateSettings).not.toHaveBeenCalled();
    expect(toasts()).toEqual([]);
  });

  it('does nothing when the signal is already aborted', async () => {
    routeFetch([jsonResponse({ accessToken: 'acc', expiresIn: 60 })]);
    const { result } = renderHook(() => useOAuth());
    const closed = new AbortController();
    closed.abort();

    await act(async () => {
      await expect(result.current.startOAuthFlow(closed.signal)).resolves.toBe(false);
    });
    expect(tauriFetch).not.toHaveBeenCalled();
  });
});

describe('useOAuth refreshTokens', () => {
  it('keeps the existing refresh token when the server does not rotate it', async () => {
    vi.mocked(tauriFetch).mockResolvedValue(jsonResponse({ accessToken: 'new', expiresIn: 120 }));
    const { result } = renderHook(() => useOAuth());

    await expect(result.current.refreshTokens('old-refresh')).resolves.toBe(true);

    expect(vi.mocked(tauriFetch).mock.calls[0][0]).toBe(`${BACKEND_URL}/api/auth/oauth/refresh`);
    expect(JSON.parse(String(vi.mocked(tauriFetch).mock.calls[0][1]?.body))).toEqual({ refreshToken: 'old-refresh' });
    expect(updateSettings).toHaveBeenCalledWith({
      pd2Token: 'new',
      pd2RefreshToken: 'old-refresh',
      pd2TokenExpiry: NOW + 120_000,
    });
  });

  it('stores a rotated refresh token', async () => {
    vi.mocked(tauriFetch).mockResolvedValue(
      jsonResponse({ accessToken: 'new', refreshToken: 'rotated', expiresIn: 1 }),
    );
    const { result } = renderHook(() => useOAuth());

    await expect(result.current.refreshTokens('old')).resolves.toBe(true);
    expect(updateSettings.mock.calls[0][0].pd2RefreshToken).toBe('rotated');
  });

  it.each([
    ['HTTP error', () => vi.mocked(tauriFetch).mockResolvedValue(jsonResponse(null, 401))],
    ['network error', () => vi.mocked(tauriFetch).mockRejectedValue(new Error('offline'))],
  ])('returns false and leaves settings untouched on %s', async (_label, arrange) => {
    arrange();
    const { result } = renderHook(() => useOAuth());

    await expect(result.current.refreshTokens('old')).resolves.toBe(false);
    expect(updateSettings).not.toHaveBeenCalled();
  });
});
