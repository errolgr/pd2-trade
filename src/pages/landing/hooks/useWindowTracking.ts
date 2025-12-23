import { useEffect } from 'react';
import { listen as tauriListen } from '@tauri-apps/api/event';
import { isTauri } from '@tauri-apps/api/core';
import { updateMainWindowBounds, moveWindowBy } from '@/lib/window';
import { WindowRefs } from './useWindowRefs';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { createChatButtonWindow } from '../lib/window-helpers';

interface UseWindowTrackingProps {
  windowRefs: WindowRefs;
  settings: any;
  settingsWindow: WebviewWindow | null;
}

export const useWindowTracking = ({ windowRefs, settings, settingsWindow }: UseWindowTrackingProps) => {
  const { winRef, quickListWinRef, chatWindowRef, chatButtonWindowRef, tradeMessagesWindowRef, currencyWindowRef } =
    windowRefs;

  useEffect(() => {
    if (!isTauri()) return;

    // Position Tracking (Event Driven)
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await tauriListen<any>('diablo-window-moved', async (event) => {
        if (settings.windowTrackingEnabled === false) return;

        const { delta } = event.payload;
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
            await createChatButtonWindow(chatButtonWindowRef);
          }
        }

        await Promise.all(updatePromises);
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [
    settings.windowTrackingEnabled,
    settingsWindow,
    settings.chatButtonOverlayEnabled,
    // Add specific refs to dependencies to satisfy exhaustive-deps
    winRef,
    quickListWinRef,
    chatWindowRef,
    tradeMessagesWindowRef,
    currencyWindowRef,
    chatButtonWindowRef,
  ]);
};
