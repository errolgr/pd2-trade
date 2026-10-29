import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@/lib/browser-events';
import { holdListener } from '@/lib/listener';

/**
 * Keyboard focus for the single non-focusable overlay window.
 *
 * Main is created focusable(false) so clicks never steal focus (or sound) from Diablo II. The keyboard is claimed
 * only when the user clicks into a text field in a panel (setFocusable(true) + focus_overlay); the claim ends
 * when the user leaves the overlay, clicks elsewhere in a panel, or the last keyboard panel closes (then focus
 * goes back to the game).
 *
 * Diablo II in fullscreen is the exception (showOverFullscreenGame): there a panel is only seen while the overlay
 * holds the foreground, so opening one claims it and clicks elsewhere in a panel keep it.
 */
let claimed = false;
/** When releaseKeyboard() last handed focus away; the focus loss that follows is ours, not a user click. */
let handoffAt = 0;
const HANDOFF_BLUR_MS = 1000;
/** Last known foreground owner: the Rust hook's reports, plus our own successful focus_overlay. */
let foregroundOwner: ForegroundOwner | null = null;
/** The keyboard was claimed while the user was in the game, so releasing it hands focus back to the game. */
let claimedFromGame = false;
/** The claim was made in the game while it filled its monitor: handing the foreground back hides every panel. */
let claimedOverFullscreenGame = false;

interface GameWindow {
  /** Game context: Diablo II in front, or our overlay focused from it (is_diablo_focused). */
  inGame: boolean;
  /** Diablo II fills its monitor (is_diablo_fullscreen). */
  fullscreen: boolean;
}

export function isKeyboardClaimed(): boolean {
  return claimed;
}

/** Claimed over a fullscreen game: only leaving the overlay or closing the last keyboard panel should end it. */
export function isHeldOverFullscreenGame(): boolean {
  return claimed && claimedOverFullscreenGame;
}

const canClaim = () => isTauri() && !(claimed && foregroundOwner === 'ownWindow');

async function readGameWindow(): Promise<GameWindow> {
  const [inGame, fullscreen] = await Promise.all([
    invoke<boolean>('is_diablo_focused'),
    invoke<boolean>('is_diablo_fullscreen'),
  ]);
  return { inGame, fullscreen };
}

async function claim(known?: GameWindow): Promise<void> {
  claimed = true;
  // A hand-off to the game that produced no focus change (the game was already in front) must not excuse
  // the user's next click into the game.
  handoffAt = 0;
  try {
    const game = known ?? (await readGameWindow());
    // Settings opened from the tray while in another app must not pull the game forward when it lets go
    claimedFromGame = game.inGame;
    claimedOverFullscreenGame = game.inGame && game.fullscreen;
    const win = getCurrentWindow();
    await win.setFocusable(true);
    // Not win.setFocus(): Windows refuses it while the game holds the foreground right (after a global hotkey
    // or our injected Ctrl+C). focus_overlay works around that and reports whether Main really came to front.
    const focusedOverlay = await invoke<boolean>('focus_overlay');
    if (focusedOverlay) {
      // Windows can drop the hook's report of this switch; leaving the overlay must still register
      foregroundOwner = 'ownWindow';
    } else {
      claimed = false;
      await win.setFocusable(false);
      console.warn('[overlay] The overlay could not take keyboard focus');
    }
  } catch (error) {
    claimed = false;
    console.warn('[overlay] Failed to claim keyboard focus:', error);
  }
}

export async function claimKeyboard(): Promise<void> {
  if (canClaim()) await claim();
}

/**
 * Shows a panel just opened in the game over Diablo II in fullscreen, where it would otherwise stay invisible.
 * D2GL's fullscreen is an OpenGL window exactly the size of its monitor, and graphics drivers send such a window
 * straight to the screen while it holds the foreground: nothing else on that monitor is drawn, the always-on-top
 * overlay included, though the overlay still gets the mouse (the cursor turns into the Windows arrow over the
 * invisible panel). Taking the foreground ends that, so the panel claims it (like a text field click) until the
 * user goes back to the game or the last keyboard panel closes. Windowed, or outside the game, it does nothing.
 */
export async function showOverFullscreenGame(): Promise<void> {
  if (!canClaim()) return;
  let game: GameWindow;
  try {
    game = await readGameWindow();
  } catch (error) {
    console.warn('[overlay] Failed to read the game window state:', error);
    return;
  }
  // canClaim again: a claim (e.g. a text field the panel focused) may have landed meanwhile
  if (!game.inGame || !game.fullscreen || !canClaim()) return;
  await claim(game);
}

/**
 * Give the keyboard back: Main becomes non-focusable again and, when it was claimed in the game (or `focusGame`),
 * Diablo II is focused.
 */
export async function releaseKeyboard({ focusGame = claimedFromGame }: { focusGame?: boolean } = {}): Promise<void> {
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

/** Who holds the OS foreground, from the Rust foreground hook (window::focus FOREGROUND_EVENT). */
export type ForegroundOwner = 'diablo' | 'ownWindow' | 'other' | 'unknown';
export const FOREGROUND_EVENT = 'foreground-changed';

/**
 * Track the user moving into and out of the overlay, from the OS foreground hook rather than the window's own
 * focus events, which can't see the user leaving the game while the overlay never had focus.
 * `onFocusChange(true)` when the overlay comes to the front; `onFocusChange(false)` when the user leaves it
 * (for the game or another app) or leaves the game for another app. Leaving ends the claim; `handoff` marks a
 * loss caused by releaseKeyboard() rather than the user. Returns the unsubscribe.
 */
export function trackKeyboardFocus(onFocusChange?: (focused: boolean, handoff: boolean) => void): () => void {
  if (!isTauri()) return () => {};
  return holdListener(
    listen<ForegroundOwner>(FOREGROUND_EVENT, ({ payload: owner }) => {
      if (owner === 'unknown') return;
      const from = foregroundOwner;
      foregroundOwner = owner;

      if (owner === 'ownWindow') {
        claimed = true;
        handoffAt = 0;
        onFocusChange?.(true, false);
        return;
      }
      if (owner === from) return;
      const left = from === 'ownWindow' || (from === 'diablo' && owner === 'other');
      if (!left) return;

      const handoff = Date.now() - handoffAt < HANDOFF_BLUR_MS;
      handoffAt = 0;
      if (claimed) {
        claimed = false;
        getCurrentWindow()
          .setFocusable(false)
          .catch((error) => console.warn('[overlay] setFocusable(false) failed:', error));
      }
      onFocusChange?.(false, handoff);
    }),
    FOREGROUND_EVENT,
  );
}

/** Test seam: reset module state between tests. */
export function resetKeyboardStateForTests(): void {
  claimed = false;
  handoffAt = 0;
  foregroundOwner = null;
  claimedFromGame = false;
  claimedOverFullscreenGame = false;
}
