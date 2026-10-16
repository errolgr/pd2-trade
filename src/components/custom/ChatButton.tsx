import React, { useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { MessageSquare, GripVertical, Settings, ShoppingBag, X, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { emit } from '@/lib/browser-events';
import { popIn } from '@/lib/motion';

interface ChatButtonProps {
  handleClick: () => void;
  onSettingsClick?: () => void;
  onTradeMessagesClick?: () => void;
  onManageListingsClick?: () => void;
  onDisableClick?: () => void;
  unreadCount?: number;
  tradeOffersCount?: number;
}

type FanItem = 'settings' | 'trade' | 'manage' | 'drag' | 'disable';

// Spiral positions: angle in degrees, distance from center
// Settings (30), Trade (90), Manage (150) -> fan at the bottom; Drag (225), Disable (315) fixed on top.
// `order` staggers the fan-out so the items unfold in a sweep.
const FAN: Record<FanItem, { angle: number; order: number }> = {
  settings: { angle: 30, order: 2 },
  trade: { angle: 90, order: 1 },
  manage: { angle: 150, order: 0 },
  drag: { angle: 225, order: 3 },
  disable: { angle: 315, order: 4 },
};
const FAN_DISTANCE = 60;

// Shared orb look: theme surface + blur so it reads over any game background.
const orb =
  'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full ' +
  'border border-border bg-surface text-surface-foreground shadow-panel backdrop-blur-md outline-none ' +
  'hover:border-glow/60 hover:bg-accent hover:text-accent-foreground active:scale-90 ' +
  'focus-visible:ring-2 focus-visible:ring-ring/60 [&_svg]:pointer-events-none';

const CountBadge: React.FC<{ count: number; className: string; label: string }> = ({ count, className, label }) => (
  <motion.span
    key={count}
    variants={popIn}
    initial="hidden"
    animate="visible"
    exit="exit"
    aria-label={label}
    className={cn(
      'pointer-events-none absolute flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums shadow-sm ring-2 ring-background',
      className,
    )}
  >
    {count > 99 ? '99+' : count}
  </motion.span>
);

export const ChatButton: React.FC<ChatButtonProps> = ({
  handleClick,
  onSettingsClick,
  onTradeMessagesClick,
  onManageListingsClick,
  onDisableClick,
  unreadCount = 0,
  tradeOffersCount = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = React.useRef<number | null>(null);

  const handleDisableClick = () => {
    // Emit a toast event that will show a confirmation dialog
    // The actual disable will happen when user confirms in the toast
    if (onDisableClick) {
      emit('toast-confirm-disable-overlay');
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // Add a small delay before collapsing to allow moving between buttons
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  const fanStyle = (item: FanItem): React.CSSProperties => {
    const { angle, order } = FAN[item];
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * FAN_DISTANCE;
    const y = Math.sin(rad) * FAN_DISTANCE;

    return {
      transform: isHovered ? `translate(${x}px, ${y}px) scale(1)` : 'translate(0px, 0px) scale(0)',
      opacity: isHovered ? 1 : 0,
      pointerEvents: isHovered ? 'auto' : 'none',
      // Spring out with a sweep; collapse together and quickly.
      transition: isHovered
        ? `transform var(--dur-slow) var(--ease-spring) ${order * 30}ms, opacity var(--dur-med) var(--ease-out) ${order * 30}ms, width var(--dur-med) var(--ease-out), height var(--dur-med) var(--ease-out), background-color var(--dur-fast), border-color var(--dur-fast), color var(--dur-fast), scale var(--dur-fast)`
        : 'transform var(--dur-med) var(--ease-out), opacity var(--dur-fast) var(--ease-out), width var(--dur-med) var(--ease-out), height var(--dur-med) var(--ease-out)',
    };
  };

  const itemSize = isHovered ? 'size-11' : 'size-9';
  const iconSize = isHovered ? 'size-5' : 'size-4';
  const iconTransition = 'transition-[width,height] duration-(--dur-med) ease-out';

  // Calculate the expanded area size (largest distance + button size + padding)
  const expandedRadius = FAN_DISTANCE + 24 + 16; // max distance + button radius + padding

  return (
    <MotionConfig reducedMotion="user">
      <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center">
        {/* Invisible hover area that covers the expanded button positions */}
        <div
          className="pointer-events-auto absolute"
          style={{
            width: expandedRadius * 2,
            height: expandedRadius * 2,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
        <div className="pointer-events-auto relative size-14"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}>
          {/* Soft halo behind the cluster while expanded */}
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute top-1/2 left-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-glow/10 blur-2xl',
              'transition-opacity duration-(--dur-slow) ease-out',
              isHovered ? 'opacity-100' : 'opacity-0',
            )}
          />

          {/* Drag Handle Circle */}
          <div
            data-tauri-drag-region
            title="Drag to move"
            className={cn(orb, 'size-9 cursor-grab text-muted-foreground active:cursor-grabbing active:scale-100')}
            style={fanStyle('drag')}
          >
            <GripVertical data-tauri-drag-region
              className="size-4" />
          </div>

          {/* Settings Button Circle */}
          {onSettingsClick && (
            <button
              type="button"
              onClick={onSettingsClick}
              className={cn(orb, itemSize)}
              aria-label="Settings"
              title="Settings"
              style={fanStyle('settings')}
            >
              <Settings className={cn(iconSize, iconTransition)} />
            </button>
          )}

          {/* Trade Messages Button Circle */}
          {onTradeMessagesClick && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={fanStyle('trade')}>
              <button
                type="button"
                onClick={onTradeMessagesClick}
                className={cn(orb, 'relative top-auto left-auto translate-x-0 translate-y-0', itemSize)}
                aria-label="Trade Messages"
                title="Trade Messages"
              >
                <ShoppingBag className={cn(iconSize, iconTransition)} />
              </button>
              <AnimatePresence>
                {tradeOffersCount > 0 && isHovered && (
                  <CountBadge key="trade"
                    count={tradeOffersCount}
                    label={`${tradeOffersCount} trade offers`}
                    className="-top-1 -right-1 bg-info text-info-foreground"
                  />
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Manage Listings Button Circle */}
          {onManageListingsClick && (
            <button
              type="button"
              onClick={onManageListingsClick}
              className={cn(orb, itemSize)}
              aria-label="Manage Listings"
              title="Manage Listings"
              style={fanStyle('manage')}
            >
              <List className={cn(iconSize, iconTransition)} />
            </button>
          )}

          {/* Disable Button Circle */}
          {onDisableClick && (
            <button
              type="button"
              onClick={handleDisableClick}
              className={cn(
                orb,
                'border-destructive/60 bg-destructive text-destructive-foreground hover:border-destructive hover:bg-destructive/85 hover:text-destructive-foreground',
                isHovered ? 'size-8' : 'size-7',
              )}
              aria-label="Disable Overlay"
              title="Disable overlay"
              style={fanStyle('disable')}
            >
              <X className={cn(iconTransition, isHovered ? 'size-3.5' : 'size-3')}
                strokeWidth={3} />
            </button>
          )}

          {/* Chat Button Circle - Main */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={handleClick}
              className={cn(
                orb,
                'pointer-events-auto relative top-auto left-auto translate-x-0 translate-y-0',
                'transition-[width,height,scale,background-color,border-color,color,box-shadow] duration-(--dur-slow) ease-spring',
                isHovered ? 'size-13 scale-110 border-glow/60 shadow-glow' : 'size-11 scale-100',
              )}
              aria-label="Open PD2 Chat"
              title="Open PD2 Chat"
            >
              <MessageSquare className={cn(iconTransition, isHovered ? 'size-6' : 'size-5')} />
            </button>
            <AnimatePresence>
              {unreadCount > 0 && (
                <CountBadge key="unread"
                  count={unreadCount}
                  label={`${unreadCount} unread messages`}
                  className="-top-1 -right-1 bg-destructive text-destructive-foreground"
                />
              )}
              {tradeOffersCount > 0 && !isHovered && (
                <CountBadge key="trade"
                  count={tradeOffersCount}
                  label={`${tradeOffersCount} trade offers`}
                  className="-top-1 -left-1 bg-info text-info-foreground"
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
};
