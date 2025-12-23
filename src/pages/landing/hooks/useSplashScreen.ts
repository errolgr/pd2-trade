import { useState, useEffect } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit } from '@/lib/browser-events';
import { sleep } from '@/lib/item-utils';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { WindowTitles } from '@/lib/window-titles';

export const useSplashScreen = () => {
  const [showTitle, setShowTitle] = useState(true);

  // Set Main Window Title
  useEffect(() => {
    if (isTauri()) {
      WebviewWindow.getCurrent().setTitle(WindowTitles.PREFIX);
    }
  }, []);

  // Hide launch title after 2 seconds
  useEffect(() => {
    const timer = setTimeout(async () => {
      setShowTitle(false);

      // Give React/Browser a moment to paint the removal of the image (which creates the ghost)
      await sleep(50);

      try {
        // Linux/AppImage Compositor Fix: "Kick" the window to force a repaint
        // Transparent windows can sometimes leave "ghost" images if the compositor
        // doesn't realize the surface needs updating after a DOM change.
        if (isTauri()) {
          const win = WebviewWindow.getCurrent();
          const size = await win.innerSize();
          await win.setSize(new LogicalSize(size.width + 1, size.height));
          // Small delay to ensure the compositor processes the new size frame
          await sleep(50);
          await win.setSize(new LogicalSize(size.width, size.height));
        }

        console.log('[LandingPage] Hiding launch title and emitting toast...');
        await emit('toast-event', 'is now running in the background...');
      } catch (error) {
        console.error('[LandingPage] Failed to emit launch toast or kick compositor:', error);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return { showTitle };
};
