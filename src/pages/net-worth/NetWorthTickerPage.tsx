import React, { useEffect, useRef, useState } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalPosition, LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
import { OptionsProvider, useOptions, ISettings } from '@/hooks/useOptions';
import { ItemsProvider } from '@/hooks/useItems';
import { ChildPd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { ChildNetWorthProvider, useNetWorth } from '@/hooks/useNetWorth';
import { useWealthRank } from '@/hooks/useWealthRank';
import { emit, listen } from '@/lib/browser-events';
import { MotionConfig } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedNumber, useChangeFlash } from '@/pages/currency/components/AnimatedNumber';
import {
  clampToArea,
  formatHr,
  formatSignedHr,
  monitorWorkAreas,
  NETWORTH_TOGGLE_PANEL_EVENT,
  pickArea,
} from './overlay';

type TickerAnchor = NonNullable<ISettings['netWorthTickerAnchor']>;
type TickerPosition = NonNullable<ISettings['netWorthTickerPosition']>;
type DiabloRect = { x: number; y: number; width: number; height: number };

const EDGE_MARGIN = 12;
/** Chat button window geometry used by LandingPage (240px window, 20px right / 10px bottom inset). */
const CHAT_BUTTON_WINDOW = { size: 240, right: 20, bottom: 10 };
/** Pointer travel (px) before a press on the ticker becomes a window drag instead of a click. */
const DRAG_THRESHOLD_PX = 4;
/** Quiet time after the last move event before a drag counts as finished and is saved. */
const DRAG_SETTLE_MS = 400;
/** A drag that produced no move events for this long no longer holds off automatic placement. */
const DRAG_STALE_MS = 2_000;

/**
 * Resizes the ticker window to its pill and moves it: to the anchor on the Diablo frame, or for `custom` to the
 * dragged position (or where it is now), kept inside a connected monitor's work area. Resolves to the physical
 * position it set, or null when it did not move the window.
 */
async function placeTickerWindow(
  anchor: TickerAnchor,
  customPosition: TickerPosition | undefined,
  width: number,
  height: number,
): Promise<{ x: number; y: number } | null> {
  const win = getCurrentWebviewWindow();
  await win.setSize(new LogicalSize(width, height));
  const scale = await win.scaleFactor();
  const physicalWidth = Math.round(width * scale);
  const physicalHeight = Math.round(height * scale);

  if (anchor === 'custom') {
    const origin = customPosition ?? (await win.outerPosition());
    const rect = { x: origin.x, y: origin.y, width: physicalWidth, height: physicalHeight };
    const area = pickArea(rect, await monitorWorkAreas());
    const target = area ? clampToArea(rect, area) : { x: rect.x, y: rect.y };
    await win.setPosition(new PhysicalPosition(target.x, target.y));
    return target;
  }

  const rect = await invoke<DiabloRect | null>('get_diablo_rect');
  if (!rect) return null;

  if (anchor === 'above-chat') {
    // Mirror LandingPage's chat button placement, which feeds the Diablo rect straight into window coordinates.
    const chatX = rect.x + rect.width - CHAT_BUTTON_WINDOW.size - CHAT_BUTTON_WINDOW.right;
    const chatY = rect.y + rect.height - CHAT_BUTTON_WINDOW.size - CHAT_BUTTON_WINDOW.bottom;
    await win.setPosition(new LogicalPosition(chatX + CHAT_BUTTON_WINDOW.size - width, chatY - height - 4));
    const placed = await win.outerPosition();
    return { x: placed.x, y: placed.y };
  }

  const margin = EDGE_MARGIN * scale;
  const x = anchor.endsWith('left')
    ? rect.x + margin
    : anchor.endsWith('right')
      ? rect.x + rect.width - physicalWidth - margin
      : rect.x + (rect.width - physicalWidth) / 2;
  const y = anchor.startsWith('bottom') ? rect.y + rect.height - physicalHeight - margin : rect.y + margin;
  const target = { x: Math.round(x), y: Math.round(y) };
  await win.setPosition(new PhysicalPosition(target.x, target.y));
  return target;
}

const NetWorthTicker: React.FC = () => {
  const { settings, updateSettings } = useOptions();
  const { latest, status, lastSnapshotAt, currentSession } = useNetWorth();
  const pillRef = useRef<HTMLButtonElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const anchor = settings.netWorthTickerAnchor ?? 'top-center';
  const customX = settings.netWorthTickerPosition?.x;
  const customY = settings.netWorthTickerPosition?.y;

  // Drag state: a press that travels DRAG_THRESHOLD_PX starts an OS window drag; the click that may follow is
  // swallowed. `lastPlaced` is where placement last put the window, so its own move events are not mistaken
  // for a drag.
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const dragRef = useRef<{ active: boolean; lastActivity: number }>({ active: false, lastActivity: 0 });
  const lastPlacedRef = useRef<{ x: number; y: number } | null>(null);

  // Re-evaluate freshness every 30s
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Keep the window exactly the size of the pill (the window is the click target), at its anchor or custom spot
  useEffect(() => {
    const pill = pillRef.current;
    if (!isTauri() || !pill) return;
    const customPosition = customX !== undefined && customY !== undefined ? { x: customX, y: customY } : undefined;

    const place = () => {
      // Never fight an OS drag in progress; its end saves the new position and re-places from there.
      const drag = dragRef.current;
      if (drag.active && Date.now() - drag.lastActivity < DRAG_STALE_MS) return;
      const { width, height } = pill.getBoundingClientRect();
      placeTickerWindow(anchor, customPosition, Math.ceil(width), Math.ceil(height))
        .then((placed) => {
          if (placed) lastPlacedRef.current = placed;
        })
        .catch((error) => console.warn('[NetWorthTicker] Failed to place ticker window:', error));
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(pill);

    let unlisten: (() => void) | null = null;
    let cancelled = false;
    listen<boolean>('diablo-focus-changed', ({ payload: focused }) => {
      if (focused) place();
    }).then((off) => {
      if (cancelled) off();
      else unlisten = off;
    });

    // Monitor DPI changes (and with them resolution/layout changes) re-place and re-clamp the ticker
    let unlistenScale: (() => void) | null = null;
    getCurrentWebviewWindow()
      .onScaleChanged(place)
      .then((off) => {
        if (cancelled) off();
        else unlistenScale = off;
      });

    return () => {
      cancelled = true;
      observer.disconnect();
      unlisten?.();
      unlistenScale?.();
    };
  }, [anchor, customX, customY]);

  // A finished drag saves the position and switches the ticker to Custom
  useEffect(() => {
    if (!isTauri()) return;
    let settleTimer: number | undefined;
    let unlisten: (() => void) | null = null;
    let cancelled = false;
    getCurrentWebviewWindow()
      .onMoved(({ payload }) => {
        const drag = dragRef.current;
        const placed = lastPlacedRef.current;
        if (!drag.active || (placed && placed.x === payload.x && placed.y === payload.y)) return;
        drag.lastActivity = Date.now();
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
          dragRef.current = { active: false, lastActivity: 0 };
          lastPlacedRef.current = { x: payload.x, y: payload.y };
          updateSettings({ netWorthTickerAnchor: 'custom', netWorthTickerPosition: { x: payload.x, y: payload.y } });
        }, DRAG_SETTLE_MS);
      })
      .then((off) => {
        if (cancelled) off();
        else unlisten = off;
      });
    return () => {
      cancelled = true;
      window.clearTimeout(settleTimer);
      unlisten?.();
    };
  }, [updateSettings]);

  const onPointerDown = (event: React.PointerEvent) => {
    suppressClickRef.current = false;
    pressRef.current = event.button === 0 ? { x: event.screenX, y: event.screenY } : null;
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const press = pressRef.current;
    if (!press) return;
    if ((event.buttons & 1) === 0) {
      pressRef.current = null;
      return;
    }
    if (Math.hypot(event.screenX - press.x, event.screenY - press.y) < DRAG_THRESHOLD_PX) return;
    pressRef.current = null;
    suppressClickRef.current = true;
    if (!isTauri()) return;
    dragRef.current = { active: true, lastActivity: Date.now() };
    getCurrentWebviewWindow()
      .startDragging()
      .catch((error) => {
        dragRef.current = { active: false, lastActivity: 0 };
        console.warn('[NetWorthTicker] Failed to start dragging:', error);
      });
  };
  const onClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    emit(NETWORTH_TOGGLE_PANEL_EVENT);
  };

  const intervalMinutes = settings.netWorthAutoSnapshotMinutes || 15;
  const isFresh = lastSnapshotAt !== null && now - lastSnapshotAt < (intervalMinutes + 1) * 60_000;
  const failed = status === 'error' || status === 'signed-out';
  const dotClass = failed
    ? 'bg-destructive ring-destructive/25'
    : isFresh
      ? 'bg-success ring-success/25'
      : 'bg-warning ring-warning/25';
  const dotTitle = failed
    ? 'Snapshot failed'
    : lastSnapshotAt
      ? `Last snapshot ${new Date(lastSnapshotAt).toLocaleTimeString()}`
      : 'No snapshot yet';

  const total = latest?.valuation.totalHr ?? null;
  const flash = useChangeFlash(total);
  const sessionDelta = currentSession?.isOpen ? currentSession.endHr - currentSession.startHr : null;
  const wealthRank = useWealthRank();

  return (
    <MotionConfig reducedMotion="user">
      <div className="inline-block">
        {/* No transforms/shadows here: the window is sized to this pill's box, so it must not grow on hover. */}
        <button
          ref={pillRef}
          type="button"
          onClick={onClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => {
            pressRef.current = null;
          }}
          style={{ opacity: (settings.netWorthTickerOpacity ?? 90) / 100 }}
          className="group flex h-7 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface pl-3 pr-2.5 text-xs font-medium text-surface-foreground outline-none backdrop-blur-md transition-[background-color,border-color] duration-(--dur-fast) ease-out hover:border-ring/60 hover:bg-surface-elevated focus-visible:border-ring active:bg-muted"
          title="Net worth — click for details, drag to move"
        >
          <span
            className={cn(
              'text-sm font-semibold tabular-nums transition-colors duration-(--dur-slow)',
              flash === 'up' && 'text-success',
              flash === 'down' && 'text-destructive',
            )}
          >
            {total !== null ? <AnimatedNumber value={total}
              format={formatHr} /> : status === 'loading' ? '…' : '—'}{' '}
            <span className="text-[11px] font-medium text-muted-foreground">HR</span>
          </span>
          {sessionDelta !== null && (
            <>
              <span aria-hidden
                className="h-3 w-px bg-border" />
              <span className={cn('tabular-nums', sessionDelta >= 0 ? 'text-success' : 'text-destructive')}>
                <span className="text-[10px]">{sessionDelta >= 0 ? '▲' : '▼'}</span> {formatSignedHr(sessionDelta)}{' '}
                <span className="font-normal opacity-80">session</span>
              </span>
            </>
          )}
          {currentSession?.isOpen && (
            <>
              <span aria-hidden
                className="h-3 w-px bg-border" />
              <span className="tabular-nums text-muted-foreground">
                <span className="text-surface-foreground/90">{formatHr(currentSession.hrPerHour)}</span> HR/h
              </span>
            </>
          )}
          {wealthRank && (
            <>
              <span aria-hidden
                className="h-3 w-px bg-border" />
              <span className="tabular-nums text-muted-foreground">{wealthRank}</span>
            </>
          )}
          <span
            className={cn(
              'ml-0.5 size-2 shrink-0 rounded-full ring-[3px] transition-colors duration-(--dur-med)',
              dotClass,
              status === 'loading' && 'motion-safe:animate-pulse',
            )}
            title={dotTitle}
          />
        </button>
      </div>
    </MotionConfig>
  );
};

const NetWorthTickerPage: React.FC = () => (
  <OptionsProvider>
    <ItemsProvider>
      <ChildPd2WebsiteProvider>
        <ChildNetWorthProvider>
          <NetWorthTicker />
        </ChildNetWorthProvider>
      </ChildPd2WebsiteProvider>
    </ItemsProvider>
  </OptionsProvider>
);

export default NetWorthTickerPage;
