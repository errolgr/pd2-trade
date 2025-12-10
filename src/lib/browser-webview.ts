/**
 * Browser-compatible webview utilities
 * Uses Tauri webview operations in Tauri environment, provides fallbacks for browser
 */

import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow as tauriGetCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

export interface BrowserWebviewWindow {
  label: string;
  show: () => Promise<void>;
  hide: () => Promise<void>;
  close: () => Promise<void>;
  emit: (event: string, payload?: any) => Promise<void>;
  onCloseRequested: (callback: () => void) => void;
  onFocusChanged: (callback: (event: { payload: boolean }) => void) => void;
  setFocus: () => Promise<void>;
}

/**
 * Get current webview window
 * Returns an object with methods that handle async operations internally
 * In browser, returns a mock window object
 */
export function getCurrentWebviewWindow(): BrowserWebviewWindow {
  let cachedWindow: BrowserWebviewWindow | null = null;
  let windowPromise: Promise<BrowserWebviewWindow | null> | null = null;

  const getWindow = (): Promise<BrowserWebviewWindow | null> => {
    if (cachedWindow) {
      return Promise.resolve(cachedWindow);
    }
    if (windowPromise) {
      return windowPromise;
    }
    
    windowPromise = (async () => {
      if (isTauri()) {
        const win = await tauriGetCurrentWebviewWindow();
        if (win) {
          cachedWindow = win;
        }
        return win;
      }
      
      // Browser fallback: return a mock window
      const mockWindow: BrowserWebviewWindow = {
        label: 'main',
        show: async () => {
          window.focus();
        },
        hide: async () => {
          window.blur();
        },
        close: async () => {
          // Can't close main window in browser
          console.warn('Cannot close main window in browser');
        },
        emit: async (event: string, payload?: any) => {
          // Use postMessage or CustomEvent for cross-window communication
          window.dispatchEvent(new CustomEvent(event, { detail: payload }));
        },
        onCloseRequested: () => {
          // No-op in browser
        },
        onFocusChanged: () => {
          // No-op in browser
        },
        setFocus: async () => {
          window.focus();
        },
      };
      cachedWindow = mockWindow;
      return mockWindow;
    })();
    
    return windowPromise;
  };

  return {
    label: 'main',
    show: () => {
      return getWindow().then(win => win?.show() ?? Promise.resolve());
    },
    hide: () => {
      return getWindow().then(win => win?.hide() ?? Promise.resolve());
    },
    close: () => {
      return getWindow().then(win => win?.close() ?? Promise.resolve());
    },
    emit: (event: string, payload?: any) => {
      return getWindow().then(win => win?.emit(event, payload) ?? Promise.resolve());
    },
    onCloseRequested: (callback: () => void) => {
      getWindow().then(win => {
        if (win) {
          win.onCloseRequested(callback);
        }
      });
    },
    onFocusChanged: (callback: (event: { payload: boolean }) => void) => {
      getWindow().then(win => {
        if (win) {
          win.onFocusChanged(callback);
        }
      });
    },
    setFocus: () => {
      return getWindow().then(win => win?.setFocus() ?? Promise.resolve());
    },
  };
}

