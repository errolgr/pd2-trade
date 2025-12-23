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
  updateMainWindowBounds,
  moveWindowBy,
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

const LandingPage: React.FC = () => {
  const [showTitle, setShowTitle] = useState(true);
  const winRef = useRef<BrowserWindow | null>(null);
  const quickListWinRef = useRef<BrowserWindow | null>(null);
  const chatWindowRef = useRef<any>(null);
  const chatButtonWindowRef = useRef<any>(null);
  const tradeMessagesWindowRef = useRef<any>(null);
  const currencyWindowRef = useRef<any>(null);
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
        winRef.current.onCloseRequested(async () => {
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

        if (quickListWinRef.current) {
          quickListWinRef.current.onCloseRequested(async () => {
            console.log('[QuickList] Window closed (onCloseRequested), clearing ref.');
            quickListWinRef.current = null;
          });
        } else {
          console.error('[QuickList] openWindowAtCursor returned null!');
        }
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

  // Register shortcuts
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
  );

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
          await chatButtonWindowRef.current.show();
        } else {
          await chatButtonWindowRef.current.hide();
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

      // Open chat window (hidden by default) - centered on Diablo screen
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
        chatWindowRef.current.onCloseRequested(async () => {
          chatWindowRef.current = null;
        });
      }

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
            chatWindowRef.current.onCloseRequested(async () => {
              chatWindowRef.current = null;
            });
          }
          // Wait a bit for window to be created, then show it
          setTimeout(async () => {
            if (chatWindowRef.current) {
              await chatWindowRef.current.show();
              await chatWindowRef.current.setFocus();
              // If conversationId was provided, emit event to select it
              if (conversationId) {
                setTimeout(() => {
                  emit('select-chat-conversation', { conversationId, conversation });
                }, 200); // Small delay to ensure chat widget is ready
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
        tradeMessagesWindowRef.current.onCloseRequested(async () => {
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
          tradeMessagesWindowRef.current.onCloseRequested(async () => {
            tradeMessagesWindowRef.current = null;
          });
        }
        // Wait a bit for window to be created, then show it
        setTimeout(async () => {
          if (tradeMessagesWindowRef.current) {
            await tradeMessagesWindowRef.current.show();
            await tradeMessagesWindowRef.current.setFocus();
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
  // Dynamic Window Tracking
  // Consolidated Dynamic Window Tracking & Focus Event Listener
  useEffect(() => {
    if (!isTauri()) return;

    // Position Tracking (Event Driven)
    let unlisten: (() => void) | null = null;

    // We retain the logic to handle chat button lazy creation and movement
    const setupListener = async () => {
      unlisten = await tauriListen<any>('diablo-window-moved', async (event) => {
        if (settings.windowTrackingEnabled === false) return;

        const { rect, delta } = event.payload;
        const { dx, dy } = delta;

        // 2. Update Main Window (Overlay) - Always Snap to D2 Size/Pos
        // Always update main bounds on event to ensure sync
        await updateMainWindowBounds();

        // Parallelize updates for smoother tracking
        const updatePromises: Promise<void>[] = [];

        // Helper to safely move window and clear ref on failure
        const safeMove = async (winRef: React.MutableRefObject<any>, name: string) => {
          if (!winRef.current) return;
          try {
            await moveWindowBy(winRef.current, dx, dy);
          } catch (err) {
            console.warn(`[Tracking] Failed to move ${name} window, clearing ref:`, err);
            winRef.current = null;
          }
        };

        if (dx !== 0 || dy !== 0) {
          // 3. Update Chat Window (Floating)
          updatePromises.push(safeMove(chatWindowRef, 'Chat'));

          // 4. Update Trade Messages Window (Floating)
          updatePromises.push(safeMove(tradeMessagesWindowRef, 'TradeMessages'));

          // 5. Update Quick List / Item Search (Floating)
          updatePromises.push(safeMove(winRef, 'ItemSearch'));
          updatePromises.push(safeMove(quickListWinRef, 'QuickList'));

          // 6. Update Settings Window (Floating)
          // Settings isn't a RefObject, it's from useTray hook...
          // complex to fix generically, let's just wrap it manually or skip for now if it's not the cause.
          // The user reported "window not found" which matches the QuickList behavior.
          // Let's wrap settings manually if needed.
          if (settingsWindow) {
            updatePromises.push(
              moveWindowBy(settingsWindow, dx, dy).catch((e) => console.warn('Failed to move settings:', e)),
            );
          }

          // 7. Update Currency Window (Floating)
          updatePromises.push(safeMove(currencyWindowRef, 'Currency'));

          // 8. Chat Button Overlay
          if (settings.chatButtonOverlayEnabled !== false) {
            updatePromises.push(safeMove(chatButtonWindowRef, 'ChatButton'));
          }
        }

        // Handle Chat Button Lazy Creation if needed (outside parallel block since it's async check/create)
        if (settings.chatButtonOverlayEnabled !== false) {
          if (!chatButtonWindowRef.current) {
            // Lazy Creation
            const buttonSize = 240;
            const x = rect.x + rect.width - buttonSize - 20;
            const y = rect.y + rect.height - buttonSize - 10;

            chatButtonWindowRef.current = new WebviewWindow('ChatButton', {
              url: '/chat-button',
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
        }

        await Promise.all(updatePromises);
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [settings.windowTrackingEnabled, settingsWindow, settings.chatButtonOverlayEnabled]);

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

          // 1. Chat Button
          if (settingsRef.current.chatButtonOverlayEnabled !== false) {
            if (chatButtonWindowRef.current) {
              await chatButtonWindowRef.current.show();
            }
          }

          // 2. Chat Window
          if (snapshot.has('chat') && chatWindowRef.current) {
            await chatWindowRef.current.show();
          }

          // 3. Trade Messages Window
          if (snapshot.has('trade') && tradeMessagesWindowRef.current) {
            await tradeMessagesWindowRef.current.show();
          }

          // 4. Quick List Window
          if (snapshot.has('quickList') && quickListWinRef.current) {
            await (quickListWinRef.current as any).show();
          }

          // 5. Item Search Window
          if (snapshot.has('search') && winRef.current) {
            await (winRef.current as any).show();
          }

          // 6. Settings Window
          if (snapshot.has('settings') && settingsWindow) {
            await settingsWindow.show();
          }

          // 7. Currency Window
          if (snapshot.has('currency') && currencyWindowRef.current) {
            await currencyWindowRef.current.show();
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

            // 1. Chat Button
            if (chatButtonWindowRef.current && (await chatButtonWindowRef.current.isVisible())) {
              snapshot.add('chatButton');
              await chatButtonWindowRef.current.hide();
            }

            // 2. Chat Window
            if (chatWindowRef.current && (await chatWindowRef.current.isVisible())) {
              snapshot.add('chat');
              await chatWindowRef.current.hide();
            }

            // 3. Trade Messages Window
            if (tradeMessagesWindowRef.current && (await tradeMessagesWindowRef.current.isVisible())) {
              snapshot.add('trade');
              await tradeMessagesWindowRef.current.hide();
            }

            // 4. Quick List Window
            if (quickListWinRef.current && (await (quickListWinRef.current as any).isVisible())) {
              snapshot.add('quickList');
              await (quickListWinRef.current as any).hide();
            }

            // 5. Item Search Window
            if (winRef.current && (await (winRef.current as any).isVisible())) {
              snapshot.add('search');
              await (winRef.current as any).hide();
            }

            // 6. Settings Window
            if (settingsWindow && (await settingsWindow.isVisible())) {
              snapshot.add('settings');
              await settingsWindow.hide();
            }

            // 7. Currency Window
            if (currencyWindowRef.current && (await currencyWindowRef.current.isVisible())) {
              snapshot.add('currency');
              await currencyWindowRef.current.hide();
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
