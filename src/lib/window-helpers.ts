import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

/**
 * Toggles the visibility of a window. If visible, hides it. If hidden, shows and focuses it.
 */
export async function toggleWindowVisibility(winRef: React.MutableRefObject<any>) {
  if (!winRef.current) return false;

  try {
    const isVisible = await winRef.current.isVisible();
    if (isVisible) {
      await winRef.current.hide();
      return false; // Hidden
    } else {
      await winRef.current.show();
      await winRef.current.setFocus();
      return true; // Shown
    }
  } catch (error) {
    console.error('Error toggling window visibility:', error);
    return false;
  }
}

/**
 * Helper to attach a close listener that clears the ref.
 */
export function attachRefClearOnClose(win: WebviewWindow | any, ref: React.MutableRefObject<any>) {
  if (win && 'onCloseRequested' in win) {
    win.onCloseRequested(async () => {
      ref.current = null;
    });
  }
}
