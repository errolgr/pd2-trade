import React, { useEffect, useState, useCallback, useRef } from 'react';
import { listen, emit } from '@tauri-apps/api/event';
import { isTauri } from '@tauri-apps/api/core';
import { TradeMessageData, TradeMessageHistoryEntry } from '@/components/trade/TradeMessage';

interface TradeMessageEvent {
  isIncoming: boolean;
  playerName: string;
  accountName?: string;
  characterName?: string;
  message: string;
  itemName?: string;
  price?: string;
}

interface WhisperEvent {
  isTrade: boolean;
  from: string;
  message: string;
  itemName?: string;
  isJoin: boolean;
  isIncoming: boolean;
}

export const useTradeMessages = () => {
  const [trades, setTrades] = useState<TradeMessageData[]>([]);
  const unlistenRef = useRef<(() => void) | null>(null);
  const whisperUnlistenRef = useRef<(() => void) | null>(null);
  const removeUnlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    const setupListener = async () => {
      try {
        const unlisten = await listen<TradeMessageEvent>('trade-message', async (event) => {
          const tradeEvent = event.payload;
          
          // Don't automatically show the trade messages window - let user open it manually
          
          const newTrade: TradeMessageData = {
            id: `${Date.now()}-${Math.random()}`,
            isIncoming: tradeEvent.isIncoming,
            playerName: tradeEvent.playerName,
            accountName: tradeEvent.accountName,
            characterName: tradeEvent.characterName,
            message: tradeEvent.message,
            itemName: tradeEvent.itemName,
            price: tradeEvent.price,
            timestamp: new Date(),
            history: [{
              id: `${Date.now()}-${Math.random()}`,
              isIncoming: tradeEvent.isIncoming,
              message: tradeEvent.message,
              timestamp: new Date(),
            }],
          };

          setTrades((prev) => {
            // Check if this is an outgoing message to an existing trade
            const existingTradeIndex = prev.findIndex((t) => {
              const normalizeName = (name: string) => name.toLowerCase().replace(/^\*/, '').trim();
              const tradeAccountNormalized = t.accountName ? normalizeName(t.accountName) : '';
              const tradeCharacterNormalized = t.characterName ? normalizeName(t.characterName) : '';
              const tradePlayerNormalized = normalizeName(t.playerName);
              const newTradeAccountNormalized = tradeEvent.accountName ? normalizeName(tradeEvent.accountName) : '';
              const newTradeCharacterNormalized = tradeEvent.characterName ? normalizeName(tradeEvent.characterName) : '';
              const newTradePlayerNormalized = normalizeName(tradeEvent.playerName);

              return (
                (!tradeEvent.isIncoming && (
                  newTradeAccountNormalized === tradeAccountNormalized ||
                  newTradeCharacterNormalized === tradeCharacterNormalized ||
                  newTradePlayerNormalized === tradePlayerNormalized
                ))
              );
            });

            if (existingTradeIndex !== -1 && !tradeEvent.isIncoming) {
              // Add outgoing message to existing trade's history
              const updatedTrades = [...prev];
              const existingTrade = updatedTrades[existingTradeIndex];
              const historyEntry: TradeMessageHistoryEntry = {
                id: `${Date.now()}-${Math.random()}`,
                isIncoming: false,
                message: tradeEvent.message,
                timestamp: new Date(),
              };
              updatedTrades[existingTradeIndex] = {
                ...existingTrade,
                history: [...(existingTrade.history || []), historyEntry],
              };
              return updatedTrades;
            }

            // Add new trade to the beginning
            return [newTrade, ...prev];
          });
        });

        unlistenRef.current = unlisten;

        // Listen for all whispers to track history
        const whisperUnlisten = await listen<WhisperEvent>('whisper-received', async (event) => {
          const whisper = event.payload;
          
          // Skip join messages only - track all whispers (trade and non-trade) for history
          if (whisper.isJoin) {
            return;
          }

          // Normalize names for matching (case-insensitive, ignore "*" prefix)
          const normalizeName = (name: string) => name.toLowerCase().replace(/^\*/, '').trim();
          const whisperFromNormalized = normalizeName(whisper.from);

          setTrades((prev) => {
            return prev.map((trade) => {
              // Match by account name, character name, or player name
              const tradeAccountNormalized = trade.accountName ? normalizeName(trade.accountName) : '';
              const tradeCharacterNormalized = trade.characterName ? normalizeName(trade.characterName) : '';
              const tradePlayerNormalized = normalizeName(trade.playerName);

              const matches = 
                whisperFromNormalized === tradeAccountNormalized ||
                whisperFromNormalized === tradeCharacterNormalized ||
                whisperFromNormalized === tradePlayerNormalized;

              if (matches) {
                // Add whisper to history (both trade and non-trade whispers)
                const historyEntry: TradeMessageHistoryEntry = {
                  id: `${Date.now()}-${Math.random()}`,
                  isIncoming: whisper.isIncoming,
                  message: whisper.message,
                  timestamp: new Date(),
                };

                return {
                  ...trade,
                  history: [...(trade.history || []), historyEntry],
                };
              }

              return trade;
            });
          });
        });

        whisperUnlistenRef.current = whisperUnlisten;

        // Listen for trade removal events from other windows (only if isTauri)
        if (isTauri()) {
          const removeUnlisten = await listen<{ id: string }>('trade-message-removed', (event) => {
            const { id } = event.payload;
            console.log('[useTradeMessages] Received trade-message-removed event for:', id);
            setTrades((prev) => {
              // Only remove if the trade still exists (avoid unnecessary updates)
              if (prev.some(trade => trade.id === id)) {
                const updated = prev.filter((trade) => trade.id !== id);
                console.log('[useTradeMessages] Updated trades from event, count:', prev.length, '->', updated.length);
                return updated;
              }
              return prev;
            });
          });
          removeUnlistenRef.current = removeUnlisten;
        }
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
      if (whisperUnlistenRef.current) {
        whisperUnlistenRef.current();
        whisperUnlistenRef.current = null;
      }
      if (removeUnlistenRef.current) {
        removeUnlistenRef.current();
        removeUnlistenRef.current = null;
      }
    };
  }, []);

  const removeTrade = useCallback((id: string) => {
    console.log('[useTradeMessages] Removing trade:', id);
    // Update state first
    setTrades((prev) => {
      const updated = prev.filter((trade) => trade.id !== id);
      console.log('[useTradeMessages] Updated trades count:', prev.length, '->', updated.length);
      return updated;
    });
    
    // Emit event after state update so other windows/components can sync
    if (isTauri()) {
      emit('trade-message-removed', { id }).catch(err => {
        console.error('[useTradeMessages] Failed to emit trade-message-removed:', err);
      });
    }
  }, []);

  const clearAll = useCallback(() => {
    setTrades([]);
  }, []);

  // Emit trade count updates whenever trades change
  useEffect(() => {
    if (isTauri()) {
      emit('trade-messages-count-updated', { count: trades.length }).catch(err => {
        console.error('[useTradeMessages] Failed to emit trade-messages-count-updated:', err);
      });
    }
  }, [trades.length]);

  return {
    trades,
    removeTrade,
    clearAll,
  };
};

