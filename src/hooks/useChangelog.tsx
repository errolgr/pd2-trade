import { useEffect } from 'react';
import { getVersion } from '@/lib/browser-app';
import { useOverlay, usePanelOpen } from '@/overlay';
import { changeLog } from '@/assets/changeLog';
import { useOptions, type ISettings } from './useOptions';

/** Pause between sign-in completing and What's New opening, so the two panels never overlap. */
export const CHANGELOG_DELAY_MS = 1500;

/** Signed in with a token that hasn't expired; an expired one is being refreshed or needs a new sign-in. */
function hasSession(settings: ISettings): boolean {
  if (!settings.pd2Token) return false;
  return !settings.pd2TokenExpiry || settings.pd2TokenExpiry > Date.now();
}

/**
 * Opens What's New after an upgrade, but only once the user is signed in and the sign-in panel is closed
 * (multi-account sign-in keeps it open for the account picker after the token is stored), so it never
 * competes with the sign-in prompt at startup.
 */
export const useChangelog = () => {
  const { settings, isLoading } = useOptions();
  const { openPanel } = useOverlay();
  const signInOpen = usePanelOpen('signIn');
  const ready = !isLoading && hasSession(settings) && !signInOpen;

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    let timer: number | undefined;

    getVersion().then((version) => {
      if (cancelled || !version || settings.lastSeenVersion === version || !changeLog[version]) return;
      timer = window.setTimeout(() => {
        if (!cancelled) openPanel('changeLog');
      }, CHANGELOG_DELAY_MS);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ready, settings.lastSeenVersion, openPanel]);
};
