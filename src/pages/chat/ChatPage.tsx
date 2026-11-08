import React from 'react';
import ChatOverlayWidget from '@/pages/chat/components/ChatOverlayWidget';
import { ChatSimTryOnProvider } from '@/pages/chat/components/ChatSimTryOn';
import { usePanel } from '@/overlay';

/** `chat` panel content (keepMounted); listing links get Horadric Sim's Try on here. */
const ChatPage: React.FC = () => {
  const { close } = usePanel<'chat'>();
  return (
    <ChatSimTryOnProvider>
      <ChatOverlayWidget onClose={close} />
    </ChatSimTryOnProvider>
  );
};

export default ChatPage;
