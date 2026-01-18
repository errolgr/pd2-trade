import React, { useCallback, useEffect, useRef } from 'react';
import { useViewManager, VIEW_IDS } from '@/hooks/useViewManager';
import { useOptions } from '@/hooks/useOptions';
import { useNotificationCountsContext } from '@/contexts/NotificationCountsContext';
import { formatHotkey } from '@/lib/hotkey-format';
import { useClickThrough } from '@/hooks/useClickThrough';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command';
import { Search, ShoppingCart, List, DollarSign, MessageSquare, FileText, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const COMMAND_MENU_ID = 'command-menu';

export const CommandMenu: React.FC = () => {
  const { settings } = useOptions();
  const { hideView, toggleView, isVisible } = useViewManager();
  const { chatUnreadCount, tradeMessagesCount } = useNotificationCountsContext();
  const { registerWindow, unregisterWindow, updateWindow } = useClickThrough();
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isRegisteredRef = useRef(false);
  const isMenuVisible = isVisible(VIEW_IDS.COMMAND_MENU);

  const handleSelect = useCallback(
    (viewId: string, viewType: 'panel' = 'panel', position: 'centered' | 'over-diablo' = 'over-diablo') => {
      hideView(VIEW_IDS.COMMAND_MENU);
      toggleView(viewId, {
        type: viewType,
        position,
      });
    },
    [hideView, toggleView],
  );

  // Register command menu with click-through system
  useEffect(() => {
    const updateWindowBox = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const box = {
        id: COMMAND_MENU_ID,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };

      if (isRegisteredRef.current) {
        updateWindow(COMMAND_MENU_ID, box);
      } else {
        registerWindow(COMMAND_MENU_ID, box);
        isRegisteredRef.current = true;
      }
    };

    // Initial registration - wait for element to be available
    const timeout = setTimeout(() => {
      if (containerRef.current) {
        updateWindowBox();

        // Set up ResizeObserver to update when menu size changes
        resizeObserverRef.current = new ResizeObserver(updateWindowBox);
        resizeObserverRef.current.observe(containerRef.current);
      }
    }, 100);

    return () => {
      clearTimeout(timeout);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (isRegisteredRef.current) {
        unregisterWindow(COMMAND_MENU_ID);
        isRegisteredRef.current = false;
      }
    };
  }, [registerWindow, unregisterWindow, updateWindow]);

  // Auto-focus the input when menu opens
  useEffect(() => {
    if (!isMenuVisible) return;

    // Focus the Tauri window first
    const win = getCurrentWebviewWindow();
    win.setFocus().catch(() => {
      // Fallback to regular window.focus()
      window.focus();
    });

    // Wait for window to get focus, then focus the input
    const rafId1 = requestAnimationFrame(() => {
      const rafId2 = requestAnimationFrame(() => {
        const timeout = setTimeout(() => {
          const input = containerRef.current?.querySelector('input[cmdk-input]') as HTMLInputElement;

          if (input) {
            input.focus();
            input.select();

            // Verify focus stuck after a short delay
            setTimeout(() => {
              if (input !== document.activeElement) {
                const retryWin = getCurrentWebviewWindow();
                retryWin.setFocus().catch(() => window.focus());
                input.focus();
                input.select();
              }
            }, 50);
          } else {
            // Try one more time after a longer delay
            setTimeout(() => {
              const retryInput = containerRef.current?.querySelector('input[cmdk-input]') as HTMLInputElement;
              if (retryInput) {
                const retryWin = getCurrentWebviewWindow();
                retryWin.setFocus().catch(() => window.focus());
                retryInput.focus();
                retryInput.select();
              }
            }, 100);
          }
        }, 200);

        return () => clearTimeout(timeout);
      });

      return () => cancelAnimationFrame(rafId2);
    });

    return () => {
      cancelAnimationFrame(rafId1);
    };
  }, [isMenuVisible]);

  return (
    <Command className="rounded-lg border shadow-md"
      ref={containerRef}>
      <CommandInput placeholder="Search commands..." />
      <ScrollArea className="h-[400px]">
        <CommandList className="!max-h-none !overflow-hidden">
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Price Checking">
            <CommandItem
              onSelect={() => handleSelect(VIEW_IDS.ITEM_SEARCH, 'panel', 'over-diablo')}
              className="cursor-pointer"
            >
              <Search className="mr-2 h-4 w-4" />
              <span>Item Search</span>
              {settings?.hotkeyKey && (
                <CommandShortcut>{formatHotkey(settings.hotkeyModifier, settings.hotkeyKey)}</CommandShortcut>
              )}
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect(VIEW_IDS.QUICK_LIST, 'panel', 'over-diablo')}
              className="cursor-pointer"
            >
              <List className="mr-2 h-4 w-4" />
              <span>Quick List</span>
              {settings?.hotkeyKeyListItem && (
                <CommandShortcut>
                  {formatHotkey(settings.hotkeyModifierListItem, settings.hotkeyKeyListItem)}
                </CommandShortcut>
              )}
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect(VIEW_IDS.CURRENCY, 'panel', 'centered')}
              className="cursor-pointer"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              <span>Currency Valuation</span>
              {settings?.hotkeyKeyCurrencyValuation && (
                <CommandShortcut>
                  {formatHotkey(settings.hotkeyModifierCurrencyValuation, settings.hotkeyKeyCurrencyValuation)}
                </CommandShortcut>
              )}
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Trading">
            <CommandItem
              onSelect={() => handleSelect(VIEW_IDS.MARKET_SEARCH, 'panel', 'over-diablo')}
              className="cursor-pointer"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>Market Search</span>
              {settings?.hotkeyKeyMarketSearch && (
                <CommandShortcut>
                  {formatHotkey(settings.hotkeyModifierMarketSearch || 'ctrl', settings.hotkeyKeyMarketSearch)}
                </CommandShortcut>
              )}
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect(VIEW_IDS.TRADE_MESSAGES, 'panel', 'over-diablo')}
              className="cursor-pointer"
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>Trade Messages</span>
              {tradeMessagesCount > 0 && (
                <Badge variant="destructive"
                  className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {tradeMessagesCount > 99 ? '99+' : tradeMessagesCount}
                </Badge>
              )}
              {settings?.hotkeyKeyOffers && (
                <CommandShortcut>
                  {formatHotkey(settings.hotkeyModifierOffers, settings.hotkeyKeyOffers)}
                </CommandShortcut>
              )}
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Communication">
            <CommandItem
              onSelect={() => handleSelect(VIEW_IDS.CHAT, 'panel', 'over-diablo')}
              className="cursor-pointer"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>Chat</span>
              {chatUnreadCount > 0 && (
                <Badge variant="destructive"
                  className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                </Badge>
              )}
              {settings?.hotkeyKeyChat && (
                <CommandShortcut>{formatHotkey(settings.hotkeyModifierChat, settings.hotkeyKeyChat)}</CommandShortcut>
              )}
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Settings">
            <CommandItem
              onSelect={() => handleSelect(VIEW_IDS.SETTINGS, 'panel', 'centered')}
              className="cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
              {settings?.hotkeyKeySettings && (
                <CommandShortcut>
                  {formatHotkey(settings.hotkeyModifierSettings || 'ctrl', settings.hotkeyKeySettings)}
                </CommandShortcut>
              )}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </ScrollArea>
    </Command>
  );
};
