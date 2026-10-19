// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { useOAuth } from '@/hooks/useOAuth';
import { useOptions } from '@/hooks/useOptions';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { usePanel } from '@/overlay';
import { BACKEND_URL } from '@/lib/pkce';
import SignInPage from './SignInPage';

vi.mock('@/hooks/useOAuth', () => ({ useOAuth: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/overlay', () => ({ usePanel: vi.fn() }));

let calls: string[];
const startOAuthFlow = vi.fn();
const updateSettings = vi.fn();
const close = vi.fn();

const meResponse = (accounts: string[] | undefined, ok = true) =>
  ({ ok, json: async () => ({ user: { game: accounts ? { accounts } : undefined } }) }) as Response;

async function signIn() {
  render(<SignInPage />);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /Sign in with PD2/ })));
}

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  calls = [];
  startOAuthFlow.mockReset().mockResolvedValue('tok-1');
  updateSettings.mockReset().mockImplementation(async (patch) => {
    calls.push(`update:${JSON.stringify(patch)}`);
  });
  close.mockReset().mockImplementation(() => {
    calls.push('close');
    return Promise.resolve();
  });
  vi.mocked(useOAuth).mockReturnValue({ startOAuthFlow } as never);
  vi.mocked(useOptions).mockReturnValue({ updateSettings } as never);
  vi.mocked(usePanel).mockReturnValue({ close } as never);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(cleanup);

describe('SignInPage', () => {
  it('selects the only account, then closes', async () => {
    vi.mocked(tauriFetch).mockResolvedValue(meResponse(['Solo']));
    await signIn();
    expect(vi.mocked(tauriFetch)).toHaveBeenCalledWith(`${BACKEND_URL}/api/auth/oauth/me`, {
      method: 'GET',
      headers: { Authorization: 'Bearer tok-1' },
    });
    expect(calls).toEqual(['update:{"account":"Solo"}', 'close']);
  });

  it('closes without touching the account when the login has none', async () => {
    vi.mocked(tauriFetch).mockResolvedValue(meResponse(undefined));
    await signIn();
    expect(calls).toEqual(['close']);
  });

  it('closes when the profile lookup fails (tokens are already stored)', async () => {
    vi.mocked(tauriFetch).mockResolvedValue(meResponse(['A', 'B'], false));
    await signIn();
    expect(calls).toEqual(['close']);
  });

  it('asks which account to use when there are several, then saves the pick and closes', async () => {
    vi.mocked(tauriFetch).mockResolvedValue(meResponse(['Alpha', 'Beta']));
    await signIn();
    expect(calls).toEqual([]);
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['AAlpha', 'BBeta']);

    await act(async () => fireEvent.click(screen.getByRole('option', { name: /Beta/ })));
    expect(calls).toEqual(['update:{"account":"Beta"}', 'close']);
    expect(screen.getByRole('option', { name: /Beta/ }).getAttribute('aria-selected')).toBe('true');
    expect((screen.getByRole('option', { name: /Alpha/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('returns to the idle button when the browser flow is cancelled', async () => {
    startOAuthFlow.mockResolvedValue(null);
    await signIn();
    expect(tauriFetch).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
    expect((screen.getByRole('button', { name: /Sign in with PD2/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('recovers from an error during sign-in without closing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(tauriFetch).mockRejectedValue(new Error('offline'));
    await signIn();
    expect(calls).toEqual([]);
    expect((screen.getByRole('button', { name: /Sign in with PD2/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows progress and blocks "Later" while the browser flow is open', async () => {
    const { promise, resolve } = Promise.withResolvers<string | null>();
    startOAuthFlow.mockReturnValue(promise);
    await signIn();
    const busy = screen.getByRole('button', { name: /Opening browser/ }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    expect(busy.getAttribute('aria-busy')).toBe('true');
    expect((screen.getByRole('button', { name: 'Later' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => resolve(null));
  });

  it('aborts the browser flow when the panel closes mid-flow and ignores its late result', async () => {
    const { promise, resolve } = Promise.withResolvers<string | false>();
    startOAuthFlow.mockReturnValue(promise);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    await signIn();
    const signal = startOAuthFlow.mock.calls[0][0] as AbortSignal;
    expect(signal.aborted).toBe(false);

    cleanup();
    expect(signal.aborted).toBe(true);

    await act(async () => resolve('late-token'));
    expect(tauriFetch).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
  });

  it('starts a fresh flow when reopened after closing mid-flow', async () => {
    startOAuthFlow.mockReturnValueOnce(Promise.withResolvers<string>().promise);
    await signIn();
    cleanup();

    vi.mocked(tauriFetch).mockResolvedValue(meResponse(['Solo']));
    await signIn();
    expect(startOAuthFlow).toHaveBeenCalledTimes(2);
    const [first, second] = startOAuthFlow.mock.calls.map(([s]) => s as AbortSignal);
    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);
    expect(calls).toEqual(['update:{"account":"Solo"}', 'close']);
  });

  it('"Later" and the close button dismiss the panel', () => {
    render(<SignInPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(calls).toEqual(['close', 'close']);
    expect(startOAuthFlow).not.toHaveBeenCalled();
  });
});
