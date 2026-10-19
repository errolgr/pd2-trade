import { useEffect } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';

/** Physical px relative to Main's top-left (Rust `RegionRect`). */
export interface RegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Everything that must receive clicks; the rest of the transparent overlay is click-through. */
export const INTERACTIVE_SELECTOR = [
  '[data-interactive="true"]',
  '[data-radix-popper-content-wrapper]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[data-sonner-toast]',
  '[data-overlay-interactive]',
].join(', ');

export const REGION_PADDING = 4;

/** CSS rect → physical px: scale by dpr, floor the top-left, ceil the bottom-right, pad, clamp at 0. Null when empty. */
export function toRegionRect(
  rect: { left: number; top: number; right: number; bottom: number; width: number; height: number },
  dpr: number,
  pad = REGION_PADDING,
): RegionRect | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const left = Math.max(0, Math.floor(rect.left * dpr) - pad);
  const top = Math.max(0, Math.floor(rect.top * dpr) - pad);
  const right = Math.ceil(rect.right * dpr) + pad;
  const bottom = Math.ceil(rect.bottom * dpr) + pad;
  if (right <= left || bottom <= top) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Converts and de-duplicates rects (identical rects collapse into one), keeping document order. */
export function buildRegion(rects: Iterable<Parameters<typeof toRegionRect>[0]>, dpr: number): RegionRect[] {
  const seen = new Set<string>();
  const out: RegionRect[] = [];
  for (const rect of rects) {
    const r = toRegionRect(rect, dpr);
    if (!r) continue;
    const key = `${r.x},${r.y},${r.width},${r.height}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export function regionsEqual(a: RegionRect[] | null, b: RegionRect[]): boolean {
  if (!a || a.length !== b.length) return false;
  return a.every((r, i) => r.x === b[i].x && r.y === b[i].y && r.width === b[i].width && r.height === b[i].height);
}

export function collectRegion(root: ParentNode = document, dpr = window.devicePixelRatio || 1): RegionRect[] {
  const elements = Array.from(root.querySelectorAll(INTERACTIVE_SELECTOR));
  return buildRegion(
    elements.map((el) => el.getBoundingClientRect()),
    dpr,
  );
}

// ---- scheduler (module level so Panel drag/resize can drive the rAF loop) ----

let lastSent: RegionRect[] | null = null;
let frame: number | null = null;
let loopHolders = 0;
let enabled = false;

function flush() {
  frame = null;
  if (!enabled) return;
  const rects = collectRegion();
  if (!regionsEqual(lastSent, rects)) {
    lastSent = rects;
    invoke('set_interactive_region', { rects }).catch((error) => {
      lastSent = null; // resend next time
      console.warn('[overlay] set_interactive_region failed:', error);
    });
  }
  if (loopHolders > 0) frame = requestAnimationFrame(flush);
}

/** Coalesced: at most one region send per animation frame. No-op outside Tauri. */
export function requestRegionSync(): void {
  if (!enabled || frame !== null) return;
  frame = requestAnimationFrame(flush);
}

/** Keep syncing every frame while a drag/resize is active. Returns the release function. */
export function holdRegionLoop(): () => void {
  loopHolders += 1;
  requestRegionSync();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    loopHolders = Math.max(0, loopHolders - 1);
    requestRegionSync();
  };
}

/** Keeps Main's OS input region equal to the union of interactive elements. Tauri only. */
export function useRegionSync(): void {
  useEffect(() => {
    if (!isTauri()) return;
    enabled = true;
    lastSent = null;
    const sync = () => requestRegionSync();

    const mutations = new MutationObserver(sync);
    mutations.observe(document.body, { subtree: true, childList: true, attributes: true });
    const resizes = new ResizeObserver(sync);
    resizes.observe(document.body);
    window.addEventListener('resize', sync);
    document.addEventListener('transitionend', sync, true);
    document.addEventListener('animationend', sync, true);
    sync();

    return () => {
      enabled = false;
      mutations.disconnect();
      resizes.disconnect();
      window.removeEventListener('resize', sync);
      document.removeEventListener('transitionend', sync, true);
      document.removeEventListener('animationend', sync, true);
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    };
  }, []);
}
