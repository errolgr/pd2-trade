import React, { useState, useRef, useCallback } from 'react';
import { Settings, X, List, Search, DollarSign, FileText, Command, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { emit } from '@/lib/browser-events';
import { useOptions } from '@/hooks/useOptions';
import { formatHotkey } from '@/lib/hotkey-format';

const CHAT_BUTTON_ID = 'chat-button';

interface ChatButtonProps {
  handleClick: () => void;
  onSettingsClick?: () => void;
  onTradeMessagesClick?: () => void;
  onItemSearchClick?: () => void;
  onQuickListClick?: () => void;
  onCurrencyValuationClick?: () => void;
  onCommandMenuClick?: () => void;
  onDisableClick?: () => void;
  unreadCount?: number;
  tradeOffersCount?: number;
  tradeMessagesCount?: number;
}

export const ChatButton: React.FC<ChatButtonProps> = ({
  handleClick,
  onSettingsClick,
  onTradeMessagesClick,
  onItemSearchClick,
  onQuickListClick,
  onCurrencyValuationClick,
  onCommandMenuClick,
  onDisableClick,
  unreadCount = 0,
  tradeOffersCount = 0,
  tradeMessagesCount: _tradeMessagesCount = 0,
}) => {
  const { settings } = useOptions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    onTradeMessagesClick && 'trade-messages',
    onSettingsClick && 'settings',
    onCommandMenuClick && 'command-menu',
    onDisableClick && 'disable',
  ].filter(Boolean);

  const menuHeight = menuItems.length * 80 + 8; // 48px per item + padding

  const buttonRef = useRef<HTMLButtonElement>(null);
  const isButtonClickingRef = useRef(false);

  const handleMenuBlur = useCallback((e: React.FocusEvent) => {
    // If button is being clicked, don't close (the button click will handle it)
    if (isButtonClickingRef.current) {
      return;
    }
    const relatedTarget = e.relatedTarget as HTMLElement;
    // If focus is moving to the button, don't close (the button click will handle it)
    if (relatedTarget && buttonRef.current?.contains(relatedTarget)) {
      return;
    }
    // Close the menu when it loses focus
    setIsMenuOpen(false);
  }, []);

  const handleButtonMouseDown = useCallback(() => {
    isButtonClickingRef.current = true;
  }, []);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Toggle the menu
    setIsMenuOpen((prev) => !prev);
    // Reset the flag after the click is processed
    isButtonClickingRef.current = false;
  }, []);

  return (
    <Popover open={isMenuOpen}
      onOpenChange={setIsMenuOpen}>
      <PopoverTrigger asChild>
        <div className="relative select-none">
          <Button
            ref={buttonRef}
            onMouseDown={handleButtonMouseDown}
            onClick={handleButtonClick}
            className="h-11 w-11 rounded-lg shadow-lg bg-neutral-800/90 hover:bg-neutral-700/90 border border-neutral-600/50 backdrop-blur-sm pointer-events-auto transition-colors duration-200 ease-out cursor-pointer p-0 select-none"
            size="icon"
            aria-label="Open PD2 Chat Menu"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            <img src="/logo2.png"
              alt="PD2 Trade Logo"
              className="h-full w-full object-contain p-1.5" />
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
        onBlur={handleMenuBlur}
      >
        <div
          style={{
            maxHeight: `${menuHeight}px`,
          }}
          className="overflow-hidden"
        >
          {/* Divider for Price Checking section */}
          {(onItemSearchClick || onCurrencyValuationClick) && (
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
          {(onQuickListClick || onTradeMessagesClick) && (
            <div className="px-4 py-2 border-b border-neutral-600/50">
              <span className="text-xs font-semibold text-neutral-400 uppercase">Trading</span>
            </div>
          )}

          {/* Manage Listings Button */}
          {onQuickListClick && (
            <button
              onClick={onQuickListClick}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700/50 transition-colors text-left"
              aria-label="Manage Listings"
            >
              <List className="h-4 w-4 text-neutral-200 flex-shrink-0" />
              <span className="text-sm text-neutral-200">Manage Listings</span>
              {settings?.hotkeyKeyListItem && (
                <span className="ml-auto text-xs text-neutral-400">
                  {formatHotkey(settings.hotkeyModifierListItem, settings.hotkeyKeyListItem)}
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
                  {tradeOffersCount > 0 && isMenuOpen && (
                    <Badge
                      key={`badge-${isMenuOpen}`}
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
          {(onSettingsClick || onCommandMenuClick) && (
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

          {/* Command Menu Button */}
          {onCommandMenuClick && (
            <button
              onClick={onCommandMenuClick}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700/50 transition-colors text-left"
              aria-label="Command Menu"
            >
              <Command className="h-4 w-4 text-neutral-200 flex-shrink-0" />
              <span className="text-sm text-neutral-200">Command Menu</span>
              {settings?.hotkeyKeyCommandMenu && settings?.commandMenuUseDoubleShift === false && (
                <span className="ml-auto text-xs text-neutral-400">
                  {formatHotkey(settings.hotkeyModifierCommandMenu || 'ctrl', settings.hotkeyKeyCommandMenu)}
                </span>
              )}
              {settings?.commandMenuUseDoubleShift !== false && (
                <span className="ml-auto text-xs text-neutral-400">Double Shift</span>
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
    </Popover>
  );
};
