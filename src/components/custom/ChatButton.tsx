import React, { useState } from 'react';
import { MessageSquare, GripVertical, Settings, ShoppingBag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { emit } from '@/lib/browser-events';

interface ChatButtonProps {
  handleClick: () => void;
  onSettingsClick?: () => void;
  onTradeMessagesClick?: () => void;
  onDisableClick?: () => void;
  unreadCount?: number;
  tradeOffersCount?: number;
}

export const ChatButton: React.FC<ChatButtonProps> = ({
  handleClick,
  onSettingsClick,
  onTradeMessagesClick,
  onDisableClick,
  unreadCount = 0,
  tradeOffersCount = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Spiral positions: angle in degrees, distance from center
  const buttonPositions = [
    { angle: 0, distance: 0, component: 'main' }, // Main chat button at center
    { angle: 45, distance: 70, component: 'settings' }, // Settings at 45°
    { angle: 135, distance: 70, component: 'trade' }, // Trade messages at 135°
    { angle: 225, distance: 50, component: 'drag' }, // Drag handle at 225°
    { angle: 315, distance: 50, component: 'disable' }, // Disable button at 315° (closer)
  ];

  const handleDisableClick = () => {
    // Emit a toast event that will show a confirmation dialog
    // The actual disable will happen when user confirms in the toast
    if (onDisableClick) {
      emit('toast-confirm-disable-overlay');
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // Add a small delay before collapsing to allow moving between buttons
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  const lastCursorRef = React.useRef({ x: 0, y: 0, time: 0 });

  React.useEffect(() => {
    // Helper to force collapse the button
    const forceCollapse = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setIsHovered(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastCursorRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
      };
    };

    document.addEventListener('mousemove', handleMouseMove);

    // Watchdog for missing mouseleave events (common with fast movement over transparent windows)
    const watchdogInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceMove = now - lastCursorRef.current.time;

      // Condition 1: Browser says nothing is hovered
      const nothingHovered = document.querySelectorAll(':hover').length === 0;

      // Condition 2: Mouse hasn't moved for a bit AND last known position was near the edge
      // This implies it flew out of the window
      const { x, y } = lastCursorRef.current;
      const { innerWidth, innerHeight } = window;
      const edgeThreshold = 10;

      const isNearEdge =
        x < edgeThreshold ||
        x > innerWidth - edgeThreshold ||
        y < edgeThreshold ||
        y > innerHeight - edgeThreshold;

      // If we are "stuck" near the edge with no updates, force close
      if (nothingHovered || (isNearEdge && timeSinceMove > 500)) {
        forceCollapse();
      }
    }, 200);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearInterval(watchdogInterval);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const getButtonStyle = (angle: number, distance: number, component: string) => {
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * distance;
    const y = Math.sin(rad) * distance;

    return {
      transform: isHovered
        ? `translate(${x}px, ${y}px) scale(1)`
        : `translate(0px, 0px) scale(${component === 'main' ? 1 : 0})`,
      opacity: isHovered || component === 'main' ? 1 : 0,
      pointerEvents: isHovered || component === 'main' ? 'auto' as const : 'none' as const,
    };
  };

  // Calculate the expanded area size (largest distance + button size + padding)
  const expandedRadius = 70 + 28 + 20; // max distance + button radius + padding

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none"
    >
      {/* Invisible hover area that covers the expanded button positions */}
      <div
        className="absolute pointer-events-auto"
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
      <div
        className="relative w-14 h-14 pointer-events-auto"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Drag Handle Circle */}
        {buttonPositions.find(p => p.component === 'drag') && (
          <div
            data-tauri-drag-region
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-neutral-800/90 border border-neutral-600/50 backdrop-blur-sm flex items-center justify-center cursor-move transition-all duration-300 ease-out"
            )}
            style={getButtonStyle(225, 50, 'drag')}
          >
            <GripVertical data-tauri-drag-region
              className="h-4 w-4 text-neutral-400" />
          </div>
        )}

        {/* Settings Button Circle */}
        {onSettingsClick && buttonPositions.find(p => p.component === 'settings') && (
          <Button
            onClick={onSettingsClick}
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg bg-neutral-800/90 hover:bg-neutral-700/90 border border-neutral-600/50 backdrop-blur-sm transition-all duration-300 ease-out cursor-pointer",
              isHovered ? "h-12 w-12" : "h-10 w-10"
            )}
            size="icon"
            aria-label="Settings"
            style={getButtonStyle(45, 70, 'settings')}
          >
            <Settings className={cn(
              "text-neutral-200 transition-all duration-300",
              isHovered ? "h-5 w-5" : "h-4 w-4"
            )} />
          </Button>
        )}

        {/* Trade Messages Button Circle */}
        {onTradeMessagesClick && buttonPositions.find(p => p.component === 'trade') && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={getButtonStyle(135, 70, 'trade')}>

            <Button
              onClick={onTradeMessagesClick}
              className={cn(
                "rounded-full shadow-lg bg-neutral-800/90 hover:bg-neutral-700/90 border border-neutral-600/50 backdrop-blur-sm transition-all duration-300 ease-out cursor-pointer",
                isHovered ? "h-12 w-12" : "h-10 w-10"
              )}
              size="icon"
              aria-label="Trade Messages"
            >
              <ShoppingBag className={cn(
                "text-neutral-200 transition-all duration-300",
                isHovered ? "h-5 w-5" : "h-4 w-4"
              )} />
            </Button>
            {tradeOffersCount > 0 && isHovered && (
              <Badge
                className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 flex items-center justify-center bg-blue-500 text-white text-xs font-bold rounded-full border-2 border-neutral-800 pointer-events-none"
              >
                {tradeOffersCount > 99 ? '99+' : tradeOffersCount}
              </Badge>
            )}
          </div>
        )}

        {/* Disable Button Circle */}
        {onDisableClick && buttonPositions.find(p => p.component === 'disable') && (
          <Button
            onClick={handleDisableClick}
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg bg-red-600/90 hover:bg-red-700/90 border border-red-500/50 backdrop-blur-sm transition-all duration-300 ease-out cursor-pointer",
              isHovered ? "h-8 w-8" : "h-7 w-7"
            )}
            size="icon"
            aria-label="Disable Overlay"
            style={getButtonStyle(315, 50, 'disable')}
          >
            <X className={cn(
              "text-white transition-all duration-300",
              isHovered ? "h-2.5 w-2.5" : "h-2 w-2"
            )} />
          </Button>
        )}

        {/* Chat Button Circle - Main */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Button
            onClick={handleClick}
            className={cn(
              "rounded-full shadow-lg bg-neutral-800/90 hover:bg-neutral-700/90 border border-neutral-600/50 backdrop-blur-sm pointer-events-auto transition-all duration-300 ease-out cursor-pointer",
              isHovered ? "h-14 w-14 scale-110" : "h-12 w-12 scale-100"
            )}
            size="icon"
            aria-label="Open PD2 Chat"
          >
            <MessageSquare className={cn(
              "text-neutral-200 transition-all duration-300",
              isHovered ? "h-6 w-6" : "h-5 w-5"
            )} />
          </Button>
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full border-2 border-neutral-800 pointer-events-none"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {tradeOffersCount > 0 && !isHovered && (
            <Badge
              className="absolute -top-1 -left-1 h-5 min-w-5 px-1.5 flex items-center justify-center bg-blue-500 text-white text-xs font-bold rounded-full border-2 border-neutral-800 pointer-events-none"
            >
              {tradeOffersCount > 99 ? '99+' : tradeOffersCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

