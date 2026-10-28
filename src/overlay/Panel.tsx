import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import * as Sentry from '@sentry/react';
import { claimKeyboard, isHeldOverFullscreenGame, isKeyboardClaimed, releaseKeyboard } from './keyboard';
import { holdRegionLoop } from './region';
import { clampRectInto, clampRectVisible } from './layout-storage';
import { viewportRect } from './game';
import { isPanelVisible, useOverlay, useOverlayInternals } from './OverlayProvider';
import { PanelPortalContext } from './portal';
import type { OverlayRect, PanelId, PanelPayloads } from './types';

export interface PanelContextValue<K extends PanelId = PanelId> {
  id: K;
  payload: PanelPayloads[K];
  /** Increments on every openPanel(id, ...): use as an effect dep for "new search"/"new item". */
  payloadVersion: number;
  close(): void;
  /** Current panel rect (CSS px). */
  rect: OverlayRect;
  /** Programmatic move/resize (persisted when the panel persists). */
  setRect(r: Partial<OverlayRect>): void;
  /** Open and actually shown (not placing, not hidden by game blur): e.g. "the user can see this content". */
  visible: boolean;
}

const PanelContext = createContext<PanelContextValue | null>(null);

/** Only inside a panel component. */
export function usePanel<K extends PanelId>(): PanelContextValue<K> {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error('usePanel must be used inside a panel');
  return ctx as unknown as PanelContextValue<K>; // the caller names its own panel id; Panel provides the matching value
}

/** Elements that never start a drag even inside [data-panel-drag]. */
const NO_DRAG_SELECTOR = 'button, a, input, textarea, select, [role=button], [data-no-drag]';
const DEFAULT_MIN_SIZE = { width: 160, height: 80 };
/** Elements that take typed text (the only reason a panel takes the keyboard from the game). */
const TEXT_ENTRY_SELECTOR =
  'textarea, [contenteditable=""], [contenteditable="true"], ' +
  'input:not([type=button]):not([type=checkbox]):not([type=color]):not([type=file]):not([type=hidden])' +
  ':not([type=image]):not([type=radio]):not([type=range]):not([type=reset]):not([type=submit])';
/** Regions whose text the user selects and copies (Ctrl+C must reach the WebView, not the game). */
const KEEP_KEYBOARD_SELECTOR = '[data-keep-keyboard]';

function textEntryAt(target: EventTarget | null): HTMLElement | null {
  const field = target instanceof Element ? target.closest<HTMLElement>(TEXT_ENTRY_SELECTOR) : null;
  return field && !(field as HTMLInputElement).disabled ? field : null;
}

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const EDGES: Record<Edge, { className: string; cursor: string }> = {
  n: { className: 'top-0 left-2 right-2 h-1.5', cursor: 'ns-resize' },
  s: { className: 'bottom-0 left-2 right-2 h-1.5', cursor: 'ns-resize' },
  e: { className: 'right-0 top-2 bottom-2 w-1.5', cursor: 'ew-resize' },
  w: { className: 'left-0 top-2 bottom-2 w-1.5', cursor: 'ew-resize' },
  ne: { className: 'top-0 right-0 size-3', cursor: 'nesw-resize' },
  sw: { className: 'bottom-0 left-0 size-3', cursor: 'nesw-resize' },
  nw: { className: 'top-0 left-0 size-3', cursor: 'nwse-resize' },
  se: { className: 'bottom-0 right-0 size-3', cursor: 'nwse-resize' },
};

/** Resize `start` by pointer delta (dx, dy) from `edge`, honouring the min size and the overlay bounds. */
export function resizeRect(
  start: OverlayRect,
  edge: Edge,
  dx: number,
  dy: number,
  min: { width: number; height: number },
  bounds: OverlayRect,
): OverlayRect {
  let { x, y, width, height } = start;
  if (edge.includes('e')) width = Math.max(min.width, Math.min(start.width + dx, bounds.x + bounds.width - x));
  if (edge.includes('s')) height = Math.max(min.height, Math.min(start.height + dy, bounds.y + bounds.height - y));
  if (edge.includes('w')) {
    const right = start.x + start.width;
    x = Math.min(Math.max(bounds.x, start.x + dx), right - min.width);
    width = right - x;
  }
  if (edge.includes('n')) {
    const bottom = start.y + start.height;
    y = Math.min(Math.max(bounds.y, start.y + dy), bottom - min.height);
    height = bottom - y;
  }
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

/** Panel frame: position/size, drag via [data-panel-drag], resize, z-order and keyboard policy. */
export const Panel: React.FC<{ id: PanelId }> = ({ id }) => {
  const { defs, state, gameFocused, commitRect } = useOverlayInternals();
  const { bringToFront, closePanel } = useOverlay();
  const def = defs[id];
  const panel = state.panels[id];
  const frameRef = useRef<HTMLDivElement>(null);
  // State, not a ref: portal consumers re-render once the layer exists.
  const [portalLayer, setPortalLayer] = useState<HTMLDivElement | null>(null);

  const close = useCallback(() => closePanel(id), [closePanel, id]);
  const setRect = useCallback((r: Partial<OverlayRect>) => commitRect(id, r), [commitRect, id]);
  const rect = panel?.rect ?? { x: 0, y: 0, ...def.size };
  const visible = isPanelVisible(def, panel, gameFocused);

  const ctx = useMemo<PanelContextValue>(
    () => ({
      id,
      payload: panel?.payload as PanelPayloads[PanelId],
      payloadVersion: panel?.payloadVersion ?? 0,
      close,
      rect,
      setRect,
      visible,
    }),
    // rect fields instead of the object: a new rect with the same values must not re-render the content
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, panel?.payload, panel?.payloadVersion, close, setRect, rect.x, rect.y, rect.width, rect.height, visible],
  );

  // Drag/resize mutate the frame's style directly and commit once on release (no per-move re-render).
  const startGesture = (e: React.PointerEvent<HTMLElement>, move: (dx: number, dy: number) => OverlayRect) => {
    const frame = frameRef.current;
    if (!frame) return;
    e.preventDefault();
    e.stopPropagation();
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    let latest: OverlayRect | null = null;
    const release = holdRegionLoop();
    frame.setPointerCapture(pointerId);

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      latest = move(ev.clientX - startX, ev.clientY - startY);
      frame.style.left = `${latest.x}px`;
      frame.style.top = `${latest.y}px`;
      frame.style.width = `${latest.width}px`;
      frame.style.height = `${latest.height}px`;
    };
    const onEnd = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      frame.removeEventListener('pointermove', onMove);
      frame.removeEventListener('pointerup', onEnd);
      frame.removeEventListener('pointercancel', onEnd);
      if (frame.hasPointerCapture(pointerId)) frame.releasePointerCapture(pointerId);
      release();
      if (latest) commitRect(id, latest);
    };
    frame.addEventListener('pointermove', onMove);
    frame.addEventListener('pointerup', onEnd);
    frame.addEventListener('pointercancel', onEnd);
  };

  const onPointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    bringToFront(id);
    if (def.keyboard !== 'onPointerDown') return;
    // Take the keyboard only to type or to copy selected text: anything else leaves the game in front (and its
    // sound playing). Over a fullscreen game the panel stays in front instead: handing the foreground back would
    // hide it (see showOverFullscreenGame).
    const field = textEntryAt(e.target);
    if (field) {
      void claimKeyboard().then(() => {
        if (field.isConnected && document.activeElement !== field) field.focus();
      });
    } else if (e.target instanceof Element && e.target.closest(KEEP_KEYBOARD_SELECTOR)) {
      void claimKeyboard();
    } else if (isKeyboardClaimed() && !isHeldOverFullscreenGame()) {
      void releaseKeyboard();
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !(e.target instanceof Element)) return;
    const handle = e.target.closest('[data-panel-drag]');
    if (!handle || !e.currentTarget.contains(handle) || e.target.closest(NO_DRAG_SELECTOR)) return;
    const start = rect;
    // 'children' frames are transparent around their content (the chat button orb): keep the whole frame on
    // screen, a 40px sliver of an empty frame could leave the content off-screen.
    const clamp = def.interactive === 'children' ? clampRectInto : clampRectVisible;
    startGesture(e, (dx, dy) => clamp({ ...start, x: start.x + dx, y: start.y + dy }, viewportRect()));
  };

  const onResizeDown = (edge: Edge) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const start = clampRectInto(rect, viewportRect());
    const min = def.minSize ?? DEFAULT_MIN_SIZE;
    startGesture(e, (dx, dy) => resizeRect(start, edge, dx, dy, min, viewportRect()));
  };

  if (!panel) return null;
  const Content = def.component;
  const childrenInteractive = def.interactive === 'children';

  return (
    // Positioned with left/top only: no transform/filter/contain on the frame, so fixed popper content in the
    // portal layer stays viewport-positioned and escapes the frame.
    <div
      ref={frameRef}
      data-interactive={childrenInteractive ? undefined : 'true'}
      data-panel-id={id}
      className={childrenInteractive ? 'pointer-events-none absolute' : 'pointer-events-auto absolute'}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        zIndex: 10 + panel.z,
        display: visible ? undefined : 'none',
      }}
      onPointerDownCapture={onPointerDownCapture}
      onPointerDown={onPointerDown}
    >
      <PanelContext.Provider value={ctx}>
        <PanelPortalContext.Provider value={portalLayer}>
          <Sentry.ErrorBoundary
            fallback={({ resetError }) => (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border bg-popover p-4 text-sm text-popover-foreground">
                <span>This panel crashed.</span>
                <button
                  type="button"
                  className="rounded-md bg-muted px-2.5 py-1 text-xs"
                  onClick={() => {
                    resetError();
                    close();
                  }}
                >
                  Close
                </button>
              </div>
            )}
          >
            <Content />
          </Sentry.ErrorBoundary>
        </PanelPortalContext.Provider>
      </PanelContext.Provider>
      {def.resizable &&
        (Object.keys(EDGES) as Edge[]).map((edge) => (
          <div
            key={edge}
            data-no-drag
            className={`absolute ${EDGES[edge].className}`}
            style={{ cursor: EDGES[edge].cursor, zIndex: 1 }}
            onPointerDown={onResizeDown(edge)}
          />
        ))}
      {/* Portal layer: Radix portals of this panel render here. Click-through itself; its direct children
          (popper wrappers, dialog/sheet overlay + content) take clicks even inside a 'children' frame. Clips
          only absolute children (panel sheets); fixed poppers escape. */}
      <div
        ref={setPortalLayer}
        data-panel-portal
        className="pointer-events-none absolute inset-0 overflow-hidden [&>*]:pointer-events-auto"
      />
    </div>
  );
};
