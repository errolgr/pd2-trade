import { isTauri } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from 'sonner';
import { resetUpdateNotification } from '@/hooks/useAppUpdates';
import { openUrl } from '@/lib/browser-opener';
import {
  MANUAL_UPDATE_DESCRIPTION,
  RELEASE_PAGE_URL,
  markManualUpdateRequired,
  requiresManualUpdate,
} from '@/lib/manual-update';

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
      const loadingToast = toast.loading('Downloading update...', {
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
            toast.loading(`Downloading update... ${progress}%`, {
              id: loadingToast,
              position: 'bottom-right',
            });
            break;
          }
          case 'Finished':
            toast.success('Update downloaded! Restarting...', {
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
      toast.error('Update must be installed manually', {
        description: MANUAL_UPDATE_DESCRIPTION,
        duration: Infinity,
        position: 'bottom-right',
        action: { label: 'Open Release Page', onClick: () => void openUrl(RELEASE_PAGE_URL) },
      });
      return false;
    }
    console.error('Failed to download/install update:', error);
    toast.error('Failed to download update. Please try again later.', {
      position: 'bottom-right',
    });
    // Reset notification state so user can try again
    resetUpdateNotification();
    return false;
  }
}
