import { useEffect, useRef } from 'react';
import { listen } from '@/lib/browser-events';
import { Message } from '@/common/types/pd2-website/ChatTypes';
import { Conversation } from '@/common/types/pd2-website/ChatTypes';
import { ISettings } from './useOptions';
import { playNotificationSound } from '@/lib/notification-sound';

interface UseChatMessageNotificationsProps {
  currentUserId: string | undefined;
  selectedConversation: Conversation | null;
  settings?: ISettings;
}

/**
 * Hook to handle chat message notifications
 * Listens for new messages and plays notification sounds when appropriate
 */
export const useChatMessageNotifications = ({
  currentUserId,
  selectedConversation,
  settings,
}: UseChatMessageNotificationsProps) => {
  const messageListenerUnlistenRef = useRef<(() => void) | null>(null);
  const isMessageListenerSetupRef = useRef<boolean>(false);
  const selectedConversationRef = useRef<Conversation | null>(null);

  // Keep refs in sync with props
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    if (!currentUserId) {
      // Clean up listener if no user ID
      if (messageListenerUnlistenRef.current) {
        messageListenerUnlistenRef.current();
        messageListenerUnlistenRef.current = null;
        isMessageListenerSetupRef.current = false;
      }
      return;
    }

    // Prevent multiple listeners from being set up
    if (isMessageListenerSetupRef.current) {
      return;
    }

    const setupListener = async () => {
      // Double-check after async gap
      if (isMessageListenerSetupRef.current) {
        return;
      }

      try {
        // Clean up any existing listener first
        if (messageListenerUnlistenRef.current) {
          messageListenerUnlistenRef.current();
          messageListenerUnlistenRef.current = null;
        }

        const unlistenFn = await listen<Message>('socket:social/message_pushed', async (event) => {
          const newMessage = event.payload;

          // Get current selected conversation
          const currentSelectedConversation = selectedConversationRef.current;

          // Play notification sound if user is recipient and conversation is not currently open
          const isCurrentConversationOpen =
            currentSelectedConversation && newMessage.conversation_id === currentSelectedConversation._id;
          if (newMessage.sender_id !== currentUserId && !isCurrentConversationOpen) {
            // Play notification sound for new messages in other conversations if general notifications are enabled
            const generalEnabled = settings?.whisperNotificationsEnabled ?? true;
            if (generalEnabled) {
              const volume = settings?.whisperNotificationVolume ?? 70;
              playNotificationSound(volume);
            }
          }
        });

        messageListenerUnlistenRef.current = unlistenFn;
        isMessageListenerSetupRef.current = true;
      } catch (error) {
        console.error('Failed to set up chat message notification listener:', error);
        isMessageListenerSetupRef.current = false;
      }
    };

    setupListener();

    return () => {
      // Cleanup: unlisten when component unmounts or dependencies change
      if (messageListenerUnlistenRef.current) {
        messageListenerUnlistenRef.current();
        messageListenerUnlistenRef.current = null;
        isMessageListenerSetupRef.current = false;
      }
    };
  }, [currentUserId, settings?.whisperNotificationsEnabled, settings?.whisperNotificationVolume]);
};
