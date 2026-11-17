import { useEffect } from 'react';
import { ToastActionType } from '@/common/types/Events';
import { setToastActionHandler } from '@/overlay';
import { isWtbResponse } from '../lib/wtb';
import { useWtbWhisper } from './useWtbWhisper';

/**
 * A buy request response toast's (and log entry's) Whisper back: copies the whisper back to the seller and keeps it
 * in Chat. The toast layer sits above the whisper history, so the handler is installed from below it. Mounted once,
 * in AppController.
 */
export function useWtbResponseActions(): void {
  const { whisperBack } = useWtbWhisper('alert');
  useEffect(() => {
    setToastActionHandler(ToastActionType.WTB_WHISPER_BACK, (data) => {
      if (isWtbResponse(data)) void whisperBack(data);
    });
    return () => setToastActionHandler(ToastActionType.WTB_WHISPER_BACK, null);
  }, [whisperBack]);
}
