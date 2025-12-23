import { useCallback } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';

export const useDiabloFocus = () => {
  const checkDiabloFocus = useCallback(async (): Promise<boolean> => {
    if (!isTauri()) {
      // In browser, always return true (no Diablo detection)
      return true;
    }
    try {
      const focused = await invoke<boolean>('is_diablo_focused');
      return focused;
    } catch (error) {
      console.warn('[useDiabloFocus] Failed to check Diablo focus:', error);
      return true; // Allow in browser or on error
    }
  }, []);

  return { checkDiabloFocus };
};
