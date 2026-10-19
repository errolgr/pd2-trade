import { useEffect } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getVersion } from '@/lib/browser-app';
import { openCenteredWindow } from '@/lib/window';
import { WindowLabels } from '@/lib/window-titles';
import { changeLog } from '@/assets/changeLog';
import { useOptions, type ISettings } from './useOptions';

/** Pause between sign-in completing and What's New opening, so the two windows never overlap. */
export const CHANGELOG_DELAY_MS = 1500;

/** Signed in with a token that hasn't expired; an expired one is being refreshed or needs a new sign-in. */
function hasSession(settings: ISettings): boolean {
  if (!settings.pd2Token) return false;
  return !settings.pd2TokenExpiry || settings.pd2TokenExpiry > Date.now();
}

/** Resolves once the sign-in window is gone (immediately if it isn't open). */
async function signInWindowClosed(): Promise<void> {
  if (!isTauri()) return;
  const win = await WebviewWindow.getByLabel(WindowLabels.SignIn);
  if (!win) return;
  await new Promise<void>((resolve) => {
    win.once('tauri://destroyed', () => resolve());
    // It may have closed between the lookup and the subscription
    WebviewWindow.getByLabel(WindowLabels.SignIn).then((stillOpen) => {
      if (!stillOpen) resolve();
    });
  });
}

/**
 * Opens What's New after an upgrade, but only once the user is signed in and the sign-in window
 * has closed, so it never competes with the sign-in prompt at startup.
 */
export const useChangelog = () => {
  const { settings, isLoading } = useOptions();
  const signedIn = !isLoading && hasSession(settings);

  useEffect(() => {
    if (!signedIn) return;

    let cancelled = false;
    let timer: number | undefined;

    (async () => {
      const version = await getVersion();
      if (cancelled || !version || settings.lastSeenVersion === version || !changeLog[version]) return;

      // Multi-account sign-in keeps its window open (account picker) after the token is stored
      await signInWindowClosed();
      if (cancelled) return;

      timer = window.setTimeout(() => {
        if (cancelled) return;
        openCenteredWindow('ChangeLog', '/change-log', {
          decorations: false,
          transparent: true,
          focus: true,
          shadow: false,
          skipTaskbar: true,
        });
      }, CHANGELOG_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [signedIn, settings.lastSeenVersion]);
};
