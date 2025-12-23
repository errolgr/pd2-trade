import { useEffect, useRef } from 'react';
import { listen as tauriListen } from '@tauri-apps/api/event';
import { isTauri } from '@tauri-apps/api/core';
import { WindowRefs } from './useWindowRefs';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

interface UseVisibilityManagerProps {
  windowRefs: WindowRefs;
  settings: any;
  settingsWindow: WebviewWindow | null;
}

export const useVisibilityManager = ({ windowRefs, settings, settingsWindow }: UseVisibilityManagerProps) => {
  const { winRef, quickListWinRef, chatWindowRef, chatButtonWindowRef, tradeMessagesWindowRef, currencyWindowRef } =
    windowRefs;

  // Persistent snapshot of which windows were open - persists across re-renders
  const visibleWindowsSnapshotRef = useRef<Set<string>>(new Set());
  // Ref to track if we are currently "focused" to handle race conditions
  const isDiabloFocusedRef = useRef<boolean>(false);
  // Ref for debounce timer
  const focusDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | null = null;

    const setupFocusListener = async () => {
      unlisten = await tauriListen<boolean>('diablo-focus-changed', async (event) => {
        const isFocused = event.payload;

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
          if (settings.chatButtonOverlayEnabled !== false) {
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
  }, [
    settingsWindow,
    settings.chatButtonOverlayEnabled,
    chatButtonWindowRef,
    chatWindowRef,
    tradeMessagesWindowRef,
    quickListWinRef,
    winRef,
    currencyWindowRef,
  ]);
};
