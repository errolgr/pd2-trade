import React, { useCallback, useEffect, useRef, useState } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { listen as tauriListen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Item } from './pages/price-check/lib/interfaces';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { emit } from '@/lib/browser-events';
import { useClipboard } from '@/hooks/useClipboard';
import { TrayProvider, useTray } from '@/hooks/useTray';
import { OptionsProvider, useOptions } from '@/hooks/useOptions';
import { useKeySender } from '@/hooks/useKeySender';
import { DialogProvider } from '@/hooks/useDialog';
import { Pd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { getDiabloRectWithRetry, updateMainWindowBounds } from '@/lib/window';
import { listen } from '@/lib/browser-events';
import { useAppShortcuts } from '@/hooks/useShortcuts';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { usePD2Auth } from '@/hooks/usePD2Auth';
import { useChangelog } from '@/hooks/useChangelog';
import { useDoubleShift } from '@/hooks/useDoubleShift';
import { useSocketNotifications } from '@/hooks/useSocketNotifications';
import { useSocket } from '@/hooks/pd2website/useSocket';
import { clipboardContainsValidItem, isStashItem, encodeItem, encodeItemForQuickList, sleep } from '@/lib/item-utils';
import { GenericToastPayload } from '@/common/types/Events';
import iconPath from '@/assets/img_1.png';
import { WindowTitles } from '@/lib/window-titles';
import { useViewManager, VIEW_IDS } from '@/hooks/useViewManager';
import { ViewManagerProvider } from '@/contexts/ViewManagerContext';
import { ClickThroughProvider } from '@/hooks/useClickThrough';
import { ItemsProvider } from '@/hooks/useItems';
import { NotificationCountsProvider } from '@/contexts/NotificationCountsContext';
import { DiabloProvider, useDiablo } from '@/hooks/useDiablo';
import { ChatProvider } from '@/contexts/ChatContext';

const MainWindow: React.FC = () => {
  const [showTitle, setShowTitle] = useState(true);
  const settingsRef = useRef<any>(null);
  const { read } = useClipboard();
  const keyPress = useKeySender();
  const { settings, isLoading } = useOptions();
  const { isConnected } = useSocket({ settings });
  const { showView, hideView, toggleView, isVisible, updateView } = useViewManager();
  const { isDiabloFocused, diabloRectRelative } = useDiablo();

  // Set up socket notifications listener (offers and whispers - only one instance in LandingPage)
  useSocketNotifications({ isConnected, settings, whisperNotificationsEnabled: true });
  // Keep settings ref up to date
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Set Main Window Title
  useEffect(() => {
    if (isTauri()) {
      WebviewWindow.getCurrent().setTitle(WindowTitles.PREFIX);
    }
  }, []);

  // Hide launch title after 2 seconds
  useEffect(() => {
    const timer = setTimeout(async () => {
      setShowTitle(false);

      // Give React/Browser a moment to paint the removal of the image (which creates the ghost)
      await sleep(50);

      try {
        // Linux/AppImage Compositor Fix: "Kick" the window to force a repaint
        // Transparent windows can sometimes leave "ghost" images if the compositor
        // doesn't realize the surface needs updating after a DOM change.
        if (isTauri()) {
          const win = WebviewWindow.getCurrent();
          const size = await win.innerSize();
          await win.setSize(new LogicalSize(size.width + 1, size.height));
          // Small delay to ensure the compositor processes the new size frame
          await sleep(50);
          await win.setSize(new LogicalSize(size.width, size.height));
        }

        console.log('[LandingPage] Hiding launch title and emitting toast...');
        await emit('toast-event', 'is now running in the background...');
      } catch (error) {
        console.error('[LandingPage] Failed to emit launch toast or kick compositor:', error);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Check if Diablo is focused
  const checkDiabloFocus = useCallback(async (): Promise<boolean> => {
    if (!isTauri()) {
      // In browser, always return true (no Diablo detection)
      return true;
    }
    try {
      const focused = await invoke<boolean>('is_diablo_focused');
      return focused;
    } catch (error) {
      console.warn('[LandingPage] Failed to check Diablo focus:', error);
      return true; // Allow in browser or on error
    }
  }, []);

  // Copy item from clipboard and validate
  const copyAndValidateItem = useCallback(async (): Promise<string | null> => {
    await keyPress('ctrl+c');
    await sleep(250);
    const raw = await read();
    return clipboardContainsValidItem(raw) ? raw : null;
  }, [read, keyPress]);

  // Open item search window
  const fireSearch = useCallback(async () => {
    if (!(await checkDiabloFocus())) return;

    if (!(settings.hotkeyModifier === 'ctrl' && settings.hotkeyKey === 'c')) {
      await keyPress('ctrl+c');
    }
    await sleep(250);
    const raw = await read();
    if (!clipboardContainsValidItem(raw)) {
      const errorToastPayload: GenericToastPayload = {
        title: 'PD2 Trader',
        description: 'Item is not supported or invalid.',
        variant: 'error',
      };
      emit('toast-event', errorToastPayload);
      return;
    }

    const encoded = encodeItem(raw);
    console.log('[LandingPage] Showing item search view:', VIEW_IDS.ITEM_SEARCH);
    showView(VIEW_IDS.ITEM_SEARCH, {
      position: 'over-diablo',
      data: { encoded, itemText: encoded },
    });
    emit('new-search', encoded);
  }, [checkDiabloFocus, read, keyPress, settings, showView]);

  // Open currency valuation window
  const openCurrencyValuation = useCallback(async () => {
    if (!(await checkDiabloFocus())) return;

    console.log('[LandingPage] Toggling currency view:', VIEW_IDS.CURRENCY);
    toggleView(VIEW_IDS.CURRENCY, {
      position: 'centered',
    });
  }, [checkDiabloFocus, toggleView]);

  // Open quick list window
  const openQuickListWindow = useCallback(
    async (_item: Item | null) => {
      if (!(await checkDiabloFocus())) return;

      const raw = await copyAndValidateItem();
      let encodedItem = '';
      let queryString = '';

      let errorToastPayload = null;

      if (raw) {
        if (isStashItem(raw)) {
          encodedItem = encodeItemForQuickList(raw);
          queryString = `?item=${encodedItem}`;
        } else {
          // Valid item but not in stash
          queryString = `?error=not_shared_stash`;
          errorToastPayload = {
            title: 'Cannot List Item',
            description: 'This item is not in your shared stash and cannot be listed.',
            variant: 'error',
          };
        }
      } else {
        // Invalid or missing item
        queryString = `?error=not_shared_stash`;
        errorToastPayload = {
          title: 'Cannot List Item',
          description: 'Item is not supported or invalid.',
          variant: 'error',
        };
      }

      console.log('[LandingPage] Showing quick list view:', VIEW_IDS.QUICK_LIST);
      showView(VIEW_IDS.QUICK_LIST, {
        position: 'at-cursor',
        data: { encodedItem, queryString, error: queryString.includes('error=') ? 'not_shared_stash' : null },
      });

      if (encodedItem) {
        emit('quick-list-new-item', encodedItem);
      } else if (queryString.includes('error=')) {
        emit('quick-list-error', 'not_shared_stash');
      }

      // Emit toast at the end to ensure it appears atop the window and isn't duplicated
      if (errorToastPayload) {
        await emit('toast-event', errorToastPayload);
      }
    },
    [checkDiabloFocus, copyAndValidateItem, showView],
  );

  // Toggle chat window handler
  const toggleChatWindow = useCallback(async () => {
    console.log('[LandingPage] Toggling chat view:', VIEW_IDS.CHAT);
    toggleView(VIEW_IDS.CHAT, {
      type: 'panel',
      position: 'over-diablo',
    });
  }, [toggleView]);

  // Listen for request to open Quick List (Manage View) from Chat Button
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await listen<void>('open-quick-list-manage', async () => {
        if (!(await checkDiabloFocus())) return;

        showView(VIEW_IDS.QUICK_LIST, {
          position: 'over-diablo',
        });
      });
    };
    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, [checkDiabloFocus, showView]);

  // Toggle trade messages window handler
  const toggleTradeMessagesWindow = useCallback(async () => {
    console.log('[LandingPage] Toggling trade messages view:', VIEW_IDS.TRADE_MESSAGES);
    toggleView(VIEW_IDS.TRADE_MESSAGES, {
      type: 'panel',
      position: 'over-diablo',
    });
  }, [toggleView]);

  // Set up command menu handler
  const openCommandMenu = useCallback(() => {
    console.log('[MainWindow] openCommandMenu called', {
      isDiabloFocused,
      timestamp: Date.now(),
    });

    if (!isDiabloFocused) {
      console.log('[MainWindow] openCommandMenu blocked - Diablo not focused');
      return;
    }

    // Toggle the command menu - if it's visible, hide it; if hidden, show it
    const isCurrentlyVisible = isVisible(VIEW_IDS.COMMAND_MENU);
    console.log('[MainWindow] openCommandMenu - visibility check', {
      isCurrentlyVisible,
      timestamp: Date.now(),
    });

    if (isCurrentlyVisible) {
      console.log('[MainWindow] openCommandMenu - hiding menu');
      hideView(VIEW_IDS.COMMAND_MENU);
    } else {
      console.log('[MainWindow] openCommandMenu - showing menu');
      // Ensure we show the menu even if it was just hidden
      showView(VIEW_IDS.COMMAND_MENU, {
        type: 'panel',
        position: 'centered',
      });
    }
  }, [showView, hideView, isVisible, isDiabloFocused]);

  // Register shortcuts
  useAppShortcuts(
    async () => {
      fireSearch();
    },
    async () => {
      await openQuickListWindow(null);
    },
    async () => {
      await openCurrencyValuation();
    },
    async () => {
      await toggleChatWindow();
    },
    async () => {
      await toggleTradeMessagesWindow();
    },
    // Only register command menu hotkey if double shift is disabled
    settings?.commandMenuUseDoubleShift === false ? openCommandMenu : undefined,
  );

  // Use double-shift if enabled in settings (default: true)
  useDoubleShift(openCommandMenu, settings?.commandMenuUseDoubleShift !== false);

  // Handle updates
  useAppUpdates();

  // Handle authentication
  usePD2Auth();

  // Handle changelog
  useChangelog();

  // Helper function to constrain chat button position within viewport bounds
  const constrainChatButtonPosition = (x: number, y: number, buttonSize: number): { x: number; y: number } => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Constrain x position: ensure button doesn't go outside left or right edges
    const constrainedX = Math.max(0, Math.min(x, viewportWidth - buttonSize));

    // Constrain y position: ensure button doesn't go outside top or bottom edges
    const constrainedY = Math.max(0, Math.min(y, viewportHeight - buttonSize));

    return { x: constrainedX, y: constrainedY };
  };

  // Handle chat button overlay visibility based on settings and Diablo focus
  useEffect(() => {
    if (settings.chatButtonOverlayEnabled === false) {
      hideView(VIEW_IDS.CHAT_BUTTON);
      return;
    }

    // Hide chat button when not logged in
    if (!settings.pd2Token) {
      hideView(VIEW_IDS.CHAT_BUTTON);
      return;
    }

    // Hide chat button when Diablo is not focused
    if (!isDiabloFocused) {
      hideView(VIEW_IDS.CHAT_BUTTON);
      return;
    }

    // Show chat button as fixed overlay in bottom right corner of Diablo frame
    // Use diabloRectRelative which is already calculated relative to main window viewport
    if (!diabloRectRelative) {
      return;
    }

    // Position in bottom right corner of Diablo frame
    // ChatButton sizes to its content (44px button, h-11 w-11)
    const buttonSize = 44; // Button is h-11 w-11 (44px)
    const padding = 20; // Padding from bottom right corner of Diablo frame
    // Position container so its bottom-right corner is at (diabloFrameRight - padding, diabloFrameBottom - padding)
    const x = diabloRectRelative.x + diabloRectRelative.width - buttonSize - padding;
    const y = diabloRectRelative.y + diabloRectRelative.height - buttonSize - padding;

    // Constrain position to stay within viewport bounds
    const constrainedPosition = constrainChatButtonPosition(x, y, buttonSize);

    showView(VIEW_IDS.CHAT_BUTTON, {
      type: 'fixed',
      position: 'custom',
      customPosition: constrainedPosition,
    });
  }, [settings.chatButtonOverlayEnabled, settings.pd2Token, isDiabloFocused, diabloRectRelative, showView, hideView]);

  // Set up chat window toggle handler
  useEffect(() => {
    let toggleUnlisten: (() => void) | null = null;

    const setupToggleHandler = async () => {
      const toggleChatWindowHandler = async (event?: { payload?: { conversationId?: string; conversation?: any } }) => {
        const conversationId = event?.payload?.conversationId;
        const conversation = event?.payload?.conversation;

        toggleView(VIEW_IDS.CHAT, {
          type: 'panel',
          position: 'over-diablo',
        });

        // If conversationId was provided, emit event to select it
        if (conversationId) {
          setTimeout(() => {
            emit('select-chat-conversation', { conversationId, conversation });
          }, 200);
        }
      };

      toggleUnlisten = await listen('toggle-chat-window', toggleChatWindowHandler);

      // Initialize chat component on startup (hidden) to ensure socket listeners are initialized
    };

    setupToggleHandler();

    return () => {
      if (toggleUnlisten) {
        toggleUnlisten();
      }
    };
  }, [toggleView, showView, hideView]);

  // Set up trade messages window toggle handler
  useEffect(() => {
    let toggleUnlisten: (() => void) | null = null;

    const setupToggleHandler = async () => {
      const toggleTradeMessagesHandler = async () => {
        toggleView(VIEW_IDS.TRADE_MESSAGES, {
          type: 'panel',
          position: 'over-diablo',
        });
      };

      toggleUnlisten = await listen('toggle-trade-messages-window', toggleTradeMessagesHandler);
    };

    setupToggleHandler();

    return () => {
      if (toggleUnlisten) {
        toggleUnlisten();
      }
    };
  }, [toggleView]);

  // Start/stop chat watcher based on settings (start if either general or trade notifications are enabled)
  useEffect(() => {
    if (!isTauri() || isLoading) return;

    const generalEnabled = settings.whisperNotificationsEnabled ?? true;
    const tradeEnabled = settings.tradeNotificationsEnabled ?? true;
    const shouldWatch = generalEnabled || tradeEnabled;

    const manageWatcher = async () => {
      try {
        if (shouldWatch) {
          await invoke('start_chat_watcher', { customD2Dir: settings.diablo2Directory });
        } else {
          await invoke('stop_chat_watcher');
        }
      } catch (error) {
        console.error('Failed to manage chat watcher:', error);
      }
    };

    manageWatcher();

    return () => {
      if (isTauri()) {
        invoke('stop_chat_watcher').catch(console.error);
      }
    };
  }, [settings.whisperNotificationsEnabled, settings.tradeNotificationsEnabled, settings.diablo2Directory, isLoading]);

  // Update main window bounds when Diablo window moves
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await tauriListen<any>('diablo-window-moved', async () => {
        if (settings.windowTrackingEnabled === false) return;
        // Update Main Window (Overlay) - Always Snap to D2 Size/Pos
        await updateMainWindowBounds();

        // Chat button position will be updated automatically by the useEffect above
        // that depends on diabloRectRelative, which is updated by the DiabloProvider
        // when the window moves. No need to manually update here.
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [settings.windowTrackingEnabled]);

  return (
    <div>
      {showTitle && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <img src={iconPath}
            style={{ width: 400 }}
            alt="PD2 Trader" />
        </div>
      )}
    </div>
  );
};

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DialogProvider>
      <OptionsProvider>
        <DiabloProvider>
          <NotificationCountsProvider>
            <ItemsProvider>
              <Pd2WebsiteProvider>
                <ChatProvider>
                  <ViewManagerProvider>
                    <TrayProvider>
                      <ClickThroughProvider>{children}</ClickThroughProvider>
                    </TrayProvider>
                  </ViewManagerProvider>
                </ChatProvider>
              </Pd2WebsiteProvider>
            </ItemsProvider>
          </NotificationCountsProvider>
        </DiabloProvider>
      </OptionsProvider>
    </DialogProvider>
  );
};

export default MainWindow;
