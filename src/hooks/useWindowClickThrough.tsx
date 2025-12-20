import { useCallback, useEffect, useRef } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';

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
  const { windowLabel } = options;

  const popupRefs = useRef<PopupRef[]>([]);
  // Use a resize observer to detect changes in popup sizes/positions
  const resizeObserver = useRef<ResizeObserver | null>(null);

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

  const updateBackend = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const bounds = getPopupBounds();
      // Send bounds to backend (which expects PopupRect struct with left, top, right, bottom)
      await invoke('update_click_through_areas', { windowLabel, rects: bounds });
    } catch (error) {
      console.error(`[useWindowClickThrough:${windowLabel}] Failed to update backend:`, error);
    }
  }, [windowLabel, getPopupBounds]);

  const registerPopup = useCallback(
    (ref: React.RefObject<HTMLElement>, id: string) => {
      // Remove if already exists to avoid duplicates
      popupRefs.current = popupRefs.current.filter((p) => p.id !== id);
      popupRefs.current.push({ ref, id });

      // Observe the element
      if (ref.current && resizeObserver.current) {
        resizeObserver.current.observe(ref.current);
      }

      // Trigger immediate update
      updateBackend();
    },
    [updateBackend],
  );

  const unregisterPopup = useCallback(
    (id: string) => {
      const popup = popupRefs.current.find((p) => p.id === id);
      if (popup && popup.ref.current && resizeObserver.current) {
        resizeObserver.current.unobserve(popup.ref.current);
      }

      popupRefs.current = popupRefs.current.filter((p) => p.id !== id);
      updateBackend();
    },
    [updateBackend],
  );

  // Initialize monitoring on mount
  useEffect(() => {
    if (!isTauri()) return;

    // Initialize ResizeObserver
    resizeObserver.current = new ResizeObserver(() => {
      // Debounce updates slightly if needed, but for now direct update is likely fine
      // as ResizeObserver batches changes
      updateBackend();
    });

    // Start the backend polling thread (idempotent)
    invoke('start_click_through_poll').catch((err) => console.error('Failed to start click-through poll:', err));

    // Initial clear
    updateBackend();

    return () => {
      if (resizeObserver.current) {
        resizeObserver.current.disconnect();
      }
      // We don't stop the backend poll as it's global
    };
  }, [updateBackend]);

  return {
    registerPopup,
    unregisterPopup,
  };
};
