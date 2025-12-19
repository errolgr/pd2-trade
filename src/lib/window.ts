import { isTauri } from '@tauri-apps/api/core';
import { WindowOptions, currentMonitor, cursorPosition } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { invoke } from '@tauri-apps/api/core';
import * as browserWindow from './browser-window';
import { WebviewOptions } from '@tauri-apps/api/webview';
import { PhysicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
import { saveWindowState, StateFlags } from '@tauri-apps/plugin-window-state';

// Re-export browser window types
export type BrowserWindow = browserWindow.BrowserWindow;

type DiabloRect = { x: number; y: number; width: number; height: number };

/**
 * Retry getting Diablo window rect with exponential backoff
 */
export async function getDiabloRectWithRetry(maxRetries = 5, delayMs = 200): Promise<DiabloRect | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rect = await invoke<DiabloRect | null>('get_diablo_rect');
    if (rect) {
      return rect;
    }

    if (attempt < maxRetries - 1) {
      // Wait before retrying, with exponential backoff
      const waitTime = delayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  return null;
}

/**
 * Opens a centered window - uses Tauri in Tauri environment, browser window.open in browser
 */
export async function openCenteredWindow(
  label: string,
  url: string,
  options: Partial<WebviewOptions & WindowOptions> = {},
): Promise<WebviewWindow | browserWindow.BrowserWindow | null> {
  if (isTauri()) {
    const monitor = await currentMonitor();
    if (!monitor) return null;

    const width = options.width ?? 600;
    const height = options.height ?? 600;

    const { position, size } = monitor;
    const x = position.x + Math.round((size.width - width) / 2);
    const y = position.y + Math.round((size.height - height) / 2);

    const w = new WebviewWindow(label, {
      url,
      focus: true,
      ...options,
      x,
      y,
      width,
      height,
    });

    attachSaveBehavior(w);

    return w;
  }

  // Browser fallback
  return browserWindow.openCenteredWindow(label, url, options);
}

/**
 * Opens a window over Diablo - uses Tauri in Tauri environment, browser window.open in browser
 */
export async function openOverDiabloWindow(
  label: string,
  url: string,
  options: Partial<WebviewOptions & WindowOptions> = {},
): Promise<WebviewWindow | browserWindow.BrowserWindow | null> {
  if (isTauri()) {
    // const { x: cursorX } = await cursorPosition(); // Unused
    const rect = await getDiabloRectWithRetry();

    if (!rect) {
      console.warn('[window] Diablo window rect not found after retries, falling back to centered window');
      return openCenteredWindow(label, url, options);
    }

    const scaleFactor = await currentMonitor().then((m) => m?.scaleFactor || 1);

    // Backend returns physical pixels, we need logical for window creation
    const logicalRect = {
      x: Math.round(rect.x / scaleFactor),
      y: Math.round(rect.y / scaleFactor),
      width: Math.round(rect.width / scaleFactor),
      height: Math.round(rect.height / scaleFactor),
    };

    const width = options.width ?? 500;
    const x = logicalRect.x + logicalRect.width - width; // Align right edge
    const y = logicalRect.y;

    const w = new WebviewWindow(label, {
      url,
      focus: true,
      ...options,
      x,
      y,
      width,
      height: logicalRect.height,
    });

    attachSaveBehavior(w);

    return w;
  }

  // Browser fallback
  return browserWindow.openOverDiabloWindow(label, url, options);
}

/**
 * Opens a window at cursor - uses Tauri in Tauri environment, browser window.open in browser
 */
export async function openWindowAtCursor(
  label: string,
  url: string,
  options: Partial<WebviewOptions & WindowOptions> = {},
): Promise<WebviewWindow | browserWindow.BrowserWindow | null> {
  if (isTauri()) {
    const { x: cursorX, y: cursorY } = await cursorPosition();
    const width = options.width ?? 600;
    const height = options.height ?? 600;

    const w = new WebviewWindow(label, {
      url,
      focus: true,
      ...options,
      x: cursorX,
      y: cursorY,
      width,
      height,
    });

    attachSaveBehavior(w);

    return w;
  }

  // Browser fallback
  return browserWindow.openWindowAtCursor(label, url, options);
}

/**
 * Opens a window centered on the Diablo screen - uses Tauri in Tauri environment, browser window.open in browser
 */
export async function openWindowCenteredOnDiablo(
  label: string,
  url: string,
  options: Partial<WebviewOptions & WindowOptions> = {},
): Promise<WebviewWindow | browserWindow.BrowserWindow | null> {
  if (isTauri()) {
    const rect = await getDiabloRectWithRetry();

    if (!rect) {
      console.warn('[window] Diablo window rect not found after retries, falling back to centered window');
      return openCenteredWindow(label, url, options);
    }

    const scaleFactor = await currentMonitor().then((m) => m?.scaleFactor || 1);

    const logicalRect = {
      x: Math.round(rect.x / scaleFactor),
      y: Math.round(rect.y / scaleFactor),
      width: Math.round(rect.width / scaleFactor),
      height: Math.round(rect.height / scaleFactor),
    };

    const windowWidth = options.width ?? 600;
    const windowHeight = options.height ?? 600;
    const x = logicalRect.x + (logicalRect.width - windowWidth) / 2;
    const y = logicalRect.y + (logicalRect.height - windowHeight) / 2;

    const w = new WebviewWindow(label, {
      url,
      focus: true,
      ...options,
      x,
      y,
      width: windowWidth,
      height: windowHeight,
    });

    attachSaveBehavior(w);

    return w;
  }

  // Browser fallback - use centered window
  return browserWindow.openCenteredWindow(label, url, options);
}

/**
 * Attach window lifecycle handlers - works with both Tauri and browser windows
 */
/**
 * Internal helper to attach save-on-close behavior with sanitization
 */
function attachSaveBehavior(w: WebviewWindow) {
  let isClosing = false;
  w.onCloseRequested(async (event) => {
    if (isClosing) return;
    event.preventDefault();
    isClosing = true;

    try {
      // Sanitize window bounds before saving to prevent Linux integer overflow bug
      if (isTauri()) {
        try {
          const size = await w.outerSize();
          const pos = await w.outerPosition();
          if (size.width > 10000 || size.height > 10000 || Math.abs(pos.x) > 50000 || Math.abs(pos.y) > 50000) {
            console.warn(
              '[window] Validating bounds before save: detected invalid dimensions, resetting...',
              size,
              pos,
            );
            await w.setSize(new PhysicalSize(800, 600));
            await w.setPosition(new PhysicalPosition(100, 100));
          }
        } catch (err) {
          console.warn('[window] Failed to validate bounds:', err);
        }
      }

      console.log('[window] saving window state...');
      await saveWindowState(StateFlags.ALL);
      console.log('[window] window state saved.');
    } catch (e) {
      console.error('[window] Failed to manually save window state on close:', e);
    }

    // We don't call onClose() here because this helper is for the generic window creation
    // The specific attachWindowLifecycle below will handle its own onClose callback

    w.close();
  });
}

/**
 * Attach window lifecycle handlers - works with both Tauri and browser windows
 */
export function attachWindowLifecycle(w: WebviewWindow | browserWindow.BrowserWindow, onClose: () => void) {
  if (isTauri() && 'onCloseRequested' in w) {
    // Tauri window
    // We attach a specific listener for the "Close on Blur" logic + Callback
    // The Save logic is attached separately or effectively duplicated if we reuse the helper?
    // If we call attachSaveBehavior(w), it attaches a listener.
    // If we ALSO attach a listener here for onClose(), they both run.
    // But both might try to preventDefault?
    // Doing it separately is risky.

    // Since this function is UNUSED, I will leave it as is (or minimal fix)
    // and rely on the open* functions using attachSaveBehavior.

    // But wait, if I use attachSaveBehavior below in open*, then this function (if used) would add a second listener.
    // Tauri allows multiple listeners.
    // Both receive the event.
    // If attachSaveBehavior calls w.close(), it triggers them again.

    // Let's just update open* functions to call attachSaveBehavior.
    // And leave this function mostly alone (revert to simple version + save) or similar.

    // Reverting this to simple version with manual save just in case
    (w as WebviewWindow).onCloseRequested(async () => {
      try {
        await saveWindowState(StateFlags.ALL);
      } catch {
        // Ignore manual save errors in this legacy handler
      }
      onClose();
    });

    (w as WebviewWindow).onFocusChanged((event: any) => {
      if (!event.payload) {
        (w as WebviewWindow).close();
        onClose();
      }
    });
  } else {
    // Browser window
    browserWindow.attachWindowLifecycle(w as browserWindow.BrowserWindow, onClose);
  }
}

/**
 * Attach window close handler with focus loss handling - works with both Tauri and browser windows
 */
export function attachWindowCloseHandler(
  w: WebviewWindow | browserWindow.BrowserWindow,
  onClose: () => void,
  onFocusLost?: () => void,
) {
  if (isTauri() && 'onCloseRequested' in w) {
    // Tauri window
    (w as WebviewWindow).onCloseRequested(() => {
      onClose();
    });

    let focusLossTimeout: ReturnType<typeof setTimeout> | null = null;

    (w as WebviewWindow).onFocusChanged((event: any) => {
      if (!event.payload) {
        focusLossTimeout = setTimeout(() => {
          (w as WebviewWindow).hide();

          if (onFocusLost) {
            onFocusLost();
          }
          focusLossTimeout = null;
        }, 150);
      } else {
        if (focusLossTimeout) {
          clearTimeout(focusLossTimeout);
          focusLossTimeout = null;
        }
      }
    });
  } else {
    // Browser window
    browserWindow.attachWindowCloseHandler(w as browserWindow.BrowserWindow, onClose, onFocusLost);
  }
}

/**
 * Update main window bounds - no-op in browser
 */
export async function updateMainWindowBounds(): Promise<void> {
  if (isTauri()) {
    await invoke('update_window_bounds');
  } else {
    // No-op in browser
    await browserWindow.updateMainWindowBounds();
  }
}

/**
 * Calculates logical rect from physical X11 rect given scale factor
 */
export function getLogicalRect(rect: DiabloRect, scaleFactor: number) {
  return {
    x: Math.round(rect.x / scaleFactor),
    y: Math.round(rect.y / scaleFactor),
    width: Math.round(rect.width / scaleFactor),
    height: Math.round(rect.height / scaleFactor),
  };
}

/**
 * Updates a specific window to match the Diablo bounds (DPI aware)
 */
export async function updateWindowPositionRelative(w: WebviewWindow | any, rect: DiabloRect): Promise<void> {
  const scaleFactor = await currentMonitor().then((m) => m?.scaleFactor || 1);
  const logical = getLogicalRect(rect, scaleFactor);

  // We only update position if the window is visible to avoid flashing
  if (await w.isVisible()) {
    await w.setPosition(new PhysicalPosition(logical.x, logical.y));
    await w.setSize(new PhysicalSize(logical.width, logical.height));
  }
}

/**
 * Updates a specific window to be centered over the Diablo bounds (DPI aware)
 * Keeps current size of the window, only updates position.
 */
export async function centerWindowOverRect(w: WebviewWindow | any, rect: DiabloRect): Promise<void> {
  if (!(await w.isVisible())) return;

  const scaleFactor = await currentMonitor().then((m) => m?.scaleFactor || 1);
  const logicalRect = getLogicalRect(rect, scaleFactor);

  // Get current window size (logical)
  // outerSize is physical, innerSize is logical?
  // Tauri v2: innerSize() returns PhysicalSize. We need to convert or use logic.
  // Actually, setPosition uses PhysicalPosition (or Logical if configured).
  // Let's use Logical coordinates for calculation but Physical for setting if easier,
  // or just convert everything to Logical.

  // Simplest way: Get window size in Logical pixels.
  const factor = await w.scaleFactor(); // Get window's scale factor
  const size = await w.innerSize(); // Physical
  const windowWidth = size.width / factor;
  const windowHeight = size.height / factor;

  const x = logicalRect.x + (logicalRect.width - windowWidth) / 2;
  const y = logicalRect.y + (logicalRect.height - windowHeight) / 2;

  await w.setPosition(new PhysicalPosition(x * factor, y * factor));
}

/**
 * Moves a window by a delta (logical pixels translated to physical if needed, or reading current pos)
 */
export async function moveWindowBy(w: WebviewWindow | any, dx: number, dy: number): Promise<void> {
  // if (!(await w.isVisible())) return; // Allow moving hidden windows to keep them in sync

  // Tauri v2 `outerPosition` returns PhysicalPosition.
  // D2 Rect x/y are physical. dx/dy are physical.
  const pos = await w.outerPosition();
  const newX = pos.x + dx;
  const newY = pos.y + dy;

  await w.setPosition(new PhysicalPosition(newX, newY));
}
