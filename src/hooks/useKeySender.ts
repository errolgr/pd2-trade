import { isTauri } from '@tauri-apps/api/core';
import { useCallback } from "react";

/**
 * React hook that returns a function you can call to simulate a key press.
 * In browser, this is a no-op (key simulation not available).
 *
 * Usage:
 *   const pressKey = useKeySender();
 *   await pressKey("F4");
 *   await pressKey("Ctrl+Alt+Z");
 */
export function useKeySender() {
  return useCallback(async (sequence: string) => {
    if (!isTauri()) {
      // Key simulation not available in browser
      console.warn('[KeySender] Key simulation not available in browser');
      return;
    }
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke("press_key", { sequence });
    } catch (err) {
      console.error("[KeySender] failed:", err);
    }
  }, []);
}
