import React, { useCallback, useEffect, useRef, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { emit } from '@/lib/browser-events';
import type { BrowserWindow } from '@/lib/window';
import { useClipboard } from '@/hooks/useClipboard';
import { TrayProvider } from '@/hooks/useTray';
import { OptionsProvider, useOptions } from '@/hooks/useOptions';
import { useKeySender } from '@/hooks/useKeySender';
import { DialogProvider } from '@/hooks/useDialog';
import { Pd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { openCenteredWindow, openOverDiabloWindow, openWindowAtCursor, openWindowCenteredOnDiablo, attachWindowCloseHandler } from '@/lib/window';
import { listen } from '@/lib/browser-events';
import { useAppShortcuts } from '@/hooks/useShortcuts';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { usePD2Auth } from '@/hooks/usePD2Auth';
import { useChangelog } from '@/hooks/useChangelog';
import { useWhisperNotifications } from '@/hooks/useWhisperNotifications';
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
  const focusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { read } = useClipboard();
  const keyPress = useKeySender();
  const { settings } = useOptions();
  
  // Keep settings ref up to date
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Hide launch title after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTitle(false);
      emit('toast-event', 'is now running in the background...');
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
      const { invoke } = await import('@tauri-apps/api/core');
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
    await sleep(100);
    const raw = await read();
    return clipboardContainsValidItem(raw) ? raw : null;
  }, [read, keyPress]);

  // Open item search window
  const fireSearch = useCallback(async () => {
    if (!(await checkDiabloFocus())) return;

    if (!(settings.hotkeyModifier === 'ctrl' && settings.hotkeyKey === 'c')) {
      await keyPress('ctrl+c');
    }
    await sleep(100);
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
    if (!raw) {
      const errorToastPayload: GenericToastPayload = {
        title: 'PD2 Trader',
        description: 'Item is not supported or invalid.',
        variant: 'error',
      };
      emit('toast-event', errorToastPayload);
      return;
    }

    if (!isStashItem(raw)) {
      const errorToastPayload: GenericToastPayload = {
        title: 'PD2 Trader',
        description: 'Item must be located in stash in order to list',
        variant: 'error',
      };
      emit('toast-event', errorToastPayload);
      return;
    }

    const encodedItem = encodeItemForQuickList(raw);

    if (!quickListWinRef.current) {
      quickListWinRef.current = await openWindowAtCursor('QuickList', `/quick-list?item=${encodedItem}`, {
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
      await quickListWinRef.current.emit('quick-list-new-item', encodedItem);
      await sleep(100);
      await quickListWinRef.current.show();
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

  // Handle whisper notifications
  // Always enable the hook - it handles the logic internally based on settings
  useWhisperNotifications(true);

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
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const { invoke } = await import('@tauri-apps/api/core');
        
        const rect = await invoke<{ x: number; y: number; width: number; height: number }>('get_diablo_rect');
        
        // Position button in bottom right corner - align bottom-right of button window with bottom-right of Diablo window
        const buttonSize = 160; // 48px button + padding
        const x = rect.x + rect.width - buttonSize - 20;
        const y = rect.y + rect.height - buttonSize - 40;

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
          // Clear interval if disabled
          if (focusCheckIntervalRef.current) {
            clearInterval(focusCheckIntervalRef.current);
            focusCheckIntervalRef.current = null;
          }
          return;
        }
        
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const isFocused = await invoke<boolean>('is_diablo_focused');
          const isVisible = await chatButtonWindowRef.current.isVisible();
          
          if (isFocused && !isVisible) {
            await chatButtonWindowRef.current.show();
          } else if (!isFocused && isVisible) {
            await chatButtonWindowRef.current.hide();
          }
        } catch (error) {
          console.error('Error checking Diablo focus:', error);
        }
      };

      // Check immediately
      checkDiabloFocus();
      
      // Check periodically (every 500ms)
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
      listen('toggle-chat-window', toggleChatWindow).then((off) => {
        toggleUnlisten = off;
      }).catch((err) => {
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
    listen('toggle-trade-messages-window', toggleTradeMessagesWindow).then((off) => {
      toggleUnlisten = off;
    }).catch((err) => {
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
    if (!isTauri()) return;

    const generalEnabled = settings.whisperNotificationsEnabled ?? true;
    const tradeEnabled = settings.tradeNotificationsEnabled ?? true;
    const shouldWatch = generalEnabled || tradeEnabled;

    const manageWatcher = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
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
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('stop_chat_watcher').catch(console.error);
        });
      }
    };
  }, [settings.whisperNotificationsEnabled, settings.tradeNotificationsEnabled, settings.diablo2Directory]);

  return (
    <ItemsProvider>
      <Pd2WebsiteProvider>
        <div>
          {showTitle && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <img src={iconPath} style={{ width: 400 }} alt="PD2 Trader" />
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
