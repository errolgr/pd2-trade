import { useEffect, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { listen } from '@/lib/browser-events';
import { useDiablo } from './useDiablo';

export const useDoubleShift = (handler: () => void | Promise<void>, enabled: boolean = true) => {
  const handlerRef = useRef(handler);
  const unlistenRef = useRef<(() => void) | null>(null);
  const { isDiabloFocused } = useDiablo();
  const isDiabloFocusedRef = useRef(isDiabloFocused);
  const enabledRef = useRef(enabled);

  // Keep handler ref up to date
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // Keep isDiabloFocused ref up to date
  useEffect(() => {
    isDiabloFocusedRef.current = isDiabloFocused;
  }, [isDiabloFocused]);

  // Keep enabled ref up to date
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!isTauri() || !enabled) {
      // Only work in Tauri environment and when enabled
      return;
    }

    const setup = async () => {
      try {
        // Listen for double-shift event from Rust backend
        unlistenRef.current = await listen('double-shift-detected', () => {
          // Disable if not enabled or Diablo is not focused
          if (!enabledRef.current || !isDiabloFocusedRef.current) return;
          handlerRef.current();
        });
      } catch (error) {
        console.error('Failed to setup double shift listener:', error);
      }
    };

    setup();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, [enabled]);
};
