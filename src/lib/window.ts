import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import {currentMonitor, cursorPosition, WindowOptions} from '@tauri-apps/api/window';
import {WebviewOptions} from "@tauri-apps/api/webview";
import {invoke} from "@tauri-apps/api/core";

export async function openCenteredWindow(
  label: string,
  url: string,
  options: Partial<WebviewOptions & WindowOptions> = {}
): Promise<WebviewWindow | null> {
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

export async function openOverDiabloWindow(
  label: string,
  url: string,
  options: Partial<WebviewOptions & WindowOptions> = {}
): Promise<WebviewWindow | null> {
  try {
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
      minHeight: 1080,
      focus: true,
      ...options,
    });

    return w;
  } catch (e) {
    console.warn('[openOverDiabloWindow] fallback to center:', e);
    return openCenteredWindow(label, url, options);
  }
}

export async function openWindowAtCursor(
  label: string,
  url: string,
  options: Partial<WebviewOptions & WindowOptions> = {}
): Promise<WebviewWindow | null> {
  try {
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
  } catch (e) {
    console.warn('[openWindowAtCursor] fallback to center:', e);
    return openCenteredWindow(label, url, options);
  }
}

export function attachWindowLifecycle(
  w: WebviewWindow,
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

export function attachWindowCloseHandler(
  w: WebviewWindow,
  onClose: () => void,
  onFocusLost?: () => void,
) {
  w.onCloseRequested(() => {
    onClose();
  });

  w.onFocusChanged((event) => {
    if (!event.payload) {
      w.hide();

      if (onFocusLost) {
        onFocusLost();
      }
    }
  });
}