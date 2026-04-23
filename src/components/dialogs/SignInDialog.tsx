import React, { useEffect } from 'react';
import { listen } from '@/lib/browser-events';
import { isTauri } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

export const SIGN_IN_DIALOG_EVENT = 'pd2:show-sign-in-dialog';

export const SignInDialog: React.FC = () => {
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      unlisten = await listen(SIGN_IN_DIALOG_EVENT, async () => {
        if (!isTauri()) return;

        // Check if sign-in window already open
        const existing = await WebviewWindow.getByLabel('SignIn');
        if (existing) {
          await existing.setFocus();
          return;
        }

        new WebviewWindow('SignIn', {
          url: '/sign-in',
          title: 'PD2 Trader: Sign In',
          width: 380,
          height: 260,
          resizable: false,
          decorations: false,
          transparent: true,
          alwaysOnTop: true,
          center: true,
          skipTaskbar: true,
          focus: true,
        });
      });
    };

    setup();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return null;
};
