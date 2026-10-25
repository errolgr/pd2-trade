// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { cancelOAuthFlow, useOAuth, useOAuthFlowActive } from '@/hooks/useOAuth';
import { useOptions } from '@/hooks/useOptions';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { usePanel, useOverlay } from '@/overlay';
import { BACKEND_URL } from '@/lib/pkce';
import SignInPage from './SignInPage';

vi.mock('@/hooks/useOAuth', () => ({ useOAuth: vi.fn(), useOAuthFlowActive: vi.fn(), cancelOAuthFlow: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/overlay', () => ({ usePanel: vi.fn(), useOverlay: vi.fn() }));

let calls: string[];
const startOAuthFlow = vi.fn();
const updateSettings = vi.fn();
const close = vi.fn();
const openPanel = vi.fn();
const closePanel = vi.fn();

const meResponse = (accounts: string[] | undefined, ok = true) =>
  ({ ok, json: async () => ({ user: { game: accounts ? { accounts } : undefined } }) }) as Response;

function renderPanel(payload?: { accounts: string[] }) {
  vi.mocked(usePanel).mockReturnValue({ close, payload } as never);
  return render(<SignInPage />);
}

async function signIn() {
  renderPanel();
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
  close.mockReset().mockImplementation(() => calls.push('close'));
  openPanel.mockReset().mockImplementation((id, payload) => calls.push(`open:${id}:${JSON.stringify(payload)}`));
  closePanel.mockReset().mockImplementation((id) => calls.push(`closePanel:${id}`));
  vi.mocked(useOAuth).mockReturnValue({ startOAuthFlow } as never);
  vi.mocked(useOAuthFlowActive).mockReturnValue(false);
  vi.mocked(cancelOAuthFlow).mockReset();
  vi.mocked(useOptions).mockReturnValue({ updateSettings } as never);
  vi.mocked(useOverlay).mockReturnValue({ openPanel, closePanel } as never);
  vi.mocked(tauriFetch).mockReset();
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
    expect(calls).toEqual(['update:{"account":"Solo"}', 'closePanel:signIn']);
  });

  it('closes without touching the account when the login has none', async () => {
    vi.mocked(tauriFetch).mockResolvedValue(meResponse(undefined));
    await signIn();
    expect(calls).toEqual(['closePanel:signIn']);
  });

  it('closes when the profile lookup fails (tokens are already stored)', async () => {
    vi.mocked(tauriFetch).mockResolvedValue(meResponse(['A', 'B'], false));
    await signIn();
    expect(calls).toEqual(['closePanel:signIn']);
  });

  it('opens the account picker when there are several', async () => {
    vi.mocked(tauriFetch).mockResolvedValue(meResponse(['Alpha', 'Beta']));
    await signIn();
    expect(calls).toEqual(['open:signIn:{"accounts":["Alpha","Beta"]}']);
  });

  it('the picker saves the chosen account and closes', async () => {
    renderPanel({ accounts: ['Alpha', 'Beta'] });
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['AAlpha', 'BBeta']);

    await act(async () => fireEvent.click(screen.getByRole('option', { name: /Beta/ })));
    expect(calls).toEqual(['update:{"account":"Beta"}', 'close']);
    expect(screen.getByRole('option', { name: /Beta/ }).getAttribute('aria-selected')).toBe('true');
    expect((screen.getByRole('option', { name: /Alpha/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('returns to the idle button when the browser flow is cancelled', async () => {
    startOAuthFlow.mockResolvedValue(false);
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

  it('keeps the browser flow running when the panel closes mid-flow, and reopens it for the account picker', async () => {
    const { promise, resolve } = Promise.withResolvers<string | false>();
    startOAuthFlow.mockReturnValue(promise);
    vi.mocked(tauriFetch).mockResolvedValue(meResponse(['Alpha', 'Beta']));
    await signIn();
    expect(startOAuthFlow).toHaveBeenCalledWith();

    cleanup(); // the user switched to the browser: closeOnBlur closed the panel

    await act(async () => resolve('tok-1'));
    expect(calls).toEqual(['open:signIn:{"accounts":["Alpha","Beta"]}']);
  });

  it('while a sign-in runs (from here or Settings): shows the progress and a Cancel that ends it', () => {
    vi.mocked(useOAuthFlowActive).mockReturnValue(true);
    renderPanel();
    const busy = screen.getByRole('button', { name: /Opening browser/ }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    expect(busy.getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Later' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancelOAuthFlow).toHaveBeenCalledOnce();
    expect(calls).toEqual([]);
  });

  it('"Later" and the close button dismiss the panel', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(calls).toEqual(['close', 'close']);
    expect(startOAuthFlow).not.toHaveBeenCalled();
  });
});
