import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  ChevronUp,
  Coins,
  List,
  type LucideIcon,
  MessageSquare,
  Settings,
  Shield,
  ShoppingBag,
  Store,
  TrendingUp,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { popIn, scaleIn } from '@/lib/motion';

interface ChatButtonProps {
  /** Tab size (CSS px); everything inside scales with its width. */
  size: { width: number; height: number };
  onChatClick: () => void;
  onOffersClick: () => void;
  onMarketClick?: () => void;
  onBuildsClick?: () => void;
  onNetWorthClick?: () => void;
  onStashValueClick?: () => void;
  onManageListingsClick?: () => void;
  onSettingsClick?: () => void;
  onDisableClick?: () => void;
  unreadCount?: number;
  tradeOffersCount?: number;
  /** Called while the tab is dragged with the vertical travel (px) since the press. Omitted: not draggable. */
  onDrag?: (dy: number) => void;
  onDragEnd?: () => void;
  /** Open the menu below the tab instead of above it (the tab is near the top). */
  menuBelow?: boolean;
  /**
   * Shown beside the tab after the pointer rests on it for PEEK_DELAY_MS (what's new behind the badges); it gets
   * `close` to call once something in it was picked. Omitted: nothing opens on hover.
   */
  peek?: (close: () => void) => React.ReactNode;
}

/** Moving the pointer from the tab to the menu crosses a small gap: only close after this long outside both. */
const LEAVE_GRACE_MS = 400;
/** The pointer must rest on the tab this long for the peek: passing over it (mid-fight) opens nothing. */
export const PEEK_DELAY_MS = 600;

const formatCount = (count: number) => (count > 99 ? '99+' : String(count));

const CountBadge: React.FC<{ count: number; className: string; label: string; style?: React.CSSProperties }> = ({
  count,
  className,
  label,
  style,
}) => (
  <motion.span
    key={count}
    variants={popIn}
    initial="hidden"
    animate="visible"
    exit="exit"
    aria-label={label}
    style={style}
    className={cn(
      'pointer-events-none flex items-center justify-center rounded-full font-bold leading-none tabular-nums shadow-sm',
      className,
    )}
  >
    {formatCount(count)}
  </motion.span>
);

const segment =
  'relative flex w-full flex-1 items-center justify-center text-surface-foreground outline-none transition-colors ' +
  'duration-(--dur-fast) hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent [&_svg]:pointer-events-none';

interface MenuEntry {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  badge?: { count: number; className: string };
}

/** Pointer travel (px) before a press on the tab becomes a drag instead of a click. */
const DRAG_THRESHOLD = 4;

/**
 * The chat dock: a tab (chat · offers · menu caret) flush on the game's right edge, flat side against it. A stray
 * pointer passing over it mid-fight opens nothing: the menu opens from the caret, the peek (if given) only once
 * the pointer rests on the tab for PEEK_DELAY_MS. Dragging the tab slides it along the edge (`onDrag` gets the
 * vertical travel). The menu opens above the tab or below it (`menuBelow`) near the top; the peek beside it,
 * aligned the same way. A new message or offer pulses the tab once.
 */
export const ChatButton: React.FC<ChatButtonProps> = ({
  size,
  onChatClick,
  onOffersClick,
  onMarketClick,
  onBuildsClick,
  onNetWorthClick,
  onStashValueClick,
  onManageListingsClick,
  onSettingsClick,
  onDisableClick,
  unreadCount = 0,
  tradeOffersCount = 0,
  onDrag,
  onDragEnd,
  menuBelow = false,
  peek,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const leaveTimer = useRef<number | undefined>(undefined);
  const peekTimer = useRef<number | undefined>(undefined);

  // One pulse per increase of either count (not on mount, not when they drop); adjusted during render, no effect
  const [pulse, setPulse] = useState(0);
  const [seen, setSeen] = useState({ unreadCount, tradeOffersCount });
  if (seen.unreadCount !== unreadCount || seen.tradeOffersCount !== tradeOffersCount) {
    if (unreadCount > seen.unreadCount || tradeOffersCount > seen.tradeOffersCount) setPulse((n) => n + 1);
    setSeen({ unreadCount, tradeOffersCount });
  }

  useEffect(
    () => () => {
      window.clearTimeout(leaveTimer.current);
      window.clearTimeout(peekTimer.current);
    },
    [],
  );

  const closePeek = () => {
    window.clearTimeout(peekTimer.current);
    setPeekOpen(false);
  };
  const onEnter = () => {
    window.clearTimeout(leaveTimer.current);
    if (!peek || peekOpen || menuOpen) return;
    window.clearTimeout(peekTimer.current);
    peekTimer.current = window.setTimeout(() => setPeekOpen(true), PEEK_DELAY_MS);
  };
  const onLeave = () => {
    window.clearTimeout(peekTimer.current);
    if (!menuOpen && !peekOpen) return;
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => {
      setMenuOpen(false);
      setPeekOpen(false);
    }, LEAVE_GRACE_MS);
  };
  const pick = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  // Press → drag past the threshold → onDrag(dy); the click that ends a drag is swallowed. Moves are tracked on the
  // window: a quick drag leaves the tab before the threshold, and pointer capture would retarget the buttons' clicks.
  const drag = useRef({ onDrag, onDragEnd });
  useEffect(() => {
    drag.current = { onDrag, onDragEnd };
  });
  const swallowClick = useRef(false);
  const onTabPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Pressing the tab (a click or a drag) means business: no peek
    closePeek();
    if (e.button !== 0 || !onDrag) return;
    const startY = e.clientY;
    let dragging = false;
    const onMove = (ev: PointerEvent) => {
      const dy = ev.clientY - startY;
      if (!dragging && Math.abs(dy) < DRAG_THRESHOLD) return;
      if (!dragging) {
        dragging = true;
        setMenuOpen(false);
      }
      drag.current.onDrag?.(dy);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (!dragging) return;
      // The click (if any) follows this pointerup in the same task: swallow it, then stop swallowing
      swallowClick.current = true;
      window.setTimeout(() => (swallowClick.current = false));
      drag.current.onDragEnd?.();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };
  const onTabClickCapture = (e: React.MouseEvent) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const w = size.width;
  const icon = { width: Math.round(w * 0.42), height: Math.round(w * 0.42) };
  const badge: React.CSSProperties = {
    position: 'absolute',
    top: Math.round(w * 0.04),
    right: Math.round(w * 0.04),
    minWidth: Math.round(w * 0.38),
    height: Math.round(w * 0.38),
    paddingInline: Math.max(2, Math.round(w * 0.06)),
    fontSize: Math.max(9, Math.round(w * 0.24)),
  };

  const entries: MenuEntry[] = [
    {
      label: 'Chat',
      icon: MessageSquare,
      onClick: onChatClick,
      badge: { count: unreadCount, className: 'bg-destructive text-destructive-foreground' },
    },
    { label: 'Market browser', icon: Store, onClick: onMarketClick },
    { label: 'Builds', icon: Shield, onClick: onBuildsClick },
    { label: 'Net worth', icon: TrendingUp, onClick: onNetWorthClick },
    { label: 'Stash value', icon: Coins, onClick: onStashValueClick },
    {
      label: 'Offers',
      icon: ShoppingBag,
      onClick: onOffersClick,
      badge: { count: tradeOffersCount, className: 'bg-warning text-warning-foreground' },
    },
    { label: 'Manage listings', icon: List, onClick: onManageListingsClick },
    { label: 'Settings', icon: Settings, onClick: onSettingsClick },
  ];

  return (
    <MotionConfig reducedMotion="user">
      {/* The frame is click-through: only the pill and the open menu or peek take clicks. */}
      <div
        data-interactive="true"
        className="pointer-events-auto absolute"
        style={{ right: 0, bottom: 0, width: size.width, height: size.height }}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
      >
        <AnimatePresence>
          {pulse > 0 && (
            <motion.span
              key={pulse}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-l-xl ring-2 ring-glow"
              initial={{ opacity: 0.9, scale: 1 }}
              animate={{ opacity: 0, scale: 1.35 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        <div
          title={onDrag ? 'Drag to move' : undefined}
          className="flex h-full w-full touch-none flex-col overflow-hidden rounded-l-xl border border-r-0 border-border bg-surface shadow-panel backdrop-blur-md"
          onPointerDown={onTabPointerDown}
          onClickCapture={onTabClickCapture}
        >
          <button type="button"
            onClick={onChatClick}
            className={segment}
            aria-label="Open PD2 Chat"
            title="Chat">
            <MessageSquare style={icon} />
            <AnimatePresence>
              {unreadCount > 0 && (
                <CountBadge
                  key="unread"
                  count={unreadCount}
                  label={`${unreadCount} unread messages`}
                  className="bg-destructive text-destructive-foreground"
                  style={badge}
                />
              )}
            </AnimatePresence>
          </button>
          <button type="button"
            onClick={onOffersClick}
            className={segment}
            aria-label="Offers"
            title="Offers">
            <ShoppingBag style={icon} />
            <AnimatePresence>
              {tradeOffersCount > 0 && (
                <CountBadge
                  key="trade"
                  count={tradeOffersCount}
                  label={`${tradeOffersCount} trade offers`}
                  className="bg-warning text-warning-foreground"
                  style={badge}
                />
              )}
            </AnimatePresence>
          </button>
          <div aria-hidden
            className="mx-auto h-px w-1/2 shrink-0 bg-border" />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(segment, 'max-h-[30%] text-muted-foreground', menuOpen && 'bg-accent text-accent-foreground')}
            aria-label="More"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="More"
          >
            <ChevronUp
              style={{ width: icon.width * 0.85, height: icon.height * 0.85 }}
              className={cn('transition-transform duration-(--dur-med)', menuOpen !== menuBelow && 'rotate-180')}
            />
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            // Its own interactive rect: the menu overflows the tab's box, and outside the OS region it is clipped
            <motion.div
              data-interactive="true"
              role="menu"
              aria-label="PD2 Trader"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ transformOrigin: menuBelow ? 'top right' : 'bottom right' }}
              className={cn(
                'absolute right-0 w-52 rounded-lg border border-border bg-surface p-1 text-sm text-surface-foreground shadow-panel backdrop-blur-md',
                menuBelow ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
              )}
            >
              {entries.map(
                ({ label, icon: Icon, onClick, badge: count }) =>
                  onClick && (
                    <button
                      key={label}
                      type="button"
                      role="menuitem"
                      onClick={pick(onClick)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1">{label}</span>
                      {count && count.count > 0 && (
                        <span
                          className={cn(
                            'min-w-5 rounded-full px-1.5 text-center text-xs leading-5 font-bold tabular-nums',
                            count.className,
                          )}
                        >
                          {formatCount(count.count)}
                        </span>
                      )}
                    </button>
                  ),
              )}
              {onDisableClick && (
                <>
                  <div role="separator"
                    className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={pick(onDisableClick)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-destructive outline-none hover:bg-destructive/15 focus-visible:bg-destructive/15"
                  >
                    <X className="size-4 shrink-0" />
                    <span className="flex-1">Disable overlay</span>
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {peek && peekOpen && !menuOpen && (
            // Beside the tab, its own interactive rect like the menu; nothing in it takes focus by itself
            <motion.div
              data-interactive="true"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ transformOrigin: menuBelow ? 'top right' : 'bottom right' }}
              className={cn('absolute right-full mr-1.5', menuBelow ? 'top-0' : 'bottom-0')}
            >
              {peek(() => setPeekOpen(false))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
};
