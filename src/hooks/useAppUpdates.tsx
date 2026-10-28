import { t } from '@/i18n';
import { useEffect, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { useUpdater } from './useUpdater';
import { useOptions } from './useOptions';
import { CustomToastPayload, ToastActionType } from '@/common/types/Events';
import { showToast } from '@/overlay';
import {
  isManualUpdateRequired,
  manualUpdateToast,
  markManualUpdateRequired,
  requiresManualUpdate,
} from '@/lib/manual-update';
import { isNetworkError } from '@/lib/network-errors';

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
  const { settings, isLoading } = useOptions();
  const isProcessingRef = useRef(false);
  const hasAutoDownloadedRef = useRef(false);
  const autoUpdateEnabledRef = useRef(true);
  autoUpdateEnabledRef.current = settings.autoUpdateEnabled ?? true;

  // Initial auto-download on startup; waits for settings so an opt-out is honoured
  useEffect(() => {
    if (!isTauri() || isLoading) return;

    const autoDownload = async () => {
      // Prevent concurrent checks
      if (isProcessingRef.current || hasAutoDownloadedRef.current) {
        return;
      }

      // One-shot startup decision: opted-out users only get the periodic "Update Available" toast,
      // and re-enabling mid-session must not trigger a surprise download + restart.
      if (!autoUpdateEnabledRef.current) {
        hasAutoDownloadedRef.current = true;
        return;
      }

      // One attempt per session, success or not: this effect re-runs on re-renders, and re-arming it after a failure
      // retried (and re-reported) the same failure every time. The periodic check below keeps notifying.
      try {
        isProcessingRef.current = true;
        hasAutoDownloadedRef.current = true;
        let update;
        try {
          update = await checkForUpdates();
        } catch (error) {
          // GitHub unreachable / bad release JSON is a network condition, not an app bug
          console.warn('Error checking for updates:', error);
          return;
        }

        if (update?.available) {
          // Auto-download on startup; download/install/relaunch failures are real bugs, keep reporting them
          try {
            await downloadUpdate(update);
          } catch (error) {
            if (isNetworkError(error)) {
              // Offline or GitHub refused/broke off the download: the periodic check still offers the update
              console.warn('Could not download update:', error);
              return;
            }
            if (!requiresManualUpdate(error)) throw error;
            // Expected for Linux deb/rpm installs: point the user at the release page once; no retry, no error report
            console.warn('Update must be installed manually:', error);
            markManualUpdateRequired();
            hasNotified = true;
            notifiedVersion = update.version;
            showToast(manualUpdateToast(update.version));
          }
        }
      } catch (error) {
        console.error('Error auto-downloading update:', error);
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Initial auto-download after a short delay to avoid startup conflicts
    const initialTimeout = setTimeout(autoDownload, 2000);

    return () => {
      clearTimeout(initialTimeout);
    };
  }, [isLoading, checkForUpdates, downloadUpdate]);

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

            const updateToastPayload: CustomToastPayload = isManualUpdateRequired()
              ? manualUpdateToast(update.version)
              : {
                  title: t('system:updates.availableTitle'),
                  description: t('system:updates.availableDescription', { version: update.version }),
                  action: {
                    label: t('system:updates.downloadAndRestart'),
                    type: ToastActionType.UPDATE_AVAILABLE,
                    data: {
                      version: update.version,
                    },
                  },
                };
            showToast(updateToastPayload);
          }
        } else {
          // No update available, reset flags for next update
          hasNotified = false;
          notifiedVersion = null;
        }
      } catch (error) {
        console.warn('Error checking for updates:', error);
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
