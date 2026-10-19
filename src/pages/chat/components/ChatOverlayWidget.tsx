import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  X,
  Search,
  SearchX,
  Check,
  CheckCheck,
  MoreVertical,
  Trash2,
  Loader2,
  MessageSquare,
  MessagesSquare,
  SendHorizontal,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { fadeIn, fadeInUp, listItem, listStagger, popIn } from '@/lib/motion';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useChatApi } from '@/hooks/pd2website/useChatApi';
import { Conversation, Message } from '@/common/types/pd2-website/ChatTypes';
import { setBadgeCount, usePanel } from '@/overlay';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';
import { cn } from '@/lib/utils';
import { MessageContent } from './MessageContent';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import poeWhisperSound from '@/assets/poe_whisper.mp3';
import { useOptions } from '@/hooks/useOptions';

interface ChatOverlayWidgetProps {
  onClose: () => void;
}

export default function ChatOverlayWidget({ onClose }: ChatOverlayWidgetProps) {
  const { authData, subscribeSocket } = usePd2Website();
  // keepMounted panel: payload is undefined until the first openPanel('chat', ...)
  const { payload, payloadVersion } = usePanel<'chat'>();
  const { settings } = useOptions();
  const {
    deleteConversation: deleteConversationApi,
    getConversations,
    getMessages,
    sendMessage: sendMessageApi,
    markMessagesAsRead,
  } = useChatApi(authData?.accessToken);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  const messagesRef = useRef<Message[]>([]);
  const selectedConversationRef = useRef<Conversation | null>(null);
  const loadConversationsRef = useRef<(() => Promise<void>) | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());

  // Get current user ID
  const currentUserId = authData?.user?._id;

  // Play notification sound
  const playNotificationSound = useCallback((volume: number = 70) => {
    try {
      const audio = new Audio(poeWhisperSound);
      audio.volume = volume / 100; // Convert 0-100 to 0-1
      audio.play().catch((error) => {
        console.error('Failed to play notification sound:', error);
      });
    } catch (error) {
      console.error('Failed to create audio element:', error);
    }
  }, []);

  // Mark unread messages as read
  const markUnreadMessagesAsRead = useCallback(
    async (messages: Message[]) => {
      if (!currentUserId) return;

      // Use ref to get the latest selected conversation
      const currentSelectedConversation = selectedConversationRef.current;
      if (!currentSelectedConversation) return;

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

      console.log('[ChatOverlayWidget] Found unread messages:', {
        unreadMessageIds,
        count: unreadMessageIds.length,
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

          // Update the messages in cache and state to reflect read status
          const updatedMessages = messages.map((message) => {
            if (unreadMessageIds.includes(message._id)) {
              return {
                ...message,
                reader_ids: [...(message.reader_ids || []), currentUserId],
              };
            }
            return message;
          });

          // Update cache
          messagesCacheRef.current.set(currentSelectedConversation._id, updatedMessages);

          // Update state
          setMessages(updatedMessages);

          // Update conversation unread_count
          setConversations((prev) => {
            const updated = prev.map((conv) => {
              if (conv._id === currentSelectedConversation._id) {
                const oldUnreadCount = conv.unread_count || 0;
                const newUnreadCount = Math.max(0, oldUnreadCount - unreadMessageIds.length);
                console.log('[ChatOverlayWidget] Updating conversation unread_count:', {
                  conversationId: conv._id,
                  oldUnreadCount,
                  newUnreadCount,
                  decrementBy: unreadMessageIds.length,
                });
                const updatedConv = {
                  ...conv,
                  unread_count: newUnreadCount,
                };
                // Also update the selected conversation state
                setSelectedConversation(updatedConv);
                return updatedConv;
              }
              return conv;
            });
            console.log(
              '[ChatOverlayWidget] Updated conversations list:',
              updated.map((c) => ({
                id: c._id,
                unread_count: c.unread_count,
              })),
            );
            return updated;
          });
        } catch (error) {
          console.error('Failed to mark messages as read:', error);
        }
      } else {
        console.log('[ChatOverlayWidget] No unread messages to mark as read');
      }
    },
    [currentUserId, markMessagesAsRead],
  );

  // Load messages for a conversation
  const loadMessages = useCallback(
    async (conversationId: string) => {
      // Always set loading to true when switching conversations
      setLoadingMessages(true);

      // Check cache first - show cached messages immediately for better UX
      const cachedMessages = messagesCacheRef.current.get(conversationId);
      if (cachedMessages && cachedMessages.length > 0) {
        // Use setTimeout to ensure loading state is visible briefly
        setTimeout(() => {
          setMessages(cachedMessages);
          setLoadingMessages(false);
          // Mark unread messages as read
          markUnreadMessagesAsRead(cachedMessages);
          // Scroll to bottom after messages load
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }, 50);
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

        // Update state (only if we didn't already show cached messages, or if merged is different)
        if (!cachedMessages || cachedMessages.length === 0 || mergedMessages.length !== cachedMessages.length) {
          setMessages(mergedMessages);
          setLoadingMessages(false);

          // Mark unread messages as read
          markUnreadMessagesAsRead(mergedMessages);

          // Scroll to bottom after messages load
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
        // If we have cached messages, keep showing them even if API fails
        if (!cachedMessages || cachedMessages.length === 0) {
          setLoadingMessages(false);
        }
      }
    },
    [getMessages, markUnreadMessagesAsRead],
  );

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;

    setLoadingConversations(true);
    try {
      const response = await getConversations(currentUserId);
      // Filter out conversations without a latest message
      const conversationsWithMessages = (response.data || []).filter((conv) => conv.latest_message);

      setConversations(conversationsWithMessages);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, [currentUserId, getConversations]);

  // Calculate total unread count
  const totalUnreadCount = React.useMemo(() => {
    const total = conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0);

    return total;
  }, [conversations]);

  // Chat button badge
  useEffect(() => {
    setBadgeCount('chatUnread', totalUnreadCount);
  }, [totalUnreadCount]);

  // Fetch conversations on mount and when user is available
  // Guard on authData.accessToken to ensure we have a token before making API calls
  useEffect(() => {
    console.log(
      '[ChatOverlay] Load conversations effect, currentUserId:',
      currentUserId,
      'hasAccessToken:',
      !!authData?.accessToken,
    );
    if (currentUserId && authData?.accessToken) {
      loadConversations();
    }
  }, [currentUserId, authData?.accessToken, loadConversations]);

  // Select the conversation requested by openPanel('chat', { conversationId, conversation }) (every open
  // bumps payloadVersion, so re-opening on the same conversation re-selects it)
  useEffect(() => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;
    const newConversation = payload.conversation as Conversation | undefined;

    // A freshly created conversation (e.g. "Start chat" on an offer): inject it into the list and select it
    if (newConversation) {
      const formattedConversation: Conversation = {
        _id: newConversation._id,
        participant_ids: newConversation.participant_ids,
        created_at: newConversation.created_at,
        updated_at: newConversation.updated_at,
        created_by_id: newConversation.created_by_id,
        unread_count: 0, // New conversation has no unread messages
        participants: newConversation.participants || [],
        latest_message: undefined, // No messages yet
      };
      setConversations((prev) =>
        prev.some((c) => c._id === conversationId)
          ? prev.map((c) => (c._id === conversationId ? formattedConversation : c))
          : [formattedConversation, ...prev],
      );
      setSelectedConversation(formattedConversation);
      return;
    }

    // Otherwise select an existing conversation, waiting for / reloading the list if needed
    const selectWhenLoaded = () =>
      setConversations((current) => {
        const conversation = current.find((c) => c._id === conversationId);
        if (conversation) setSelectedConversation(conversation);
        return current;
      });
    setConversations((prev) => {
      if (prev.length === 0) {
        // Conversations aren't loaded yet: try again shortly
        setTimeout(selectWhenLoaded, 500);
        return prev;
      }
      const conversation = prev.find((c) => c._id === conversationId);
      if (conversation) {
        setSelectedConversation(conversation);
      } else {
        // Unknown conversation: reload the list and try again
        loadConversationsRef.current?.().then(() => setTimeout(selectWhenLoaded, 500));
      }
      return prev;
    });
    // payload is read only when its version changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadVersion]);

  // New messages pushed by the PD2 socket
  useEffect(() => {
    if (!currentUserId) return;

    return subscribeSocket<Message>('social/message_pushed', (newMessage) => {
      // Atomic de-duping check: prevent duplicate processing
      // Check if this message has already been processed
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

      // Get current selected conversation before updating conversations list
      const currentSelectedConversation = selectedConversationRef.current;
      const currentSelectedConversationId = currentSelectedConversation?._id;

      // Update conversations list locally (avoid server call which can race with FIFO socket)
      const isFromOtherUser = newMessage.sender_id !== currentUserId;
      setConversations((prev) => {
        const existingConv = prev.find((c) => c._id === newMessage.conversation_id);
        if (existingConv) {
          const shouldIncrementUnread =
            isFromOtherUser && newMessage.conversation_id !== currentSelectedConversation?._id;
          return prev.map((conv) => {
            if (conv._id === newMessage.conversation_id) {
              return {
                ...conv,
                latest_message: newMessage,
                unread_count: shouldIncrementUnread ? (conv.unread_count || 0) + 1 : conv.unread_count,
              };
            }
            return conv;
          });
        } else if (isFromOtherUser) {
          // New conversation - reload from server
          if (loadConversationsRef.current) {
            loadConversationsRef.current();
          }
        }
        return prev;
      });

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

      // Always add the new message to the cache for its conversation (even if not currently open)
      const conversationId = newMessage.conversation_id;
      const cachedMessagesForConversation = messagesCacheRef.current.get(conversationId) || [];
      const messageExistsInCache = cachedMessagesForConversation.some((m) => m._id === newMessage._id);

      if (!messageExistsInCache) {
        // Add message to cache
        const updatedCachedMessages = [...cachedMessagesForConversation, newMessage];
        messagesCacheRef.current.set(conversationId, updatedCachedMessages);

        // If this conversation is currently open, also update the state
        if (isCurrentConversationOpen) {
          // Use functional update to only add the new message, avoiding full re-render
          setMessages((prev) => {
            // Check if message already exists in state (defensive check)
            if (prev.some((m) => m._id === newMessage._id)) {
              return prev; // Return previous state to avoid re-render
            }
            return [...prev, newMessage]; // Only add the new message
          });

          // Mark as read if user is recipient
          if (newMessage.sender_id !== currentUserId) {
            markMessagesAsRead([newMessage._id], currentUserId)
              .then(() => {
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

                // Update state only if message read status changed
                setMessages((prev) =>
                  prev.map((m) => {
                    if (m._id === newMessage._id && !m.reader_ids?.includes(currentUserId)) {
                      return {
                        ...m,
                        reader_ids: [...(m.reader_ids || []), currentUserId],
                      };
                    }
                    return m;
                  }),
                );

                // Update conversation unread_count (only update the specific conversation)
                // Use functional update to avoid unnecessary re-renders
                setConversations((prev) =>
                  prev.map((conv) => {
                    if (conv._id === conversationId && conv.unread_count > 0) {
                      const newUnreadCount = Math.max(0, conv.unread_count - 1);
                      const updatedConv = {
                        ...conv,
                        unread_count: newUnreadCount,
                      };
                      // Also update the selected conversation state if it matches (defer to avoid render during state update)
                      if (currentSelectedConversationId === conversationId) {
                        setTimeout(() => {
                          setSelectedConversation((prevSelected) => {
                            if (prevSelected?._id === conversationId) {
                              return { ...prevSelected, unread_count: newUnreadCount };
                            }
                            return prevSelected;
                          });
                        }, 0);
                      }
                      return updatedConv;
                    }
                    return conv;
                  }),
                );
              })
              .catch((error) => {
                console.error('Failed to mark new message as read:', error);
              });
          }
        }
      }
    });
  }, [
    currentUserId,
    subscribeSocket,
    markMessagesAsRead,
    settings?.whisperNotificationsEnabled,
    settings?.whisperNotificationVolume,
  ]);

  // Load conversations

  // Store loadConversations in ref
  useEffect(() => {
    loadConversationsRef.current = loadConversations;
  }, [loadConversations]);

  // Update refs when state changes
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Track the last loaded conversation ID to avoid reloading on push message updates
  const lastLoadedConversationIdRef = useRef<string | null>(null);

  // Track conversation ID separately to avoid re-fetching on object reference changes
  const selectedConversationId = selectedConversation?._id ?? null;

  // Load messages when a conversation is selected
  useEffect(() => {
    if (selectedConversationId) {
      if (lastLoadedConversationIdRef.current !== selectedConversationId) {
        lastLoadedConversationIdRef.current = selectedConversationId;
        // Clear messages immediately when switching conversations to show loading state
        setMessages([]);
      }
      loadMessages(selectedConversationId);
    } else {
      // Clear messages when no conversation is selected
      lastLoadedConversationIdRef.current = null;
      setMessages([]);
    }
  }, [selectedConversationId, loadMessages]);

  // Focus the composer when a conversation is opened (Input is not a forwardRef component)
  const composerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedConversationId) composerRef.current?.querySelector('input')?.focus();
  }, [selectedConversationId]);

  // Load messages for a conversation

  // Track the last message count to only scroll when a new message is added
  const lastMessageCountRef = useRef(0);

  // Scroll to bottom only when a new message is added (not on read status updates)
  useEffect(() => {
    // Only scroll if the message count increased (new message added)
    if (messages.length > lastMessageCountRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length]); // Only depend on length, not the entire messages array

  // Automatically mark new messages as read when they arrive while conversation is open
  useEffect(() => {
    if (!selectedConversation || !currentUserId || messages.length === 0) return;

    // Find new unread messages from the other participant
    const newUnreadMessages = messages.filter((message) => {
      // User is recipient if they didn't send the message
      const isRecipient = message.sender_id !== currentUserId;
      // Check if message hasn't been read by current user
      const isUnread = !message.reader_ids?.includes(currentUserId);
      return isRecipient && isUnread;
    });

    // Mark all new unread messages as read in a single batch
    if (newUnreadMessages.length > 0) {
      const unreadMessageIds = newUnreadMessages.map((m) => m._id);
      markMessagesAsRead(unreadMessageIds, currentUserId)
        .then(() => {
          // Update the messages in cache and state to reflect read status
          const updatedMessages = messages.map((message) => {
            if (unreadMessageIds.includes(message._id)) {
              return {
                ...message,
                reader_ids: [...(message.reader_ids || []), currentUserId],
              };
            }
            return message;
          });

          // Update cache
          messagesCacheRef.current.set(selectedConversation._id, updatedMessages);

          // Update state
          setMessages(updatedMessages);

          // Update conversation unread_count
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv._id === selectedConversation._id) {
                const newUnreadCount = Math.max(0, (conv.unread_count || 0) - unreadMessageIds.length);
                const updatedConv = {
                  ...conv,
                  unread_count: newUnreadCount,
                };
                // Also update the selected conversation state
                setSelectedConversation(updatedConv);
                return updatedConv;
              }
              return conv;
            }),
          );
        })
        .catch((error) => {
          console.error('Failed to mark new messages as read:', error);
        });
    }
  }, [messages, selectedConversation, currentUserId, markMessagesAsRead]);

  // Get the other participant in a conversation
  const getOtherParticipant = useCallback(
    (conversation: Conversation) => {
      if (!currentUserId) return null;
      return conversation.participants.find((p) => p._id !== currentUserId);
    },
    [currentUserId],
  );

  // Filter conversations based on search query
  const filteredConversations = React.useMemo(() => {
    let result = conversations;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      result = result.filter((conversation) => {
        // Search by participant name
        const otherParticipant = getOtherParticipant(conversation);
        const displayName = otherParticipant?.display_name || '';
        const username = otherParticipant?.username || '';
        const nameMatch = displayName.toLowerCase().includes(query) || username.toLowerCase().includes(query);

        // Search by latest message content
        const latestMessage = conversation.latest_message;
        const messageMatch = latestMessage?.content?.toLowerCase().includes(query) || false;

        return nameMatch || messageMatch;
      });
    }

    // Sort by latest message time (most recent first)
    return [...result].sort((a, b) => {
      const timeA = a.latest_message?.created_at ? new Date(a.latest_message.created_at).getTime() : 0;
      const timeB = b.latest_message?.created_at ? new Date(b.latest_message.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [conversations, searchQuery, getOtherParticipant]);

  // Format message time for conversation list
  const formatConversationTime = (timestamp: string) => {
    const now = moment();
    const msgTime = moment(timestamp);
    const diffMinutes = now.diff(msgTime, 'minutes');
    const diffDays = now.diff(msgTime, 'days');

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes`;
    if (diffDays === 0) return msgTime.format('h:mm A');
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days`;
    return msgTime.format('MMM D');
  };

  // Format message time for chat messages
  const formatMessageTime = (timestamp: string) => {
    return moment(timestamp).format('h:mm A');
  };

  // Send message
  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !currentUserId) return;

    const content = messageInput.trim();
    const conversationId = selectedConversation._id;

    // Clear input immediately for better UX
    setMessageInput('');

    try {
      const newMessage = await sendMessageApi(conversationId, content, currentUserId);

      // Add message to cache
      const cachedMessages = messagesCacheRef.current.get(conversationId) || [];
      messagesCacheRef.current.set(conversationId, [...cachedMessages, newMessage]);

      // Update messages state
      setMessages((prev) => [...prev, newMessage]);

      // Update conversation's latest_message in the conversations list
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              latest_message: newMessage,
              updated_at: newMessage.created_at,
            };
          }
          return conv;
        });

        // Sort conversations by latest message time (most recent first)
        return updated.sort((a, b) => {
          const aTime = a.latest_message?.created_at || a.updated_at || '';
          const bTime = b.latest_message?.created_at || b.updated_at || '';
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
      });

      // Update selected conversation state
      setSelectedConversation((prev) => {
        if (prev && prev._id === conversationId) {
          return {
            ...prev,
            latest_message: newMessage,
            updated_at: newMessage.created_at,
          };
        }
        return prev;
      });

      // Scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore input on error
      setMessageInput(content);
    }
  };

  // Handle Enter key to send message (ignored while an IME composition is active)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Delete/archive conversation
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversationApi(conversationId);

      // Remove conversation from list
      setConversations((prev) => prev.filter((conv) => conv._id !== conversationId));

      // Clear messages from cache
      messagesCacheRef.current.delete(conversationId);

      // If the deleted conversation was selected, clear selection
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const selectedParticipant = selectedConversation ? getOtherParticipant(selectedConversation) : null;
  const selectedName = selectedParticipant?.display_name || selectedParticipant?.username || 'Unknown';
  const selectedUsername =
    selectedParticipant?.username && selectedParticipant.username !== selectedName
      ? selectedParticipant.username
      : null;
  const hasSearch = searchQuery.trim().length > 0;
  const canSend = messageInput.trim().length > 0;

  return (
    <MotionConfig reducedMotion="user">
      <WindowPanel animate
        className="relative z-10 h-full w-full">
        {/* Top Bar (WindowChrome is the panel drag handle) */}
        <div id="titlebar-drag-handle">
          <WindowChrome
            title="PD2 Chat"
            icon={<MessageSquare />}
            titleClassName="text-muted-foreground"
            onClose={onClose}
            closeLabel="Close chat"
            actions={
              !authData?.accessToken && (
                <Badge variant="destructive"
                  className="mr-1 text-xs">
                  Not authenticated
                </Badge>
              )
            }
          />
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Conversations List */}
          <aside className="flex min-h-0 w-80 flex-col overflow-hidden border-r border-border bg-card/30">
            {/* Header */}
            <div className="flex-shrink-0 space-y-3 border-b border-border p-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Chats</h1>
                <AnimatePresence>
                  {totalUnreadCount > 0 && (
                    <motion.span
                      key="unread"
                      variants={popIn}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="rounded-full bg-success px-2 py-0.5 text-xs font-semibold tabular-nums text-success-foreground"
                      title={`${totalUnreadCount} unread`}
                    >
                      {totalUnreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              {/* Search */}
              <div className="group relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-(--dur-fast) group-focus-within:text-foreground" />
                <Input
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && searchQuery) {
                      e.preventDefault();
                      setSearchQuery('');
                    }
                  }}
                  className="pl-9 pr-8"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors duration-(--dur-fast) hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Conversations */}
            <ScrollArea className="min-h-0 flex-1 overflow-hidden [&_[data-radix-scroll-area-viewport]>div]:!block">
              <div className="h-full">
                {loadingConversations && conversations.length === 0 ? (
                  <div aria-busy
                    className="p-2">
                    <div className="flex items-center gap-2 px-2 pb-2 pt-1 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      <span>Loading conversations...</span>
                    </div>
                    {Array.from({ length: 5 }, (_, i) => (
                      <div key={i}
                        className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                        <Skeleton className="size-9 shrink-0 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between gap-4">
                            <Skeleton className="h-3.5 w-28" />
                            <Skeleton className="h-3 w-10" />
                          </div>
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <EmptyState
                    icon={hasSearch ? <SearchX /> : <MessagesSquare />}
                    title={hasSearch ? 'No conversations match your search' : 'No conversations'}
                    hint={
                      hasSearch
                        ? undefined
                        : authData?.accessToken
                          ? 'Start a chat from an offer in the Offers window.'
                          : 'Sign in to Project Diablo 2 in Settings → Account to chat.'
                    }
                    action={
                      hasSearch ? (
                        <Button variant="ghost"
                          size="sm"
                          onClick={() => setSearchQuery('')}>
                          Clear search
                        </Button>
                      ) : undefined
                    }
                  />
                ) : (
                  <motion.div className="space-y-0.5 p-2"
                    variants={listStagger}
                    initial="hidden"
                    animate="visible">
                    {filteredConversations.map((conversation) => {
                      const otherParticipant = getOtherParticipant(conversation);
                      const displayName = otherParticipant?.display_name || otherParticipant?.username || 'Unknown';
                      const latestMessage = conversation.latest_message;
                      const isSelected = selectedConversation?._id === conversation._id;
                      const isUnread = conversation.unread_count > 0;

                      return (
                        <motion.button
                          key={conversation._id}
                          layout="position"
                          variants={listItem}
                          type="button"
                          aria-current={isSelected ? 'true' : undefined}
                          onClick={() => setSelectedConversation(conversation)}
                          className={cn(
                            'group relative flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left outline-none',
                            'transition-colors duration-(--dur-fast) ease-out focus-visible:ring-2 focus-visible:ring-ring/60',
                            isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60 active:bg-accent',
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary transition-opacity duration-(--dur-med)',
                              isSelected ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <ChatAvatar name={displayName} />
                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center justify-between">
                              <span
                                className={cn(
                                  'truncate text-sm text-foreground',
                                  isUnread ? 'font-bold' : 'font-semibold',
                                )}
                              >
                                {displayName}
                              </span>
                              <div className="ml-2 flex shrink-0 items-center gap-1.5">
                                {isUnread && (
                                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-success px-1 text-[10px] font-semibold tabular-nums text-success-foreground">
                                    {conversation.unread_count}
                                  </span>
                                )}
                                {latestMessage && (
                                  <span
                                    className={cn(
                                      'text-xs tabular-nums',
                                      isUnread ? 'font-medium text-success' : 'text-muted-foreground',
                                    )}
                                  >
                                    {formatConversationTime(latestMessage.created_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {latestMessage && (
                              <div className="flex items-center gap-1">
                                {(() => {
                                  // Show read receipt only for own messages
                                  if (latestMessage.sender_id === currentUserId) {
                                    const otherParticipantId = otherParticipant?._id;
                                    const readerIds = latestMessage.reader_ids || [];

                                    // Check if the other participant has read the message
                                    const isRead = otherParticipantId && readerIds.includes(otherParticipantId);

                                    if (isRead) {
                                      // Double check = read
                                      return <CheckCheck aria-label="Read"
                                        className="size-3 shrink-0 text-info" />;
                                    }
                                    // Single check = sent/delivered
                                    return (
                                      <Check aria-label="Sent"
                                        className="size-3 shrink-0 text-muted-foreground" />
                                    );
                                  }
                                  return null;
                                })()}
                                <span
                                  className={cn(
                                    'truncate text-xs',
                                    isUnread ? 'text-foreground/90' : 'text-muted-foreground',
                                  )}
                                >
                                  {(() => {
                                    // Check if message contains a market listing URL
                                    const urlMatch = latestMessage.content.match(
                                      /https?:\/\/www\.projectdiablo2\.com\/market\/listing\/([a-f0-9]+)(?:\?display=([^"\s]+|"[^"]+"))?/i,
                                    );
                                    if (urlMatch) {
                                      const displayName = urlMatch[2]
                                        ? decodeURIComponent(urlMatch[2].replace(/^["']|["']$/g, ''))
                                        : null;
                                      return displayName ? `📦 ${displayName}` : '📦 Market Listing';
                                    }
                                    return latestMessage.content;
                                  })()}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </ScrollArea>
          </aside>

          {/* Messages Area */}
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border bg-card/40 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ChatAvatar name={selectedName} />
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold leading-tight text-foreground">{selectedName}</h3>
                      {selectedUsername && (
                        <p className="truncate text-xs text-muted-foreground">@{selectedUsername}</p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label="Conversation options"
                      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'data-[state=open]:bg-accent')}
                    >
                      <MoreVertical className="size-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end"
                      side="bottom"
                      sideOffset={5}>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => handleDeleteConversation(selectedConversation._id)}
                        className="cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                        Delete Conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Messages */}
                <ScrollArea className="min-h-0 flex-1 overflow-hidden"
                  ref={messagesContainerRef}>
                  <div className="h-full">
                    {loadingMessages ? (
                      <div aria-busy
                        className="space-y-3 p-4">
                        <div className="flex items-center justify-center gap-2 pb-1 text-sm text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" />
                          <span>Loading messages...</span>
                        </div>
                        {[
                          ['justify-start', 'w-52'],
                          ['justify-end', 'w-64'],
                          ['justify-start', 'w-40'],
                          ['justify-end', 'w-48'],
                        ].map(([align, width], i) => (
                          <div key={i}
                            className={cn('flex', align)}>
                            <Skeleton className={cn('h-14 rounded-2xl', width)} />
                          </div>
                        ))}
                      </div>
                    ) : messages.length === 0 ? (
                      <EmptyState
                        icon={<MessageSquare />}
                        title="No messages yet"
                        hint={`Say hi to ${selectedName}.`}
                        className="py-16"
                      />
                    ) : (
                      <div className="px-4 py-3">
                        <AnimatePresence initial={false}>
                          {messages.map((message, index) => {
                            const isOwnMessage = message.sender_id === currentUserId;
                            const previous = index > 0 ? messages[index - 1] : null;
                            const startsDay =
                              !previous || !moment(message.created_at).isSame(previous.created_at, 'day');
                            const continuesGroup =
                              !!previous &&
                              !startsDay &&
                              previous.sender_id === message.sender_id &&
                              moment(message.created_at).diff(previous.created_at, 'minutes') < 5;

                            // Determine read receipt status for own messages
                            let readReceiptIcon = null;
                            if (isOwnMessage) {
                              const otherParticipantId = selectedParticipant?._id;
                              const readerIds = message.reader_ids || [];

                              // Check if the other participant has read the message
                              const isRead = otherParticipantId && readerIds.includes(otherParticipantId);

                              readReceiptIcon = isRead ? (
                                // Double check = read
                                <CheckCheck aria-label="Read"
                                  className="size-3 text-info" />
                              ) : (
                                // Single check = sent/delivered
                                <Check aria-label="Sent"
                                  className="size-3 text-muted-foreground" />
                              );
                            }

                            return (
                              <motion.div
                                key={message._id}
                                variants={fadeInUp}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className={continuesGroup ? 'mt-1' : index === 0 ? '' : 'mt-3'}
                              >
                                {startsDay && (
                                  <div className="mb-3 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                    <span className="h-px flex-1 bg-border" />
                                    {formatDayLabel(message.created_at)}
                                    <span className="h-px flex-1 bg-border" />
                                  </div>
                                )}
                                <div className={cn('flex', isOwnMessage ? 'justify-end' : 'justify-start')}>
                                  <div
                                    className={cn(
                                      'max-w-[70%] rounded-2xl border px-3.5 py-2 text-foreground shadow-sm',
                                      isOwnMessage
                                        ? 'rounded-br-md border-primary/15 bg-primary/15'
                                        : 'rounded-bl-md border-transparent bg-card',
                                    )}
                                  >
                                    <MessageContent content={message.content}
                                      isOwnMessage={isOwnMessage} />
                                    <div className="mt-0.5 flex items-center justify-end gap-1">
                                      <span className="text-[11px] tabular-nums text-muted-foreground">
                                        {formatMessageTime(message.created_at)}
                                      </span>
                                      {readReceiptIcon}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div
                  ref={composerRef}
                  className="flex flex-shrink-0 items-center gap-2 border-t border-border bg-card/40 p-2.5"
                >
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter message..."
                    className="flex-1"
                  />
                  <Button onClick={sendMessage}
                    size="sm"
                    disabled={!canSend}
                    className="h-9 gap-1.5 px-3.5">
                    <SendHorizontal className="size-4" />
                    Send
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<MessagesSquare />}
                title="Select a conversation to view messages"
                hint={conversations.length > 0 ? 'Pick a chat on the left.' : undefined}
                className="flex-1"
              />
            )}
          </section>
        </div>
      </WindowPanel>
    </MotionConfig>
  );
}

const AVATAR_TINTS = [
  'bg-chart-1/20 text-chart-1',
  'bg-chart-2/20 text-chart-2',
  'bg-chart-3/20 text-chart-3',
  'bg-chart-4/20 text-chart-4',
  'bg-chart-5/20 text-chart-5',
] as const;

function ChatAvatar({ name }: { name: string }) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const tint = AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length];
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-sm font-semibold uppercase',
        tint,
      )}
    >
      {name.trim().charAt(0) || '?'}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className={cn('flex flex-col items-center justify-center gap-2 px-6 py-10 text-center', className)}
    >
      <span className="mb-1 flex size-11 items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground [&_svg]:size-5">
        {icon}
      </span>
      <p className="text-sm font-medium text-foreground/90">{title}</p>
      {hint && <p className="max-w-56 text-xs text-muted-foreground">{hint}</p>}
      {action}
    </motion.div>
  );
}

function formatDayLabel(timestamp: string) {
  const day = moment(timestamp);
  if (day.isSame(moment(), 'day')) return 'Today';
  if (day.isSame(moment().subtract(1, 'day'), 'day')) return 'Yesterday';
  return day.format('ddd, MMM D');
}
