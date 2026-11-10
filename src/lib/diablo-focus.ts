import { invoke, isTauri } from '@tauri-apps/api/core';

/** Diablo II in front (or our overlay focused from it); always true in browser mode, false when the check fails. */
export async function isDiabloFocused(): Promise<boolean> {
  if (!isTauri()) return true;
  try {
    return await invoke<boolean>('is_diablo_focused');
  } catch {
    return false;
  }
}
