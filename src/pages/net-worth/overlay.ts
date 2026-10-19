import { availableMonitors } from '@tauri-apps/api/window';

/** App event: toggle the net worth mini panel window (emitted by the ticker, handled by NetWorthOverlayHost). */
export const NETWORTH_TOGGLE_PANEL_EVENT = 'networth:toggle-panel';

/** Formats an HR amount for compact overlay display (1 decimal under 1000, none above). */
export function formatHr(value: number): string {
  return Math.abs(value) >= 1000 ? value.toFixed(0) : value.toFixed(1);
}

/** Formats an HR change with an explicit sign, e.g. `+3.1` / `-0.4`. */
export function formatSignedHr(value: number): string {
  return `${value >= 0 ? '+' : '-'}${formatHr(Math.abs(value))}`;
}

/** A rectangle in physical screen pixels. */
export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlapArea(a: ScreenRect, b: ScreenRect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function centerDistance(a: ScreenRect, b: ScreenRect): number {
  return Math.hypot(a.x + a.width / 2 - (b.x + b.width / 2), a.y + a.height / 2 - (b.y + b.height / 2));
}

/** A monitor's work area (physical pixels) and its scale factor. */
export interface ScreenArea extends ScreenRect {
  scaleFactor: number;
}

/** Work areas (screen minus taskbar/dock) of every connected monitor. */
export async function monitorWorkAreas(): Promise<ScreenArea[]> {
  const monitors = await availableMonitors();
  return monitors.map(({ workArea, scaleFactor }) => ({
    x: workArea.position.x,
    y: workArea.position.y,
    width: workArea.size.width,
    height: workArea.size.height,
    scaleFactor,
  }));
}

/** The area `rect` is mostly on: largest overlap, else the nearest area (e.g. its monitor was unplugged). */
export function pickArea<T extends ScreenRect>(rect: ScreenRect, areas: T[]): T | null {
  let best: T | null = null;
  let bestOverlap = 0;
  for (const area of areas) {
    const overlap = overlapArea(rect, area);
    if (overlap > bestOverlap) {
      best = area;
      bestOverlap = overlap;
    }
  }
  if (best) return best;
  return areas.reduce<T | null>(
    (nearest, area) => (!nearest || centerDistance(rect, area) < centerDistance(rect, nearest) ? area : nearest),
    null,
  );
}

/** Moves `rect` the least distance needed to lie fully inside `area` (top-left wins if it is larger). */
export function clampToArea(rect: ScreenRect, area: ScreenRect): { x: number; y: number } {
  const x = Math.max(area.x, Math.min(rect.x, area.x + area.width - rect.width));
  const y = Math.max(area.y, Math.min(rect.y, area.y + area.height - rect.height));
  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Where to open a `width`×`height` panel next to the ticker inside `area`: below it, or above when there is no
 * room below; left edges aligned, or right edges when it would overflow to the right; then kept inside `area`.
 */
export function panelBesideTicker(
  ticker: ScreenRect,
  panel: { width: number; height: number },
  area: ScreenRect,
  gap: number,
): { x: number; y: number } {
  let y = ticker.y + ticker.height + gap;
  if (y + panel.height > area.y + area.height) y = ticker.y - gap - panel.height;
  let x = ticker.x;
  if (x + panel.width > area.x + area.width) x = ticker.x + ticker.width - panel.width;
  return clampToArea({ x, y, ...panel }, area);
}
