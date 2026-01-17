import { useEffect, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { listen } from '@/lib/browser-events';

export const useDoubleShift = (handler: () => void | Promise<void>) => {
  const handlerRef = useRef(handler);
  const unlistenRef = useRef<(() => void) | null>(null);

  // Keep handler ref up to date
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!isTauri()) {
      // Only work in Tauri environment
      return;
    }

    const setup = async () => {
      try {
        // Listen for double-shift event from Rust backend
        unlistenRef.current = await listen('double-shift-detected', () => {
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
  }, []);
};
