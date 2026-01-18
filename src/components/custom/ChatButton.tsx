import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  GripVertical,
  Settings,
  X,
  List,
  Search,
  ShoppingCart,
  DollarSign,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { emit } from '@/lib/browser-events';
import { useClickThrough } from '@/hooks/useClickThrough';
import { useOptions } from '@/hooks/useOptions';
import { formatHotkey } from '@/lib/hotkey-format';

const CHAT_BUTTON_ID = 'chat-button';

interface ChatButtonProps {
  handleClick: () => void;
  onSettingsClick?: () => void;
  onTradeMessagesClick?: () => void;
  onManageListingsClick?: () => void;
  onItemSearchClick?: () => void;
  onQuickListClick?: () => void;
  onCurrencyValuationClick?: () => void;
  onMarketSearchClick?: () => void;
  onDisableClick?: () => void;
  unreadCount?: number;
  tradeOffersCount?: number;
  tradeMessagesCount?: number;
}

export const ChatButton: React.FC<ChatButtonProps> = ({
  handleClick,
  onSettingsClick,
  onTradeMessagesClick,
  onManageListingsClick,
  onItemSearchClick,
  onQuickListClick,
  onCurrencyValuationClick,
  onMarketSearchClick,
  onDisableClick,
  unreadCount = 0,
  tradeOffersCount = 0,
  tradeMessagesCount: _tradeMessagesCount = 0,
}) => {
  const { settings } = useOptions();
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

  const { registerWindow, unregisterWindow, updateWindow, isDragging: setIsDragging } = useClickThrough();
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isRegisteredRef = useRef(false);

  const handleDisableClick = () => {
    // Emit a toast event that will show a confirmation dialog
    // The actual disable will happen when user confirms in the toast
    if (onDisableClick) {
      emit('toast-confirm-disable-overlay');
    }
  };

  // Calculate menu items count for proper sizing
  const menuItems = [
    onItemSearchClick && 'item-search',
    onQuickListClick && 'quick-list',
    onCurrencyValuationClick && 'currency',
    onMarketSearchClick && 'market-search',
    onTradeMessagesClick && 'trade-messages',
    onManageListingsClick && 'manage',
    onSettingsClick && 'settings',
    'drag',
    onDisableClick && 'disable',
  ].filter(Boolean);

  const menuHeight = menuItems.length * 80 + 8; // 48px per item + padding

  // Calculate combined bounding box including menu when expanded
  const calculateWindowBox = useCallback(() => {
    if (!containerRef.current) return null;

    const containerRect = containerRef.current.getBoundingClientRect();

    // If menu is visible, calculate combined bounding box
    if (isHovered && menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();

      // Calculate the combined bounding box
      const left = Math.min(containerRect.left, menuRect.left);
      const top = Math.min(containerRect.top, menuRect.top);
      const right = Math.max(containerRect.right, menuRect.right);
      const bottom = Math.max(containerRect.bottom, menuRect.bottom);

      return {
        id: CHAT_BUTTON_ID,
        top,
        left,
        width: right - left,
        height: bottom - top,
      };
    }

    // Otherwise, just use container bounds
    return {
      id: CHAT_BUTTON_ID,
      top: containerRect.top,
      left: containerRect.left,
      width: containerRect.width,
      height: containerRect.height,
    };
  }, [isHovered]);

  // Register with click-through system
  useEffect(() => {
    const updateWindowBox = () => {
      const box = calculateWindowBox();
      if (!box) return;

      if (isRegisteredRef.current) {
        updateWindow(CHAT_BUTTON_ID, box);
      } else {
        registerWindow(CHAT_BUTTON_ID, box);
        isRegisteredRef.current = true;
      }
    };

    // Initial registration - wait for element to be available
    const timeout = setTimeout(() => {
      if (containerRef.current) {
        updateWindowBox();

        // Set up ResizeObserver to update when button size changes
        resizeObserverRef.current = new ResizeObserver(updateWindowBox);
        resizeObserverRef.current.observe(containerRef.current);

        // Also observe the menu if it exists
        if (menuRef.current) {
          resizeObserverRef.current.observe(menuRef.current);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timeout);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (isRegisteredRef.current) {
        unregisterWindow(CHAT_BUTTON_ID);
        isRegisteredRef.current = false;
      }
    };
  }, [registerWindow, unregisterWindow, updateWindow, calculateWindowBox]);

  // Set up ResizeObserver for menu when it becomes available
  useEffect(() => {
    if (menuRef.current && resizeObserverRef.current) {
      resizeObserverRef.current.observe(menuRef.current);
      return () => {
        if (resizeObserverRef.current && menuRef.current) {
          resizeObserverRef.current.unobserve(menuRef.current);
        }
      };
    }
  }, [isHovered]); // Re-run when menu visibility changes

  // Update window box when hover state changes (menu expands/collapses)
  useEffect(() => {
    if (isRegisteredRef.current) {
      // Small delay to allow DOM to update and menu to render
      const timeout = setTimeout(() => {
        const box = calculateWindowBox();
        if (box) {
          updateWindow(CHAT_BUTTON_ID, box);
        }
      }, 100); // Increased delay to ensure menu is fully rendered
      return () => clearTimeout(timeout);
    }
  }, [isHovered, updateWindow, calculateWindowBox]);

  // Notify click-through system when dragging state changes
  useEffect(() => {
    setIsDragging(CHAT_BUTTON_ID, isDraggingState);
  }, [isDraggingState, setIsDragging]);

  const handleDragStart = () => {
    setIsDraggingState(true);
  };

  const handleDragEnd = () => {
    setIsDraggingState(false);
  };

  return (
    <Popover open={isHovered}
      onOpenChange={setIsHovered}>
      <div ref={containerRef}
        className="relative pointer-events-auto group/container">
        <PopoverTrigger asChild>
          <div className="relative">
            <Button
              onMouseEnter={() => setIsHovered(true)}
              onClick={handleClick}
              className="h-11 w-11 rounded-lg shadow-lg bg-neutral-800/90 hover:bg-neutral-700/90 border border-neutral-600/50 backdrop-blur-sm pointer-events-auto transition-colors duration-200 ease-out cursor-pointer"
              size="icon"
              aria-label="Open PD2 Chat"
            >
              <MessageSquare className="h-5 w-5 text-neutral-200" />
            </Button>
            {unreadCount > 0 && (
              <Badge
                key={`unread-${unreadCount}`}
                className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full border-2 border-neutral-800 pointer-events-none animate__animated animate__wobble"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
            {/* Trade Offers Badge - always shows on button */}
            {tradeOffersCount > 0 && (
              <Badge
                key={`trade-offers-${tradeOffersCount}`}
                className="absolute -top-1 -left-1 h-5 min-w-5 px-1.5 flex items-center justify-center bg-blue-500 text-white text-xs font-bold rounded-full border-2 border-neutral-800 pointer-events-none animate__animated animate__wobble"
              >
                {tradeOffersCount > 99 ? '99+' : tradeOffersCount}
              </Badge>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          ref={menuRef}
          side="top"
          align="end"
          sideOffset={8}
          className={cn(
            'bg-neutral-800/95 border-neutral-600/50 backdrop-blur-sm rounded-lg shadow-xl p-0 min-w-[300px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=top]:slide-in-from-bottom-2',
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            style={{
              maxHeight: `${menuHeight}px`,
            }}
            className="overflow-hidden"
          >
            {/* Drag Handle */}
            <div
              data-drag-handle
              className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-700/50 cursor-move transition-colors"
              onMouseDown={handleDragStart}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
            >
              <GripVertical className="h-4 w-4 text-neutral-400 flex-shrink-0" />
              <span className="text-sm text-neutral-200">Drag to move</span>
            </div>

            {/* Divider for Price Checking section */}
            {(onItemSearchClick || onQuickListClick || onCurrencyValuationClick) && (
              <div className="px-4 py-2 border-b border-neutral-600/50">
                <span className="text-xs font-semibold text-neutral-400 uppercase">Price Checking</span>
              </div>
            )}

            {/* Item Search Button */}
            {onItemSearchClick && (
              <button
                onClick={onItemSearchClick}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700/50 transition-colors text-left"
                aria-label="Item Search"
              >
                <Search className="h-4 w-4 text-neutral-200 flex-shrink-0" />
                <span className="text-sm text-neutral-200">Item Search</span>
                {settings?.hotkeyKey && (
                  <span className="ml-auto text-xs text-neutral-400">
                    {formatHotkey(settings.hotkeyModifier, settings.hotkeyKey)}
                  </span>
                )}
              </button>
            )}

            {/* Quick List Button */}
            {onQuickListClick && (
              <button
                onClick={onQuickListClick}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700/50 transition-colors text-left"
                aria-label="Quick List"
              >
                <List className="h-4 w-4 text-neutral-200 flex-shrink-0" />
                <span className="text-sm text-neutral-200">Quick List</span>
                {settings?.hotkeyKeyListItem && (
                  <span className="ml-auto text-xs text-neutral-400">
                    {formatHotkey(settings.hotkeyModifierListItem, settings.hotkeyKeyListItem)}
                  </span>
                )}
              </button>
            )}

            {/* Currency Valuation Button */}
            {onCurrencyValuationClick && (
              <button
                onClick={onCurrencyValuationClick}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700/50 transition-colors text-left"
                aria-label="Currency Valuation"
              >
                <DollarSign className="h-4 w-4 text-neutral-200 flex-shrink-0" />
                <span className="text-sm text-neutral-200">Currency Valuation</span>
                {settings?.hotkeyKeyCurrencyValuation && (
                  <span className="ml-auto text-xs text-neutral-400">
                    {formatHotkey(settings.hotkeyModifierCurrencyValuation, settings.hotkeyKeyCurrencyValuation)}
                  </span>
                )}
              </button>
            )}

            {/* Divider for Trading section */}
            {(onMarketSearchClick || onTradeMessagesClick || onManageListingsClick) && (
              <div className="px-4 py-2 border-b border-neutral-600/50">
                <span className="text-xs font-semibold text-neutral-400 uppercase">Trading</span>
              </div>
            )}

            {/* Market Search Button */}
            {onMarketSearchClick && (
              <button
                onClick={onMarketSearchClick}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700/50 transition-colors text-left"
                aria-label="Market Search"
              >
                <ShoppingCart className="h-4 w-4 text-neutral-200 flex-shrink-0" />
                <span className="text-sm text-neutral-200">Market Search</span>
                {settings?.hotkeyKeyMarketSearch && (
                  <span className="ml-auto text-xs text-neutral-400">
                    {formatHotkey(settings.hotkeyModifierMarketSearch || 'ctrl', settings.hotkeyKeyMarketSearch)}
                  </span>
                )}
              </button>
            )}

            {/* Trade Messages Button */}
            {onTradeMessagesClick && (
              <div className="relative">
                <button
                  onClick={onTradeMessagesClick}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700/50 transition-colors text-left relative"
                  aria-label="Trade Messages"
                >
                  <FileText className="h-4 w-4 text-neutral-200 flex-shrink-0" />
                  <span className="text-sm text-neutral-200 relative">Trade Offers</span>
                  <div className="ml-auto flex items-center gap-2">
                    {tradeOffersCount > 0 && isHovered && (
                      <Badge
                        key={`badge-${isHovered}`}
                        className={cn(
                          'h-5 min-w-5 px-1.5 flex items-center justify-center bg-blue-500 text-white text-xs font-bold rounded-full border-2 border-neutral-800 pointer-events-none animate__animated animate__wobble',
                        )}
                      >
                        {tradeOffersCount > 99 ? '99+' : tradeOffersCount}
                      </Badge>
                    )}
                    {settings?.hotkeyKeyOffers && (
                      <span className="text-xs text-neutral-400">
                        {formatHotkey(settings.hotkeyModifierOffers, settings.hotkeyKeyOffers)}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            )}

            {/* Manage Listings Button */}
            {onManageListingsClick && (
              <button
                onClick={onManageListingsClick}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700/50 transition-colors text-left"
                aria-label="Manage Listings"
              >
                <List className="h-4 w-4 text-neutral-200 flex-shrink-0" />
                <span className="text-sm text-neutral-200">Manage Listings</span>
              </button>
            )}

            {/* Divider for Communication section */}
            <div className="px-4 py-2 border-b border-neutral-600/50">
              <span className="text-xs font-semibold text-neutral-400 uppercase">Communication</span>
            </div>

            {/* Chat Button (in menu) */}
            <button
              onClick={handleClick}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700/50 transition-colors text-left"
              aria-label="Chat"
            >
              <MessageSquare className="h-4 w-4 text-neutral-200 flex-shrink-0" />
              <span className="text-sm text-neutral-200">Chat</span>
              <div className="ml-auto flex items-center gap-2">
                {unreadCount > 0 && (
                  <Badge
                    key={`menu-unread-${unreadCount}`}
                    className="h-5 min-w-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full border-2 border-neutral-800 pointer-events-none animate__animated animate__wobble"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
                {settings?.hotkeyKeyChat && (
                  <span className="text-xs text-neutral-400">
                    {formatHotkey(settings.hotkeyModifierChat, settings.hotkeyKeyChat)}
                  </span>
                )}
              </div>
            </button>

            {/* Divider for Settings section */}
            {onSettingsClick && (
              <div className="px-4 py-2 border-b border-neutral-600/50">
                <span className="text-xs font-semibold text-neutral-400 uppercase">Settings</span>
              </div>
            )}

            {/* Settings Button */}
            {onSettingsClick && (
              <button
                onClick={onSettingsClick}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700/50 transition-colors text-left"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4 text-neutral-200 flex-shrink-0" />
                <span className="text-sm text-neutral-200">Settings</span>
                {settings?.hotkeyKeySettings && (
                  <span className="ml-auto text-xs text-neutral-400">
                    {formatHotkey(settings.hotkeyModifierSettings || 'ctrl', settings.hotkeyKeySettings)}
                  </span>
                )}
              </button>
            )}

            {/* Disable Button */}
            {onDisableClick && (
              <button
                onClick={handleDisableClick}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-700/50 transition-colors text-left border-t border-neutral-600/50"
                aria-label="Disable Overlay"
              >
                <X className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-400">Disable Overlay</span>
              </button>
            )}
          </div>
        </PopoverContent>
      </div>
    </Popover>
  );
};
