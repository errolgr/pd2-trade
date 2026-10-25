import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { MotionConfig } from 'framer-motion';
import { useOptions } from '@/hooks/useOptions';
import { useNetWorth } from '@/hooks/useNetWorth';
import { useWealthRank } from '@/hooks/useWealthRank';
import { usePanel, useOverlay } from '@/overlay';
import { screenToOverlayRect } from '@/overlay/game';
import { loadPanelRect } from '@/overlay/layout-storage';
import { cn } from '@/lib/utils';
import { AnimatedNumber, useChangeFlash } from '@/pages/currency/components/AnimatedNumber';
import {
  clampToArea,
  formatHr,
  formatSignedHr,
  NET_WORTH_PANEL_SIZE,
  panelBesideTicker,
  tickerPosition,
} from './overlay';
import { useChatDockOffset } from '@/pages/chat/chat-dock';
import { overlayViewport, useDragToMove } from '@/overlay/useDragToMove';

/** Px between the ticker and the mini panel opened from it. */
const PANEL_GAP = 6;

/**
 * Overlay px of the old ticker window's saved top-left (`settings.netWorthTickerPosition`: physical screen px, or
 * CSS px in a browser), or null when the overlay window's position or scale can't be read.
 */
async function legacyTickerOrigin(position: { x: number; y: number }): Promise<{ x: number; y: number } | null> {
  if (!isTauri()) return position;
  try {
    const win = getCurrentWindow();
    const [outer, scaleFactor] = await Promise.all([win.outerPosition(), win.scaleFactor()]);
    const { x, y } = screenToOverlayRect({ ...position, width: 0, height: 0 }, outer, scaleFactor);
    return { x, y };
  } catch (error) {
    console.warn('[NetWorthTicker] Could not convert the saved ticker position:', error);
    return null;
  }
}

/**
 * Net worth ticker panel. The panel is sized to the pill and placed at its anchor on the game (following the
 * game), or for `custom` where the user dragged it (the panel layout persists it). Click toggles the mini panel.
 */
const NetWorthTicker: React.FC = () => {
  const { settings, updateSettings } = useOptions();
  const { latest, status, lastSnapshotAt, currentSession } = useNetWorth();
  const { gameRect, togglePanel } = useOverlay();
  const { rect, setRect } = usePanel<'netWorthTicker'>();
  const pillRef = useRef<HTMLButtonElement>(null);
  const [pillSize, setPillSize] = useState<{ width: number; height: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const anchor = settings.netWorthTickerAnchor ?? 'top-center';

  // A finished drag switches the ticker to Custom; the panel layout keeps the dragged position
  const drag = useDragToMove(rect, setRect, () => {
    if (anchor !== 'custom') updateSettings({ netWorthTickerAnchor: 'custom' });
  });
  // 'above-chat' follows the chat dock as it is dragged along the edge
  const dockOffset = useChatDockOffset();

  // Re-evaluate freshness every 30s
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Track the pill's box (zero while the panel is hidden, so those reads are ignored)
  useLayoutEffect(() => {
    const pill = pillRef.current;
    if (!pill) return;
    const measure = () => {
      const box = pill.getBoundingClientRect();
      const width = Math.ceil(box.width);
      const height = Math.ceil(box.height);
      if (width <= 0 || height <= 0) return;
      setPillSize((prev) => (prev?.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pill);
    return () => observer.disconnect();
  }, []);

  // Latest rect for the placement effect, which must not re-run (and snap back) on every rect change
  const rectRef = useRef(rect);
  useLayoutEffect(() => {
    rectRef.current = rect;
  });

  // One-time upgrade: the old ticker window kept its dragged spot in settings. The first custom placement moves it
  // into the panel layout (unless the layout already has a ticker rect) and clears the setting; placement waits
  // while it converts, then re-runs via `migrated`.
  const legacyPosition = settings.netWorthTickerPosition;
  const migrationRef = useRef<'unchecked' | 'running' | 'done'>('unchecked');
  const [migrated, setMigrated] = useState(false);

  // Keep the panel exactly the pill's size, at its anchor on the game or (custom) where it is, inside the overlay
  useLayoutEffect(() => {
    if (!pillSize || drag.dragging.current) return;
    if (anchor === 'custom' && migrationRef.current === 'unchecked') {
      migrationRef.current = 'done';
      if (legacyPosition && !loadPanelRect('netWorthTicker')) {
        migrationRef.current = 'running';
        void legacyTickerOrigin(legacyPosition).then((origin) => {
          migrationRef.current = 'done';
          if (origin) setRect(origin);
          setMigrated(true);
          void updateSettings({ netWorthTickerPosition: undefined });
        });
      }
    }
    if (anchor === 'custom' && migrationRef.current === 'running') return;
    const origin = anchor === 'custom' ? rectRef.current : tickerPosition(anchor, pillSize, gameRect, dockOffset);
    const next = { ...clampToArea({ ...origin, ...pillSize }, overlayViewport()), ...pillSize };
    const current = rectRef.current;
    if (
      next.x !== current.x ||
      next.y !== current.y ||
      next.width !== current.width ||
      next.height !== current.height
    ) {
      setRect(next);
    }
  }, [anchor, gameRect, dockOffset, pillSize, setRect, legacyPosition, updateSettings, migrated, drag.dragging]);

  const onClick = () => {
    if (drag.consumeDragClick()) return;
    const placement = panelBesideTicker(rect, NET_WORTH_PANEL_SIZE, overlayViewport(), PANEL_GAP);
    togglePanel('netWorthPanel', undefined, { placement });
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
        {/* No transforms/shadows here: the panel is sized to this pill's box, so it must not grow on hover. */}
        <button
          ref={pillRef}
          type="button"
          onClick={onClick}
          {...drag.handlers}
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

export default NetWorthTicker;
