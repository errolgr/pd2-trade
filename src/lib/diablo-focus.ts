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

/** No keyboard or mouse input for this long (any app) reads as away from the keyboard. */
export const AFK_AFTER_MS = 60_000;

/**
 * The player is in the game and at the keyboard: Diablo II in front and input within AFK_AFTER_MS (unknown idle
 * time counts as present). False in browser mode and when the check fails.
 */
export async function isPlayerInGame(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const [focused, idleMs] = await Promise.all([
      invoke<boolean>('is_diablo_focused'),
      invoke<number | null>('input_idle_ms'),
    ]);
    return focused && (idleMs == null || idleMs < AFK_AFTER_MS);
  } catch {
    return false;
  }
}
