import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { listen as tauriListen } from '@tauri-apps/api/event';
import { getDiabloRectWithRetry } from '@/lib/window';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { currentMonitor } from '@tauri-apps/api/window';

export interface DiabloRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DiabloContextType {
  diabloRect: DiabloRect | null;
  isDiabloFocused: boolean;
  windowOffset: { x: number; y: number };
  // Diablo rect relative to main window viewport
  diabloRectRelative: { x: number; y: number; width: number; height: number } | null;
}

const DiabloContext = createContext<DiabloContextType | undefined>(undefined);

export const DiabloProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [diabloRect, setDiabloRect] = useState<DiabloRect | null>(null);
  const [isDiabloFocused, setIsDiabloFocused] = useState<boolean>(false);
  const [windowOffset, setWindowOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const isInitializedRef = useRef(false);

  // Get scale factor
  useEffect(() => {
    if (!isTauri()) return;

    const updateScaleFactor = async () => {
      try {
        const monitor = await currentMonitor();
        setScaleFactor(monitor?.scaleFactor || 1);
      } catch (error) {
        console.error('[DiabloProvider] Failed to get scale factor:', error);
      }
    };

    updateScaleFactor();
  }, []);

  // Calculate Diablo rect relative to main window viewport
  const diabloRectRelative = React.useMemo((): { x: number; y: number; width: number; height: number } | null => {
    if (!diabloRect) {
      return null;
    }

    const x = diabloRect.x - windowOffset.x;
    const y = diabloRect.y - windowOffset.y;
    const result = {
      x,
      y,
      width: diabloRect.width / scaleFactor,
      height: diabloRect.height / scaleFactor,
    };

    return result;
  }, [diabloRect, windowOffset, scaleFactor]);

  // Initialize Diablo rect
  useEffect(() => {
    if (!isTauri() || isInitializedRef.current) return;

    const initialize = async () => {
      try {
        const rect = await getDiabloRectWithRetry();
        if (rect) {
          setDiabloRect(rect);
        }

        const focused = await invoke<boolean>('is_diablo_focused');
        setIsDiabloFocused(focused);

        const window = getCurrentWebviewWindow();
        const position = await window.outerPosition();
        setWindowOffset({ x: position.x, y: position.y });
      } catch (error) {
        console.error('[DiabloProvider] Failed to initialize:', error);
      }
    };

    initialize();
    isInitializedRef.current = true;
  }, []);

  // Listen for Diablo window movement
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unlisten = await tauriListen<{ rect: DiabloRect; delta: { dx: number; dy: number } }>(
          'diablo-window-moved',
          (event) => {
            if (event.payload.rect) {
              setDiabloRect(event.payload.rect);
            }
          },
        );
      } catch (error) {
        console.error('[DiabloProvider] Failed to set up diablo-window-moved listener:', error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  // Listen for Diablo focus changes
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unlisten = await tauriListen<boolean>('diablo-focus-changed', (event) => {
          setIsDiabloFocused(event.payload);
        });
      } catch (error) {
        console.error('[DiabloProvider] Failed to set up diablo-focus-changed listener:', error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  // Listen for window position changes
  useEffect(() => {
    if (!isTauri()) return;

    const window = getCurrentWebviewWindow();
    let unlistenMoved: (() => void) | undefined;
    let unlistenResized: (() => void) | undefined;

    const updateWindowOffset = async () => {
      try {
        const position = await window.outerPosition();
        const newOffset = { x: position.x, y: position.y };
        setWindowOffset((prev) => {
          if (prev.x !== newOffset.x || prev.y !== newOffset.y) {
            return newOffset;
          }
          return prev;
        });
      } catch (error) {
        console.error('[DiabloProvider] Failed to get window position:', error);
      }
    };

    // Initial position
    updateWindowOffset();

    // Listen for window moved/resized events
    const setupListeners = async () => {
      try {
        // Check if window has onMoved/onResized methods (Tauri v2+)
        if (typeof (window as any).onMoved === 'function') {
          unlistenMoved = await (window as any).onMoved(() => {
            updateWindowOffset();
          });
        }

        if (typeof (window as any).onResized === 'function') {
          unlistenResized = await (window as any).onResized(() => {
            updateWindowOffset();
          });
        }
      } catch (error) {
        console.error('[DiabloProvider] Failed to set up window position listeners:', error);
      }
    };

    setupListeners();

    return () => {
      if (unlistenMoved) {
        unlistenMoved();
      }
      if (unlistenResized) {
        unlistenResized();
      }
    };
  }, []);

  return (
    <DiabloContext.Provider
      value={{
        diabloRect,
        isDiabloFocused,
        windowOffset,
        diabloRectRelative,
      }}
    >
      {children}
    </DiabloContext.Provider>
  );
};

/**
 * Hook to access Diablo window information
 * @throws Error if used outside DiabloProvider
 */
export const useDiablo = (): DiabloContextType => {
  const context = useContext(DiabloContext);
  if (context === undefined) {
    throw new Error('useDiablo must be used within a DiabloProvider');
  }
  return context;
};
