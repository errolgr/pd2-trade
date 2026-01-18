import React, { useEffect } from 'react';
import { ChatButton } from '@/components/custom/ChatButton';
import { emit, listen } from '@/lib/browser-events';
import { useOptions } from '@/hooks/useOptions';
import { useNotificationCountsContext } from '@/contexts/NotificationCountsContext';

const ChatButtonPageContent: React.FC = () => {
  const { updateSettings } = useOptions();
  const { chatUnreadCount, totalTradeOffersCount } = useNotificationCountsContext();

  useEffect(() => {
    let unlistenConfirm: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unlistenConfirm = await listen('confirm-disable-overlay', async () => {
          await updateSettings({ chatButtonOverlayEnabled: false });
          await emit('toast-event', 'Chat button overlay disabled. Re-enable in Settings → Interface.');
        });
      } catch (error) {
        console.error('Failed to set up listeners:', error);
      }
    };

    setupListener();

    return () => {
      if (unlistenConfirm) {
        unlistenConfirm();
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
    <div className="relative w-full h-full pointer-events-none"
      style={{ width: '200px', height: '200px' }}>
      <div className="absolute bottom-0 right-0">
        <ChatButton
          handleClick={handleClick}
          onSettingsClick={handleSettingsClick}
          onTradeMessagesClick={handleTradeMessagesClick}
          onManageListingsClick={handleManageListingsClick}
          onDisableClick={handleDisableClick}
          unreadCount={chatUnreadCount}
          tradeOffersCount={totalTradeOffersCount}
        />
      </div>
    </div>
  );
};

const ChatButtonPage: React.FC = () => {
  return <ChatButtonPageContent />;
};

export default ChatButtonPage;
