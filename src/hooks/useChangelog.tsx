import { useEffect } from 'react';
import { getVersion } from '@/lib/browser-app';
import { openCenteredWindow } from '@/lib/window';
import { changeLog } from '@/assets/changeLog';
import { useOptions } from './useOptions';

export const useChangelog = () => {
  const { settings, isLoading } = useOptions();

  useEffect(() => {
    if (isLoading) return;

    getVersion().then((version) => {
      if (version && settings.lastSeenVersion !== version && changeLog[version]) {
        openCenteredWindow('ChangeLog', '/change-log', {
          decorations: false,
          transparent: true,
          focus: true,
          shadow: false,
          skipTaskbar: true,
        });
      }
    });
  }, [settings.lastSeenVersion, isLoading]);
};
