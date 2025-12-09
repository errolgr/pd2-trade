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

  return (
    <div 
    className="fixed bottom-4 right-4 z-[100] pointer-events-auto">
      <div 
        className="relative flex items-center gap-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Drag Handle Circle */}
        <div
            data-tauri-drag-region
          className={cn(
            "h-10 w-10 rounded-full bg-neutral-800/90 border border-neutral-600/50 backdrop-blur-sm flex items-center justify-center cursor-move transition-all duration-200",
            isHovered ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
          )}
        >
          <GripVertical className="h-4 w-4 text-neutral-400" />
        </div>

        {/* Settings Button Circle */}
        {onSettingsClick && (
          <Button
            onClick={onSettingsClick}
            className={cn(
              "rounded-full shadow-lg bg-neutral-800/90 hover:bg-neutral-700/90 border border-neutral-600/50 backdrop-blur-sm pointer-events-auto transition-all duration-200",
              isHovered ? "h-12 w-12 scale-110" : "h-10 w-10 scale-100 opacity-0 pointer-events-none"
            )}
            size="icon"
            aria-label="Settings"
          >
            <Settings className={cn(
              "text-neutral-200 transition-all duration-200",
              isHovered ? "h-5 w-5" : "h-4 w-4"
            )} />
          </Button>
        )}

        {/* Trade Messages Button Circle */}
        {onTradeMessagesClick && (
          <Button
            onClick={onTradeMessagesClick}
            className={cn(
              "rounded-full shadow-lg bg-neutral-800/90 hover:bg-neutral-700/90 border border-neutral-600/50 backdrop-blur-sm pointer-events-auto transition-all duration-200",
              isHovered ? "h-12 w-12 scale-110" : "h-10 w-10 scale-100 opacity-0 pointer-events-none"
            )}
            size="icon"
            aria-label="Trade Messages"
          >
            <ShoppingBag className={cn(
              "text-neutral-200 transition-all duration-200",
              isHovered ? "h-5 w-5" : "h-4 w-4"
            )} />
          </Button>
        )}

        {/* Chat Button Circle */}
        <div className="relative">
          <Button
            onClick={handleClick}
            className={cn(
              "rounded-full shadow-lg bg-neutral-800/90 hover:bg-neutral-700/90 border border-neutral-600/50 backdrop-blur-sm pointer-events-auto transition-all duration-200",
              isHovered ? "h-14 w-14 scale-110" : "h-12 w-12 scale-100"
            )}
            size="icon"
            aria-label="Open PD2 Chat"
          >
            <MessageSquare className={cn(
              "text-neutral-200 transition-all duration-200",
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

