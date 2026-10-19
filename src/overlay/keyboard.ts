import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * Keyboard focus for the single non-focusable overlay window.
 *
 * Main is created focusable(false) so clicks never steal focus from Diablo II. A panel that needs typing
 * claims the keyboard (setFocusable(true) + setFocus()); the claim ends when Main loses OS focus or when the
 * last keyboard panel closes (then focus goes back to the game).
 */
let claimed = false;
/** When releaseKeyboard() last handed focus away; the focus loss that follows is ours, not a user click. */
let handoffAt = 0;
const HANDOFF_BLUR_MS = 1000;

export function isKeyboardClaimed(): boolean {
  return claimed;
}

export async function claimKeyboard(): Promise<void> {
  if (!isTauri() || claimed) return;
  claimed = true;
  try {
    const win = getCurrentWindow();
    await win.setFocusable(true);
    await win.setFocus();
  } catch (error) {
    claimed = false;
    console.warn('[overlay] Failed to claim keyboard focus:', error);
  }
}

/** Give the keyboard back: Main becomes non-focusable again and (by default) Diablo II is focused. */
export async function releaseKeyboard({ focusGame = true }: { focusGame?: boolean } = {}): Promise<void> {
  if (!isTauri() || !claimed) return;
  claimed = false;
  handoffAt = Date.now();
  try {
    await getCurrentWindow().setFocusable(false);
    if (focusGame) await invoke<boolean>('focus_diablo');
  } catch (error) {
    console.warn('[overlay] Failed to release keyboard focus:', error);
  }
}

/**
 * Track Main's OS focus: losing it (user clicked into the game) ends the claim. `onFocusChange` sees every
 * change (Tauri only); `handoff` marks a focus loss caused by releaseKeyboard() rather than the user.
 * Returns the unsubscribe.
 */
export function trackKeyboardFocus(onFocusChange?: (focused: boolean, handoff: boolean) => void): () => void {
  if (!isTauri()) return () => {};
  let disposed = false;
  let unlisten: (() => void) | null = null;
  getCurrentWindow()
    .onFocusChanged(({ payload: focused }) => {
      const handoff = !focused && Date.now() - handoffAt < HANDOFF_BLUR_MS;
      if (handoff || focused) handoffAt = 0;
      if (focused) {
        claimed = true;
      } else if (claimed) {
        claimed = false;
        getCurrentWindow()
          .setFocusable(false)
          .catch((error) => console.warn('[overlay] setFocusable(false) failed:', error));
      }
      onFocusChange?.(focused, handoff);
    })
    .then((off) => {
      if (disposed) off();
      else unlisten = off;
    })
    .catch((error) => console.warn('[overlay] onFocusChanged failed:', error));
  return () => {
    disposed = true;
    unlisten?.();
  };
}

/** Test seam: reset module state between tests. */
export function resetKeyboardStateForTests(): void {
  claimed = false;
  handoffAt = 0;
}
