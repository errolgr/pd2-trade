import { useCallback, useEffect, useRef } from 'react';
import { emit, listen } from '@/lib/browser-events';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { openWindowCenteredOnDiablo } from '@/lib/window';
import { WindowTitles, WindowLabels } from '@/lib/window-titles';
import { sleep } from '@/lib/item-utils';
import { WindowRefs } from './useWindowRefs';
import { createChatButtonWindow } from '../lib/window-helpers';
import { toggleWindowVisibility, attachRefClearOnClose } from '@/lib/window-helpers';

interface UseChatManagerProps {
  windowRefs: WindowRefs;
  settings: any;
  settingsRef: React.MutableRefObject<any>; // Needed for latest settings in async
}

export const useChatManager = ({ windowRefs, settings, settingsRef }: UseChatManagerProps) => {
  const { chatWindowRef, chatButtonWindowRef } = windowRefs;
  const focusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Toggle chat window handler
  const toggleChatWindow = useCallback(async () => {
    await emit('toggle-chat-window');
  }, []);

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
      await createChatButtonWindow(chatButtonWindowRef);

      // Initial focus check
      try {
        if (chatButtonWindowRef.current) {
          const isFocused = await invoke<boolean>('is_diablo_focused');
          if (isFocused) {
            await chatButtonWindowRef.current.show();
          } else {
            await chatButtonWindowRef.current.hide();
          }
        }
      } catch (error) {
        console.error('Initial focus check failed:', error);
      }
    };

    setupChatButton();

    return () => {
      // Cleanup handled by ref nulling in logic context if needed, but here just clearing timeout if we had one
      if (focusCheckIntervalRef.current) {
        clearInterval(focusCheckIntervalRef.current);
        focusCheckIntervalRef.current = null;
      }
    };
  }, [settings.chatButtonOverlayEnabled, chatButtonWindowRef, settingsRef]);

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

      attachRefClearOnClose(chatWindowRef.current, chatWindowRef);

      // Set up toggle handler
      const toggleChatWindowHandler = async (event?: { payload?: { conversationId?: string; conversation?: any } }) => {
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
          attachRefClearOnClose(chatWindowRef.current, chatWindowRef);

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

        const shown = await toggleWindowVisibility(chatWindowRef);
        if (shown && conversationId) {
          setTimeout(() => {
            emit('select-chat-conversation', { conversationId, conversation });
          }, 200); // Small delay to ensure chat widget is ready
        }
      };

      // Listen for toggle chat window event
      listen('toggle-chat-window', toggleChatWindowHandler)
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
    };
  }, [settings.chatButtonOverlayEnabled, chatWindowRef]);

  // Start/stop chat watcher based on settings
  useEffect(() => {
    if (!isTauri()) return;

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
  }, [settings.whisperNotificationsEnabled, settings.tradeNotificationsEnabled, settings.diablo2Directory]);

  return { toggleChatWindow };
};
