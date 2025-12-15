import React, { useCallback, useEffect, useRef, useState } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { currentMonitor } from '@tauri-apps/api/window';
import { LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
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
  attachWindowCloseHandler,
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

const LandingPage: React.FC = () => {
  const [showTitle, setShowTitle] = useState(true);
  const winRef = useRef<BrowserWindow | null>(null);
  const quickListWinRef = useRef<BrowserWindow | null>(null);
  const chatWindowRef = useRef<any>(null);
  const chatButtonWindowRef = useRef<any>(null);
  const tradeMessagesWindowRef = useRef<any>(null);
  const settingsRef = useRef<any>(null);
  const prevRectRef = useRef<{ x: number; y: number } | null>(null);
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
      if (!focused) {
        console.warn('[LandingPage] Diablo is not focused, skipping action.');
      }
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
      winRef.current = await openOverDiabloWindow('Item', `/item?text=${encoded}`, {
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

    await openCenteredWindow('Currency', '/currency', {
      decorations: false,
      focus: true,
      shadow: false,
      skipTaskbar: true,
      width: 640,
      height: 870,
      alwaysOnTop: true,
    });
  }, [checkDiabloFocus]);

  // Open quick list window
  const openQuickListWindow = useCallback(async () => {
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
      quickListWinRef.current = await openWindowAtCursor('QuickList', `/quick-list${queryString}`, {
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
      if (encodedItem) {
        await quickListWinRef.current.emit('quick-list-new-item', encodedItem);
      } else if (queryString.includes('error=')) {
        // Clear item state in window
        await quickListWinRef.current.emit('quick-list-error', 'not_shared_stash');
      }
      await sleep(100);
      await quickListWinRef.current.show();
    }

    // Emit toast at the end to ensure it appears atop the window and isn't duplicated
    if (errorToastPayload) {
      await emit('toast-event', errorToastPayload);
    }
  }, [checkDiabloFocus, copyAndValidateItem]);

  // Toggle chat window handler
  const toggleChatWindow = useCallback(async () => {
    await emit('toggle-chat-window');
  }, []);

  // Toggle trade messages window handler
  const toggleTradeMessagesWindow = useCallback(async () => {
    await emit('toggle-trade-messages-window');
  }, []);

  // Register shortcuts
  useAppShortcuts(fireSearch, openQuickListWindow, openCurrencyValuation, toggleChatWindow, toggleTradeMessagesWindow);

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
        });
      }

      // Monitor Diablo focus state and hide/show chat button accordingly
      const checkDiabloFocus = async () => {
        if (!chatButtonWindowRef.current) return;
        // Always check current settings value from ref (not from closure)
        const currentSettings = settingsRef.current;
        if (currentSettings?.chatButtonOverlayEnabled === false) {
          const isVisible = await chatButtonWindowRef.current.isVisible();
          if (isVisible) {
            await chatButtonWindowRef.current.hide();
          }
          return;
        }

        try {
          const isFocused = await invoke<boolean>('is_diablo_focused');
          const isVisible = await chatButtonWindowRef.current.isVisible();
          if (isFocused && !isVisible) {
            await chatButtonWindowRef.current.show();
          } else if (!isFocused && isVisible) {
            // Only hide if not tracking? Or always hide on blur?
            // The original logic hid it on blur.
            await chatButtonWindowRef.current.hide();
          }
        } catch (error) {
          console.error('Error checking Diablo focus:', error);
        }
      };

      // Initial check
      checkDiabloFocus();
      // We rely on the main Consolidated Tracking Loop (below) to call this check now?
      // actually, the focus check is separate from position tracking.
      // But we can consolidate it too if we want.
      // For now, let's KEEP the focus check interval here but REMOVE position logic if any existed (none existed, it was static).
      // Wait, if tracking is enabled, we need to UPDATE position.

      // Let's keep the focus interval for now as it handles visibility.
      // We will handle POSITION in the main loop.
      focusCheckIntervalRef.current = setInterval(checkDiabloFocus, 500);
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
      chatWindowRef.current = await openWindowCenteredOnDiablo('Chat', '/chat', {
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

      // Set up toggle handler
      const toggleChatWindow = async (event?: { payload?: { conversationId?: string; conversation?: any } }) => {
        const conversationId = event?.payload?.conversationId;
        const conversation = event?.payload?.conversation;
        if (!chatWindowRef.current) {
          // Create the window if it doesn't exist - centered on Diablo screen
          chatWindowRef.current = await openWindowCenteredOnDiablo('Chat', '/chat', {
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
      tradeMessagesWindowRef.current = await openWindowCenteredOnDiablo('trade-messages', '/trade-messages', {
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
        // attachWindowCloseHandler(tradeMessagesWindowRef.current, () => {
        //   tradeMessagesWindowRef.current = null;
        // });
      }
    };

    const toggleTradeMessagesWindow = async () => {
      if (!tradeMessagesWindowRef.current) {
        // Create the window if it doesn't exist - centered on Diablo screen
        tradeMessagesWindowRef.current = await openWindowCenteredOnDiablo('trade-messages', '/trade-messages', {
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
        });

        if (tradeMessagesWindowRef.current) {
          // attachWindowCloseHandler(tradeMessagesWindowRef.current, () => {
          //   tradeMessagesWindowRef.current = null;
          // });
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
  // Consolidated Dynamic Window Tracking & Focus Loop
  useEffect(() => {
    if (!isTauri()) return;

    // Use a shared interval for both tracking and focus checks if possible,
    // but focus checks need to run regardless of tracking setting?
    // Actually, focus checks for "Main" window aren't needed (backend handles global hotkeys).
    // Focus checks for "Chat Button" are handled in its own effect above.

    // This effect handles POSITION TRACKING only.
    if (settings.windowTrackingEnabled === false) return;

    const intervalId = setInterval(async () => {
      try {
        // 1. Get Diablo Rect once
        const rect = await getDiabloRectWithRetry(1, 0); // Single attempt, fail fast
        if (!rect) {
          // prevRectRef.current = null; // Do NOT reset on transient failure.
          return;
        }

        // Calculate Delta
        let dx = 0;
        let dy = 0;
        if (prevRectRef.current) {
          dx = rect.x - prevRectRef.current.x;
          dy = rect.y - prevRectRef.current.y;
        } else {
          // First successful detection, initialize ref
          prevRectRef.current = { x: rect.x, y: rect.y };
        }
        prevRectRef.current = { x: rect.x, y: rect.y };

        if (dx !== 0 || dy !== 0) {
          console.log(`[Tracking] Delta: ${dx}, ${dy} | Rect: ${rect.x}, ${rect.y}`);
        } else {
          // console.log(`[Tracking] No Delta | Rect: ${rect.x}, ${rect.y}`);
        }

        // 2. Update Main Window (Overlay) - Always Snap to D2 Size/Pos
        // We want this to match D2 exactly.
        await updateMainWindowBounds();

        // 3. Update Chat Window (Floating) - Move by Delta
        if (chatWindowRef.current && (dx !== 0 || dy !== 0)) {
          await moveWindowBy(chatWindowRef.current, dx, dy);
        }

        // 4. Update Trade Messages Window (Floating) - Move by Delta
        if (tradeMessagesWindowRef.current && (dx !== 0 || dy !== 0)) {
          await moveWindowBy(tradeMessagesWindowRef.current, dx, dy);
        }

        // 5. Update Quick List / Item Search (Floating) - Move by Delta
        if (winRef.current && (dx !== 0 || dy !== 0)) {
          await moveWindowBy(winRef.current, dx, dy);
        }
        if (quickListWinRef.current && (dx !== 0 || dy !== 0)) {
          await moveWindowBy(quickListWinRef.current, dx, dy);
        }

        // 6. Update Settings Window (Floating) - Move by Delta
        if (settingsWindow && (dx !== 0 || dy !== 0)) {
          await moveWindowBy(settingsWindow, dx, dy);
        }

        // 6. Chat Button Overlay (Pinned Bottom Right) - Always Re-Pin
        // This needs absolute position relative to current D2 rect to stay valid.
        // 6. Chat Button Overlay (Bottom Right)
        if (chatButtonWindowRef.current) {
          // Logic to pin to bottom right - Use PHYSICAL coordinates
          const scaleFactor = await currentMonitor().then((m) => m?.scaleFactor || 1);

          // rect is Physical. ButtonSize is Logical (240).
          // We need to convert ButtonSize/Padding to Physical.
          const buttonSizePhysical = Math.round(240 * scaleFactor);
          const paddingXPhysical = Math.round(20 * scaleFactor);
          const paddingYPhysical = Math.round(10 * scaleFactor);

          const x = rect.x + rect.width - buttonSizePhysical - paddingXPhysical;
          const y = rect.y + rect.height - buttonSizePhysical - paddingYPhysical;

          // Check visibility first to avoid errors
          try {
            if (await chatButtonWindowRef.current.isVisible()) {
              await chatButtonWindowRef.current.setPosition(new PhysicalPosition(x, y));
            }
          } catch {
            // Ignore errors if window is destroyed/busy
          }
        }
      } catch {
        // console.error("Tracking error");
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [settings.windowTrackingEnabled, settingsWindow]);

  // Set up trade messages window - always display for testing
  useEffect(() => {
    let toggleUnlisten: (() => void) | null = null;

    const openTradeMessagesWindow = async () => {
      // Small delay to ensure app is fully initialized
      await sleep(500);
      // Create and show the trade messages window - centered on Diablo screen
      tradeMessagesWindowRef.current = await openWindowCenteredOnDiablo('trade-messages', '/trade-messages', {
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
        // attachWindowCloseHandler(tradeMessagesWindowRef.current, () => {
        //   tradeMessagesWindowRef.current = null;
        // });
      }
    };

    const toggleTradeMessagesWindow = async () => {
      if (!tradeMessagesWindowRef.current) {
        // Create the window if it doesn't exist - centered on Diablo screen
        tradeMessagesWindowRef.current = await openWindowCenteredOnDiablo('trade-messages', '/trade-messages', {
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
        });

        if (tradeMessagesWindowRef.current) {
          // attachWindowCloseHandler(tradeMessagesWindowRef.current, () => {
          //   tradeMessagesWindowRef.current = null;
          // });
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
