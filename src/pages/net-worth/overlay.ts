import type { NetWorthTickerAnchor } from '@/hooks/useOptions';
import type { OverlayRect } from '@/overlay';

/** Formats an HR amount for compact overlay display (1 decimal under 1000, none above). */
export function formatHr(value: number): string {
  return Math.abs(value) >= 1000 ? value.toFixed(0) : value.toFixed(1);
}

/** Formats an HR change with an explicit sign, e.g. `+3.1` / `-0.4`. */
export function formatSignedHr(value: number): string {
  return `${value >= 0 ? '+' : '-'}${formatHr(Math.abs(value))}`;
}

/** Default size of the net worth mini panel (registry `netWorthPanel`). */
export const NET_WORTH_PANEL_SIZE = { width: 360, height: 420 };

/** Gap (px) between the ticker and the edges of the game. */
const TICKER_EDGE_MARGIN = 12;
/** The chat button panel's default spot: 240px frame, 20px from the game's right edge, 10px from its bottom. */
const CHAT_BUTTON_FRAME = { size: 240, right: 20, bottom: 10 };

/** Moves `rect` the least distance needed to lie fully inside `area` (top-left wins if it is larger). */
export function clampToArea(rect: OverlayRect, area: OverlayRect): { x: number; y: number } {
  const x = Math.max(area.x, Math.min(rect.x, area.x + area.width - rect.width));
  const y = Math.max(area.y, Math.min(rect.y, area.y + area.height - rect.height));
  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Top-left (overlay px) of a `size` ticker at `anchor` on the game rect: a corner or top center inset by
 * TICKER_EDGE_MARGIN, or right-aligned just above the chat button's default spot.
 */
export function tickerPosition(
  anchor: Exclude<NetWorthTickerAnchor, 'custom'>,
  size: { width: number; height: number },
  game: OverlayRect,
): { x: number; y: number } {
  if (anchor === 'above-chat') {
    const chatRight = game.x + game.width - CHAT_BUTTON_FRAME.right;
    const chatTop = game.y + game.height - CHAT_BUTTON_FRAME.size - CHAT_BUTTON_FRAME.bottom;
    return { x: Math.round(chatRight - size.width), y: Math.round(chatTop - size.height - 4) };
  }
  const x = anchor.endsWith('left')
    ? game.x + TICKER_EDGE_MARGIN
    : anchor.endsWith('right')
      ? game.x + game.width - size.width - TICKER_EDGE_MARGIN
      : game.x + (game.width - size.width) / 2;
  const y = anchor.startsWith('bottom')
    ? game.y + game.height - size.height - TICKER_EDGE_MARGIN
    : game.y + TICKER_EDGE_MARGIN;
  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Where to open a `width`×`height` panel next to the ticker inside `area`: below it, or above when there is no
 * room below; left edges aligned, or right edges when it would overflow to the right; then kept inside `area`.
 */
export function panelBesideTicker(
  ticker: OverlayRect,
  panel: { width: number; height: number },
  area: OverlayRect,
  gap: number,
): { x: number; y: number } {
  let y = ticker.y + ticker.height + gap;
  if (y + panel.height > area.y + area.height) y = ticker.y - gap - panel.height;
  let x = ticker.x;
  if (x + panel.width > area.x + area.width) x = ticker.x + ticker.width - panel.width;
  return clampToArea({ x, y, ...panel }, area);
}
