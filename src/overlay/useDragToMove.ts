import type React from 'react';
import { useRef } from 'react';
import type { OverlayRect } from './types';
import { clampToArea } from '@/pages/net-worth/overlay';

/** Pointer travel (px) before a press becomes a drag instead of a click. */
const DRAG_THRESHOLD_PX = 4;

/** The whole overlay window, in overlay px. */
export const overlayViewport = (): OverlayRect => ({
  x: 0,
  y: 0,
  width: window.innerWidth,
  height: window.innerHeight,
});

/**
 * Drag-to-move for a small self-placing panel (tickers): spread `handlers` on the grab element. A press that
 * travels DRAG_THRESHOLD_PX moves the panel (kept inside the overlay) and calls `onDragEnd` on release; the click
 * that follows a drag is swallowed, so gate the element's onClick on `consumeDragClick()`. `dragging` is true
 * mid-drag (self-placement must not snap the panel back meanwhile).
 */
export function useDragToMove(rect: OverlayRect, setRect: (r: Partial<OverlayRect>) => void, onDragEnd: () => void) {
  const pressRef = useRef<{ x: number; y: number; origin: OverlayRect } | null>(null);
  const dragging = useRef(false);
  const suppressClickRef = useRef(false);

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    suppressClickRef.current = false;
    pressRef.current = null;
    if (event.button !== 0) return;
    pressRef.current = { x: event.clientX, y: event.clientY, origin: rect };
    // Keep receiving moves when a fast drag leaves the small element before the threshold
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const press = pressRef.current;
    if (!press) return;
    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    if (!dragging.current) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      dragging.current = true;
      suppressClickRef.current = true;
    }
    setRect(clampToArea({ ...press.origin, x: press.origin.x + dx, y: press.origin.y + dy }, overlayViewport()));
  };
  const endPress = () => {
    pressRef.current = null;
    if (!dragging.current) return;
    dragging.current = false;
    onDragEnd();
  };
  /** True (once) when the click is the tail of a drag and must be ignored. */
  const consumeDragClick = () => {
    const suppressed = suppressClickRef.current;
    suppressClickRef.current = false;
    return suppressed;
  };

  return {
    dragging,
    consumeDragClick,
    handlers: { onPointerDown, onPointerMove, onPointerUp: endPress, onPointerCancel: endPress },
  };
}
