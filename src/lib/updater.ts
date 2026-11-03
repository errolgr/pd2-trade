import { t } from '@/i18n';
import { isTauri } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from 'sonner';
import { resetUpdateNotification } from '@/hooks/useAppUpdates';
import { openUrl } from '@/lib/browser-opener';
import {
  manualUpdateDescription,
  RELEASE_PAGE_URL,
  markManualUpdateRequired,
  requiresManualUpdate,
} from '@/lib/manual-update';
import { isNetworkError } from '@/lib/network-errors';

// "Download & Restart" action: install the pending update (if any) and restart the app.
// Resolves false when the install failed (the app keeps running); windows without a Toaster use it for feedback.
export async function installUpdateAndRelaunch(): Promise<boolean> {
  if (!isTauri()) {
    // In browser, just reload the page
    window.location.reload();
    return true;
  }

  try {
    const update = await check();
    if (update?.available) {
      const loadingToast = toast.loading(t('system:updates.downloading'), {
        position: 'bottom-right',
      });

      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0;
            break;
          case 'Progress': {
            downloaded += event.data.chunkLength;
            const progress = contentLength ? Math.min(100, Math.floor((downloaded / contentLength) * 100)) : 0;
            toast.loading(t('system:updates.downloadingProgress', { progress }), {
              id: loadingToast,
              position: 'bottom-right',
            });
            break;
          }
          case 'Finished':
            toast.success(t('system:updates.downloaded'), {
              id: loadingToast,
              position: 'bottom-right',
            });
            break;
        }
      });
    }

    // Relaunch after a successful install, or directly when no update is pending
    await relaunch();
    return true;
  } catch (error) {
    if (requiresManualUpdate(error)) {
      // Expected for Linux deb/rpm installs: retrying can't help, so link the release page instead of reporting it
      console.warn('Update must be installed manually:', error);
      markManualUpdateRequired();
      toast.error(t('system:updates.manualRequired'), {
        description: manualUpdateDescription(),
        duration: Infinity,
        position: 'bottom-right',
        action: { label: t('system:updates.openReleasePage'), onClick: () => void openUrl(RELEASE_PAGE_URL) },
      });
      return false;
    }
    // Offline / GitHub unreachable is the user's network, not an app bug: same toast, no error report
    if (isNetworkError(error)) console.warn('Could not download update:', error);
    else console.error('Failed to download/install update:', error);
    toast.error(t('system:updates.downloadFailed'), {
      position: 'bottom-right',
    });
    // Reset notification state so user can try again
    resetUpdateNotification();
    return false;
  }
}
