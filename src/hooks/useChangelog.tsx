import { useEffect } from 'react';
import { getVersion } from '@/lib/browser-app';
import { changeLog } from '@/assets/changeLog';
import { useOptions } from './useOptions';
import { useViewManager, VIEW_IDS } from '@/hooks/useViewManager';

export const useChangelog = () => {
  const { settings, isLoading } = useOptions();
  const { showView } = useViewManager();

  useEffect(() => {
    if (isLoading) return;

    getVersion().then((version) => {
      if (version && settings.lastSeenVersion !== version && changeLog[version]) {
        showView(VIEW_IDS.CHANGELOG, {
          position: 'centered',
        });
      }
    });
  }, [settings.lastSeenVersion, isLoading, showView]);
};
