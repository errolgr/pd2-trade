// @vitest-environment happy-dom
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { emitTo } from '@tauri-apps/api/event';
import { usePanelOpen, useOverlay } from '@/overlay';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { writeText } from '@/lib/browser-clipboard';
import { cancelOAuthFlow, useOAuth, useOAuthFlowActive, useOAuthFlowLink } from './useOAuth';
import { useOptions } from './useOptions';
import {
  SIGN_IN_ACTION_EVENT,
  SIGN_IN_CLOSED_EVENT,
  SIGN_IN_READY_EVENT,
  SIGN_IN_STATE_EVENT,
  SignInProvider,
  useSignIn,
} from './useSignIn';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ emitTo: vi.fn() }));
vi.mock('@/overlay', () => ({ useOverlay: vi.fn(), usePanelOpen: vi.fn() }));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('./useOAuth', () => ({
  useOAuth: vi.fn(),
  useOAuthFlowActive: vi.fn(),
  useOAuthFlowLink: vi.fn(),
  cancelOAuthFlow: vi.fn(),
}));
vi.mock('@/lib/browser-clipboard', () => ({ writeText: vi.fn() }));
vi.mock('./useOptions', () => ({ useOptions: vi.fn() }));
const events = vi.hoisted(() => ({ handlers: new Map<string, (e: { payload: unknown }) => void>() }));
vi.mock('@/lib/browser-events', () => ({
  listen: vi.fn(async (event: string, handler: (e: { payload: unknown }) => void) => {
    events.handlers.set(event, handler);
    return () => events.handlers.delete(event);
  }),
}));

const startOAuthFlow = vi.fn();
const updateSettings = vi.fn();
const openPanel = vi.fn();
const closePanel = vi.fn();

const meResponse = (accounts: string[], ok = true) =>
  ({ ok, json: async () => ({ user: { game: { accounts } } }) }) as Response;
const commands = () => vi.mocked(invoke).mock.calls.map(([name]) => name);
const fire = (event: string, payload?: unknown) => act(() => events.handlers.get(event)!({ payload }));

async function renderSignIn() {
  const view = renderHook(() => useSignIn(), {
    wrapper: ({ children }) => <SignInProvider>{children}</SignInProvider>,
  });
  await act(async () => {}); // listeners subscribe
  return view;
}

beforeEach(() => {
  vi.clearAllMocks();
  events.handlers.clear();
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(invoke).mockResolvedValue(undefined);
  vi.mocked(emitTo).mockResolvedValue(undefined);
  startOAuthFlow.mockResolvedValue('tok-1');
  updateSettings.mockResolvedValue(undefined);
  vi.mocked(useOAuth).mockReturnValue({ startOAuthFlow } as never);
  vi.mocked(useOAuthFlowActive).mockReturnValue(false);
  vi.mocked(useOAuthFlowLink).mockReturnValue(null);
  vi.mocked(writeText).mockResolvedValue(undefined);
  vi.mocked(useOptions).mockReturnValue({ updateSettings } as never);
  vi.mocked(useOverlay).mockReturnValue({ openPanel, closePanel } as never);
  vi.mocked(usePanelOpen).mockReturnValue(false);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('SignInProvider (Tauri: native window)', () => {
  it('opens the window, and tracks the user closing it', async () => {
    const { result } = await renderSignIn();
    act(() => result.current.openSignIn());
    expect(commands()).toEqual(['open_sign_in_window']);
    expect(result.current.isOpen).toBe(true);

    fire(SIGN_IN_CLOSED_EVENT);
    expect(result.current.isOpen).toBe(false);
  });

  it('answers the window with the state, and runs its buttons', async () => {
    const { result } = await renderSignIn();
    act(() => result.current.openSignIn());
    vi.mocked(emitTo).mockClear();
    fire(SIGN_IN_READY_EVENT);
    expect(emitTo).toHaveBeenCalledWith('SignIn', SIGN_IN_STATE_EVENT, {
      flowActive: false,
      busy: false,
      accounts: null,
      selectedAccount: null,
      link: null,
      linkCopied: false,
    });

    fire(SIGN_IN_ACTION_EVENT, { type: 'cancel' });
    expect(cancelOAuthFlow).toHaveBeenCalledOnce();
    fire(SIGN_IN_ACTION_EVENT, { type: 'later' });
    expect(commands()).toEqual(['open_sign_in_window', 'close_sign_in_window']);
    expect(result.current.isOpen).toBe(false);
  });

  it('one account: saves it and closes the window', async () => {
    vi.mocked(tauriFetch).mockResolvedValue(meResponse(['Solo']));
    const { result } = await renderSignIn();
    await act(async () => result.current.dispatch({ type: 'start' }));
    expect(updateSettings).toHaveBeenCalledWith({ account: 'Solo' });
    expect(commands()).toEqual(['close_sign_in_window']);
  });

  it('several accounts: brings the window back to the front with the picker, even after it was closed', async () => {
    const { promise, resolve } = Promise.withResolvers<string>();
    startOAuthFlow.mockReturnValue(promise);
    vi.mocked(tauriFetch).mockResolvedValue(meResponse(['Alpha', 'Beta']));
    const { result } = await renderSignIn();
    act(() => result.current.openSignIn());
    act(() => result.current.dispatch({ type: 'start' }));
    fire(SIGN_IN_CLOSED_EVENT); // closed while signing in in the browser

    await act(async () => resolve('tok-1'));
    expect(commands()).toEqual(['open_sign_in_window', 'open_sign_in_window']);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.state.accounts).toEqual(['Alpha', 'Beta']);

    await act(async () => result.current.dispatch({ type: 'select', account: 'Beta' }));
    expect(updateSettings).toHaveBeenCalledWith({ account: 'Beta' });
    expect(commands().at(-1)).toBe('close_sign_in_window');
    expect(result.current.state.accounts).toBeNull(); // the next open starts at the sign-in view
  });

  it('a cancelled or failed browser sign-in leaves the window as it is', async () => {
    startOAuthFlow.mockResolvedValue(false);
    const { result } = await renderSignIn();
    act(() => result.current.openSignIn());
    await act(async () => result.current.dispatch({ type: 'start' }));
    expect(tauriFetch).not.toHaveBeenCalled();
    expect(commands()).toEqual(['open_sign_in_window']);
    expect(result.current.state.busy).toBe(false);
  });

  it("copies the running sign-in's link for the window, which can't reach the clipboard", async () => {
    vi.mocked(useOAuthFlowActive).mockReturnValue(true);
    vi.mocked(useOAuthFlowLink).mockReturnValue({ url: 'https://auth/x', openFailed: true });
    const { result, rerender } = await renderSignIn();
    expect(result.current.state).toMatchObject({
      link: { url: 'https://auth/x', openFailed: true },
      linkCopied: false,
    });

    fire(SIGN_IN_ACTION_EVENT, { type: 'copyLink' });
    await act(async () => {}); // the clipboard write settles
    expect(writeText).toHaveBeenCalledWith('https://auth/x');
    expect(result.current.state.linkCopied).toBe(true);

    // A new sign-in has a new link, not copied yet
    vi.mocked(useOAuthFlowLink).mockReturnValue({ url: 'https://auth/y', openFailed: false });
    rerender();
    expect(result.current.state.linkCopied).toBe(false);
  });

  it('leaves the link uncopied when the clipboard refuses it', async () => {
    vi.mocked(useOAuthFlowLink).mockReturnValue({ url: 'https://auth/x', openFailed: true });
    vi.mocked(writeText).mockRejectedValue(new Error('clipboard unavailable'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = await renderSignIn();

    await act(async () => result.current.dispatch({ type: 'copyLink' }));
    expect(result.current.state.linkCopied).toBe(false);
    expect(warn).toHaveBeenCalledWith('[SignIn] Could not copy the sign-in link:', expect.any(Error));
  });
});

describe('SignInProvider (browser: overlay panel)', () => {
  it('opens and closes the signIn panel', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    const { result } = await renderSignIn();
    act(() => result.current.openSignIn());
    expect(openPanel).toHaveBeenCalledWith('signIn', undefined, { focus: true });
    act(() => result.current.dispatch({ type: 'later' }));
    expect(closePanel).toHaveBeenCalledWith('signIn');
    expect(invoke).not.toHaveBeenCalled();
  });
});
