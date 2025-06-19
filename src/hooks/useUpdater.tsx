// hooks/useUpdater.ts
import { useState } from 'react';
import {check, Update} from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useDialog } from '@/hooks/useDialog';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import React from 'react';


export function useUpdater() {
  const { openDialog, closeDialog } = useDialog();
  const [progress, setProgress] = useState(0);
  const [isUpdating, setIsUpdating] = useState(true);

  const openDownloadDialog = (currentProgress: number) => {
    openDialog(
      <div className="flex flex-col gap-4">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">
            Downloading Update
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Please wait while the update is being downloaded.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Progress value={currentProgress} />
      </div>
    );
  };

  const checkForUpdates = async (): Promise<Update> => {
    const update = await check();
    return update;
  };

  // Function to download and install the update.
  // It uses the update object stored in state.
  const downloadUpdate = async (updateInfo) => {
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
          contentLength = event.data.contentLength;
          break;
        case 'Progress':
          downloaded += event.data.chunkLength;
          const newProgress = Math.min(
            100,
            Math.floor((downloaded / contentLength) * 100)
          );
          setProgress(newProgress);
          openDownloadDialog(newProgress);
          break;
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
