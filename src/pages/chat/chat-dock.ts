import type { OverlayRect } from '@/overlay';

/**
 * The chat dock: a vertical pill in the game's bottom-right corner. That corner is a dead zone for game clicks: the
 * stone statue beside the mana orb, or the black bar when the game is pillarboxed. Teleport clicks near the screen
 * edges never land on it, so the pill can't swallow them.
 *
 * Its size follows the game height (the HUD art scales with it): 4% of the height wide, 2.75× as tall.
 */
const WIDTH_RATIO = 0.04;
const HEIGHT_PER_WIDTH = 2.75;
const INSET_RATIO = 0.008;
const MIN_WIDTH = 22;
const MAX_WIDTH = 64;

/** The chatButton panel frame (registry): click-through, room for the pill plus its menu opening up-left. */
export const CHAT_DOCK_FRAME = { width: 240, height: 560 };

/** Pill size (CSS px) and its inset from the game's right and bottom edges, for a game `height` tall. */
export function chatDockMetrics(height: number): { width: number; height: number; inset: number } {
  const width = Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, height * WIDTH_RATIO)));
  return { width, height: Math.round(width * HEIGHT_PER_WIDTH), inset: Math.round(height * INSET_RATIO) };
}

/** The pill's rect (overlay px) on `game`. */
export function chatDockRect(game: OverlayRect): OverlayRect {
  const { width, height, inset } = chatDockMetrics(game.height);
  return {
    x: game.x + game.width - inset - width,
    y: game.y + game.height - inset - height,
    width,
    height,
  };
}
