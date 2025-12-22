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

export const useClickThrough = () => {
  const popupRefs = useRef<PopupRef[]>([]);

  // Use a resize observer to detect changes in popup sizes/positions
  // We'll also attach it to document.body to detect global DOM changes that might affect portals?
  // Actually, MutationObserver is better for Portals appearing/disappearing.
  // ResizeObserver is better for size changes.
  const resizeObserver = useRef<ResizeObserver | null>(null);
  const mutationObserver = useRef<MutationObserver | null>(null);

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
    });

    // Get bounds for any other portal-rendered popups (dialogs, etc.)
    const portalPopups = document.querySelectorAll(
      '[data-radix-portal] [role="dialog"], [data-radix-portal] [role="alertdialog"]',
    );
    portalPopups.forEach((popup, index) => {
      const rect = popup.getBoundingClientRect();
      bounds.push({
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      });
    });

    return bounds;
  }, []);

  const updateBackend = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const bounds = getPopupBounds();
      // Send bounds to backend for the "main" window
      await invoke('update_click_through_areas', { windowLabel: 'main', rects: bounds });

      // Control logic:
      // If we have interactive areas (including portals), we MUST be monitoring.
      // If we have ZERO interactive areas... we could stop monitoring?
      // But wait: if we stop monitoring, the backend thread sleeps.
      // BUT the backend thread also handles the "click-through" vs "interactive" toggle logic.
      // If we stop monitoring, the thread pauses. The window stays in its LAST STATE.
      // If the last state was "Interactive", and we clear all popups, we probably want to revert to "Click-Through"
      // before stopping.
      // HOWEVER, the standard use case is: items on screen -> monitor. No items -> maybe just leave it running?
      // The user specifically asked for "stop if not required".

      // Strategy:
      // If bounds.length > 0 -> START (ensure active)
      // If bounds.length == 0 -> STOP (disable monitoring)
      // Note: We need to ensure we set the window to click-through (ignore=true) before stopping if it was interactive.
      // The backend 'stop' just pauses the thread. It doesn't reset state.
      // So we should manually set click-through if we are about to stop.

      if (bounds.length > 0) {
        await invoke('start_click_through_poll');
      } else {
        // Force click-through before stopping
        await invoke('set_window_click_through', { ignore: true });
        await invoke('stop_click_through_poll');
      }
    } catch (error) {
      console.error('[useClickThrough] Failed to update backend:', error);
    }
  }, [getPopupBounds]);

  const registerPopup = useCallback(
    (ref: React.RefObject<HTMLElement>, id: string) => {
      // Remove existing ref with same id if it exists
      popupRefs.current = popupRefs.current.filter((p) => p.id !== id);
      // Add new ref
      popupRefs.current.push({ ref, id });

      // observe
      if (ref.current && resizeObserver.current) {
        resizeObserver.current.observe(ref.current);
      }

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

  useEffect(() => {
    if (!isTauri()) return;

    // Initialize Observers
    let animationFrameId: number;

    resizeObserver.current = new ResizeObserver(() => {
      // Throttled update
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateBackend);
    });

    mutationObserver.current = new MutationObserver(() => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateBackend);
    });

    // Observe body for Portal changes (additions/removals of dialogs/toasts)
    mutationObserver.current.observe(document.body, { childList: true, subtree: true });

    // Initial Sync
    updateBackend();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizeObserver.current) resizeObserver.current.disconnect();
      if (mutationObserver.current) mutationObserver.current.disconnect();

      // Cleanup: disable monitoring on unmount?
      // This hook is likely used at the top level of the page, so yes.
      if (isTauri()) {
        invoke('set_window_click_through', { ignore: true }).catch(console.error);
        invoke('stop_click_through_poll').catch(console.error);
      }
    };
  }, [updateBackend]);

  return {
    registerPopup,
    unregisterPopup,
  };
};
