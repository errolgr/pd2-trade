import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, Reorder, motion, useDragControls } from 'framer-motion';
import {
  ChevronUp,
  Coins,
  GripVertical,
  List,
  type LucideIcon,
  MessageSquare,
  Settings,
  Shield,
  ShoppingBag,
  Star,
  Store,
  TrendingUp,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { popIn, scaleIn } from '@/lib/motion';
import { useTranslation } from '@/i18n';
import { CARET_HEIGHT, type ChatDockItem } from '@/pages/chat/chat-dock';

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
  /** Every window in the user's menu order; the tab shows the favorites among them in this order. */
  order: readonly ChatDockItem[];
  /** The windows shown as their own buttons on the tab; the menu lists every window regardless. */
  favorites: readonly ChatDockItem[];
  /** Called with the new order when a menu row is dragged or moved with the arrow keys. Omitted: fixed order. */
  onOrderChange?: (order: ChatDockItem[]) => void;
  /** Called with the new favorites (menu order) when a window is starred or unstarred. Omitted: no stars. */
  onFavoritesChange?: (favorites: ChatDockItem[]) => void;
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
  id: ChatDockItem;
  label: string;
  /** The tab button's accessible name, when it differs from the label (chat: "Open PD2 Chat"). */
  tabLabel?: string;
  icon: LucideIcon;
  onClick?: () => void;
  badge?: { count: number; className: string; label: string };
}
type ShownEntry = MenuEntry & { onClick: () => void };

/** `order` with the slots of the `shown` windows refilled by `moved` (the same windows, new sequence). */
function refill(order: readonly ChatDockItem[], shown: readonly ChatDockItem[], moved: readonly ChatDockItem[]) {
  let next = 0;
  return order.map((item) => (shown.includes(item) ? moved[next++] : item));
}

interface MenuRowProps {
  entry: ShownEntry;
  favorite: boolean;
  onPick: () => void;
  onToggleFavorite?: () => void;
  /** Reorderable: drag the grip, or ArrowUp/ArrowDown on it to move one step. */
  reorder?: { onMove: (step: -1 | 1) => void; onDragStart: () => void; onDragEnd: () => void };
}

const MenuRow: React.FC<MenuRowProps> = ({ entry, favorite, onPick, onToggleFavorite, reorder }) => {
  const { t } = useTranslation('app');
  const controls = useDragControls();
  const { id, label, icon: Icon, badge: count } = entry;
  return (
    <Reorder.Item
      as="div"
      value={id}
      role="none"
      dragListener={false}
      dragControls={controls}
      onDragStart={reorder?.onDragStart}
      onDragEnd={reorder?.onDragEnd}
      className="group/row relative flex items-center rounded-md bg-surface hover:bg-accent hover:text-accent-foreground has-[:focus-visible]:bg-accent"
    >
      {reorder && (
        <button
          type="button"
          aria-label={t('chatButton.move', { label })}
          title={t('chatButton.moveHint')}
          onPointerDown={(e) => {
            e.preventDefault();
            controls.start(e);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();
            reorder.onMove(e.key === 'ArrowUp' ? -1 : 1);
          }}
          className="ml-0.5 inline-flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground/40 outline-none group-hover/row:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        onClick={onPick}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2.5 py-1.5 pr-2.5 text-left outline-none',
          reorder ? 'pl-1' : 'pl-2.5',
        )}
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
      {onToggleFavorite && (
        // Stays open: several windows can be starred in one go
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={favorite}
          aria-label={t('chatButton.favorite', { label })}
          title={favorite ? t('chatButton.removeFavorite') : t('chatButton.addFavorite')}
          onClick={onToggleFavorite}
          className={cn(
            'mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded outline-none transition-colors duration-(--dur-fast) hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring/60',
            favorite ? 'text-warning' : 'text-muted-foreground/40 group-hover/row:text-muted-foreground',
          )}
        >
          <Star className={cn('size-3.5', favorite && 'fill-current')} />
        </button>
      )}
    </Reorder.Item>
  );
};

/** Pointer travel (px) before a press on the tab becomes a drag instead of a click. */
const DRAG_THRESHOLD = 4;

/**
 * The chat dock: a tab (the favorite windows' buttons · menu caret) flush on the game's right edge, flat side
 * against it. A stray pointer passing over it mid-fight opens nothing: the menu opens from the caret, the peek (if
 * given) only once the pointer rests on the tab for PEEK_DELAY_MS. Dragging the tab slides it along the edge
 * (`onDrag` gets the vertical travel). The menu opens above the tab or below it (`menuBelow`) near the top; the peek
 * beside it, aligned the same way. In the menu each window can be starred onto the tab or off it, and the rows
 * dragged into the user's order (the tab follows it). A new message or offer pulses the tab once.
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
  order,
  favorites,
  onOrderChange,
  onFavoritesChange,
}) => {
  const { t } = useTranslation('app');
  const [menuOpen, setMenuOpen] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const leaveTimer = useRef<number | undefined>(undefined);
  const peekTimer = useRef<number | undefined>(undefined);
  // A row being dragged can carry the pointer out of the frame: the menu stays open until it is dropped
  const rowDragging = useRef(false);
  // The order while a row is dragged, then until the saved order arrives (keyed by the order it was made from)
  const orderKey = order.join();
  const [draft, setDraft] = useState<{ from: string; order: ChatDockItem[] } | null>(null);
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  });
  const menuOrder = draft?.from === orderKey ? draft.order : order;

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
    if ((!menuOpen && !peekOpen) || rowDragging.current) return;
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
      id: 'chat',
      label: t('chatButton.menu.chat'),
      tabLabel: t('chatButton.openChat'),
      icon: MessageSquare,
      onClick: onChatClick,
      badge: {
        count: unreadCount,
        className: 'bg-destructive text-destructive-foreground',
        label: t('chatButton.unreadMessages', { count: unreadCount }),
      },
    },
    { id: 'market', label: t('chatButton.menu.market'), icon: Store, onClick: onMarketClick },
    { id: 'builds', label: t('chatButton.menu.builds'), icon: Shield, onClick: onBuildsClick },
    { id: 'netWorth', label: t('chatButton.menu.netWorth'), icon: TrendingUp, onClick: onNetWorthClick },
    { id: 'stashValue', label: t('chatButton.menu.stashValue'), icon: Coins, onClick: onStashValueClick },
    {
      id: 'offers',
      label: t('chatButton.menu.offers'),
      icon: ShoppingBag,
      onClick: onOffersClick,
      badge: {
        count: tradeOffersCount,
        className: 'bg-warning text-warning-foreground',
        label: t('chatButton.tradeOffers', { count: tradeOffersCount }),
      },
    },
    { id: 'manageListings', label: t('chatButton.menu.manageListings'), icon: List, onClick: onManageListingsClick },
    { id: 'settings', label: t('chatButton.menu.settings'), icon: Settings, onClick: onSettingsClick },
  ];
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const shown = menuOrder.map((id) => byId.get(id)).filter((entry): entry is ShownEntry => !!entry?.onClick);
  const shownIds = shown.map((entry) => entry.id);
  const onTab = shown.filter((entry) => favorites.includes(entry.id));

  const commitOrder = (next: ChatDockItem[]) => {
    if (next.some((item, i) => item !== order[i])) onOrderChange?.(next);
  };
  const moveRow = (id: ChatDockItem, step: -1 | 1) => {
    const from = shownIds.indexOf(id);
    const to = from + step;
    if (to < 0 || to >= shownIds.length) return;
    const moved = [...shownIds];
    [moved[from], moved[to]] = [moved[to], moved[from]];
    const next = refill(menuOrder, shownIds, moved);
    setDraft({ from: orderKey, order: next });
    commitOrder(next);
  };
  const rowReorder = (id: ChatDockItem) =>
    onOrderChange && {
      onMove: (step: -1 | 1) => moveRow(id, step),
      onDragStart: () => {
        rowDragging.current = true;
        window.clearTimeout(leaveTimer.current);
      },
      onDragEnd: () => {
        rowDragging.current = false;
        const dropped = draftRef.current;
        if (dropped?.from === orderKey) commitOrder(dropped.order);
      },
    };
  const toggleFavorite = (id: ChatDockItem) =>
    onFavoritesChange &&
    (() => {
      const wasFavorite = favorites.includes(id);
      onFavoritesChange(menuOrder.filter((item) => (item === id ? !wasFavorite : favorites.includes(item))));
    });

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
          title={onDrag ? t('chatButton.dragToMove') : undefined}
          className="flex h-full w-full touch-none flex-col overflow-hidden rounded-l-xl border border-r-0 border-border bg-surface shadow-panel backdrop-blur-md"
          onPointerDown={onTabPointerDown}
          onClickCapture={onTabClickCapture}
        >
          {onTab.map(({ id, label, tabLabel, icon: Icon, onClick, badge: count }) => (
            <button
              key={id}
              type="button"
              onClick={onClick}
              className={segment}
              aria-label={tabLabel ?? label}
              title={label}
            >
              <Icon style={icon} />
              <AnimatePresence>
                {count && count.count > 0 && (
                  <CountBadge
                    key={id}
                    count={count.count}
                    label={count.label}
                    className={count.className}
                    style={badge}
                  />
                )}
              </AnimatePresence>
            </button>
          ))}
          {onTab.length > 0 && <div aria-hidden
            className="mx-auto h-px w-1/2 shrink-0 bg-border" />}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            style={{ flexGrow: CARET_HEIGHT }}
            className={cn(segment, 'text-muted-foreground', menuOpen && 'bg-accent text-accent-foreground')}
            aria-label={t('chatButton.more')}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title={t('chatButton.more')}
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
              {(onOrderChange || onFavoritesChange) && (
                <p className="px-2.5 pt-1 pb-1.5 text-xs text-muted-foreground">{t('chatButton.layoutHint')}</p>
              )}
              <Reorder.Group
                as="div"
                axis="y"
                role="none"
                values={shownIds}
                onReorder={(moved: ChatDockItem[]) =>
                  setDraft({ from: orderKey, order: refill(menuOrder, shownIds, moved) })
                }
              >
                {shown.map((entry) => (
                  <MenuRow
                    key={entry.id}
                    entry={entry}
                    favorite={favorites.includes(entry.id)}
                    onPick={pick(entry.onClick)}
                    onToggleFavorite={toggleFavorite(entry.id)}
                    reorder={rowReorder(entry.id)}
                  />
                ))}
              </Reorder.Group>
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
                    <span className="flex-1">{t('chatButton.disableOverlay')}</span>
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
