import React, { useState, useEffect } from 'react';
import { ChatButton } from '@/components/custom/ChatButton';
import { emit, listen } from '@/lib/browser-events';
import { useOptions } from '@/hooks/useOptions';
import { OptionsProvider } from '@/hooks/useOptions';
import { Pd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { ItemsProvider } from '@/hooks/useItems';

interface UnreadCountEvent {
  count: number;
}

const ChatButtonPageContent: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [whispersCount, setWhispersCount] = useState(0);
  const [websiteOffersCount, setWebsiteOffersCount] = useState(0);
  const { updateSettings } = useOptions();

  // Calculate total trade offers count (website offers + whispers)
  const tradeOffersCount = whispersCount + websiteOffersCount;

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let unlistenConfirm: (() => void) | null = null;
    let unlistenTradeMessagesCount: (() => void) | null = null;
    let unlistenTradeOffersCount: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unlisten = await listen<UnreadCountEvent>('chat-unread-count-updated', (event) => {
          console.log('[ChatButtonPage] Received unread count update:', event.payload.count);
          setUnreadCount(event.payload.count);
        });

        unlistenConfirm = await listen('confirm-disable-overlay', async () => {
          await updateSettings({ chatButtonOverlayEnabled: false });
          await emit('toast-event', 'Chat button overlay disabled. Re-enable in Settings → Interface.');
        });

        // Listen for trade messages count updates (whispers)
        unlistenTradeMessagesCount = await listen<{ count: number }>('trade-messages-count-updated', (event) => {
          setWhispersCount(event.payload.count);
        });

        // Listen for trade offers count updates (website offers)
        unlistenTradeOffersCount = await listen<{ incomingCount: number; outgoingCount: number; totalCount: number }>(
          'trade-offers-count-updated',
          (event) => {
            setWebsiteOffersCount(event.payload.totalCount);
          },
        );
      } catch (error) {
        console.error('Failed to set up listeners:', error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
      if (unlistenConfirm) {
        unlistenConfirm();
      }
      if (unlistenTradeMessagesCount) {
        unlistenTradeMessagesCount();
      }
      if (unlistenTradeOffersCount) {
        unlistenTradeOffersCount();
      }
    };
  }, [updateSettings]);

  const handleClick = async () => {
    await emit('toggle-chat-window');
  };

  const handleSettingsClick = async () => {
    await emit('open-settings');
  };

  const handleTradeMessagesClick = async () => {
    await emit('toggle-trade-messages-window');
  };

  const handleManageListingsClick = async () => {
    console.log('[ChatButtonPage] handleManageListingsClick called, emitting open-quick-list-manage');
    await emit('open-quick-list-manage');
  };

  const handleDisableClick = () => {
    // The actual disable logic is handled by the 'confirm-disable-overlay' listener
    // This function just needs to exist to pass to ChatButton
  };

  return (
    <div className="w-screen h-screen pointer-events-none">
      <ChatButton
        handleClick={handleClick}
        onSettingsClick={handleSettingsClick}
        onTradeMessagesClick={handleTradeMessagesClick}
        onManageListingsClick={handleManageListingsClick}
        onDisableClick={handleDisableClick}
        unreadCount={unreadCount}
        tradeOffersCount={tradeOffersCount}
      />
    </div>
  );
};

const ChatButtonPage: React.FC = () => {
  return (
    <OptionsProvider>
      <ItemsProvider>
        <Pd2WebsiteProvider>
          <ChatButtonPageContent />
        </Pd2WebsiteProvider>
      </ItemsProvider>
    </OptionsProvider>
  );
};

export default ChatButtonPage;
