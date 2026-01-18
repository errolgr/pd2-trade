import { useEffect, useState, useRef } from 'react';
import { listen } from '@/lib/browser-events';

interface UnreadCountEvent {
  count: number;
}

interface TradeMessagesCountEvent {
  count: number;
}

interface TradeOffersCountEvent {
  incomingCount: number;
  outgoingCount: number;
  totalCount: number;
}

export interface NotificationCounts {
  chatUnreadCount: number;
  tradeMessagesCount: number;
  tradeOffersCount: number;
  totalTradeOffersCount: number;
}

/**
 * Hook to track notification counts from various events
 * Listens to chat-unread-count-updated, trade-messages-count-updated, and trade-offers-count-updated events
 */
export const useNotificationCounts = (): NotificationCounts => {
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [tradeMessagesCount, setTradeMessagesCount] = useState(0);
  const [tradeOffersCount, setTradeOffersCount] = useState(0);

  const unlistenChatRef = useRef<(() => void) | null>(null);
  const unlistenTradeMessagesRef = useRef<(() => void) | null>(null);
  const unlistenTradeOffersRef = useRef<(() => void) | null>(null);
  const isSetupRef = useRef<boolean>(false);

  useEffect(() => {
    if (isSetupRef.current) {
      return;
    }

    const setupListeners = async () => {
      if (isSetupRef.current) {
        return;
      }

      try {
        // Listen for chat unread count updates
        const unlistenChat = await listen<UnreadCountEvent>('chat-unread-count-updated', (event) => {
          setChatUnreadCount(event.payload.count);
        });
        unlistenChatRef.current = unlistenChat;

        // Listen for trade messages count updates (whispers)
        const unlistenTradeMessages = await listen<TradeMessagesCountEvent>('trade-messages-count-updated', (event) => {
          console.log('[useNotificationCounts] Received trade-messages-count-updated:', event.payload.count);
          setTradeMessagesCount(event.payload.count);
        });
        unlistenTradeMessagesRef.current = unlistenTradeMessages;

        // Listen for trade offers count updates (website offers)
        const unlistenTradeOffers = await listen<TradeOffersCountEvent>('trade-offers-count-updated', (event) => {
          setTradeOffersCount(event.payload.totalCount);
        });
        unlistenTradeOffersRef.current = unlistenTradeOffers;

        isSetupRef.current = true;
      } catch (error) {
        console.error('Failed to set up notification count listeners:', error);
      }
    };

    setupListeners();

    return () => {
      if (unlistenChatRef.current) {
        unlistenChatRef.current();
        unlistenChatRef.current = null;
      }
      if (unlistenTradeMessagesRef.current) {
        unlistenTradeMessagesRef.current();
        unlistenTradeMessagesRef.current = null;
      }
      if (unlistenTradeOffersRef.current) {
        unlistenTradeOffersRef.current();
        unlistenTradeOffersRef.current = null;
      }
      isSetupRef.current = false;
    };
  }, []);

  // Calculate total trade offers count (whispers + website offers)
  const totalTradeOffersCount = tradeMessagesCount + tradeOffersCount;

  return {
    chatUnreadCount,
    tradeMessagesCount,
    tradeOffersCount,
    totalTradeOffersCount,
  };
};
