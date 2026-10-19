import { useEffect } from 'react';
import { getVersion } from '@/lib/browser-app';
import { useOverlay } from '@/overlay';
import { changeLog } from '@/assets/changeLog';
import { useOptions } from './useOptions';

export const useChangelog = () => {
  const { settings, isLoading } = useOptions();
  const { openPanel } = useOverlay();

  useEffect(() => {
    if (isLoading) return;

    getVersion().then((version) => {
      if (version && settings.lastSeenVersion !== version && changeLog[version]) {
        openPanel('changeLog');
      }
    });
  }, [settings.lastSeenVersion, isLoading, openPanel]);
};
