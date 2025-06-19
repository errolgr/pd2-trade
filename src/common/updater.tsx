import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import React, {useEffect, useState} from "react";
import {useDialog} from "@/hooks/useDialog";
import {Progress} from "@/components/ui/progress";
import {AlertDialogDescription, AlertDialogHeader, AlertDialogTitle} from "@/components/ui/alert-dialog";


export function Updater() {
  const { openDialog, closeDialog } = useDialog();
  const [progress, setProgress] = useState(0);

  // Open the dialog as soon as the updater mounts.
  useEffect(() => {
    checkForUpdates();
  }, []);

  // Opens or updates the dialog with the current progress.
  const openDownloadDialog = (currentProgress: number) => {
    openDialog(
      <div className={'flex flex-col gap-4'}>
        <AlertDialogHeader>
          <AlertDialogTitle className={'text-center'}>Downloading Update</AlertDialogTitle>
          <AlertDialogDescription className={'text-center'}>Please wait while the update is being downloaded.</AlertDialogDescription>
        </AlertDialogHeader>
        <Progress value={currentProgress} />
      </div>,
    );
  };

  const checkForUpdates = async () => {
    const update = await check();
    if (update) {
      openDownloadDialog(progress);
      let downloaded = 0;
      let contentLength = 0;

      // Start the download. In each progress event, update state and refresh the dialog.
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            // Calculate progress percentage.
            const newProgress = Math.min(
              100,
              Math.floor((downloaded / contentLength) * 100)
            );
            setProgress(newProgress);
            // Update the dialog content with the new progress.
            openDownloadDialog(newProgress);
            break;
          case 'Finished':
            setProgress(100);
            closeDialog();
            break;
        }
      });

      await relaunch();
    }
  };

  return null;
}