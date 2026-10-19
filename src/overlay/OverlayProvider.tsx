import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { claimKeyboard, isKeyboardClaimed, releaseKeyboard, trackKeyboardFocus } from './keyboard';
import { getCursorPoint, sameRect, useGameState, viewportRect } from './game';
import { clampRectInto, loadPanelRect, savePanelRect } from './layout-storage';
import { setToastBridge } from './toast';
import { installDevHook } from './dev';
import type { OpenOptions, OverlayRect, PanelDef, PanelDefs, PanelId, PanelPayloads, Placement } from './types';

// ---------------------------------------------------------------------------------------------------------------------
// Pure state machine
// ---------------------------------------------------------------------------------------------------------------------

export interface PanelState {
  open: boolean;
  payload: unknown;
  /** Increments on every openPanel(id, ...). */
  payloadVersion: number;
  rect: OverlayRect;
  z: number;
  /** Waiting for an async placement (cursor); rendered display:none until placed. */
  placing: boolean;
  /** Game-relative placement the rect follows when the game rect changes; null once moved/resized/restored. */
  anchor: Placement | null;
}

export interface OverlayState {
  panels: Partial<Record<PanelId, PanelState>>;
  topZ: number;
}

export type OverlayAction =
  | { type: 'open'; id: PanelId; payload: unknown; rect?: OverlayRect; placing?: boolean; anchor?: Placement | null }
  | { type: 'place'; id: PanelId; rect: OverlayRect }
  | { type: 'close'; id: PanelId }
  | { type: 'setRect'; id: PanelId; rect: Partial<OverlayRect> }
  | { type: 'front'; id: PanelId };

/** keepMounted panels exist (closed) from the start so their listeners run before the first open. */
export function initialOverlayState(defs: PanelDefs): OverlayState {
  const panels: OverlayState['panels'] = {};
  for (const def of Object.values(defs)) {
    if (!def.keepMounted) continue;
    panels[def.id] = {
      open: false,
      payload: undefined,
      payloadVersion: 0,
      rect: { x: 0, y: 0, ...def.size },
      z: 0,
      placing: false,
      anchor: null,
    };
  }
  return { panels, topZ: 0 };
}

export function overlayReducer(state: OverlayState, action: OverlayAction): OverlayState {
  const current = state.panels[action.id];
  const withPanel = (panel: PanelState, topZ = state.topZ): OverlayState => ({
    panels: { ...state.panels, [action.id]: panel },
    topZ,
  });

  switch (action.type) {
    case 'open': {
      const topZ = state.topZ + 1;
      return withPanel(
        {
          open: true,
          payload: action.payload,
          payloadVersion: (current?.payloadVersion ?? 0) + 1,
          rect: action.rect ?? current?.rect ?? { x: 0, y: 0, width: 0, height: 0 },
          z: topZ,
          placing: action.placing ?? (action.rect ? false : (current?.placing ?? false)),
          anchor: action.rect ? (action.anchor ?? null) : (current?.anchor ?? null),
        },
        topZ,
      );
    }
    case 'place':
      if (!current?.open) return state;
      return withPanel({ ...current, rect: action.rect, placing: false });
    case 'close':
      if (!current?.open) return state;
      // payload/version survive: keepMounted components stay mounted; other panels unmount while closed
      return withPanel({ ...current, open: false, placing: false });
    case 'setRect':
      if (!current) return state;
      return withPanel({ ...current, rect: { ...current.rect, ...action.rect }, anchor: null });
    case 'front':
      if (!current || current.z === state.topZ) return state;
      return withPanel({ ...current, z: state.topZ + 1 }, state.topZ + 1);
  }
}

/** True when the panel occupies the screen: open, placed and not hidden by game blur. */
export function isPanelVisible(def: PanelDef, panel: PanelState | undefined, gameFocused: boolean): boolean {
  return !!panel?.open && !panel.placing && !(def.hideOnGameBlur && !gameFocused);
}

const isGameAnchored = (placement: Placement): placement is 'gameCenter' | 'gameRight' | 'gameBottomRight' =>
  placement === 'gameCenter' || placement === 'gameRight' || placement === 'gameBottomRight';

export const GAME_BOTTOM_RIGHT_MARGIN = { right: 20, bottom: 10 };

/** Placement → rect (CSS px), clamped fully into the viewport. `cursor` must be provided for 'cursor'. */
export function computePlacement(
  placement: Placement,
  size: { width: number; height: number },
  game: OverlayRect,
  viewport: OverlayRect,
  cursor?: { x: number; y: number },
): OverlayRect {
  let rect: OverlayRect;
  if (typeof placement === 'object') {
    rect = { ...placement, ...size };
  } else {
    switch (placement) {
      case 'gameCenter':
        rect = { x: game.x + (game.width - size.width) / 2, y: game.y + (game.height - size.height) / 2, ...size };
        break;
      case 'gameRight':
        rect = { x: game.x + game.width - size.width, y: game.y, width: size.width, height: game.height };
        break;
      case 'gameBottomRight':
        rect = {
          x: game.x + game.width - size.width - GAME_BOTTOM_RIGHT_MARGIN.right,
          y: game.y + game.height - size.height - GAME_BOTTOM_RIGHT_MARGIN.bottom,
          ...size,
        };
        break;
      case 'screenCenter':
        rect = {
          x: viewport.x + (viewport.width - size.width) / 2,
          y: viewport.y + (viewport.height - size.height) / 2,
          ...size,
        };
        break;
      case 'cursor': {
        const at = cursor ?? { x: viewport.width / 2, y: viewport.height / 2 };
        rect = { x: at.x, y: at.y, ...size };
        break;
      }
    }
  }
  const clamped = clampRectInto(rect, viewport);
  return {
    x: Math.round(clamped.x),
    y: Math.round(clamped.y),
    width: Math.round(clamped.width),
    height: Math.round(clamped.height),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// React
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Stable across panel state changes (open/close/front/setRect): hotkey and listener effects that depend on it
 * do not re-run on every transition. Only gameRect/gameFocused changes produce a new value.
 */
export interface OverlayApi {
  /** Opens or, if open, updates payload + brings to front (OpenOptions.keepPayload: only brings to front). */
  openPanel<K extends PanelId>(id: K, payload?: PanelPayloads[K], opts?: OpenOptions): void;
  closePanel(id: PanelId): void;
  /** Closes if open & visible, else opens. */
  togglePanel<K extends PanelId>(id: K, payload?: PanelPayloads[K], opts?: OpenOptions): void;
  /** Snapshot read at call time; does not re-render the caller when it changes. */
  isOpen(id: PanelId): boolean;
  bringToFront(id: PanelId): void;
  /** CSS px relative to the overlay viewport; the viewport when no game / browser. */
  gameRect: OverlayRect;
  /** Debounced: false only after 500ms of Diablo (and us) not being foreground. */
  gameFocused: boolean;
}

/** Same delay the old per-window focus-loss handler used before hiding its window. */
export const CLOSE_ON_BLUR_MS = 150;

interface OverlayInternals {
  defs: PanelDefs;
  state: OverlayState;
  gameFocused: boolean;
  /** Commit a panel rect (drag/resize end, usePanel().setRect); persisted when def.persist. */
  commitRect(id: PanelId, rect: Partial<OverlayRect>): void;
}

const OverlayContext = createContext<OverlayApi | null>(null);
const OverlayInternalContext = createContext<OverlayInternals | null>(null);

export function useOverlay(): OverlayApi {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlay must be used inside <OverlayProvider>');
  return ctx;
}

export function useOverlayInternals(): OverlayInternals {
  const ctx = useContext(OverlayInternalContext);
  if (!ctx) throw new Error('Overlay internals used outside <OverlayProvider>');
  return ctx;
}

/** Reactive `isOpen`: re-renders the caller on every overlay state change, so keep it to light components. */
export function usePanelOpen(id: PanelId): boolean {
  return !!useOverlayInternals().state.panels[id]?.open;
}

export const OverlayProvider: React.FC<{ defs: PanelDefs; children?: React.ReactNode }> = ({ defs, children }) => {
  const [state, setState] = useState(() => initialOverlayState(defs));
  const stateRef = useRef(state);
  const { gameRect, gameFocused } = useGameState();
  const gameRef = useRef({ gameRect, gameFocused });
  // Layout effect: callbacks and the reflow effect below read the committed game state
  useLayoutEffect(() => {
    gameRef.current = { gameRect, gameFocused };
  }, [gameRect, gameFocused]);
  const placeTokens = useRef<Partial<Record<PanelId, number>>>({});

  // Synchronous reducer so back-to-back calls (open then toggle in one tick) see each other's result.
  const apply = useCallback((action: OverlayAction) => {
    const next = overlayReducer(stateRef.current, action);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setState(next);
  }, []);

  const commitRect = useCallback(
    (id: PanelId, rect: Partial<OverlayRect>) => {
      apply({ type: 'setRect', id, rect });
      const panel = stateRef.current.panels[id];
      if (defs[id].persist && panel) savePanelRect(id, panel.rect);
    },
    [apply, defs],
  );

  const openPanel = useCallback(
    <K extends PanelId>(id: K, payload?: PanelPayloads[K], opts: OpenOptions = {}) => {
      const def = defs[id];
      const current = stateRef.current.panels[id];

      if (current?.open && !opts.reposition) {
        // An in-flight cursor placement (placing) keeps its token, so it still places the panel.
        apply(opts.keepPayload ? { type: 'front', id } : { type: 'open', id, payload });
      } else {
        // A new placement supersedes any in-flight one.
        const token = (placeTokens.current[id] ?? 0) + 1;
        placeTokens.current[id] = token;
        const viewport = viewportRect();
        const saved = !opts.placement && def.persist ? loadPanelRect(id) : null;
        const placement = opts.placement ?? def.placement;
        if (saved) {
          apply({ type: 'open', id, payload, rect: clampRectInto(saved, viewport) });
        } else if (placement === 'cursor') {
          apply({ type: 'open', id, payload, placing: true });
          getCursorPoint().then((cursor) => {
            if (placeTokens.current[id] !== token) return;
            const rect = computePlacement('cursor', def.size, gameRef.current.gameRect, viewportRect(), cursor);
            apply({ type: 'place', id, rect });
          });
        } else {
          apply({
            type: 'open',
            id,
            payload,
            rect: computePlacement(placement, def.size, gameRef.current.gameRect, viewport),
            anchor: isGameAnchored(placement) ? placement : null,
          });
        }
      }

      if (opts.focus ?? (def.keyboard === 'onPointerDown' && !!def.focusOnOpen)) void claimKeyboard();
    },
    [apply, defs],
  );

  // Open panels stay on screen: game-anchored ones (default game* placement, not moved by the user) follow the
  // game window; the rest are clamped into the overlay when it shrinks. Only the live rect changes: the saved
  // layout is kept for when the monitor is back.
  const reflowPanels = useCallback(() => {
    const viewport = viewportRect();
    for (const [id, panel] of Object.entries(stateRef.current.panels) as [PanelId, PanelState][]) {
      if (!panel.open || panel.placing) continue;
      const rect = panel.anchor
        ? computePlacement(panel.anchor, defs[id].size, gameRef.current.gameRect, viewport)
        : clampRectInto(panel.rect, viewport);
      if (!sameRect(rect, panel.rect)) apply({ type: 'place', id, rect });
    }
  }, [apply, defs]);

  useEffect(() => reflowPanels(), [reflowPanels, gameRect]);

  useEffect(() => {
    window.addEventListener('resize', reflowPanels);
    return () => window.removeEventListener('resize', reflowPanels);
  }, [reflowPanels]);

  const closePanel = useCallback(
    (id: PanelId) => {
      if (!stateRef.current.panels[id]?.open) return;
      placeTokens.current[id] = (placeTokens.current[id] ?? 0) + 1;
      apply({ type: 'close', id });
      const keyboardPanelOpen = Object.entries(stateRef.current.panels).some(
        ([pid, panel]) => panel?.open && defs[pid as PanelId].keyboard === 'onPointerDown',
      );
      if (isKeyboardClaimed() && !keyboardPanelOpen) void releaseKeyboard();
    },
    [apply, defs],
  );

  const togglePanel = useCallback(
    <K extends PanelId>(id: K, payload?: PanelPayloads[K], opts?: OpenOptions) => {
      if (isPanelVisible(defs[id], stateRef.current.panels[id], gameRef.current.gameFocused)) closePanel(id);
      else openPanel(id, payload, opts);
    },
    [closePanel, defs, openPanel],
  );

  const isOpen = useCallback((id: PanelId) => !!stateRef.current.panels[id]?.open, []);
  const bringToFront = useCallback((id: PanelId) => apply({ type: 'front', id }), [apply]);

  // No `state` here: panel transitions must not re-render (and re-run the effects of) every consumer.
  const api = useMemo<OverlayApi>(
    () => ({ openPanel, closePanel, togglePanel, isOpen, bringToFront, gameRect, gameFocused }),
    [openPanel, closePanel, togglePanel, isOpen, bringToFront, gameRect, gameFocused],
  );
  const internals = useMemo<OverlayInternals>(
    () => ({ defs, state, gameFocused, commitRect }),
    [defs, state, gameFocused, commitRect],
  );

  // Main lost OS focus (the user clicked into the game or another app): close closeOnBlur panels unless focus
  // comes back within CLOSE_ON_BLUR_MS, like the old per-window focus-loss handler hid its window.
  useEffect(() => {
    let blurTimer: ReturnType<typeof setTimeout> | undefined;
    const stop = trackKeyboardFocus((focused) => {
      clearTimeout(blurTimer);
      blurTimer = undefined;
      if (focused) return;
      blurTimer = setTimeout(() => {
        blurTimer = undefined;
        for (const [id, panel] of Object.entries(stateRef.current.panels) as [PanelId, PanelState][]) {
          if (panel.open && defs[id].closeOnBlur) closePanel(id);
        }
      }, CLOSE_ON_BLUR_MS);
    });
    return () => {
      clearTimeout(blurTimer);
      stop();
    };
  }, [closePanel, defs]);

  useEffect(() => {
    setToastBridge({ openChat: (payload) => openPanel('chat', payload) });
    return () => setToastBridge(null);
  }, [openPanel]);

  useEffect(
    () => installDevHook({ openPanel, closePanel, togglePanel, isOpen, getState: () => stateRef.current }),
    [openPanel, closePanel, togglePanel, isOpen],
  );

  return (
    <OverlayContext.Provider value={api}>
      <OverlayInternalContext.Provider value={internals}>{children}</OverlayInternalContext.Provider>
    </OverlayContext.Provider>
  );
};
