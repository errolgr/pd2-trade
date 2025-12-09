import React, { useEffect, useState, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { TradeMessageData } from '@/components/trade/TradeMessage';

interface TradeMessageEvent {
  isIncoming: boolean;
  playerName: string;
  message: string;
  itemName?: string;
  price?: string;
}

export const useTradeMessages = () => {
  const [trades, setTrades] = useState<TradeMessageData[]>([]);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    const setupListener = async () => {
      try {
        const unlisten = await listen<TradeMessageEvent>('trade-message', async (event) => {
          const tradeEvent = event.payload;
          
          // Show the trade messages window when a trade message is received
          try {
            const tradeWindow = await WebviewWindow.getByLabel('trade-messages');
            if (tradeWindow) {
              await tradeWindow.show();
            }
          } catch (error) {
            console.error('Failed to show trade messages window:', error);
          }
          
          const newTrade: TradeMessageData = {
            id: `${Date.now()}-${Math.random()}`,
            isIncoming: tradeEvent.isIncoming,
            playerName: tradeEvent.playerName,
            message: tradeEvent.message,
            itemName: tradeEvent.itemName,
            price: tradeEvent.price,
            timestamp: new Date(),
          };

          setTrades((prev) => {
            // Add new trade to the beginning
            return [newTrade, ...prev];
          });
        });

        unlistenRef.current = unlisten;
      } catch (error) {
        console.error('Failed to set up trade message listener:', error);
      }
    };

    setupListener();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, []);

  const removeTrade = useCallback((id: string) => {
    setTrades((prev) => prev.filter((trade) => trade.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setTrades([]);
  }, []);

  return {
    trades,
    removeTrade,
    clearAll,
  };
};

