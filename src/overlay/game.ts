import { useEffect, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@/lib/browser-events';
import { cursorPosition, getCurrentWindow } from '@tauri-apps/api/window';
import type { OverlayRect } from './types';

/** Same debounce the old visibility manager used before hiding windows on focus loss. */
export const GAME_BLUR_DEBOUNCE_MS = 500;
const RECT_REFRESH_MS = 2000;

interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
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
  return screenToOverlayRect(rect, outer, sf);
}

/**
 * Game rect (CSS px relative to the overlay; the viewport when there is no game / in a browser) and
 * debounced game focus: false only after GAME_BLUR_DEBOUNCE_MS of neither Diablo nor Main being foreground.
 */
export function useGameState(): { gameRect: OverlayRect; gameFocused: boolean } {
  const [gameRect, setGameRect] = useState<OverlayRect>(viewportRect);
  const [gameFocused, setGameFocused] = useState(true);
  const rectRef = useRef(gameRect);

  useEffect(() => {
    let disposed = false;
    const unlisteners: (() => void)[] = [];
    const track = (p: Promise<() => void>) =>
      p
        .then((off) => (disposed ? off() : unlisteners.push(off)))
        .catch((error) => console.warn('[overlay] listener failed:', error));
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

    let diabloFocused = true;
    let mainFocused = false;
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
      const focused = diabloFocused || mainFocused;
      if (focused) {
        clearTimeout(blurTimer);
        blurTimer = undefined;
        setGameFocused(true);
        setRefreshing(true);
      } else if (!blurTimer) {
        blurTimer = setTimeout(() => {
          blurTimer = undefined;
          if (disposed || diabloFocused || mainFocused) return;
          setGameFocused(false);
          setRefreshing(false);
        }, GAME_BLUR_DEBOUNCE_MS);
      }
    };

    refreshRect();
    invoke<boolean>('is_diablo_focused')
      .then((focused) => {
        diabloFocused = focused;
        updateFocus();
      })
      .catch(() => updateFocus());

    track(
      listen<boolean>('diablo-focus-changed', ({ payload }) => {
        diabloFocused = payload;
        updateFocus();
        refreshRect();
      }),
    );
    const win = getCurrentWindow();
    track(
      win.onFocusChanged(({ payload }) => {
        mainFocused = payload;
        updateFocus();
      }),
    );
    track(win.onMoved(refreshRect));
    track(win.onResized(refreshRect));

    return () => {
      disposed = true;
      unlisteners.forEach((off) => off());
      clearTimeout(blurTimer);
      setRefreshing(false);
    };
  }, []);

  return { gameRect, gameFocused };
}
