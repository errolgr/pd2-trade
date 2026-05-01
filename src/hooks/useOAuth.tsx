import { useCallback } from 'react';
import { useOptions } from './useOptions';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { emit } from '@/lib/browser-events';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { BACKEND_URL, PD2_SCOPES } from '@/lib/pkce';
import { GenericToastPayload } from '@/common/types/Events';

let flowInProgress = false;

async function pollForTokens(
  state: string,
  intervalMs = 2000,
  timeoutMs = 10 * 60 * 1000,
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number } | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    try {
      const response = await tauriFetch(`${BACKEND_URL}/api/auth/oauth/poll/${state}`);
      if (response.ok) {
        return await response.json();
      }
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

  const startOAuthFlow = useCallback(async (): Promise<string | false> => {
    if (flowInProgress) return false;
    flowInProgress = true;

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

      // 2. Open system browser
      if (isTauri()) {
        await invoke('open_oauth_url', { url: authUrl });
      } else {
        window.open(authUrl, '_blank', 'noopener,noreferrer');
      }

      // 3. Poll for completion
      const tokens = await pollForTokens(state);
      if (!tokens) {
        const timeoutToast: GenericToastPayload = {
          title: 'PD2 Trader',
          description: 'Login timed out. Please try again.',
          variant: 'warning',
        };
        emit('toast-event', timeoutToast);
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
      emit('toast-event', successToast);
      return tokens.accessToken;
    } catch (error) {
      console.error('[OAuth] Flow failed:', error);
      const errorToast: GenericToastPayload = {
        title: 'PD2 Trader',
        description: 'Authentication failed. Please try again.',
        variant: 'error',
      };
      emit('toast-event', errorToast);
      return false;
    } finally {
      flowInProgress = false;
    }
  }, [updateSettings]);

  const refreshTokens = useCallback(
    async (refreshToken: string): Promise<boolean> => {
      try {
        const response = await tauriFetch(`${BACKEND_URL}/api/auth/oauth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

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
