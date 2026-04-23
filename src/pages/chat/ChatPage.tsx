import React, { useEffect } from 'react';
import { listen } from '@/lib/browser-events';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import ChatOverlayWidget from '@/pages/chat/components/ChatOverlayWidget';
import { OptionsProvider } from '@/hooks/useOptions';
import { ChildPd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';

const ChatWindow: React.FC = () => {
  useEffect(() => {
    // Listen for any future events if needed
    const unlistenPromise = listen('chat-update', () => {
      // Handle chat updates if needed
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  return (
    <OptionsProvider>
      <ChildPd2WebsiteProvider>
        <ChatOverlayWidget onClose={() => getCurrentWebviewWindow().hide()} />
      </ChildPd2WebsiteProvider>
    </OptionsProvider>
  );
};

export default ChatWindow;
