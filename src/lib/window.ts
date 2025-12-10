import { isTauri } from '@tauri-apps/api/core';
import {WindowOptions} from '@tauri-apps/api/window';
import * as browserWindow from './browser-window';
import {WebviewOptions} from "@tauri-apps/api/webview";

// Re-export browser window types
export type BrowserWindow = browserWindow.BrowserWindow;

// Tauri types (only used when in Tauri)
type WebviewWindow = any;

/**
 * Opens a centered window - uses Tauri in Tauri environment, browser window.open in browser
 */
export async function openCenteredWindow(
  label: string,
  url: string,
  options: Partial<WebviewOptions & WindowOptions> = {}
): Promise<WebviewWindow | browserWindow.BrowserWindow | null> {
  if (isTauri()) {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const { currentMonitor } = await import('@tauri-apps/api/window');
    
    const monitor = await currentMonitor();
    if (!monitor) return null;

    const width = options.width ?? 600;
    const height = options.height ?? 600;

    const { position, size } = monitor;
    const x = position.x + Math.round((size.width - width) / 2);
    const y = position.y + Math.round((size.height - height) / 2);

    const w = new WebviewWindow(label, {
      url,
      x,
      y,
      width,
      height,
      focus: true,
      ...options,
    });

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
  options: Partial<WebviewOptions & WindowOptions> = {}
): Promise<WebviewWindow | browserWindow.BrowserWindow | null> {
  if (isTauri()) {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const { cursorPosition } = await import('@tauri-apps/api/window');
    const { invoke } = await import('@tauri-apps/api/core');
    
    const { x: cursorX } = await cursorPosition();
    const rect = await invoke<{ x: number; y: number; width: number; height: number }>('get_diablo_rect');

    const width = options.width ?? 500;
    const x = cursorX - width;
    const y = rect.y;

    const w = new WebviewWindow(label, {
      url,
      x,
      y,
      width,
      height: rect.height,
      focus: true,
      ...options,
    });

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
  options: Partial<WebviewOptions & WindowOptions> = {}
): Promise<WebviewWindow | browserWindow.BrowserWindow | null> {
  if (isTauri()) {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const { cursorPosition } = await import('@tauri-apps/api/window');
    
    const { x, y } = await cursorPosition();
    const width = options.width ?? 600;
    const height = options.height ?? 600;

    const w = new WebviewWindow(label, {
      url,
      x,
      y,
      width,
      height,
      focus: true,
      ...options,
    });

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
  options: Partial<WebviewOptions & WindowOptions> = {}
): Promise<WebviewWindow | browserWindow.BrowserWindow | null> {
  if (isTauri()) {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const { invoke } = await import('@tauri-apps/api/core');
    
    const rect = await invoke<{ x: number; y: number; width: number; height: number }>('get_diablo_rect');
    const windowWidth = options.width ?? 600;
    const windowHeight = options.height ?? 600;
    const x = rect.x + (rect.width - windowWidth) / 2;
    const y = rect.y + (rect.height - windowHeight) / 2;

    const w = new WebviewWindow(label, {
      url,
      x,
      y,
      width: windowWidth,
      height: windowHeight,
      focus: true,
      ...options,
    });

    return w;
  }
  
  // Browser fallback - use centered window
  return browserWindow.openCenteredWindow(label, url, options);
}

/**
 * Attach window lifecycle handlers - works with both Tauri and browser windows
 */
export function attachWindowLifecycle(
  w: WebviewWindow | browserWindow.BrowserWindow,
  onClose: () => void
) {
  if (isTauri() && 'onCloseRequested' in w) {
    // Tauri window
    (w as WebviewWindow).onCloseRequested(() => {
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
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('update_window_bounds');
  } else {
    // No-op in browser
    await browserWindow.updateMainWindowBounds();
  }
}