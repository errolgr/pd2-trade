import { invoke } from '@tauri-apps/api/core';
import { useCallback } from "react";

/**
 * React hook that returns a function you can call to simulate a key press.
 *
 * Usage:
 *   const pressKey = useKeySender();
 *   await pressKey("F4");
 *   await pressKey("Ctrl+Alt+Z");
 */
export function useKeySender() {
  return useCallback(async (sequence: string) => {
    try {
      await invoke("press_key", { sequence });
    } catch (err) {
      console.error("[KeySender] failed:", err);
    }
  }, []);
}
