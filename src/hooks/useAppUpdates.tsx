import { useEffect } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { emit } from '@/lib/browser-events';
import { useUpdater } from './useUpdater';
import { CustomToastPayload, ToastActionType } from '@/common/types/Events';

export const useAppUpdates = () => {
  const { checkForUpdates, downloadUpdate } = useUpdater();

  // Initial update check
  useEffect(() => {
    if (!isTauri()) return;
    
    checkForUpdates().then((update) => {
      if (update?.available) {
        downloadUpdate(update);
      }
    });
  }, []);

  // Periodic update checks
  useEffect(() => {
    if (!isTauri()) return;
    
    let updateNotified = false;

    const checkAndNotify = async () => {
      const update = await checkForUpdates();
      if (update?.available && !updateNotified) {
        updateNotified = true;
        const updateToastPayload: CustomToastPayload = {
          title: 'PD2 Trader - Update Available',
          description: 'A new update is ready. Click to restart and apply it.',
          action: {
            label: 'Restart Now',
            type: ToastActionType.UPDATE_AVAILABLE,
            data: {},
          },
        };
        await emit('toast-event', updateToastPayload);
      }
    };

    checkAndNotify();
    const interval = setInterval(checkAndNotify, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [checkForUpdates]);
};

