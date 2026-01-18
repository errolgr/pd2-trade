import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Conversation, Message } from '@/common/types/pd2-website/ChatTypes';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { emit, listen } from '@/lib/browser-events';
import { playNotificationSound } from '@/lib/notification-sound';

interface ChatContextType {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  setSelectedConversation: (conversation: Conversation | null) => void;
  messagesCache: React.MutableRefObject<Map<string, Message[]>>;
  markUnreadMessagesAsRead: (messages: Message[], conversationId: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<Message[]>;
  loadConversations: () => Promise<void>;
  updateConversations: (updater: (prev: Conversation[]) => Conversation[]) => void;
  totalUnreadCount: number;
  setOnNewMessage: (callback: ((message: Message) => void) | undefined) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { authData, getConversations, getMessages, markMessagesAsRead } = usePd2Website();
  const { settings } = useOptions();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  const selectedConversationRef = useRef<Conversation | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const messageListenerUnlistenRef = useRef<(() => void) | null>(null);
  const isMessageListenerSetupRef = useRef<boolean>(false);
  const onNewMessageCallbackRef = useRef<((message: Message) => void) | undefined>(undefined);
  const currentUserId = authData?.user?._id;

  // Keep ref in sync with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Set up socket message listener for processing incoming messages
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

          // Atomic de-duping check: prevent duplicate processing
          if (processedMessagesRef.current.has(newMessage._id)) {
            return;
          }

          // Mark as processed immediately to prevent duplicate processing
          processedMessagesRef.current.add(newMessage._id);

          // Clean up old message IDs (keep only last 500)
          if (processedMessagesRef.current.size > 500) {
            const idsArray = Array.from(processedMessagesRef.current);
            processedMessagesRef.current = new Set(idsArray.slice(-500));
          }

          // Play notification sound if user is recipient and conversation is not currently open
          const isCurrentConversationOpen =
            selectedConversationRef.current && newMessage.conversation_id === selectedConversationRef.current._id;
          if (newMessage.sender_id !== currentUserId && !isCurrentConversationOpen) {
            // Play notification sound for new messages in other conversations if general notifications are enabled
            const generalEnabled = settings?.whisperNotificationsEnabled ?? true;
            if (generalEnabled) {
              const volume = settings?.whisperNotificationVolume ?? 70;
              playNotificationSound(volume);
            }
          }

          // Update conversations list (but only update what changed to avoid flickering)
          try {
            const response = await getConversations(currentUserId);
            const conversationsWithMessages = (response.data || []).filter((conv) => conv.latest_message);

            // Only update conversations list if something actually changed
            setConversations((prev) => {
              // Check if the list actually changed
              const hasChanges =
                conversationsWithMessages.length !== prev.length ||
                conversationsWithMessages.some((newConv) => {
                  const oldConv = prev.find((c) => c._id === newConv._id);
                  if (!oldConv) return true; // New conversation
                  // Check if unread_count or latest_message changed
                  return (
                    oldConv.unread_count !== newConv.unread_count ||
                    oldConv.latest_message?._id !== newConv.latest_message?._id
                  );
                });

              if (!hasChanges) {
                return prev;
              }

              return conversationsWithMessages;
            });
          } catch (error) {
            console.error('[ChatContext] Failed to refresh conversations:', error);
          }

          // Always add the new message to the cache for its conversation
          const conversationId = newMessage.conversation_id;
          const cachedMessagesForConversation = messagesCacheRef.current.get(conversationId) || [];
          const messageExistsInCache = cachedMessagesForConversation.some((m) => m._id === newMessage._id);

          if (!messageExistsInCache) {
            // Add message to cache
            const updatedCachedMessages = [...cachedMessagesForConversation, newMessage];
            messagesCacheRef.current.set(conversationId, updatedCachedMessages);

            // Check if this conversation is currently open
            const isCurrentConversationOpen = selectedConversationRef.current?._id === conversationId;

            // If this conversation is currently open, mark as read if user is recipient
            if (isCurrentConversationOpen && newMessage.sender_id !== currentUserId) {
              try {
                await markMessagesAsRead([newMessage._id], currentUserId);

                // Update message with read status in cache
                const readUpdatedMessages = updatedCachedMessages.map((m) => {
                  if (m._id === newMessage._id) {
                    return {
                      ...m,
                      reader_ids: [...(m.reader_ids || []), currentUserId],
                    };
                  }
                  return m;
                });
                messagesCacheRef.current.set(conversationId, readUpdatedMessages);

                // Update conversation unread_count
                setConversations((prev) =>
                  prev.map((conv) => {
                    if (conv._id === conversationId && conv.unread_count > 0) {
                      const newUnreadCount = Math.max(0, conv.unread_count - 1);
                      const updatedConv = {
                        ...conv,
                        unread_count: newUnreadCount,
                      };
                      // Also update the selected conversation state if it matches
                      if (selectedConversationRef.current?._id === conversationId) {
                        setSelectedConversation(updatedConv);
                      }
                      return updatedConv;
                    }
                    return conv;
                  }),
                );
              } catch (error) {
                console.error('[ChatContext] Failed to mark new message as read:', error);
              }
            }

            // Notify callback if set (for components to update their local state)
            if (onNewMessageCallbackRef.current) {
              onNewMessageCallbackRef.current(newMessage);
            }
          }
        });

        messageListenerUnlistenRef.current = unlistenFn;
        isMessageListenerSetupRef.current = true;
      } catch (error) {
        console.error('[ChatContext] Failed to set up socket message listener:', error);
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
  }, [
    currentUserId,
    getConversations,
    markMessagesAsRead,
    settings?.whisperNotificationsEnabled,
    settings?.whisperNotificationVolume,
  ]);

  // Expose callback setter
  const setOnNewMessage = useCallback((callback: ((message: Message) => void) | undefined) => {
    onNewMessageCallbackRef.current = callback;
  }, []);

  // Mark unread messages as read
  const markUnreadMessagesAsRead = useCallback(
    async (messages: Message[], conversationId: string) => {
      if (!currentUserId) return;

      // Find messages that:
      // 1. Are sent by the other participant (user is recipient)
      // 2. Haven't been read by the current user yet
      const unreadMessageIds = messages
        .filter((message) => {
          // User is recipient if they didn't send the message
          const isRecipient = message.sender_id !== currentUserId;
          // Check if message hasn't been read by current user
          const isUnread = !message.reader_ids?.includes(currentUserId);
          return isRecipient && isUnread;
        })
        .map((message) => message._id);

      console.log('[ChatContext] Found unread messages:', {
        unreadMessageIds,
        count: unreadMessageIds.length,
        conversationId,
        messages: messages.map((m) => ({
          id: m._id,
          sender_id: m.sender_id,
          reader_ids: m.reader_ids,
          isRecipient: m.sender_id !== currentUserId,
          isUnread: !m.reader_ids?.includes(currentUserId),
        })),
      });

      if (unreadMessageIds.length > 0) {
        try {
          await markMessagesAsRead(unreadMessageIds, currentUserId);

          // Update the messages in cache to reflect read status
          const cachedMessages = messagesCacheRef.current.get(conversationId);
          if (cachedMessages) {
            const updatedMessages = cachedMessages.map((message) => {
              if (unreadMessageIds.includes(message._id)) {
                return {
                  ...message,
                  reader_ids: [...(message.reader_ids || []), currentUserId],
                };
              }
              return message;
            });
            messagesCacheRef.current.set(conversationId, updatedMessages);
          }

          // Update conversation unread_count
          setConversations((prev) => {
            const updated = prev.map((conv) => {
              if (conv._id === conversationId) {
                const oldUnreadCount = conv.unread_count || 0;
                const newUnreadCount = Math.max(0, oldUnreadCount - unreadMessageIds.length);
                console.log('[ChatContext] Updating conversation unread_count:', {
                  conversationId: conv._id,
                  oldUnreadCount,
                  newUnreadCount,
                  decrementBy: unreadMessageIds.length,
                });
                const updatedConv = {
                  ...conv,
                  unread_count: newUnreadCount,
                };
                // Also update the selected conversation state if it matches
                if (selectedConversationRef.current?._id === conversationId) {
                  setSelectedConversation(updatedConv);
                }
                return updatedConv;
              }
              return conv;
            });
            console.log(
              '[ChatContext] Updated conversations list:',
              updated.map((c) => ({
                id: c._id,
                unread_count: c.unread_count,
              })),
            );
            return updated;
          });
        } catch (error) {
          console.error('[ChatContext] Failed to mark messages as read:', error);
        }
      } else {
        console.log('[ChatContext] No unread messages to mark as read');
      }
    },
    [currentUserId, markMessagesAsRead],
  );

  // Load messages for a conversation
  const loadMessages = useCallback(
    async (conversationId: string): Promise<Message[]> => {
      // Check cache first
      const cachedMessages = messagesCacheRef.current.get(conversationId);
      if (cachedMessages && cachedMessages.length > 0) {
        // Mark unread messages as read
        await markUnreadMessagesAsRead(cachedMessages, conversationId);
      }

      // Always fetch from API to ensure we have the latest messages, then merge with cache
      try {
        const response = await getMessages(conversationId);
        const apiMessages = response.data || [];

        // Merge API messages with cached messages (API messages take precedence, but keep any newer cached messages)
        const messageMap = new Map<string, Message>();

        // First, add all API messages
        apiMessages.forEach((msg) => {
          messageMap.set(msg._id, msg);
        });

        // Then, add any cached messages that aren't in the API response (newer messages from socket)
        if (cachedMessages) {
          cachedMessages.forEach((msg) => {
            if (!messageMap.has(msg._id)) {
              messageMap.set(msg._id, msg);
            }
          });
        }

        // Sort by created_at
        const mergedMessages = Array.from(messageMap.values()).sort((a, b) => {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        // Update cache with merged messages
        messagesCacheRef.current.set(conversationId, mergedMessages);

        // Mark unread messages as read
        await markUnreadMessagesAsRead(mergedMessages, conversationId);

        return mergedMessages;
      } catch (error) {
        console.error('[ChatContext] Failed to load messages:', error);
        // Return cached messages if available, otherwise empty array
        return cachedMessages || [];
      }
    },
    [getMessages, markUnreadMessagesAsRead],
  );

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const response = await getConversations(currentUserId);
      // Filter out conversations without a latest message
      const conversationsWithMessages = (response.data || []).filter((conv) => conv.latest_message);

      setConversations(conversationsWithMessages);
    } catch (error) {
      console.error('[ChatContext] Failed to load conversations:', error);
    }
  }, [currentUserId, getConversations]);

  // Update conversations with a function (for external updates)
  const updateConversations = useCallback((updater: (prev: Conversation[]) => Conversation[]) => {
    setConversations(updater);
  }, []);

  // Calculate total unread count
  const totalUnreadCount = useMemo(() => {
    const total = conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0);
    return total;
  }, [conversations]);

  // Emit unread count update whenever it changes
  useEffect(() => {
    emit('chat-unread-count-updated', { count: totalUnreadCount });
  }, [totalUnreadCount]);

  // Fetch conversations on mount and when user is available
  useEffect(() => {
    if (currentUserId) {
      loadConversations();
    }
  }, [currentUserId, loadConversations]);

  const value: ChatContextType = {
    conversations,
    selectedConversation,
    setSelectedConversation,
    messagesCache: messagesCacheRef,
    markUnreadMessagesAsRead,
    loadMessages,
    loadConversations,
    updateConversations,
    totalUnreadCount,
    setOnNewMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

/**
 * Hook to access chat context
 * @throws Error if used outside ChatProvider
 */
export const useChatContext = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
