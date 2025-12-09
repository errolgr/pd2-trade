import { useCallback, useEffect, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';

interface PopupRef {
  ref: React.RefObject<HTMLElement>;
  id: string;
}

interface PopupBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface WindowClickThroughOptions {
  windowLabel: string;
  pollingInterval?: number;
  enableThrottling?: boolean;
}

export const useWindowClickThrough = (options: WindowClickThroughOptions) => {
  const { windowLabel, pollingInterval = 100, enableThrottling = true } = options;
  
  const popupRefs = useRef<PopupRef[]>([]);
  const isClickThroughEnabled = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateChange = useRef<number>(0);
  const currentPollingInterval = useRef<number>(pollingInterval);

  const registerPopup = useCallback((ref: React.RefObject<HTMLElement>, id: string) => {
    popupRefs.current = popupRefs.current.filter(p => p.id !== id);
    popupRefs.current.push({ ref, id });
  }, []);

  const unregisterPopup = useCallback((id: string) => {
    popupRefs.current = popupRefs.current.filter(p => p.id !== id);
  }, []);

  const getPopupBounds = useCallback((): PopupBounds[] => {
    const bounds: PopupBounds[] = [];

    popupRefs.current.forEach(({ ref }) => {
      const element = ref.current;
      if (element) {
        const rect = element.getBoundingClientRect();
        bounds.push({
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
        });
      }
    });

    return bounds;
  }, []);

  const checkCursorPosition = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const { cursorPosition } = await import('@tauri-apps/api/window');
      
      const window = await WebviewWindow.getByLabel(windowLabel);
      if (!window) return;

      // Get cursor position (screen coordinates)
      const { x: cursorScreenX, y: cursorScreenY } = await cursorPosition();
      
      // Get window position (screen coordinates)
      const windowPosition = await window.outerPosition();
      const windowX = windowPosition.x;
      const windowY = windowPosition.y;

      // Get popup bounds (viewport-relative coordinates)
      const popupBounds = getPopupBounds();

      // Convert cursor position to viewport-relative coordinates
      const cursorViewportX = cursorScreenX - windowX;
      const cursorViewportY = cursorScreenY - windowY;

      const isOverPopup = popupBounds.some(bounds => 
        cursorViewportX >= bounds.left &&
        cursorViewportX <= bounds.right &&
        cursorViewportY >= bounds.top &&
        cursorViewportY <= bounds.bottom
      );

      const now = Date.now();

      // Throttle rapid state changes if enabled
      if (enableThrottling && now - lastStateChange.current < 50) {
        return;
      }

      // Update click-through state for the window
      if (isOverPopup && isClickThroughEnabled.current) {
        // Cursor is over popup, disable click-through
        await window.setIgnoreCursorEvents(false);
        isClickThroughEnabled.current = false;
        lastStateChange.current = now;
      } else if (!isOverPopup && !isClickThroughEnabled.current) {
        // Cursor is not over popup, enable click-through
        await window.setIgnoreCursorEvents(true);
        isClickThroughEnabled.current = true;
        lastStateChange.current = now;
      }
    } catch (error) {
      console.error(`[useWindowClickThrough:${windowLabel}] Error checking cursor position:`, error);
    }
  }, [windowLabel, getPopupBounds, enableThrottling]);

  useEffect(() => {
    if (!isTauri()) return;

    // Start with click-through enabled for the window
    const initClickThrough = async () => {
      try {
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const window = await WebviewWindow.getByLabel(windowLabel);
        if (window) {
          await window.setIgnoreCursorEvents(true);
          isClickThroughEnabled.current = true;
        }
      } catch (error) {
        console.error(`[useWindowClickThrough:${windowLabel}] Failed to initialize click-through:`, error);
      }
    };

    initClickThrough();

    // Start polling for cursor position
    pollingIntervalRef.current = setInterval(checkCursorPosition, currentPollingInterval.current);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // Re-enable click-through on cleanup
      if (isTauri()) {
        import('@tauri-apps/api/webviewWindow').then(async ({ WebviewWindow }) => {
          try {
            const window = await WebviewWindow.getByLabel(windowLabel);
            if (window) {
              await window.setIgnoreCursorEvents(true);
            }
          } catch (error) {
            // Ignore errors on cleanup
          }
        });
      }
    };
  }, [windowLabel, checkCursorPosition]);

  return {
    registerPopup,
    unregisterPopup,
  };
};

