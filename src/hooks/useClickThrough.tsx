import { useCallback, useEffect, useRef } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { cursorPosition } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

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

interface ClickThroughOptions {
  pollingInterval?: number; // Default: 100ms
  enableThrottling?: boolean; // Default: false - throttles rapid state changes
  forceFocusOnPopup?: boolean; // Default: true - force window focus when cursor is over popup
}

export const useClickThrough = (options: ClickThroughOptions = {}) => {
  const {
    pollingInterval = 100,
    enableThrottling = false,
    forceFocusOnPopup = true,
  } = options;

  const popupRefs = useRef<PopupRef[]>([]);
  const isClickThroughEnabled = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateChange = useRef<number>(0);
  const consecutivePopupDetections = useRef<number>(0);
  const lastPopupDetectionTime = useRef<number>(0);
  const currentPollingInterval = useRef<number>(pollingInterval);

  const registerPopup = useCallback((ref: React.RefObject<HTMLElement>, id: string) => {
    // Remove existing ref with same id if it exists
    popupRefs.current = popupRefs.current.filter(p => p.id !== id);
    // Add new ref
    popupRefs.current.push({ ref, id });
    console.log(`[useClickThrough] Registered popup: ${id}`);
  }, []);

  const unregisterPopup = useCallback((id: string) => {
    popupRefs.current = popupRefs.current.filter(p => p.id !== id);
    console.log(`[useClickThrough] Unregistered popup: ${id}`);
  }, []);

  const getPopupBounds = useCallback((): PopupBounds[] => {
    const bounds: PopupBounds[] = [];

    // Get bounds for registered popup refs
    popupRefs.current.forEach(({ ref, id }) => {
      const element = ref.current;
      if (element) {
        const rect = element.getBoundingClientRect();
        bounds.push({
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
        });
        console.log(`[useClickThrough] Popup ${id} bounds:`, rect);
      }
    });

    // Get bounds for Sonner toast notifications (they're rendered in a portal)
    const sonnerToasts = document.querySelectorAll('[data-sonner-toaster] [data-sonner-toast]');
    sonnerToasts.forEach((toast, index) => {
      const rect = toast.getBoundingClientRect();
      bounds.push({
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      });
      console.log(`[useClickThrough] Sonner toast ${index} bounds:`, rect);
    });

    // Get bounds for any other portal-rendered popups (dialogs, etc.)
    const portalPopups = document.querySelectorAll('[data-radix-portal] [role="dialog"], [data-radix-portal] [role="alertdialog"]');
    portalPopups.forEach((popup, index) => {
      const rect = popup.getBoundingClientRect();
      bounds.push({
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      });
      console.log(`[useClickThrough] Portal popup ${index} bounds:`, rect);
    });

    return bounds;
  }, []);

  const forceWindowFocus = useCallback(async () => {
    if (!isTauri() || !forceFocusOnPopup) return;
    
    try {
      // Try to bring the window to front and focus it
      const mainWindow = await WebviewWindow.getByLabel('main');
      if (mainWindow) {
        await mainWindow.setFocus();
        console.log('[useClickThrough] Forced window focus via WebviewWindow');
      }
    } catch (error) {
      console.error('[useClickThrough] Failed to force window focus via WebviewWindow:', error);
      // Fallback to Tauri command
      try {
        await invoke('force_window_focus');
        console.log('[useClickThrough] Forced window focus via Tauri command');
      } catch (invokeError) {
        console.error('[useClickThrough] Failed to force window focus via Tauri command:', invokeError);
      }
    }
  }, [forceFocusOnPopup]);

  const checkCursorPosition = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const { x: cursorX, y: cursorY } = await cursorPosition();
      const popupBounds = getPopupBounds();

      // Check if cursor is over any popup area
      const isOverPopup = popupBounds.some(bounds => 
        cursorX >= bounds.left &&
        cursorX <= bounds.right &&
        cursorY >= bounds.top &&
        cursorY <= bounds.bottom
      );

      const now = Date.now();

      // Track consecutive popup detections
      if (isOverPopup) {
        if (now - lastPopupDetectionTime.current < 1000) { // Within 1 second
          consecutivePopupDetections.current++;
        } else {
          consecutivePopupDetections.current = 1;
        }
        lastPopupDetectionTime.current = now;
      } else {
        consecutivePopupDetections.current = 0;
      }

      // Adjust polling interval based on popup detection
      const newPollingInterval = isOverPopup ? Math.max(50, pollingInterval / 2) : pollingInterval;
      if (newPollingInterval !== currentPollingInterval.current) {
        currentPollingInterval.current = newPollingInterval;
        // Restart polling with new interval
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = setInterval(checkCursorPosition, newPollingInterval);
        }
      }

      // Throttling: prevent rapid state changes
      if (enableThrottling) {
        if (now - lastStateChange.current < 50) { // 50ms throttle
          return;
        }
      }

      // Update click-through state if needed
      if (isOverPopup && isClickThroughEnabled.current) {
        // Cursor is over popup, disable click-through
        console.log(`[useClickThrough] Cursor over popup (${consecutivePopupDetections.current} consecutive), disabling click-through`);
        await invoke('set_window_click_through', { ignore: false });
        isClickThroughEnabled.current = false;
        lastStateChange.current = now;

        // Force window focus if we have multiple consecutive detections (indicating potential focus issue)
        if (consecutivePopupDetections.current >= 3) {
          await forceWindowFocus();
        }
      } else if (!isOverPopup && !isClickThroughEnabled.current) {
        // Cursor is not over popup, enable click-through
        console.log('[useClickThrough] Cursor not over popup, enabling click-through');
        await invoke('set_window_click_through', { ignore: true });
        isClickThroughEnabled.current = true;
        lastStateChange.current = now;
      }

      // Debug logging
      if (isOverPopup) {
        console.log(`[useClickThrough] Cursor position: (${cursorX}, ${cursorY}) - Over popup`);
      }
    } catch (error) {
      console.error('[useClickThrough] Error checking cursor position:', error);
    }
  }, [getPopupBounds, enableThrottling, forceWindowFocus, pollingInterval]);

  useEffect(() => {
    if (!isTauri()) return;

    // Start with click-through enabled
    invoke('set_window_click_through', { ignore: true });
    isClickThroughEnabled.current = true;

    // Start polling for cursor position
    pollingIntervalRef.current = setInterval(checkCursorPosition, currentPollingInterval.current);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // Re-enable click-through on cleanup
      invoke('set_window_click_through', { ignore: true });
    };
  }, [checkCursorPosition]);

  return {
    registerPopup,
    unregisterPopup,
  };
}; 