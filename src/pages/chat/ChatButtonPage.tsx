import React, { useState, useEffect } from 'react';
import { ChatButton } from '@/components/custom/ChatButton';
import { emit, listen } from '@/lib/browser-events';

interface UnreadCountEvent {
  count: number;
}

const ChatButtonPage: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unlisten = await listen<UnreadCountEvent>('chat-unread-count-updated', (event) => {
          console.log('[ChatButtonPage] Received unread count update:', event.payload.count);
          setUnreadCount(event.payload.count);
        });
      } catch (error) {
        console.error('Failed to set up unread count listener:', error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const handleClick = async () => {
    await emit('toggle-chat-window');
  };

  const handleSettingsClick = async () => {
    await emit('open-settings');
  };

  const handleTradeMessagesClick = async () => {
    await emit('toggle-trade-messages-window');
  };

  return (
    <div className="w-screen h-screen pointer-events-none">
      <ChatButton 
        handleClick={handleClick} 
        onSettingsClick={handleSettingsClick}
        onTradeMessagesClick={handleTradeMessagesClick}
        unreadCount={unreadCount} 
      />
    </div>
  );
};

export default ChatButtonPage;

