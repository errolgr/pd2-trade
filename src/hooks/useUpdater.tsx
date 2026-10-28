// hooks/useUpdater.ts
import { useCallback, useState } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useDialog } from '@/hooks/useDialog';
import { Progress } from '@/components/ui/progress';
import { AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import React from 'react';
import { t } from '@/i18n';

export function useUpdater() {
  const { openDialog, closeDialog } = useDialog();
  const [progress, setProgress] = useState(0);
  const [isUpdating, setIsUpdating] = useState(true);

  const openDownloadDialog = (currentProgress: number) => {
    openDialog(
      <div className="flex flex-col gap-4">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">{t('system:updates.dialogTitle')}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {t('system:updates.dialogDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Progress value={currentProgress} />
      </div>,
    );
  };

  // Stable identity: useAppUpdates' periodic-check interval depends on it and would reset every render otherwise
  const checkForUpdates = useCallback(async (): Promise<Update> => check(), []);

  // Function to download and install the update.
  // It uses the update object stored in state.
  const downloadUpdate = async (updateInfo: Update | null) => {
    if (!updateInfo) {
      console.warn('No update available to download.');
      return;
    }

    openDownloadDialog(progress);
    let downloaded = 0;
    let contentLength = 0;

    // Start the download, update progress, and refresh the dialog accordingly.
    await updateInfo.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength ?? 0;
          break;
        case 'Progress': {
          downloaded += event.data.chunkLength;
          const newProgress = contentLength ? Math.min(100, Math.floor((downloaded / contentLength) * 100)) : 0;
          setProgress(newProgress);
          openDownloadDialog(newProgress);
          break;
        }
        case 'Finished':
          setProgress(100);
          closeDialog();
          setIsUpdating(false);
          break;
      }
    });

    await relaunch();
  };

  return { checkForUpdates, downloadUpdate, progress, isUpdating };
}
