import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { Search, List, DollarSign, MessageSquare, FileText, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const COMMAND_MENU_ID = 'command-menu';

export const CommandMenu: React.FC = () => {
  const { settings } = useOptions();
  const { hideView, toggleView, getView } = useViewManager();
  const { chatUnreadCount, tradeOffersCount } = useNotificationCountsContext();
  const { registerWindow, unregisterWindow, updateWindow } = useClickThrough();
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isRegisteredRef = useRef(false);

  // Get view and track previous visibility to prevent unnecessary re-renders
  const view = getView(VIEW_IDS.COMMAND_MENU);
  const prevVisibilityRef = useRef<boolean | null>(null);
  const isMenuVisible = view?.visible ?? false;

  const [search, setSearch] = useState('');

  // Track visibility changes and clear search when menu closes
  // Only run when visibility actually changes
  useEffect(() => {
    const prevVisibility = prevVisibilityRef.current;
    const visibilityChanged = prevVisibility !== isMenuVisible;

    if (!visibilityChanged) {
      return;
    }

    // Update ref after checking
    prevVisibilityRef.current = isMenuVisible;

    console.log('[CommandMenu] Visibility changed', {
      isMenuVisible,
      prevVisibility,
      timestamp: Date.now(),
    });

    if (!isMenuVisible) {
      setSearch(''); // Clear search when menu closes
    }
  }, [isMenuVisible]);

  const handleSelect = useCallback(
    (viewId: string, viewType: 'panel' = 'panel', position: 'centered' | 'over-diablo' = 'over-diablo') => {
      hideView(VIEW_IDS.COMMAND_MENU);
      toggleView(viewId, {
        type: viewType,
        position,
      });
      setSearch(''); // Clear search when selecting a command
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

  // Hide menu when it loses focus (user clicks outside or presses Escape)
  useEffect(() => {
    if (!isMenuVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Only hide if clicking outside the menu container
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        hideView(VIEW_IDS.COMMAND_MENU);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      // Only handle Escape, don't interfere with other keys like Shift
      if (event.key === 'Escape' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        event.stopPropagation();
        hideView(VIEW_IDS.COMMAND_MENU);
      }
    };

    // Use a small delay to avoid immediately hiding when menu opens
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 200);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuVisible, hideView]);

  // Filter commands based on search - show commands if search is empty or matches command names
  const shouldShowCommands =
    !search.trim() ||
    'item search'.toLowerCase().includes(search.toLowerCase()) ||
    'currency valuation'.toLowerCase().includes(search.toLowerCase()) ||
    'manage listings'.toLowerCase().includes(search.toLowerCase()) ||
    'trade offers'.toLowerCase().includes(search.toLowerCase()) ||
    'chat'.toLowerCase().includes(search.toLowerCase()) ||
    'settings'.toLowerCase().includes(search.toLowerCase());

  return (
    <Command
      className="rounded-lg border shadow-md"
      ref={containerRef}
      filter={(value, search) => {
        // Custom filter that allows both command and item search
        if (!search) return 1;
        const valueLower = value.toLowerCase();
        const searchLower = search.toLowerCase();
        return valueLower.includes(searchLower) ? 1 : 0;
      }}
    >
      <CommandInput placeholder="Search commands..."
        value={search}
        onValueChange={setSearch} />
      <ScrollArea className="h-[400px]">
        <CommandList className="!max-h-none !overflow-hidden">
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Commands - only show when no search or search matches commands */}
          {shouldShowCommands && (
            <>
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
                  onSelect={() => handleSelect(VIEW_IDS.QUICK_LIST, 'panel', 'over-diablo')}
                  className="cursor-pointer"
                >
                  <List className="mr-2 h-4 w-4" />
                  <span>Manage Listings</span>
                  {settings?.hotkeyKeyListItem && (
                    <CommandShortcut>
                      {formatHotkey(settings.hotkeyModifierListItem, settings.hotkeyKeyListItem)}
                    </CommandShortcut>
                  )}
                </CommandItem>
                <CommandItem
                  onSelect={() => handleSelect(VIEW_IDS.TRADE_MESSAGES, 'panel', 'over-diablo')}
                  className="cursor-pointer"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Trade Offers</span>
                  {tradeOffersCount > 0 && (
                    <Badge
                      key={`trade-offers-${tradeOffersCount}`}
                      className={cn(
                        'ml-2 h-5 min-w-5 px-1.5 flex items-center justify-center bg-blue-500 text-white text-xs font-bold rounded-full border-2 border-neutral-800 pointer-events-none animate__animated animate__wobble',
                      )}
                    >
                      {tradeOffersCount > 99 ? '99+' : tradeOffersCount}
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
                    <Badge
                      key={`chat-unread-${chatUnreadCount}`}
                      className={cn(
                        'ml-2 h-5 min-w-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full border-2 border-neutral-800 pointer-events-none animate__animated animate__wobble',
                      )}
                    >
                      {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                    </Badge>
                  )}
                  {settings?.hotkeyKeyChat && (
                    <CommandShortcut>
                      {formatHotkey(settings.hotkeyModifierChat, settings.hotkeyKeyChat)}
                    </CommandShortcut>
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
            </>
          )}
        </CommandList>
      </ScrollArea>
    </Command>
  );
};
