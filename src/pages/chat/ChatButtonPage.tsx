import React, { useEffect } from 'react';
import { ChatButton } from '@/components/custom/ChatButton';
import { emit, listen } from '@/lib/browser-events';
import { useOptions } from '@/hooks/useOptions';
import { useNotificationCountsContext } from '@/contexts/NotificationCountsContext';
import { useViewManager, VIEW_IDS } from '@/hooks/useViewManager';

const ChatButtonPageContent: React.FC = () => {
  const { updateSettings, settings } = useOptions();
  const { chatUnreadCount, totalTradeOffersCount, tradeMessagesCount } = useNotificationCountsContext();
  const { toggleView, showView, hideView, isVisible } = useViewManager();

  // Debug: Log when tradeMessagesCount changes
  useEffect(() => {
    console.log('[ChatButtonPage] tradeMessagesCount updated:', tradeMessagesCount);
  }, [tradeMessagesCount]);

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

  const handleCommandMenuClick = async () => {
    const isCurrentlyVisible = isVisible(VIEW_IDS.COMMAND_MENU);
    if (isCurrentlyVisible) {
      hideView(VIEW_IDS.COMMAND_MENU);
    } else {
      showView(VIEW_IDS.COMMAND_MENU, {
        type: 'panel',
        position: 'centered',
      });
    }
  };

  const handleItemSearchClick = async () => {
    showView(VIEW_IDS.ITEM_SEARCH, {
      type: 'panel',
      position: 'over-diablo',
    });
  };

  const handleQuickListClick = async () => {
    showView(VIEW_IDS.QUICK_LIST, {
      type: 'panel',
      position: 'over-diablo',
    });
  };

  const handleCurrencyValuationClick = async () => {
    toggleView(VIEW_IDS.CURRENCY, {
      type: 'panel',
      position: 'centered',
    });
  };

  const handleDisableClick = () => {
    // The actual disable logic is handled by the 'confirm-disable-overlay' listener
    // This function just needs to exist to pass to ChatButton
  };

  // Don't render if overlay is disabled
  if (settings?.chatButtonOverlayEnabled === false) {
    return null;
  }

  return (
    <div className="pointer-events-none">
      <ChatButton
        handleClick={handleClick}
        onSettingsClick={handleSettingsClick}
        onTradeMessagesClick={handleTradeMessagesClick}
        onItemSearchClick={handleItemSearchClick}
        onQuickListClick={handleQuickListClick}
        onCurrencyValuationClick={handleCurrencyValuationClick}
        onCommandMenuClick={handleCommandMenuClick}
        onDisableClick={handleDisableClick}
        unreadCount={chatUnreadCount}
        tradeOffersCount={totalTradeOffersCount}
        tradeMessagesCount={tradeMessagesCount}
      />
    </div>
  );
};

const ChatButtonPage: React.FC = () => {
  return <ChatButtonPageContent />;
};

export default ChatButtonPage;
