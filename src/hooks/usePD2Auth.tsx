import { useEffect, useRef } from 'react';
import { useOptions } from './useOptions';
import { useOAuth } from './useOAuth';
import { useSignIn } from './useSignIn';

export const usePD2Auth = () => {
  const { settings, isLoading } = useOptions();
  const { refreshTokens } = useOAuth();
  const refreshAttemptedRef = useRef(false);
  const { openSignIn } = useSignIn();

  // Auto-refresh token when expiring within 5 minutes, or prompt sign-in if no token
  useEffect(() => {
    if (isLoading) return;

    if (!settings?.pd2Token) {
      openSignIn();
      return;
    }

    const expiresAt = settings.pd2TokenExpiry;
    if (!expiresAt) return;

    const fiveMinutes = 5 * 60 * 1000;
    const timeUntilRefresh = expiresAt - Date.now() - fiveMinutes;

    if (timeUntilRefresh <= 0 && settings.pd2RefreshToken && !refreshAttemptedRef.current) {
      // Token expiring soon or already expired, try refresh
      refreshAttemptedRef.current = true;
      refreshTokens(settings.pd2RefreshToken).then((success) => {
        if (!success) {
          openSignIn();
        }
        refreshAttemptedRef.current = false;
      });
      return;
    }

    if (timeUntilRefresh > 0 && settings.pd2RefreshToken) {
      // Schedule refresh before expiry
      const timer = setTimeout(() => {
        if (settings.pd2RefreshToken) {
          refreshTokens(settings.pd2RefreshToken).then((success) => {
            if (!success) {
              openSignIn();
            }
          });
        }
      }, timeUntilRefresh);

      return () => clearTimeout(timer);
    }
  }, [settings?.pd2Token, settings?.pd2TokenExpiry, settings?.pd2RefreshToken, isLoading, refreshTokens, openSignIn]);
};
