import { useCallback, useEffect, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { cursorPosition } from '@tauri-apps/api/window';

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
      const window = await WebviewWindow.getByLabel(windowLabel);
      if (!window) return;

      const { x: cursorX, y: cursorY } = await cursorPosition();
      const popupBounds = getPopupBounds();

      const isOverPopup = popupBounds.some(bounds => 
        cursorX >= bounds.left &&
        cursorX <= bounds.right &&
        cursorY >= bounds.top &&
        cursorY <= bounds.bottom
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
      console.error(`[useWindowClickThrough] Error checking cursor position for window "${windowLabel}":`, error);
    }
  }, [windowLabel, getPopupBounds, enableThrottling]);

  useEffect(() => {
    if (!isTauri()) return;

    // Start with click-through enabled for the window
    const initClickThrough = async () => {
      try {
        const window = await WebviewWindow.getByLabel(windowLabel);
        if (window) {
          await window.setIgnoreCursorEvents(true);
          isClickThroughEnabled.current = true;
        }
      } catch (error) {
        console.error(`[useWindowClickThrough] Failed to initialize click-through for window "${windowLabel}":`, error);
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
        WebviewWindow.getByLabel(windowLabel).then(async (window) => {
          try {
            if (!window) return;
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

