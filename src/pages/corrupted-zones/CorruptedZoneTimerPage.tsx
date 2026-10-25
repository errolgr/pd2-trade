import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useOptions } from '@/hooks/useOptions';
import { usePanel, useOverlay } from '@/overlay';
import { overlayViewport, useDragToMove } from '@/overlay/useDragToMove';
import { cn } from '@/lib/utils';
import { corruptedZoneSchedule, formatCountdown } from '@/lib/corrupted-zones';
import { clampToArea, tickerPosition } from '@/pages/net-worth/overlay';
import { useChatDockOffset } from '@/pages/chat/chat-dock';

/** Upcoming slots listed under the pill when it is expanded. */
const UPCOMING_SLOTS = 6;

const clockTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * Corrupted zone timer panel: a pill with the zone(s) corrupted in Hell games made now and the time left until
 * the next rotation; click lists the upcoming zones. Sized to its content and placed like the net worth ticker:
 * at its anchor on the game (following it), or for `custom` where the user dragged it (the panel layout keeps it).
 */
const CorruptedZoneTimer: React.FC = () => {
  const { settings, updateSettings } = useOptions();
  const { gameRect } = useOverlay();
  const { rect, setRect } = usePanel<'corruptedZoneTimer'>();
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxSize, setBoxSize] = useState<{ width: number; height: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);
  const anchor = settings.corruptedZoneTimerAnchor ?? 'top-right';
  const dockOffset = useChatDockOffset();
  // A finished drag switches the timer to Custom; the panel layout keeps the dragged position
  const drag = useDragToMove(rect, setRect, () => {
    if (anchor !== 'custom') updateSettings({ corruptedZoneTimerAnchor: 'custom' });
  });

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Track the content's box (zero while the panel is hidden, so those reads are ignored)
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const { width, height } = box.getBoundingClientRect();
      const size = { width: Math.ceil(width), height: Math.ceil(height) };
      if (size.width <= 0 || size.height <= 0) return;
      setBoxSize((prev) => (prev?.width === size.width && prev.height === size.height ? prev : size));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Latest rect for the placement effect, which must not re-run (and snap back) on every rect change
  const rectRef = useRef(rect);
  useLayoutEffect(() => {
    rectRef.current = rect;
  });

  // Keep the panel exactly the content's size, at its anchor on the game or (custom) where it is, in the overlay
  useLayoutEffect(() => {
    if (!boxSize || drag.dragging.current) return;
    const origin = anchor === 'custom' ? rectRef.current : tickerPosition(anchor, boxSize, gameRect, dockOffset);
    const next = { ...clampToArea({ ...origin, ...boxSize }, overlayViewport()), ...boxSize };
    const current = rectRef.current;
    if (
      next.x !== current.x ||
      next.y !== current.y ||
      next.width !== current.width ||
      next.height !== current.height
    ) {
      setRect(next);
    }
  }, [anchor, gameRect, dockOffset, boxSize, setRect, drag.dragging]);

  const [current, ...upcoming] = corruptedZoneSchedule(now, 1 + UPCOMING_SLOTS);
  // Bottom anchors grow upwards so the pill stays put; the pill hugs the anchored side
  const listAbove = anchor.startsWith('bottom') || anchor === 'above-chat';
  const align =
    anchor.endsWith('right') || anchor === 'above-chat'
      ? 'items-end'
      : anchor === 'top-center'
        ? 'items-center'
        : 'items-start';

  return (
    <div
      ref={boxRef}
      style={{ opacity: (settings.corruptedZoneTimerOpacity ?? 90) / 100 }}
      className={cn('inline-flex flex-col gap-1', align, listAbove && 'flex-col-reverse')}
    >
      {/* No transforms/shadows here: the panel is sized to this box, so it must not grow on hover. */}
      <button
        type="button"
        data-interactive="true"
        onClick={() => {
          if (!drag.consumeDragClick()) setExpanded((open) => !open);
        }}
        {...drag.handlers}
        aria-expanded={expanded}
        className="pointer-events-auto flex h-7 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-full border border-q-corrupted-zone/45 bg-surface pl-3 pr-2 text-xs font-medium text-surface-foreground shadow-[inset_0_0_12px_-4px_var(--q-corrupted-zone)] outline-none backdrop-blur-md transition-[background-color,border-color] duration-(--dur-fast) ease-out hover:border-q-corrupted-zone/80 hover:bg-surface-elevated focus-visible:border-q-corrupted-zone active:bg-muted"
        title={`Corrupted in Hell games made until ${clockTime(current.end)}. Next: ${upcoming[0].zone}. Click for the schedule, drag to move.`}
      >
        <span aria-hidden
          className="size-2 shrink-0 rounded-full bg-q-corrupted-zone ring-[3px] ring-q-corrupted-zone/25" />
        <span className="font-semibold text-q-corrupted-zone">{current.zone}</span>
        <span aria-hidden
          className="h-3 w-px bg-border" />
        <span className="tabular-nums text-muted-foreground"
          aria-label="Time until the next zone">
          {formatCountdown(current.end - now)}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'size-3.5 text-muted-foreground transition-transform duration-(--dur-fast)',
            expanded && 'rotate-180',
          )}
        />
      </button>
      {expanded && (
        <ol
          data-interactive="true"
          aria-label="Upcoming corrupted zones"
          className="pointer-events-auto flex flex-col gap-1 rounded-lg border border-q-corrupted-zone/30 bg-surface px-3 py-2 text-xs text-surface-foreground shadow-[inset_3px_0_0_var(--q-corrupted-zone)] backdrop-blur-md"
        >
          {upcoming.map((slot) => (
            <li key={slot.start}
              className="flex items-baseline justify-between gap-4 whitespace-nowrap">
              <span>{slot.zone}</span>
              <span className="tabular-nums text-muted-foreground">
                {clockTime(slot.start)} · in {Math.ceil((slot.start - now) / 60_000)}m
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default CorruptedZoneTimer;
