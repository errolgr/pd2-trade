import { useSyncExternalStore } from 'react';
import type { OverlayRect } from '@/overlay';

/**
 * The chat dock: a tab flush on the game's right edge (flat side against the edge). It starts in the bottom-right
 * corner, on the statue beside the mana orb, and can be dragged up or down along the edge; where it sits is saved as
 * a share of the game height, so it keeps its spot across resolutions.
 *
 * Its size follows the game height (the HUD art scales with it): 4% of the height wide, 2.75× as tall.
 */
const WIDTH_RATIO = 0.04;
const HEIGHT_PER_WIDTH = 2.75;
const MIN_WIDTH = 22;
const MAX_WIDTH = 64;
/** Default gap between the tab and the game's bottom edge, as a share of the game height. */
const DEFAULT_OFFSET = 0.008;
const STORAGE_KEY = 'pd2-chat-dock-offset-v1';

/** The chatButton panel frame width (registry, placement 'gameRight': full game height). Room for the menu. */
export const CHAT_DOCK_FRAME = { width: 240, height: 560 };

/** Tab size (CSS px) for a game `height` tall. */
export function chatDockSize(height: number): { width: number; height: number } {
  const width = Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, height * WIDTH_RATIO)));
  return { width, height: Math.round(width * HEIGHT_PER_WIDTH) };
}

/** Clamps an offset (share of the game height between the game's bottom edge and the tab) so the tab stays inside. */
export function clampDockOffset(offset: number, gameHeight: number): number {
  const max = gameHeight > 0 ? Math.max(0, 1 - chatDockSize(gameHeight).height / gameHeight) : 0;
  return Math.min(max, Math.max(0, Number.isFinite(offset) ? offset : DEFAULT_OFFSET));
}

/** The tab's rect (overlay px) on `game` at `offset`. */
export function chatDockRect(game: OverlayRect, offset: number): OverlayRect {
  const size = chatDockSize(game.height);
  const bottom = Math.round(clampDockOffset(offset, game.height) * game.height);
  return { x: game.x + game.width - size.width, y: game.y + game.height - bottom - size.height, ...size };
}

// ---- saved offset: shared by the dock and the ticker's 'above-chat' anchor ----

function readOffset(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value = Number(raw);
    return raw !== null && Number.isFinite(value) ? value : DEFAULT_OFFSET;
  } catch {
    return DEFAULT_OFFSET;
  }
}

let offset = readOffset();
const listeners = new Set<() => void>();

/** Moves the dock (and saves it); `persist: false` while dragging, saved once on release. */
export function setChatDockOffset(next: number, persist = true): void {
  offset = next;
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* best-effort */
    }
  }
  listeners.forEach((listener) => listener());
}

/** Current dock offset (share of the game height above its bottom edge), re-rendering on change. */
export function useChatDockOffset(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => offset,
  );
}
