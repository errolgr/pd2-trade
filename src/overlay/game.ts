import { useEffect, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@/lib/browser-events';
import { holdListener } from '@/lib/listener';
import { cursorPosition, getCurrentWindow } from '@tauri-apps/api/window';
import type { OverlayRect } from './types';

/** Same debounce the old visibility manager used before hiding windows on focus loss. */
export const GAME_BLUR_DEBOUNCE_MS = 500;
const RECT_REFRESH_MS = 2000;

/** Diablo II's render aspect (PD2's 1068x600). */
export const GAME_ASPECT = 16 / 9;
/** Wider than this counts as pillarboxed; absorbs rounding such as 1366x768. */
const PILLARBOX_TOLERANCE = 1.01;

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The part of the Diablo II window the game draws in and traps the cursor in. Fullscreen on a monitor wider than
 * 16:9 (21:9, 32:9) the window spans the monitor but the game is pillarboxed to a centered 16:9 area, so UI
 * anchored to the window edges would sit in the black bars, out of the cursor's reach. Up to 16:9 (incl. 16:10)
 * and in windowed mode the window rect is returned as is.
 */
export function gamePlayRect(rect: ScreenRect): ScreenRect {
  if (rect.height <= 0 || rect.width <= rect.height * GAME_ASPECT * PILLARBOX_TOLERANCE) return rect;
  const width = Math.round(rect.height * GAME_ASPECT);
  return { x: rect.x + Math.round((rect.width - width) / 2), y: rect.y, width, height: rect.height };
}

export function viewportRect(): OverlayRect {
  return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
}

/** Physical screen rect → CSS px relative to Main, given Main's outer position and scale factor. */
export function screenToOverlayRect(
  rect: ScreenRect,
  outer: { x: number; y: number },
  scaleFactor: number,
): OverlayRect {
  return {
    x: (rect.x - outer.x) / scaleFactor,
    y: (rect.y - outer.y) / scaleFactor,
    width: rect.width / scaleFactor,
    height: rect.height / scaleFactor,
  };
}

export const sameRect = (a: OverlayRect, b: OverlayRect) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

// Browser fallback for 'cursor' placement: the last pointer position seen by the page.
let lastPointer: { x: number; y: number } | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      lastPointer = { x: e.clientX, y: e.clientY };
    },
    { passive: true, capture: true },
  );
}

/** Current OS cursor in overlay CSS px (Tauri), else the last pointer position or the viewport center. */
export async function getCursorPoint(): Promise<{ x: number; y: number }> {
  if (isTauri()) {
    try {
      const win = getCurrentWindow();
      const [cursor, outer, sf] = await Promise.all([cursorPosition(), win.outerPosition(), win.scaleFactor()]);
      return { x: (cursor.x - outer.x) / sf, y: (cursor.y - outer.y) / sf };
    } catch (error) {
      console.warn('[overlay] cursorPosition failed:', error);
    }
  }
  return lastPointer ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

async function fetchGameRect(): Promise<OverlayRect> {
  const rect = await invoke<ScreenRect | null>('get_diablo_rect');
  if (!rect) return viewportRect();
  const win = getCurrentWindow();
  const [outer, sf] = await Promise.all([win.outerPosition(), win.scaleFactor()]);
  return screenToOverlayRect(gamePlayRect(rect), outer, sf);
}

/**
 * Game rect (CSS px relative to the overlay: the game's play area, see gamePlayRect; the viewport when there is no
 * game / in a browser) and
 * debounced game focus: false only after GAME_BLUR_DEBOUNCE_MS outside the game context (Rust window::focus:
 * Diablo in front, or the overlay entered from it). The overlay having focus on its own isn't the game: Settings
 * opened from the tray takes focus to type without bringing the in-game panels back.
 */
export function useGameState(): { gameRect: OverlayRect; gameFocused: boolean } {
  const [gameRect, setGameRect] = useState<OverlayRect>(viewportRect);
  // Tauri: hidden until the game context is known, so in-game panels don't flash at startup outside the game
  const [gameFocused, setGameFocused] = useState(() => !isTauri());
  const rectRef = useRef(gameRect);

  useEffect(() => {
    let disposed = false;
    const releases: (() => void)[] = [];
    const applyRect = (next: OverlayRect) => {
      if (disposed || sameRect(rectRef.current, next)) return;
      rectRef.current = next;
      setGameRect(next);
    };

    if (!isTauri()) {
      const onResize = () => applyRect(viewportRect());
      window.addEventListener('resize', onResize);
      return () => {
        disposed = true;
        window.removeEventListener('resize', onResize);
      };
    }

    let inGame = false;
    let blurTimer: ReturnType<typeof setTimeout> | undefined;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    const refreshRect = () => {
      fetchGameRect()
        .then(applyRect)
        .catch((error) => console.warn('[overlay] get_diablo_rect failed:', error));
    };
    const setRefreshing = (on: boolean) => {
      if (on && !refreshTimer) refreshTimer = setInterval(refreshRect, RECT_REFRESH_MS);
      if (!on && refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
    };
    const updateFocus = () => {
      if (disposed) return;
      if (inGame) {
        clearTimeout(blurTimer);
        blurTimer = undefined;
        setGameFocused(true);
        setRefreshing(true);
      } else if (!blurTimer) {
        blurTimer = setTimeout(() => {
          blurTimer = undefined;
          if (disposed || inGame) return;
          setGameFocused(false);
          setRefreshing(false);
        }, GAME_BLUR_DEBOUNCE_MS);
      }
    };

    refreshRect();
    invoke<boolean>('is_diablo_focused')
      .then((focused) => {
        inGame = focused;
        updateFocus();
      })
      .catch(() => updateFocus());

    const win = getCurrentWindow();
    releases.push(
      holdListener(
        listen<boolean>('diablo-focus-changed', ({ payload }) => {
          inGame = payload;
          updateFocus();
          refreshRect();
        }),
        'diablo-focus-changed',
      ),
      holdListener(win.onMoved(refreshRect), 'window moved'),
      holdListener(win.onResized(refreshRect), 'window resized'),
    );

    return () => {
      disposed = true;
      releases.forEach((release) => release());
      clearTimeout(blurTimer);
      setRefreshing(false);
    };
  }, []);

  return { gameRect, gameFocused };
}
