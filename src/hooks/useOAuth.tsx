import { useCallback, useSyncExternalStore } from 'react';
import { useOptions } from './useOptions';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { BACKEND_URL, PD2_SCOPES } from '@/lib/pkce';
import { GenericToastPayload } from '@/common/types/Events';
import { showToast } from '@/overlay';

/**
 * The running sign-in flow; a new flow is refused while one is active. Cleared when it ends or is aborted (its
 * caller's signal or cancelOAuthFlow).
 */
let activeFlow: AbortController | null = null;
const flowListeners = new Set<() => void>();

function setActiveFlow(flow: AbortController | null) {
  activeFlow = flow;
  flowListeners.forEach((listener) => listener());
}

/** Ends the running sign-in flow, whoever started it, as if its caller had aborted: a new flow may start right away. */
export function cancelOAuthFlow(): void {
  activeFlow?.abort();
}

/** True while a sign-in flow runs (whoever started it), re-rendering on change. */
export function useOAuthFlowActive(): boolean {
  return useSyncExternalStore(
    (listener) => {
      flowListeners.add(listener);
      return () => flowListeners.delete(listener);
    },
    () => activeFlow !== null,
  );
}

/** Resolves after `ms`, or as soon as `signal` aborts. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  if (signal?.aborted) {
    resolve();
    return promise;
  }
  const done = () => {
    clearTimeout(timer);
    signal?.removeEventListener('abort', done);
    resolve();
  };
  const timer = setTimeout(done, ms);
  signal?.addEventListener('abort', done, { once: true });
  return promise;
}

/** Shown when pd2trader.com refuses a banned account (403 from poll, refresh or /me). */
export const BANNED_MESSAGE = 'This PD2 account is banned from PD2 Trader.';

export function showBannedToast(): void {
  showToast({ title: 'PD2 Trader', description: BANNED_MESSAGE, variant: 'error' });
}

async function pollForTokens(
  state: string,
  signal?: AbortSignal,
  intervalMs = 2000,
  timeoutMs = 10 * 60 * 1000,
): Promise<{ accessToken: string; refreshToken?: string; idToken?: string; expiresIn: number } | 'banned' | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await sleep(intervalMs, signal);
    if (signal?.aborted) return null;

    try {
      const response = await tauriFetch(`${BACKEND_URL}/api/auth/oauth/poll/${state}`);
      if (response.ok) {
        return await response.json();
      }
      // 403 = the server refused the sign-in: the account is banned
      if (response.status === 403) return 'banned';
      // 404 = not ready yet, keep polling
      if (response.status !== 404) {
        console.warn('[OAuth] Unexpected poll response:', response.status);
      }
    } catch {
      // Network error, keep trying
    }
  }

  return null;
}

export function useOAuth() {
  const { updateSettings } = useOptions();

  /**
   * Runs the browser sign-in flow. Aborting `callerSignal` (the caller went away) or cancelOAuthFlow() ends the flow
   * right away: polling stops, nothing is stored or toasted, the result is `false`, and a new flow may start
   * immediately.
   */
  const startOAuthFlow = useCallback(
    async (callerSignal?: AbortSignal): Promise<string | false> => {
      if (activeFlow || callerSignal?.aborted) return false;
      const flow = new AbortController();
      setActiveFlow(flow);
      const { signal } = flow;
      const release = () => {
        if (activeFlow === flow) setActiveFlow(null);
      };
      signal.addEventListener('abort', release, { once: true });
      const abort = () => flow.abort();
      callerSignal?.addEventListener('abort', abort, { once: true });

      // Browser build: open the sign-in tab now, while the click still counts as a user gesture. Opening it
      // after the start request (an await later) gets it silently blocked as a pop-up (Safari, slow Firefox).
      const authTab = isTauri() ? null : window.open('about:blank', '_blank');
      let navigated = false;
      try {
        // 1. Start flow on backend
        const startResponse = await tauriFetch(`${BACKEND_URL}/api/auth/oauth/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scopes: PD2_SCOPES }),
        });

        if (!startResponse.ok) {
          throw new Error(`Failed to start OAuth flow: ${startResponse.status}`);
        }

        const { authUrl, state } = await startResponse.json();
        if (signal.aborted) return false;

        // 2. Open system browser
        if (isTauri()) {
          await invoke('open_oauth_url', { url: authUrl });
        } else if (authTab && !authTab.closed) {
          authTab.opener = null;
          authTab.location.href = authUrl;
          navigated = true;
        } else {
          const tab = window.open(authUrl, '_blank');
          if (!tab) {
            showToast({
              title: 'PD2 Trader',
              description: 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
              variant: 'error',
            });
            return false;
          }
          tab.opener = null;
        }

        // 3. Poll for completion
        const tokens = await pollForTokens(state, signal);
        if (signal.aborted) return false;
        if (tokens === 'banned') {
          showBannedToast();
          return false;
        }
        if (!tokens) {
          const timeoutToast: GenericToastPayload = {
            title: 'PD2 Trader',
            description: 'Login timed out. Please try again.',
            variant: 'warning',
          };
          showToast(timeoutToast);
          return false;
        }

        // 4. Store tokens
        await updateSettings({
          pd2Token: tokens.accessToken,
          pd2RefreshToken: tokens.refreshToken,
          pd2TokenExpiry: Date.now() + tokens.expiresIn * 1000,
        });

        const successToast: GenericToastPayload = {
          title: 'PD2 Trader',
          description: 'Authentication successful!',
        };
        showToast(successToast);
        return tokens.accessToken;
      } catch (error) {
        if (signal.aborted) return false;
        console.error('[OAuth] Flow failed:', error);
        const errorToast: GenericToastPayload = {
          title: 'PD2 Trader',
          description: 'Authentication failed. Please try again.',
          variant: 'error',
        };
        showToast(errorToast);
        return false;
      } finally {
        // A pre-opened tab the flow never sent to PD2 (start failed or cancelled) shouldn't linger blank.
        if (authTab && !navigated && !authTab.closed) authTab.close();
        callerSignal?.removeEventListener('abort', abort);
        release();
      }
    },
    [updateSettings],
  );

  const refreshTokens = useCallback(
    async (refreshToken: string): Promise<boolean> => {
      try {
        const response = await tauriFetch(`${BACKEND_URL}/api/auth/oauth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (response.status === 403) {
          // Banned: the session is over for good, so drop the stored tokens instead of asking to sign in again.
          await updateSettings({ pd2Token: undefined, pd2RefreshToken: undefined, pd2TokenExpiry: undefined });
          showBannedToast();
          return false;
        }
        if (!response.ok) {
          throw new Error(`Token refresh failed: ${response.status}`);
        }

        const tokens = await response.json();
        await updateSettings({
          pd2Token: tokens.accessToken,
          pd2RefreshToken: tokens.refreshToken || refreshToken,
          pd2TokenExpiry: Date.now() + tokens.expiresIn * 1000,
        });

        return true;
      } catch (error) {
        console.error('[OAuth] Token refresh failed:', error);
        return false;
      }
    },
    [updateSettings],
  );

  return { startOAuthFlow, refreshTokens };
}
