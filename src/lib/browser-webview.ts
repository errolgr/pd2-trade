/**
 * Browser-compatible webview utilities
 * Provides fallbacks for Tauri webview operations when running in browser
 */

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
 * In browser, returns a mock window object
 */
export async function getCurrentWebviewWindow(): Promise<BrowserWebviewWindow | null> {
  try {
    // Try Tauri API first
    const { getCurrentWebviewWindow: tauriGetCurrent } = await import('@tauri-apps/api/webviewWindow');
    return await tauriGetCurrent();
  } catch {
    // Fallback: return a mock window for browser
    return {
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
  }
}

