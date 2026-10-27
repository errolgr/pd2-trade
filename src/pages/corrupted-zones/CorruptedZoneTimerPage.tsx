import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useOptions } from '@/hooks/useOptions';
import { usePanel, useOverlay } from '@/overlay';
import { overlayViewport, useDragToMove } from '@/overlay/useDragToMove';
import { cn } from '@/lib/utils';
import {
  corruptedZoneAt,
  corruptedZoneSchedule,
  followedZoneSchedule,
  formatCountdown,
  formatWait,
} from '@/lib/corrupted-zones';
import { clampToArea, tickerPosition } from '@/pages/net-worth/overlay';
import { useChatDockOffset } from '@/pages/chat/chat-dock';

/** Upcoming slots listed next to the pill when it is expanded. */
const UPCOMING_SLOTS = 6;

const clockTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** `clockTime`, with the weekday when `ts` is not on the same day as `now` (followed zones can be days away). */
const slotTime = (ts: number, now: number) =>
  new Date(ts).toDateString() === new Date(now).toDateString()
    ? clockTime(ts)
    : new Date(ts).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });

interface BoxSize {
  width: number;
  height: number;
  /** Height of the pill alone (the box also holds the schedule list while expanded). */
  pill: number;
}

/**
 * Corrupted zone timer panel: a pill with the zone(s) corrupted in Hell games made now and the time left until
 * the next rotation; click lists the upcoming zones, below or above the pill. With "Only zones I follow" (and at
 * least one zone followed) both show followed zones only: the pill shows the next one and the time until it starts
 * while it is not corrupted yet. Sized to its content and placed like the net worth ticker: at its anchor on the
 * game (following it), or for `custom` where the user dragged it (the panel layout keeps it).
 */
const CorruptedZoneTimer: React.FC = () => {
  const { settings, updateSettings } = useOptions();
  const { gameRect } = useOverlay();
  const { rect, setRect } = usePanel<'corruptedZoneTimer'>();
  const boxRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const [boxSize, setBoxSize] = useState<BoxSize | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);
  // The list opens upwards when the pill sits in the lower half of the overlay, else downwards: decided when it
  // opens and kept until it opens again, so closing it (or dragging it meanwhile) lands the pill where it was
  const [listAbove, setListAbove] = useState(false);
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
    const pill = pillRef.current;
    if (!box || !pill) return;
    const measure = () => {
      const { width, height } = box.getBoundingClientRect();
      const size = {
        width: Math.ceil(width),
        height: Math.ceil(height),
        pill: Math.ceil(pill.getBoundingClientRect().height),
      };
      if (size.width <= 0 || size.height <= 0) return;
      setBoxSize((prev) =>
        prev?.width === size.width && prev.height === size.height && prev.pill === size.pill ? prev : size,
      );
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

  const lowOnScreen = rect.y + rect.height / 2 > overlayViewport().height / 2;
  // Where a click opens it (the chevron points there)
  const opensUp = expanded ? listAbove : lowOnScreen;

  // Keep the panel exactly the content's size, in the overlay, with the pill at its anchor on the game or (custom)
  // where it is: the box grows away from the pill, so the edge on the pill's side stays put
  const restoredRef = useRef(false);
  useLayoutEffect(() => {
    if (!boxSize || drag.dragging.current) return;
    const size = { width: boxSize.width, height: boxSize.height };
    const current = rectRef.current;
    // First placement: a Custom rect can be a box saved with the list open, whose pill is at the bottom when it
    // opened upwards, which it did when its top is in the lower half; one across the middle is taken as opened
    // downwards.
    const pillAtBottom = restoredRef.current ? listAbove : current.y + boxSize.pill / 2 > overlayViewport().height / 2;
    restoredRef.current = true;
    let origin: { x: number; y: number };
    if (anchor === 'custom') {
      origin = { x: current.x, y: pillAtBottom ? current.y + current.height - size.height : current.y };
    } else {
      const pill = tickerPosition(anchor, { width: size.width, height: boxSize.pill }, gameRect, dockOffset);
      origin = { x: pill.x, y: listAbove ? pill.y + boxSize.pill - size.height : pill.y };
    }
    const next = { ...clampToArea({ ...origin, ...size }, overlayViewport()), ...size };
    if (
      next.x !== current.x ||
      next.y !== current.y ||
      next.width !== current.width ||
      next.height !== current.height
    ) {
      setRect(next);
    }
  }, [anchor, listAbove, gameRect, dockOffset, boxSize, setRect, drag.dragging]);

  const followedKey = (settings.corruptedZoneFollowed ?? []).join('\n');
  const onlyFollowed = settings.corruptedZoneTimerZones === 'followed' && followedKey !== '';
  const slotStart = corruptedZoneAt(now).start;
  const [head, ...upcoming] = useMemo(() => {
    const followed = onlyFollowed
      ? followedZoneSchedule(slotStart, new Set(followedKey.split('\n')), 1 + UPCOMING_SLOTS)
      : [];
    return followed.length > 0 ? followed : corruptedZoneSchedule(slotStart, 1 + UPCOMING_SLOTS);
  }, [slotStart, onlyFollowed, followedKey]);
  // False when the pill shows a followed zone that is still to come
  const live = head.start <= now;
  const next = upcoming[0];
  const title = live
    ? `Corrupted in Hell games made until ${clockTime(head.end)}.` +
      (next ? ` Next: ${next.zone}${onlyFollowed ? ` at ${slotTime(next.start, now)}` : ''}.` : '')
    : `Next followed zone: corrupted in Hell games made from ${slotTime(head.start, now)} to ${clockTime(head.end)}.`;
  // The pill hugs the anchored side
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
        ref={pillRef}
        type="button"
        data-interactive="true"
        onClick={() => {
          if (drag.consumeDragClick()) return;
          if (!expanded) setListAbove(lowOnScreen);
          setExpanded((open) => !open);
        }}
        {...drag.handlers}
        aria-expanded={expanded}
        className="pointer-events-auto flex h-7 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-full border border-q-corrupted-zone/45 bg-surface pl-3 pr-2 text-xs font-medium text-surface-foreground shadow-[inset_0_0_12px_-4px_var(--q-corrupted-zone)] outline-none backdrop-blur-md transition-[background-color,border-color] duration-(--dur-fast) ease-out hover:border-q-corrupted-zone/80 hover:bg-surface-elevated focus-visible:border-q-corrupted-zone active:bg-muted"
        title={`${title} Click for the schedule, drag to move.`}
      >
        <span
          aria-hidden
          className={cn(
            'size-2 shrink-0 rounded-full',
            live ? 'bg-q-corrupted-zone ring-[3px] ring-q-corrupted-zone/25' : 'border border-q-corrupted-zone',
          )}
        />
        <span className={cn('font-semibold', live && 'text-q-corrupted-zone')}>{head.zone}</span>
        <span aria-hidden
          className="h-3 w-px bg-border" />
        <span
          className="tabular-nums text-muted-foreground"
          aria-label={live ? 'Time until the next zone' : 'Time until this zone'}
        >
          {live ? formatCountdown(head.end - now) : `in ${formatCountdown(head.start - now)}`}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'size-3.5 text-muted-foreground transition-transform duration-(--dur-fast)',
            expanded !== opensUp && 'rotate-180',
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
                {slotTime(slot.start, now)} · in {formatWait(slot.start - now)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default CorruptedZoneTimer;
