import type { OverlayRect, PanelId } from './types';

export const LAYOUT_STORAGE_KEY = 'pd2-overlay-layout-v1';

/** How much of a dragged panel must stay inside the overlay (CSS px). */
export const MIN_VISIBLE_PX = 40;

type Layout = Partial<Record<PanelId, OverlayRect>>;

function isRect(value: unknown): value is OverlayRect {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return ['x', 'y', 'width', 'height'].every((k) => typeof r[k] === 'number' && Number.isFinite(r[k]));
}

function readLayout(): Layout {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const layout: Layout = {};
    for (const [id, rect] of Object.entries(parsed)) {
      if (isRect(rect)) layout[id as PanelId] = rect;
    }
    return layout;
  } catch {
    return {};
  }
}

export function loadPanelRect(id: PanelId): OverlayRect | null {
  return readLayout()[id] ?? null;
}

export function savePanelRect(id: PanelId, rect: OverlayRect): void {
  try {
    const layout = readLayout();
    layout[id] = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* storage full/unavailable: layout persistence is best-effort */
  }
}

export function clearPanelRect(id: PanelId): void {
  try {
    const layout = readLayout();
    delete layout[id];
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* best-effort */
  }
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/** Fit `rect` fully inside `bounds`, shrinking it when it is larger (restored layouts, placements). */
export function clampRectInto(rect: OverlayRect, bounds: OverlayRect): OverlayRect {
  const width = Math.min(rect.width, bounds.width);
  const height = Math.min(rect.height, bounds.height);
  return {
    x: clamp(rect.x, bounds.x, bounds.x + bounds.width - width),
    y: clamp(rect.y, bounds.y, bounds.y + bounds.height - height),
    width,
    height,
  };
}

/** Keep at least `minVisible` px of `rect` inside `bounds` (dragging); the top edge never leaves the overlay. */
export function clampRectVisible(rect: OverlayRect, bounds: OverlayRect, minVisible = MIN_VISIBLE_PX): OverlayRect {
  const keepX = Math.min(minVisible, rect.width);
  const keepY = Math.min(minVisible, rect.height);
  return {
    ...rect,
    x: clamp(rect.x, bounds.x - rect.width + keepX, bounds.x + bounds.width - keepX),
    y: clamp(rect.y, bounds.y, bounds.y + bounds.height - keepY),
  };
}
