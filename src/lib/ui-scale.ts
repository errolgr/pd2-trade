import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import windowConfig from '@/common/window-config.json';

/**
 * Overlay UI scale (percent): the Main webview's zoom, so text, spacing and panel sizes all grow together on
 * high-resolution monitors. CSS px then cover `scaleFactor * scale` physical px: convert screen coordinates with
 * `overlayPixelRatio` (game.ts); `window.devicePixelRatio` already includes the zoom.
 */
export const UI_SCALE_OPTIONS = [75, 90, 100, 110, 125, 150, 175, 200] as const;
export const UI_SCALE_DEFAULT = 100;
const UI_SCALE_MIN = UI_SCALE_OPTIONS[0];
const UI_SCALE_MAX = UI_SCALE_OPTIONS[UI_SCALE_OPTIONS.length - 1];
const UI_SCALE_STORAGE_KEY = 'pd2-ui-scale';

/** The only webview that zooms: the sign-in window is a fixed-size page. */
const ZOOMED_WEBVIEW = windowConfig.labels.Main;

let current = UI_SCALE_DEFAULT;

/** Clamps a saved scale (percent) to the supported range; anything invalid is 100%. */
export function clampUiScale(percent: number | undefined): number {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return UI_SCALE_DEFAULT;
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Math.round(percent)));
}

/** The applied zoom factor (1 = 100%). */
export function getUiZoom(): number {
  return current / 100;
}

/** Zooms the Main webview and caches the value for `initUiScale`'s first paint. No-op zoom outside Tauri. */
export function applyUiScale(percent: number | undefined): void {
  const scale = clampUiScale(percent);
  try {
    localStorage.setItem(UI_SCALE_STORAGE_KEY, String(scale));
  } catch {
    // localStorage unavailable: the next start zooms once settings load.
  }
  // The webview starts at 100% and keeps its zoom across reloads, which re-apply the cached value: skip no-ops.
  if (!isTauri() || scale === current) return;
  try {
    const webview = getCurrentWebview();
    if (webview.label !== ZOOMED_WEBVIEW) return;
    current = scale;
    webview.setZoom(scale / 100).catch((error) => console.warn('[ui-scale] setZoom failed:', error));
  } catch (error) {
    console.warn('[ui-scale] webview unavailable:', error);
  }
}

/** Called once from main.tsx before the first render: applies the cached scale (no 100% flash at startup). */
export function initUiScale(): void {
  let stored: number | undefined;
  try {
    const raw = localStorage.getItem(UI_SCALE_STORAGE_KEY);
    stored = raw === null ? undefined : Number(raw);
  } catch {
    stored = undefined;
  }
  applyUiScale(stored);
}
