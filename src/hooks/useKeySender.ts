import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
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
    } catch (err: any) {
      if (typeof err === 'string' && err.includes('NoPermission')) {
        await invoke('open_accessibility_settings');
        await emit('toast-event', {
          title: 'Accessibility Permission Required',
          description: 'Please grant Accessibility permissions to PD2 Trader in System Settings > Privacy & Security > Accessibility. This is required for key sending to work.',
          duration: 10000,
        });
      }
      console.error("[KeySender] failed:", err);
    }
  }, []);
}
