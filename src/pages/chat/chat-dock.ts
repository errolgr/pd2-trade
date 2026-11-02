import { useSyncExternalStore } from 'react';
import type { OverlayRect } from '@/overlay';

/**
 * The chat dock: a tab flush on the game's right edge (flat side against the edge). It starts in the bottom-right
 * corner, on the statue beside the mana orb, and can be dragged up or down along the edge; where it sits is saved as
 * a share of the game height, so it keeps its spot across resolutions.
 *
 * Its width follows the game height (the HUD art scales with it): 4% of the height. Its height holds a button per
 * favorite window, then the menu caret (chat + offers + caret, the default, is 2.75× the width).
 */
const WIDTH_RATIO = 0.04;
/** Height of a favorite window's button, in tab widths. */
const BUTTON_HEIGHT = 1;
/** Height of the menu caret, in tab widths (as a flex weight next to the buttons' 1). */
export const CARET_HEIGHT = 0.75;
const MIN_WIDTH = 22;
const MAX_WIDTH = 64;
/** Default gap between the tab and the game's bottom edge, as a share of the game height. */
const DEFAULT_OFFSET = 0.008;
const STORAGE_KEY = 'pd2-chat-dock-offset-v1';

/** The windows the dock's menu opens, in default menu order; any of them can be a favorite (its own tab button). */
export const CHAT_DOCK_ITEMS = [
  'chat',
  'market',
  'builds',
  'netWorth',
  'stashValue',
  'offers',
  'manageListings',
  'settings',
] as const;
export type ChatDockItem = (typeof CHAT_DOCK_ITEMS)[number];

/** Favorites until the user changes them. */
const DEFAULT_FAVORITES: readonly ChatDockItem[] = ['chat', 'offers'];

/** The user's menu: every window in their order, and the favorites among them (shown on the tab in that order). */
export interface ChatDockLayout {
  order: ChatDockItem[];
  favorites: ChatDockItem[];
}

/**
 * The dock layout from settings `chatDockOrder` / `chatDockFavorites`: known saved windows once in their saved order,
 * then any window missing from it (new ones) in default order; favorites default to chat + offers.
 */
export function chatDockLayout(saved: {
  chatDockOrder?: readonly string[];
  chatDockFavorites?: readonly string[];
}): ChatDockLayout {
  const known = (saved.chatDockOrder ?? []).filter(
    (item, i, all): item is ChatDockItem => CHAT_DOCK_ITEMS.includes(item as ChatDockItem) && all.indexOf(item) === i,
  );
  const order = [...known, ...CHAT_DOCK_ITEMS.filter((item) => !known.includes(item))];
  const favorites: readonly string[] = saved.chatDockFavorites ?? DEFAULT_FAVORITES;
  return { order, favorites: order.filter((item) => favorites.includes(item)) };
}

/** The chatButton panel frame width (registry, placement 'gameRight': full game height). Room for the menu. */
export const CHAT_DOCK_FRAME = { width: 240, height: 560 };

/** Tab width (CSS px) for a game `height` tall. */
export function chatDockWidth(height: number): number {
  return Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, height * WIDTH_RATIO)));
}

/** Tab size (CSS px) for a game `height` tall holding `buttons` favorites (the caret alone is square). */
export function chatDockSize(height: number, buttons: number): { width: number; height: number } {
  const width = chatDockWidth(height);
  return { width, height: Math.round(width * Math.max(1, buttons * BUTTON_HEIGHT + CARET_HEIGHT)) };
}

/** Clamps an offset (share of the game height between the game's bottom edge and the tab) so the tab stays inside. */
export function clampDockOffset(offset: number, gameHeight: number, buttons: number): number {
  const max = gameHeight > 0 ? Math.max(0, 1 - chatDockSize(gameHeight, buttons).height / gameHeight) : 0;
  return Math.min(max, Math.max(0, Number.isFinite(offset) ? offset : DEFAULT_OFFSET));
}

/** The tab's rect (overlay px) on `game` at `offset`, holding `buttons` favorites. */
export function chatDockRect(game: OverlayRect, offset: number, buttons: number): OverlayRect {
  const size = chatDockSize(game.height, buttons);
  const bottom = Math.round(clampDockOffset(offset, game.height, buttons) * game.height);
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
