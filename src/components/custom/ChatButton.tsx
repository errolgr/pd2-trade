import React, { useState } from 'react';
import { MessageSquare, GripVertical, Settings, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChatButtonProps {
  handleClick: () => void;
  onSettingsClick?: () => void;
  onTradeMessagesClick?: () => void;
  unreadCount?: number;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ handleClick, onSettingsClick, onTradeMessagesClick, unreadCount = 0 }) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Spiral positions: angle in degrees, distance from center
  const buttonPositions = [
    { angle: 0, distance: 0, component: 'main' }, // Main chat button at center
    { angle: 45, distance: 70, component: 'settings' }, // Settings at 45°
    { angle: 135, distance: 70, component: 'trade' }, // Trade messages at 135°
    { angle: 225, distance: 50, component: 'drag' }, // Drag handle at 225°
  ];

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

  React.useEffect(() => {
    return () => {
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
            <GripVertical data-tauri-drag-region className="h-4 w-4 text-neutral-400" />
          </div>
        )}

        {/* Settings Button Circle */}
        {onSettingsClick && buttonPositions.find(p => p.component === 'settings') && (
          <Button
            onClick={onSettingsClick}
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg bg-neutral-800/90 hover:bg-neutral-700/90 border border-neutral-600/50 backdrop-blur-sm transition-all duration-300 ease-out",
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
          <Button
            onClick={onTradeMessagesClick}
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg bg-neutral-800/90 hover:bg-neutral-700/90 border border-neutral-600/50 backdrop-blur-sm transition-all duration-300 ease-out",
              isHovered ? "h-12 w-12" : "h-10 w-10"
            )}
            size="icon"
            aria-label="Trade Messages"
            style={getButtonStyle(135, 70, 'trade')}
          >
            <ShoppingBag className={cn(
              "text-neutral-200 transition-all duration-300",
              isHovered ? "h-5 w-5" : "h-4 w-4"
            )} />
          </Button>
        )}

        {/* Chat Button Circle - Main */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Button
            onClick={handleClick}
            className={cn(
              "rounded-full shadow-lg bg-neutral-800/90 hover:bg-neutral-700/90 border border-neutral-600/50 backdrop-blur-sm pointer-events-auto transition-all duration-300 ease-out",
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
        </div>
      </div>
    </div>
  );
};

