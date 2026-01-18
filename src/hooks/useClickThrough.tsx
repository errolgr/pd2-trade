import React, { useEffect, useRef, useCallback, createContext, useContext, useState, ReactNode } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { isTauri } from '@tauri-apps/api/core';

export interface WindowBox {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ClickThroughContextType {
  registerWindow: (id: string, box: WindowBox) => void;
  unregisterWindow: (id: string) => void;
  updateWindow: (id: string, box: WindowBox) => void;
  isDragging: (id: string, dragging: boolean) => void;
}

const ClickThroughContext = createContext<ClickThroughContextType | undefined>(undefined);

export const ClickThroughProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const windowsRef = useRef<Map<string, WindowBox>>(new Map());
  const draggingWindowsRef = useRef<Set<string>>(new Set());
  const isIgnoredRef = useRef<boolean | null>(null);
  const windowPositionRef = useRef<{ x: number; y: number } | null>(null);

  const registerWindow = useCallback((id: string, box: WindowBox) => {
    windowsRef.current.set(id, box);
  }, []);

  const unregisterWindow = useCallback((id: string) => {
    windowsRef.current.delete(id);
    draggingWindowsRef.current.delete(id);
  }, []);

  const updateWindow = useCallback((id: string, box: WindowBox) => {
    windowsRef.current.set(id, box);
  }, []);

  const isDragging = useCallback((id: string, dragging: boolean) => {
    if (dragging) {
      draggingWindowsRef.current.add(id);
    } else {
      draggingWindowsRef.current.delete(id);
    }
  }, []);

  // Check if point is inside a box (using screen coordinates)
  const isInBox = useCallback(
    (screenX: number, screenY: number, box: WindowBox, windowPos: { x: number; y: number } | null): boolean => {
      // Convert viewport-relative box coordinates to screen coordinates
      const screenLeft = windowPos ? box.left + windowPos.x : box.left;
      const screenTop = windowPos ? box.top + windowPos.y : box.top;
      const screenRight = screenLeft + box.width;
      const screenBottom = screenTop + box.height;

      const result = screenX >= screenLeft && screenX <= screenRight && screenY >= screenTop && screenY <= screenBottom;

      return result;
    },
    [],
  );

  // Update window position periodically
  useEffect(() => {
    if (!isTauri()) return;

    const appWebview = getCurrentWebviewWindow();
    const updateWindowPosition = async () => {
      try {
        const position = await appWebview.outerPosition();
        windowPositionRef.current = { x: position.x, y: position.y };
      } catch (error) {
        console.error('[ClickThrough] Failed to get window position:', error);
      }
    };

    // Update immediately
    updateWindowPosition();

    // Update periodically (every 100ms) to catch window movements
    const interval = setInterval(updateWindowPosition, 100);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) return;

    const appWebview = getCurrentWebviewWindow();
    appWebview.setIgnoreCursorEvents(false);

    const unlistenPromise = appWebview.listen<{ x: number; y: number }>('device-mouse-move', async ({ payload }) => {
      const windows = windowsRef.current;
      const draggingWindows = draggingWindowsRef.current;
      const windowPos = windowPositionRef.current;

      // If we have windows registered but no window position yet, we can't accurately detect hits
      // In this case, default to not ignoring (allow interaction) to be safe
      if (windows.size > 0 && windowPos === null) {
        if (isIgnoredRef.current !== false) {
          appWebview.setIgnoreCursorEvents(false);
          isIgnoredRef.current = false;
        }
        return;
      }

      // Check if mouse is over any window or if any window is being dragged
      let inHitbox = false;
      const isDragging = draggingWindows.size > 0;
      let matchedBoxId: string | null = null;

      for (const [id, box] of windows) {
        if (isInBox(payload.x, payload.y, box, windowPos)) {
          inHitbox = true;
          matchedBoxId = id;
          break;
        }
      }

      // Log when we should detect overlap but don't (helps debug)
      if (!inHitbox && windows.size > 0 && windowPos) {
        // Only log occasionally to avoid spam, but show all boxes for debugging
        const boxes = Array.from(windows.entries()).map(([id, box]) => {
          const screenLeft = box.left + windowPos.x;
          const screenTop = box.top + windowPos.y;
          const screenRight = screenLeft + box.width;
          const screenBottom = screenTop + box.height;
          return `${id}: [${screenLeft}, ${screenTop}] to [${screenRight}, ${screenBottom}]`;
        });
      }

      const shouldIgnore = !isDragging && !inHitbox;

      if (shouldIgnore !== isIgnoredRef.current) {
        appWebview.setIgnoreCursorEvents(shouldIgnore);
        isIgnoredRef.current = shouldIgnore;
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [isInBox]);

  return (
    <ClickThroughContext.Provider value={{ registerWindow, unregisterWindow, updateWindow, isDragging }}>
      {children}
    </ClickThroughContext.Provider>
  );
};

export const useClickThrough = () => {
  const context = useContext(ClickThroughContext);
  if (context === undefined) {
    throw new Error('useClickThrough must be used within a ClickThroughProvider');
  }
  return context;
};
