import React, { useCallback, useEffect, useRef, useState } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { listen as tauriListen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Item } from '../price-check/lib/interfaces';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { emit } from '@/lib/browser-events';
import type { BrowserWindow } from '@/lib/window';
import { useClipboard } from '@/hooks/useClipboard';
import { TrayProvider, useTray } from '@/hooks/useTray';
import { OptionsProvider, useOptions } from '@/hooks/useOptions';
import { useKeySender } from '@/hooks/useKeySender';
import { DialogProvider } from '@/hooks/useDialog';
import { Pd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import {
  openCenteredWindow,
  openOverDiabloWindow,
  openWindowAtCursor,
  openWindowCenteredOnDiablo,
  getDiabloRectWithRetry,
  attachWindowCloseHandler,
} from '@/lib/window';
import { listen } from '@/lib/browser-events';
import { useAppShortcuts } from '@/hooks/useShortcuts';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { usePD2Auth } from '@/hooks/usePD2Auth';
import { useChangelog } from '@/hooks/useChangelog';
import { useSocketNotifications } from '@/hooks/useSocketNotifications';
import { useSocket } from '@/hooks/pd2website/useSocket';
import { clipboardContainsValidItem, isStashItem, encodeItem, encodeItemForQuickList, sleep } from '@/lib/item-utils';
import { GenericToastPayload } from '@/common/types/Events';
import iconPath from '@/assets/img_1.png';
import { ItemsProvider } from '@/hooks/useItems';
import { WindowTitles, WindowLabels } from '@/lib/window-titles';
import DelistHandler from '@/pages/delist/DelistHandler';

const LandingPage: React.FC = () => {
  const [showTitle, setShowTitle] = useState(true);
  const winRef = useRef<BrowserWindow | null>(null);
  const quickListWinRef = useRef<BrowserWindow | null>(null);
  const chatWindowRef = useRef<any>(null);
  const chatButtonWindowRef = useRef<any>(null);
  const tradeMessagesWindowRef = useRef<any>(null);
  const currencyWindowRef = useRef<any>(null);
  const delistWinRef = useRef<BrowserWindow | null>(null);
  const settingsRef = useRef<any>(null);
  // const prevRectRef = useRef<{ x: number; y: number } | null>(null);
  const focusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { read } = useClipboard();
  const keyPress = useKeySender();
  const { settings, isLoading } = useOptions();
  const { settingsWindow } = useTray();
  const { isConnected } = useSocket({ settings });

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

    if (!winRef.current) {
      winRef.current = await openOverDiabloWindow(WindowLabels.ItemSearch, `/item?text=${encoded}`, {
        title: WindowTitles.ItemSearch,
        decorations: false,
        transparent: true,
        skipTaskbar: true,
        alwaysOnTop: true,
        shadow: false,
        focus: false,
        focusable: true,
      });
      if (winRef.current) {
        attachWindowCloseHandler(winRef.current, () => {
          winRef.current = null;
        });
      }
    } else {
      await winRef.current.emit('new-search', encoded);
      await sleep(100);
      await winRef.current.show();
    }
  }, [checkDiabloFocus, read, keyPress, settings]);

  // Open currency valuation window
  const openCurrencyValuation = useCallback(async () => {
    if (!(await checkDiabloFocus())) return;

    if (!currencyWindowRef.current) {
      currencyWindowRef.current = await openCenteredWindow(WindowLabels.Currency, '/currency', {
        title: WindowTitles.Currency,
        decorations: false,
        focus: true,
        shadow: false,
        skipTaskbar: true,
        width: 665,
        height: 870,
        alwaysOnTop: true,
      });

      if (currencyWindowRef.current) {
        currencyWindowRef.current.onCloseRequested(async () => {
          currencyWindowRef.current = null;
        });
      }
    } else {
      try {
        await currencyWindowRef.current.show();
        await currencyWindowRef.current.setFocus();
      } catch (err) {
        console.error('[LandingPage] Failed to focus existing currency window:', err);
        currencyWindowRef.current = null;
        // Retry open? No, let user click again or recursive call?
        // Simple retry logic could be added but usually nulling ref is enough for next click
      }
    }
  }, [checkDiabloFocus]);

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

      if (!quickListWinRef.current) {
        quickListWinRef.current = await openWindowAtCursor(WindowLabels.QuickList, `/quick-list${queryString}`, {
          title: WindowTitles.QuickList,
          decorations: false,
          transparent: true,
          focus: false,
          shadow: false,
          skipTaskbar: true,
          focusable: true,
          width: 600,
          height: 512,
          resizable: true,
          alwaysOnTop: true,
        });
      } else {
        console.log('[QuickList] Window already exists, showing and focusing.');
        try {
          await quickListWinRef.current.show();
          await quickListWinRef.current.setFocus();
          if (encodedItem) {
            await quickListWinRef.current.emit('quick-list-new-item', encodedItem);
          } else if (queryString.includes('error=')) {
            // Clear item state in window
            await quickListWinRef.current.emit('quick-list-error', 'not_shared_stash');
          }
        } catch {
          // console.error("[QuickList] Failed to show/focus existing window:", e);
          quickListWinRef.current = null;
        }
      }

      // Emit toast at the end to ensure it appears atop the window and isn't duplicated
      if (errorToastPayload) {
        await emit('toast-event', errorToastPayload);
      }
    },
    [checkDiabloFocus, copyAndValidateItem],
  );

  // Toggle chat window handler
  const toggleChatWindow = useCallback(async () => {
    await emit('toggle-chat-window');
  }, []);

  // Listen for request to open Quick List (Manage View) from Chat Button
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await listen<void>('open-quick-list-manage', async () => {
        if (!(await checkDiabloFocus())) return;

        const label = WindowLabels.QuickList;

        // 1. Check existing ref
        if (quickListWinRef.current) {
          try {
            await quickListWinRef.current.show();
            await quickListWinRef.current.setFocus();
            return;
          } catch {
            quickListWinRef.current = null;
          }
        }

        // 2. Check by label
        const existing = await WebviewWindow.getByLabel(label);
        if (existing) {
          console.log('[LandingPage] Found existing QuickList by label, attaching.');
          try {
            // Try to interact with it to verify it's alive
            await existing.show();
            await existing.setFocus();

            quickListWinRef.current = existing;
            // Attach close listener
            existing.onCloseRequested(async () => {
              quickListWinRef.current = null;
            });
            return;
          } catch (e) {
            console.warn('Found zombie window by label, ignoring:', e);
            // Do NOT return here, fall through to create new
          }
        }

        // 3. Create new
        console.log('[LandingPage] Creating new QuickList window (Manage Mode).');
        quickListWinRef.current = await openWindowCenteredOnDiablo(label, '/quick-list', {
          title: WindowTitles.QuickList,
          decorations: false,
          transparent: true,
          focus: false,
          shadow: false,
          skipTaskbar: true,
          focusable: true,
          width: 600,
          height: 512,
          resizable: true,
          alwaysOnTop: true,
          visible: true, // Keep explicit visible
        });

        if (quickListWinRef.current) {
          // Explicitly show to be safe
          await quickListWinRef.current.show();

          quickListWinRef.current.onCloseRequested(async () => {
            quickListWinRef.current = null;
          });
        }
      });
    };
    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, [checkDiabloFocus]);

  // Toggle trade messages window handler
  const toggleTradeMessagesWindow = useCallback(async () => {
    await emit('toggle-trade-messages-window');
  }, []);

  // Delist item handler - reads clipboard and emits event for DelistHandler inside Pd2WebsiteProvider
  const handleDelistItem = useCallback(async () => {
    console.log('[LandingPage] handleDelistItem called');
    if (!(await checkDiabloFocus())) return;

    const raw = await copyAndValidateItem();
    if (!raw) {
      emit('toast-event', {
        title: 'Delist',
        description: 'No valid item found under cursor.',
        variant: 'error',
      });
      return;
    }

    emit('delist-item', raw);
  }, [checkDiabloFocus, copyAndValidateItem]);

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
    async () => {
      await handleDelistItem();
    },
  );

  // Listen for delist-show-popup event to open delist window with multiple matches
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<any[]>('delist-show-popup', async ({ payload: listings }) => {
      console.log('[LandingPage] delist-show-popup received, listings:', listings.length);
      const encoded = encodeURIComponent(btoa(JSON.stringify(listings)));
      const url = `/delist?data=${encoded}`;

      if (!delistWinRef.current) {
        delistWinRef.current = await openWindowAtCursor(WindowLabels.Delist as any, url, {
          title: WindowTitles.Delist as any,
          decorations: false,
          transparent: true,
          focus: true,
          shadow: false,
          skipTaskbar: true,
          focusable: true,
          width: 420,
          height: 320,
          resizable: true,
          alwaysOnTop: true,
        });
        delistWinRef.current.onCloseRequested(async () => {
          delistWinRef.current = null;
        });
      } else {
        try {
          await delistWinRef.current.show();
          await delistWinRef.current.setFocus();
          // Navigate to new URL with updated listings
          await (delistWinRef.current as any).navigate(url);
        } catch {
          delistWinRef.current = null;
        }
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Handle updates
  useAppUpdates();

  // Handle authentication
  usePD2Auth();

  // Handle changelog
  useChangelog();

  // Handle chat button overlay visibility based on settings
  useEffect(() => {
    // Clear any existing interval first
    if (focusCheckIntervalRef.current) {
      clearInterval(focusCheckIntervalRef.current);
      focusCheckIntervalRef.current = null;
    }

    if (settings.chatButtonOverlayEnabled === false) {
      // Hide the window if overlay is disabled
      if (chatButtonWindowRef.current) {
        chatButtonWindowRef.current.hide().catch((error: any) => {
          console.error('Error hiding chat button window:', error);
        });
      }
      return;
    }

    // Overlay is enabled - set up window and monitoring
    if (!isTauri()) return;

    const setupChatButton = async () => {
      // Small delay to ensure app is fully initialized
      await sleep(500);

      // Create window if it doesn't exist
      if (!chatButtonWindowRef.current) {
        const rect = await getDiabloRectWithRetry();

        // Check if rect is null (Diablo window not found after retries)
        if (!rect) {
          console.warn('[LandingPage] Diablo window rect not found after retries, cannot position chat button overlay');
          return;
        }

        // Position button in bottom right corner - align bottom-right of button window with bottom-right of Diablo window
        const buttonSize = 240; // 48px button + padding + expanded radius
        const x = rect.x + rect.width - buttonSize - 20;
        const y = rect.y + rect.height - buttonSize - 10;

        chatButtonWindowRef.current = new WebviewWindow(WindowLabels.ChatButton, {
          url: '/chat-button',
          title: WindowTitles.ChatButton,
          x,
          y,
          width: buttonSize,
          height: buttonSize,
          decorations: false,
          transparent: true,
          skipTaskbar: true,
          alwaysOnTop: true,
          shadow: false,
          focus: false,
          focusable: false,
          visible: true,
        });
      }

      // NOTE: We no longer check focus here individually.
      // The Central Visibility Manager (below) handles hiding/showing based on focus events.
      // However, we still need to initially show it if Diablo is focused?
      // Actually, the focus event might have already fired.
      // Let's do a one-time check here to set initial state.
      try {
        const isFocused = await invoke<boolean>('is_diablo_focused');
        if (isFocused) {
          try {
            await chatButtonWindowRef.current.show();
          } catch (error) {
            console.warn('[LandingPage] Window not found when showing chat button:', error);
            chatButtonWindowRef.current = null;
          }
        } else {
          try {
            await chatButtonWindowRef.current.hide();
          } catch (error) {
            console.warn('[LandingPage] Window not found when hiding chat button:', error);
            chatButtonWindowRef.current = null;
          }
        }
      } catch (error) {
        console.error('Initial focus check failed:', error);
      }
    };

    setupChatButton();

    return () => {
      // Cleanup handled by ref nulling in logic context if needed, but here just clearing timeout if we had one
    };

    setupChatButton();

    return () => {
      if (focusCheckIntervalRef.current) {
        clearInterval(focusCheckIntervalRef.current);
        focusCheckIntervalRef.current = null;
      }
    };
  }, [settings.chatButtonOverlayEnabled]);

  // Auto-open chat window on startup and set up toggle handler
  useEffect(() => {
    let toggleUnlisten: (() => void) | null = null;

    const openChat = async () => {
      // Small delay to ensure app is fully initialized
      await sleep(500);

      // Set up toggle handler
      const toggleChatWindow = async (event?: { payload?: { conversationId?: string; conversation?: any } }) => {
        const conversationId = event?.payload?.conversationId;
        const conversation = event?.payload?.conversation;
        if (!chatWindowRef.current) {
          // Create the window if it doesn't exist - centered on Diablo screen
          chatWindowRef.current = await openWindowCenteredOnDiablo(WindowLabels.Chat, '/chat', {
            title: WindowTitles.Chat,
            decorations: false,
            transparent: true,
            skipTaskbar: true,
            alwaysOnTop: true,
            shadow: false,
            focus: false,
            focusable: true,
            width: 1000,
            height: 700,
            visible: false,
          });
          if (chatWindowRef.current) {
            attachWindowCloseHandler(chatWindowRef.current, () => {
              chatWindowRef.current = null;
            });
          }
          // Wait a bit for window to be created, then show it
          setTimeout(async () => {
            if (chatWindowRef.current) {
              try {
                await chatWindowRef.current.show();
                await chatWindowRef.current.setFocus();
                // If conversationId was provided, emit event to select it
                if (conversationId) {
                  setTimeout(() => {
                    emit('select-chat-conversation', { conversationId, conversation });
                  }, 200); // Small delay to ensure chat widget is ready
                }
              } catch (error) {
                console.warn('[LandingPage] Window not found when showing chat window:', error);
                chatWindowRef.current = null;
              }
            }
          }, 100);
          return;
        }

        try {
          const isVisible = await chatWindowRef.current.isVisible();
          if (isVisible) {
            await chatWindowRef.current.hide();
          } else {
            await chatWindowRef.current.show();
            await chatWindowRef.current.setFocus();
            // If conversationId was provided, emit event to select it
            if (conversationId) {
              setTimeout(() => {
                emit('select-chat-conversation', { conversationId, conversation });
              }, 200); // Small delay to ensure chat widget is ready
            }
          }
        } catch (error) {
          console.error('Error toggling chat window:', error);
        }
      };

      // Listen for toggle chat window event
      listen('toggle-chat-window', toggleChatWindow)
        .then((off) => {
          toggleUnlisten = off;
        })
        .catch((err) => {
          console.error('Failed to listen for toggle-chat-window event:', err);
        });

      // Call toggle function on startup to ensure chat window is created and opened (even if invisible)
      // This ensures the component mounts and socket listeners are initialized for notifications
      setTimeout(async () => {
        try {
          // Call toggle to create and show the window
          await toggleChatWindow();
          // Give the component time to mount and initialize socket listeners
          await sleep(300);
          // Hide it so it's invisible to the user (but component remains mounted)
          if (chatWindowRef.current) {
            await chatWindowRef.current.hide();
            console.log('[LandingPage] Chat window initialized in background for notifications');
          }
        } catch (error) {
          console.error('[LandingPage] Error initializing chat window on startup:', error);
        }
      }, 600); // Wait a bit longer to ensure toggle listener is set up
    };
    openChat();

    return () => {
      if (toggleUnlisten) {
        toggleUnlisten();
      }
      if (focusCheckIntervalRef.current) {
        clearInterval(focusCheckIntervalRef.current);
        focusCheckIntervalRef.current = null;
      }
    };
  }, [settings.chatButtonOverlayEnabled]);

  // Set up trade messages window - always display for testing
  useEffect(() => {
    let toggleUnlisten: (() => void) | null = null;

    const openTradeMessagesWindow = async () => {
      // Small delay to ensure app is fully initialized
      await sleep(500);
      // Create and show the trade messages window - centered on Diablo screen
      tradeMessagesWindowRef.current = await openWindowCenteredOnDiablo(WindowLabels.TradeMessages, '/trade-messages', {
        title: WindowTitles.TradeMessages,
        decorations: false,
        transparent: true,
        skipTaskbar: true,
        alwaysOnTop: true,
        shadow: false,
        focus: false,
        focusable: true,
        width: 600,
        resizable: true,
        height: 400,
        visible: false,
      });
      if (tradeMessagesWindowRef.current) {
        attachWindowCloseHandler(tradeMessagesWindowRef.current, () => {
          tradeMessagesWindowRef.current = null;
        });
      }
    };

    const toggleTradeMessagesWindow = async () => {
      if (!tradeMessagesWindowRef.current) {
        // Create the window if it doesn't exist - centered on Diablo screen
        tradeMessagesWindowRef.current = await openWindowCenteredOnDiablo(
          WindowLabels.TradeMessages,
          '/trade-messages',
          {
            title: WindowTitles.TradeMessages,
            decorations: false,
            transparent: true,
            skipTaskbar: true,
            alwaysOnTop: true,
            shadow: false,
            focus: false,
            focusable: true,
            width: 600,
            resizable: true,
            height: 400,
            visible: true,
          },
        );

        if (tradeMessagesWindowRef.current) {
          attachWindowCloseHandler(tradeMessagesWindowRef.current, () => {
            tradeMessagesWindowRef.current = null;
          });
        }
        // Wait a bit for window to be created, then show it
        setTimeout(async () => {
          if (tradeMessagesWindowRef.current) {
            try {
              await tradeMessagesWindowRef.current.show();
              await tradeMessagesWindowRef.current.setFocus();
            } catch (error) {
              console.warn('[LandingPage] Window not found when showing trade messages window:', error);
              tradeMessagesWindowRef.current = null;
            }
          }
        }, 100);
        return;
      }

      try {
        const isVisible = await tradeMessagesWindowRef.current.isVisible();
        if (isVisible) {
          await tradeMessagesWindowRef.current.hide();
        } else {
          await tradeMessagesWindowRef.current.show();
          await tradeMessagesWindowRef.current.setFocus();
        }
      } catch (error) {
        console.error('Error toggling trade messages window:', error);
      }
    };

    // Open window on startup
    openTradeMessagesWindow();

    // Listen for toggle trade messages window event
    listen('toggle-trade-messages-window', toggleTradeMessagesWindow)
      .then((off) => {
        toggleUnlisten = off;
      })
      .catch((err) => {
        console.error('Failed to listen for toggle-trade-messages-window event:', err);
      });

    return () => {
      if (toggleUnlisten) {
        toggleUnlisten();
      }
    };
  }, []);

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

  // Persistent snapshot of which windows were open - persists across re-renders
  const visibleWindowsSnapshotRef = useRef<Set<string>>(new Set());
  // Ref to track if we are currently "focused" to handle race conditions
  const isDiabloFocusedRef = useRef<boolean>(false);
  // Ref for debounce timer
  const focusDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Central Visibility Manager
  // Handles auto-hiding windows when Diablo/App loses focus and restoring them when focus is gained.
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | null = null;

    const setupFocusListener = async () => {
      unlisten = await tauriListen<boolean>('diablo-focus-changed', async (event) => {
        const isFocused = event.payload;
        // console.log('[VisibilityManager] Focus changed:', isFocused);

        // Update current state immediately
        isDiabloFocusedRef.current = isFocused;

        if (isFocused) {
          // --- FOCUS GAIN: Restore Immediately ---

          // Cancel any pending hide operation
          if (focusDebounceTimerRef.current) {
            clearTimeout(focusDebounceTimerRef.current);
            focusDebounceTimerRef.current = null;
          }

          const snapshot = visibleWindowsSnapshotRef.current;

          // Helper to safely show window and clear ref on failure
          const safeShow = async (winRef: React.MutableRefObject<any> | any, name: string) => {
            if (!winRef) return;
            const win = winRef.current || winRef;
            if (!win) return;
            try {
              await win.show();
            } catch (err) {
              console.warn(`[VisibilityManager] Window not found when showing ${name}, clearing ref:`, err);
              if (winRef.current) winRef.current = null;
            }
          };

          // 1. Chat Button
          if (settingsRef.current.chatButtonOverlayEnabled !== false) {
            await safeShow(chatButtonWindowRef, 'ChatButton');
          }

          // 2. Chat Window
          if (snapshot.has('chat')) {
            await safeShow(chatWindowRef, 'Chat');
          }

          // 3. Trade Messages Window
          if (snapshot.has('trade')) {
            await safeShow(tradeMessagesWindowRef, 'TradeMessages');
          }

          // 4. Quick List Window
          if (snapshot.has('quickList')) {
            await safeShow(quickListWinRef, 'QuickList');
          }

          // 5. Item Search Window
          if (snapshot.has('search')) {
            await safeShow(winRef, 'ItemSearch');
          }

          // 6. Settings Window
          if (snapshot.has('settings') && settingsWindow) {
            await safeShow({ current: settingsWindow }, 'Settings');
          }

          // 7. Currency Window
          if (snapshot.has('currency')) {
            await safeShow(currencyWindowRef, 'Currency');
          }

          // Clear snapshot after restoring - we assume we are back to normal state
          snapshot.clear();
        } else {
          // --- FOCUS LOSS: Debounce Hide ---

          if (focusDebounceTimerRef.current) {
            clearTimeout(focusDebounceTimerRef.current);
          }

          focusDebounceTimerRef.current = setTimeout(async () => {
            // Check if we regained focus during the delay
            if (isDiabloFocusedRef.current) {
              console.log('[VisibilityManager] Focus regained during debounce, skipping hide');
              return;
            }

            // Perform Snapshot and Hide
            const snapshot = visibleWindowsSnapshotRef.current;

            // Helper to safely check visibility, hide window, and clear ref on failure
            const safeHide = async (winRef: React.MutableRefObject<any> | any, name: string, snapshotKey: string) => {
              if (!winRef) return;
              const win = winRef.current || winRef;
              if (!win) return;
              try {
                if (await win.isVisible()) {
                  snapshot.add(snapshotKey);
                  await win.hide();
                }
              } catch (err) {
                console.warn(`[VisibilityManager] Window not found when hiding ${name}, clearing ref:`, err);
                if (winRef.current) winRef.current = null;
              }
            };

            // 1. Chat Button
            if (chatButtonWindowRef.current) {
              await safeHide(chatButtonWindowRef, 'ChatButton', 'chatButton');
            }

            // 2. Chat Window
            if (chatWindowRef.current) {
              await safeHide(chatWindowRef, 'Chat', 'chat');
            }

            // 3. Trade Messages Window
            if (tradeMessagesWindowRef.current) {
              await safeHide(tradeMessagesWindowRef, 'TradeMessages', 'trade');
            }

            // 4. Quick List Window
            if (quickListWinRef.current) {
              await safeHide(quickListWinRef, 'QuickList', 'quickList');
            }

            // 5. Item Search Window
            if (winRef.current) {
              await safeHide(winRef, 'ItemSearch', 'search');
            }

            // 6. Settings Window
            if (settingsWindow) {
              await safeHide({ current: settingsWindow }, 'Settings', 'settings');
            }

            // 7. Currency Window
            if (currencyWindowRef.current) {
              await safeHide(currencyWindowRef, 'Currency', 'currency');
            }

            console.log('[VisibilityManager] Hidden windows due to focus loss. Snapshot:', Array.from(snapshot));
          }, 500); // 500ms debounce
        }
      });
    };

    setupFocusListener();

    return () => {
      if (unlisten) unlisten();
      if (focusDebounceTimerRef.current) {
        clearTimeout(focusDebounceTimerRef.current);
      }
    };
  }, [settingsWindow]);

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

  return (
    <ItemsProvider>
      <Pd2WebsiteProvider>
        <DelistHandler />
        <div>
          {showTitle && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <img src={iconPath}
                style={{ width: 400 }}
                alt="PD2 Trader" />
            </div>
          )}
        </div>
      </Pd2WebsiteProvider>
    </ItemsProvider>
  );
};

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DialogProvider>
      <OptionsProvider>
        <TrayProvider>{children}</TrayProvider>
      </OptionsProvider>
    </DialogProvider>
  );
};

export default LandingPage;
