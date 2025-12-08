/**
 * Browser-compatible window utilities
 * Provides fallbacks for Tauri window operations when running in browser
 */

export interface BrowserWindowOptions {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  focus?: boolean;
  alwaysOnTop?: boolean;
  skipTaskbar?: boolean;
  decorations?: boolean;
  transparent?: boolean;
  shadow?: boolean;
  resizable?: boolean;
  focusable?: boolean;
  minHeight?: number;
  minWidth?: number;
}

export interface BrowserWindow {
  show: () => Promise<void>;
  hide: () => Promise<void>;
  close: () => Promise<void>;
  emit: (event: string, payload?: any) => Promise<void>;
  onCloseRequested: (callback: () => void) => void;
  onFocusChanged: (callback: (event: { payload: boolean }) => void) => void;
  setFocus: () => Promise<void>;
}

/**
 * Opens a centered window in browser (uses window.open)
 */
export async function openCenteredWindow(
  label: string,
  url: string,
  options: BrowserWindowOptions = {}
): Promise<BrowserWindow | null> {
  const width = options.width ?? 600;
  const height = options.height ?? 600;
  
  // Calculate center position
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;
  
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');
  
  const win = window.open(url, label, features);
  
  if (!win) {
    console.warn('Failed to open window - popup blocked?');
    return null;
  }
  
  return createBrowserWindowWrapper(win, label);
}

/**
 * Opens a window at cursor position (falls back to center in browser)
 */
export async function openWindowAtCursor(
  label: string,
  url: string,
  options: BrowserWindowOptions = {}
): Promise<BrowserWindow | null> {
  // In browser, we can't get cursor position, so fall back to center
  return openCenteredWindow(label, url, options);
}

/**
 * Opens a window over Diablo (falls back to center in browser)
 */
export async function openOverDiabloWindow(
  label: string,
  url: string,
  options: BrowserWindowOptions = {}
): Promise<BrowserWindow | null> {
  // In browser, we can't detect Diablo window, so fall back to center
  return openCenteredWindow(label, url, options);
}

/**
 * Creates a browser-compatible window wrapper
 */
function createBrowserWindowWrapper(win: Window, label: string): BrowserWindow {
  const closeCallbacks: (() => void)[] = [];
  const focusCallbacks: ((event: { payload: boolean }) => void)[] = [];
  
  // Poll for window close
  const checkClosed = setInterval(() => {
    if (win.closed) {
      clearInterval(checkClosed);
      closeCallbacks.forEach(cb => cb());
    }
  }, 100);
  
  // Poll for focus changes
  const checkFocus = setInterval(() => {
    if (win.closed) {
      clearInterval(checkFocus);
      return;
    }
    const hasFocus = document.hasFocus() && win.document.hasFocus();
    focusCallbacks.forEach(cb => cb({ payload: hasFocus }));
  }, 200);
  
  return {
    show: async () => {
      if (win.closed) {
        // Reopen if closed
        const newWin = window.open(win.location.href, label);
        if (newWin) {
          Object.assign(win, newWin);
        }
      } else {
        win.focus();
      }
    },
    hide: async () => {
      if (!win.closed) {
        win.blur();
      }
    },
    close: async () => {
      if (!win.closed) {
        win.close();
      }
    },
    emit: async (event: string, payload?: any) => {
      // In browser, we can use postMessage to communicate between windows
      if (!win.closed) {
        win.postMessage({ type: event, payload }, window.location.origin);
      }
    },
    onCloseRequested: (callback: () => void) => {
      closeCallbacks.push(callback);
    },
    onFocusChanged: (callback: (event: { payload: boolean }) => void) => {
      focusCallbacks.push(callback);
    },
    setFocus: async () => {
      if (!win.closed) {
        win.focus();
      }
    },
  };
}

/**
 * Attach window lifecycle handlers
 */
export function attachWindowLifecycle(
  w: BrowserWindow,
  onClose: () => void
) {
  w.onCloseRequested(() => {
    onClose();
  });

  w.onFocusChanged((event) => {
    if (!event.payload) {
      w.close();
      onClose();
    }
  });
}

/**
 * Attach window close handler with focus loss handling
 */
export function attachWindowCloseHandler(
  w: BrowserWindow,
  onClose: () => void,
  onFocusLost?: () => void,
) {
  w.onCloseRequested(() => {
    onClose();
  });

  let focusLossTimeout: ReturnType<typeof setTimeout> | null = null;

  w.onFocusChanged((event) => {
    if (!event.payload) {
      focusLossTimeout = setTimeout(() => {
        w.hide();

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
}

/**
 * Update main window bounds (no-op in browser)
 */
export async function updateMainWindowBounds(): Promise<void> {
  // No-op in browser
}

