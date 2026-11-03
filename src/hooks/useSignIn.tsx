import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { emitTo } from '@tauri-apps/api/event';
import { usePanelOpen, useOverlay } from '@/overlay';
import { cancelOAuthFlow, useOAuth, useOAuthFlowActive, useOAuthFlowLink, type OAuthFlowLink } from './useOAuth';
import { useOptions } from './useOptions';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { listen } from '@/lib/browser-events';
import { holdListener } from '@/lib/listener';
import { writeText } from '@/lib/browser-clipboard';

/** What the sign-in view shows. */
export interface SignInState {
  /** The browser sign-in runs (started here or from Settings). */
  flowActive: boolean;
  /** The browser sign-in, or the account lookup after it, runs. */
  busy: boolean;
  /** Several game accounts are linked to the login: pick one. */
  accounts: string[] | null;
  selectedAccount: string | null;
  /** The running sign-in's link, to copy into a browser when none opened. */
  link: OAuthFlowLink | null;
  /** That link is on the clipboard. */
  linkCopied: boolean;
}

export type SignInAction =
  | { type: 'start' }
  | { type: 'cancel' }
  | { type: 'later' }
  | { type: 'copyLink' }
  | { type: 'select'; account: string };

/** Label of the native sign-in window (src-tauri commands::SIGN_IN_LABEL). */
export const SIGN_IN_WINDOW = 'SignIn';
const MAIN_WINDOW = 'Main';
/** Rust → Main: the user closed the sign-in window. */
export const SIGN_IN_CLOSED_EVENT = 'sign-in-window-closed';
/** Main → sign-in window: the state to show. */
export const SIGN_IN_STATE_EVENT = 'sign-in:state';
/** Sign-in window → Main: the view loaded and wants the state. */
export const SIGN_IN_READY_EVENT = 'sign-in:ready';
/** Sign-in window → Main: a button was pressed. */
export const SIGN_IN_ACTION_EVENT = 'sign-in:action';

interface SignInContextValue {
  /** Shows the sign-in prompt, focused (restores and raises the window if it is already open). */
  openSignIn(): void;
  isOpen: boolean;
  state: SignInState;
  dispatch(action: SignInAction): void;
}

const SignInContext = createContext<SignInContextValue | null>(null);

/**
 * Runs the sign-in for the whole app, in Main. The prompt is an ordinary window in the app (not the always-on-top
 * overlay), so it goes behind other apps like any window and comes back when selected; that window is only a view
 * that reports its buttons here. Outside Tauri there are no windows, so it is the `signIn` overlay panel.
 */
export function SignInProvider({ children }: { children: React.ReactNode }) {
  const { startOAuthFlow } = useOAuth();
  const { updateSettings } = useOptions();
  const { openPanel, closePanel } = useOverlay();
  const native = isTauri();
  const panelOpen = usePanelOpen('signIn');
  const [windowOpen, setWindowOpen] = useState(false);
  const isOpen = native ? windowOpen : panelOpen;

  const flowActive = useOAuthFlowActive();
  const link = useOAuthFlowLink();
  const [lookingUp, setLookingUp] = useState(false);
  const [accounts, setAccounts] = useState<string[] | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const state = useMemo<SignInState>(
    () => ({
      flowActive,
      busy: flowActive || lookingUp,
      accounts,
      selectedAccount,
      link,
      linkCopied: link !== null && copiedUrl === link.url,
    }),
    [flowActive, lookingUp, accounts, selectedAccount, link, copiedUrl],
  );

  const openSignIn = useCallback(() => {
    if (native) {
      setWindowOpen(true);
      invoke('open_sign_in_window').catch((error) => console.error('[SignIn] Could not open the window:', error));
    } else {
      openPanel('signIn', undefined, { focus: true });
    }
  }, [native, openPanel]);

  const closeSignIn = useCallback(() => {
    if (native) {
      setWindowOpen(false);
      invoke('close_sign_in_window').catch((error) => console.error('[SignIn] Could not close the window:', error));
    } else {
      closePanel('signIn');
    }
  }, [native, closePanel]);

  // A closed prompt starts over at the sign-in view; a running browser sign-in keeps going.
  useEffect(() => {
    if (!isOpen) {
      setAccounts(null);
      setSelectedAccount(null);
    }
  }, [isOpen]);

  const signIn = useCallback(async () => {
    setLookingUp(true);
    try {
      const token = await startOAuthFlow();
      if (!token) return;

      const response = await tauriFetch(`${BACKEND_URL}/api/auth/oauth/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      // Auth check failed but tokens are stored — just close
      if (!response.ok) return closeSignIn();

      const data = await response.json();
      const userAccounts: string[] = data?.user?.game?.accounts ?? [];
      console.log('[SignIn] Accounts found:', userAccounts);
      if (userAccounts.length <= 1) {
        if (userAccounts.length === 1) await updateSettings({ account: userAccounts[0] });
        closeSignIn();
      } else {
        // The user is still in the browser: bring the prompt back to the front for the pick
        setAccounts(userAccounts);
        openSignIn();
      }
    } catch (err) {
      console.error('[SignIn] Error during sign-in flow:', err);
    } finally {
      setLookingUp(false);
    }
  }, [startOAuthFlow, updateSettings, closeSignIn, openSignIn]);

  const dispatch = useCallback(
    (action: SignInAction) => {
      switch (action.type) {
        case 'start':
          void signIn();
          break;
        case 'cancel':
          cancelOAuthFlow();
          break;
        case 'later':
          closeSignIn();
          break;
        case 'copyLink':
          // The window's view can't reach the clipboard; Main copies
          if (link) {
            writeText(link.url).then(
              () => setCopiedUrl(link.url),
              (error) => console.warn('[SignIn] Could not copy the sign-in link:', error),
            );
          }
          break;
        case 'select':
          setSelectedAccount(action.account);
          void updateSettings({ account: action.account }).then(closeSignIn);
          break;
      }
    },
    [signIn, closeSignIn, updateSettings, link],
  );

  // The native window: send it the state, take its button presses, notice it closing.
  const stateRef = useRef(state);
  stateRef.current = state;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const sendState = useCallback((s: SignInState) => {
    emitTo(SIGN_IN_WINDOW, SIGN_IN_STATE_EVENT, s).catch((error) =>
      console.warn('[SignIn] Could not update the window:', error),
    );
  }, []);
  useEffect(() => {
    if (!native) return;
    const releases = [
      holdListener(
        listen(SIGN_IN_CLOSED_EVENT, () => setWindowOpen(false)),
        SIGN_IN_CLOSED_EVENT,
      ),
      holdListener(
        listen(SIGN_IN_READY_EVENT, () => sendState(stateRef.current)),
        SIGN_IN_READY_EVENT,
      ),
      holdListener(
        listen<SignInAction>(SIGN_IN_ACTION_EVENT, (e) => dispatchRef.current(e.payload)),
        SIGN_IN_ACTION_EVENT,
      ),
    ];
    return () => releases.forEach((release) => release());
  }, [native, sendState]);
  useEffect(() => {
    if (native && windowOpen) sendState(state);
  }, [native, windowOpen, state, sendState]);

  const value = useMemo(() => ({ openSignIn, isOpen, state, dispatch }), [openSignIn, isOpen, state, dispatch]);
  return <SignInContext.Provider value={value}>{children}</SignInContext.Provider>;
}

export function useSignIn(): SignInContextValue {
  const ctx = useContext(SignInContext);
  if (!ctx) throw new Error('useSignIn must be used inside SignInProvider');
  return ctx;
}

/** The sign-in window's side: Main's state, and a dispatch that reports to Main. */
export function useRemoteSignIn(): { state: SignInState | null; dispatch(action: SignInAction): void } {
  const [state, setState] = useState<SignInState | null>(null);
  useEffect(() => {
    const pending = listen<SignInState>(SIGN_IN_STATE_EVENT, (e) => setState(e.payload));
    // Ask only once listening, or Main's answer could arrive first and be lost
    pending.then(() =>
      emitTo(MAIN_WINDOW, SIGN_IN_READY_EVENT).catch((error) => console.warn('[SignIn] Main unreachable:', error)),
    );
    return holdListener(pending, SIGN_IN_STATE_EVENT);
  }, []);
  const dispatch = useCallback((action: SignInAction) => {
    emitTo(MAIN_WINDOW, SIGN_IN_ACTION_EVENT, action).catch((error) =>
      console.warn('[SignIn] Main unreachable:', error),
    );
  }, []);
  return { state, dispatch };
}
