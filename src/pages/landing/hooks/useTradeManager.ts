import { useCallback, useEffect } from 'react';
import { listen } from '@/lib/browser-events';
import { emit } from '@/lib/browser-events';
import { openWindowCenteredOnDiablo } from '@/lib/window';
import { WindowTitles, WindowLabels } from '@/lib/window-titles';
import { sleep } from '@/lib/item-utils';
import { WindowRefs } from './useWindowRefs';
import { toggleWindowVisibility, attachRefClearOnClose } from '@/lib/window-helpers';

interface UseTradeManagerProps {
  windowRefs: WindowRefs;
}

export const useTradeManager = ({ windowRefs }: UseTradeManagerProps) => {
  const { tradeMessagesWindowRef } = windowRefs;

  // Toggle trade messages window handler
  const toggleTradeMessagesWindow = useCallback(async () => {
    await emit('toggle-trade-messages-window');
  }, []);

  // Set up trade messages window - always display for testing/startup (hidden, then toggled)
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
      attachRefClearOnClose(tradeMessagesWindowRef.current, tradeMessagesWindowRef);
    };

    const toggleTradeMessagesWindowHandler = async () => {
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
        attachRefClearOnClose(tradeMessagesWindowRef.current, tradeMessagesWindowRef);

        // Wait a bit for window to be created, then show it
        setTimeout(async () => {
          if (tradeMessagesWindowRef.current) {
            await tradeMessagesWindowRef.current.show();
            await tradeMessagesWindowRef.current.setFocus();
          }
        }, 100);
        return;
      }

      await toggleWindowVisibility(tradeMessagesWindowRef);
    };

    // Open window on startup
    openTradeMessagesWindow();

    // Listen for toggle trade messages window event
    listen('toggle-trade-messages-window', toggleTradeMessagesWindowHandler)
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
  }, [tradeMessagesWindowRef]);

  return { toggleTradeMessagesWindow };
};
