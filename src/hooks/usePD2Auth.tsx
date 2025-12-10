import { useEffect } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@/lib/browser-events';
import { jwtDecode } from 'jwt-decode';
import { useOptions } from './useOptions';
import { GenericToastPayload } from '@/common/types/Events';

const openAuthWebview = async () => {
  if (!isTauri()) {
    // In browser, open auth URL in new window
    window.open('https://projectdiablo2.com/auth', '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    await invoke('open_project_diablo2_webview');
  } catch (error) {
    console.error('Failed to open Project Diablo 2 webview:', error);
  }
};

const isTokenExpiringSoon = (token: string): boolean => {
  try {
    const payload: { exp?: number } = jwtDecode(token);
    if (!payload.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    const fiveHours = 5 * 60 * 60;
    return payload.exp < now + fiveHours;
  } catch {
    return true;
  }
};

export const usePD2Auth = () => {
  const { settings, isLoading, updateSettings } = useOptions();

  // Listen for token updates
  useEffect(() => {
    let unlistenPromise: Promise<() => void>;
    
    listen<string>('pd2-token-found', (event) => {
      updateSettings({ pd2Token: event.payload });
      const successToastPayload: GenericToastPayload = {
        title: 'PD2 Trader',
        description: 'Authentication successful!',
      };
      emit('toast-event', successToastPayload);
    }).then((off) => {
      unlistenPromise = Promise.resolve(off);
    });

    return () => {
      if (unlistenPromise) {
        unlistenPromise.then((off) => off());
      }
    };
  }, [updateSettings]);

  // Check token validity and prompt for auth if needed
  useEffect(() => {
    if (isLoading) return;

    if (!settings?.pd2Token) {
      if (isTauri()) {
        // In Tauri, open webview for authentication
        const authRequiredToastPayload: GenericToastPayload = {
          title: 'PD2 Trader',
          description: 'PD2 website authentication required!',
        };
        emit('toast-event', authRequiredToastPayload);
        openAuthWebview();
      } else {
        // In browser, show instructions to enter token manually
        const authRequiredToastPayload: GenericToastPayload = {
          title: 'PD2 Trader - Authentication Required',
          description: 'Please enter your PD2 token in Settings > Account. Get your token from projectdiablo2.com after logging in.',
          variant: 'warning',
        };
        emit('toast-event', authRequiredToastPayload);
      }
      return;
    }

    if (isTokenExpiringSoon(settings.pd2Token)) {
      if (isTauri()) {
        openAuthWebview();
      } else {
        const tokenExpiringToastPayload: GenericToastPayload = {
          title: 'PD2 Trader - Token Expiring',
          description: 'Your token is expiring soon. Please update it in Settings > Account.',
          variant: 'warning',
        };
        emit('toast-event', tokenExpiringToastPayload);
      }
    }
  }, [settings?.pd2Token, isLoading]);
};

