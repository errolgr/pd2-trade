import React, { useEffect } from 'react';
import { listen } from '@/lib/browser-events';
import ChatOverlayWidget from '@/pages/chat/components/ChatOverlayWidget';
import { useViewManager, VIEW_IDS } from '@/hooks/useViewManager';

const ChatWindow: React.FC = () => {
  const { hideView } = useViewManager();

  useEffect(() => {
    // Listen for any future events if needed
    const unlistenPromise = listen('chat-update', () => {
      // Handle chat updates if needed
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  return <ChatOverlayWidget onClose={() => hideView(VIEW_IDS.CHAT)} />;
};

export default ChatWindow;
