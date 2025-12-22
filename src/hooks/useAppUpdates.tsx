import { useEffect, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { emit } from '@/lib/browser-events';
import { useUpdater } from './useUpdater';
import { CustomToastPayload, ToastActionType } from '@/common/types/Events';

// Track update state globally to prevent duplicate notifications
let hasNotified = false;
let notifiedVersion: string | null = null;

// Export function to reset notification state (for error recovery)
export const resetUpdateNotification = () => {
  hasNotified = false;
  notifiedVersion = null;
};

export const useAppUpdates = () => {
  const { checkForUpdates, downloadUpdate } = useUpdater();
  const isProcessingRef = useRef(false);
  const hasAutoDownloadedRef = useRef(false);

  // Initial auto-download on startup
  useEffect(() => {
    if (!isTauri()) return;

    const autoDownload = async () => {
      // Prevent concurrent checks
      if (isProcessingRef.current || hasAutoDownloadedRef.current) {
        return;
      }

      try {
        isProcessingRef.current = true;
        hasAutoDownloadedRef.current = true;
        const update = await checkForUpdates();

        if (update?.available) {
          // Auto-download on startup
          await downloadUpdate(update);
        }
      } catch (error) {
        console.error('Error auto-downloading update:', error);
        // Reset flag on error so periodic checks can still notify
        hasAutoDownloadedRef.current = false;
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Initial auto-download after a short delay to avoid startup conflicts
    const initialTimeout = setTimeout(autoDownload, 2000);

    return () => {
      clearTimeout(initialTimeout);
    };
  }, [checkForUpdates, downloadUpdate]);

  // Periodic update checks for notifications
  useEffect(() => {
    if (!isTauri()) return;

    const checkAndNotify = async () => {
      // Prevent concurrent checks
      if (isProcessingRef.current) {
        return;
      }

      try {
        isProcessingRef.current = true;
        const update = await checkForUpdates();

        if (update?.available) {
          // Only notify if we haven't notified for this version yet
          // This prevents spam if the same update is still available
          if (!hasNotified || notifiedVersion !== update.version) {
            hasNotified = true;
            notifiedVersion = update.version;

            const updateToastPayload: CustomToastPayload = {
              title: 'PD2 Trader - Update Available',
              description: `Version ${update.version} is available. Click to download and restart.`,
              action: {
                label: 'Download & Restart',
                type: ToastActionType.UPDATE_AVAILABLE,
                data: {
                  version: update.version,
                },
              },
            };
            await emit('toast-event', updateToastPayload);
          }
        } else {
          // No update available, reset flags for next update
          hasNotified = false;
          notifiedVersion = null;
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      } finally {
        isProcessingRef.current = false;
      }
    };

    let interval: NodeJS.Timeout | null = null;

    // Start periodic checks after initial auto-download delay (5 seconds)
    const initialTimeout = setTimeout(() => {
      checkAndNotify();
      // Periodic checks every 5 minutes
      interval = setInterval(checkAndNotify, 5 * 60 * 1000);
    }, 5000);

    return () => {
      clearTimeout(initialTimeout);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [checkForUpdates]);
};
