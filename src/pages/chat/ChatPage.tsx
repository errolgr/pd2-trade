import React from 'react';
import ChatOverlayWidget from '@/pages/chat/components/ChatOverlayWidget';
import { usePanel } from '@/overlay';

/** `chat` panel content (keepMounted). */
const ChatPage: React.FC = () => {
  const { close } = usePanel<'chat'>();
  return <ChatOverlayWidget onClose={close} />;
};

export default ChatPage;
