import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Search, Check, CheckCheck, MoreVertical, Trash2, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useSocket } from '@/hooks/pd2website/useSocket';
import { Conversation, Message } from '@/common/types/pd2-website/ChatTypes';
import { listen, emit } from '@/lib/browser-events';
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
  const {
    authData,
    deleteConversation: deleteConversationApi,
    getConversations,
    getMessages,
    sendMessage: sendMessageApi,
    markMessagesAsRead,
  } = usePd2Website();
  const { isConnected } = useSocket();
  const { settings } = useOptions();
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
  const messageListenerUnlistenRef = useRef<(() => void) | null>(null);
  const isMessageListenerSetupRef = useRef<boolean>(false);

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

  // Listen for conversation selection event
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unlisten = await listen<{ conversationId: string; conversation?: any }>(
          'select-chat-conversation',
          async (event) => {
            const { conversationId, conversation: newConversation } = event.payload;

            // If a new conversation object was provided, inject it into the list
            if (newConversation) {
              // Format the conversation to match the Conversation type
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

              // Check if conversation already exists in the list
              setConversations((prev) => {
                const exists = prev.some((c) => c._id === conversationId);
                if (exists) {
                  // Update existing conversation
                  return prev.map((c) => (c._id === conversationId ? formattedConversation : c));
                } else {
                  // Add new conversation to the beginning of the list
                  return [formattedConversation, ...prev];
                }
              });

              // Select the conversation
              setSelectedConversation(formattedConversation);
              return;
            }

            // If no new conversation object provided, try to find existing one
            if (!newConversation) {
              // Wait for conversations to be loaded
              setConversations((prev) => {
                if (prev.length === 0) {
                  // If conversations aren't loaded yet, wait a bit and try again
                  setTimeout(() => {
                    setConversations((current) => {
                      const conversation = current.find((c) => c._id === conversationId);
                      if (conversation) {
                        setSelectedConversation(conversation);
                      }
                      return current;
                    });
                  }, 500);
                  return prev;
                }

                // Find and select the conversation
                const conversation = prev.find((c) => c._id === conversationId);
                if (conversation) {
                  setSelectedConversation(conversation);
                } else {
                  // If conversation not found, reload conversations and try again
                  if (loadConversationsRef.current) {
                    loadConversationsRef.current().then(() => {
                      setTimeout(() => {
                        setConversations((current) => {
                          const foundConversation = current.find((c) => c._id === conversationId);
                          if (foundConversation) {
                            setSelectedConversation(foundConversation);
                          }
                          return current;
                        });
                      }, 500);
                    });
                  }
                }
                return prev;
              });
            }
          },
        );
      } catch (error) {
        console.error('Failed to set up select-chat-conversation listener:', error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [currentUserId]);

  // Listen for new messages from socket
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

          // Update conversations list (but only update what changed to avoid flickering)
          if (currentUserId) {
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
              console.error('Failed to refresh conversations:', error);
            }
          }

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

        messageListenerUnlistenRef.current = unlistenFn;
        isMessageListenerSetupRef.current = true;
      } catch (error) {
        console.error('Failed to set up socket message listener:', error);
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
    playNotificationSound,
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

  // Load messages when a conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      const conversationId = selectedConversation._id;

      // Only reload if it's a different conversation (not just an update to the same one)
      if (lastLoadedConversationIdRef.current !== conversationId) {
        lastLoadedConversationIdRef.current = conversationId;
        // Clear messages immediately when switching conversations to show loading state
        setMessages([]);
        loadMessages(conversationId);
      } else {
        // Same conversation, just an update (e.g., unread_count changed from push message)
        // Don't reload messages, just update the ref
      }
    } else {
      // Clear messages when no conversation is selected
      lastLoadedConversationIdRef.current = null;
      setMessages([]);
    }
  }, [selectedConversation, loadMessages]);

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
    if (!searchQuery.trim()) {
      return conversations;
    }

    const query = searchQuery.toLowerCase().trim();

    return conversations.filter((conversation) => {
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

  // Handle Enter key to send message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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

  return (
    <Card className="w-screen h-screen shadow-2xl bg-neutral-900 border-neutral-700 rounded-sm relative z-10 opacity-90 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div
        data-tauri-drag-region
        id="titlebar-drag-handle"
        className="flex items-center justify-end border-b border-neutral-700 bg-neutral-800 flex-shrink-0"
      >
        {!isConnected && (
          <Badge variant="destructive"
            className="text-xs mr-2">
            Disconnected
          </Badge>
        )}
        <Button variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 cursor-pointer">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 border-r border-neutral-700 bg-neutral-900 flex flex-col min-h-0 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-neutral-700 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-white">Chats</h1>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-neutral-800 border-neutral-700 text-neutral-200 placeholder:text-neutral-500"
              />
            </div>
          </div>

          {/* Conversations */}
          <ScrollArea className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full">
              {loadingConversations && conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-400 mb-2" />
                  <span className="text-sm text-neutral-400">Loading conversations...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-sm text-neutral-400">
                  {searchQuery.trim() ? 'No conversations match your search' : 'No conversations'}
                </div>
              ) : (
                <div>
                  {filteredConversations.map((conversation) => {
                    const otherParticipant = getOtherParticipant(conversation);
                    const displayName = otherParticipant?.display_name || otherParticipant?.username || 'Unknown';
                    const latestMessage = conversation.latest_message;
                    const isSelected = selectedConversation?._id === conversation._id;

                    return (
                      <button
                        key={conversation._id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={cn(
                          'w-full text-left p-3 transition-colors border-b border-neutral-800',
                          isSelected ? 'bg-neutral-800' : 'hover:bg-neutral-800',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-sm text-white truncate">{displayName}</span>
                              {latestMessage && (
                                <span className="text-xs text-neutral-400 ml-2 shrink-0">
                                  {formatConversationTime(latestMessage.created_at)}
                                </span>
                              )}
                            </div>
                            {latestMessage && (
                              <div className="flex items-center gap-1">
                                {(() => {
                                  // Show read receipt only for own messages
                                  if (latestMessage.sender_id === currentUserId) {
                                    const otherParticipant = getOtherParticipant(conversation);
                                    const otherParticipantId = otherParticipant?._id;
                                    const readerIds = latestMessage.reader_ids || [];

                                    // Check if the other participant has read the message
                                    const isRead = otherParticipantId && readerIds.includes(otherParticipantId);

                                    if (isRead) {
                                      // Double check = read
                                      return <CheckCheck className="h-3 w-3 text-blue-500 shrink-0" />;
                                    } else {
                                      // Single check = sent/delivered
                                      return <Check className="h-3 w-3 text-neutral-400 shrink-0" />;
                                    }
                                  }
                                  return null;
                                })()}
                                <span className="text-xs text-neutral-400 truncate">
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

                          {/* Unread Badge */}
                          {conversation.unread_count > 0 && (
                            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-green-500 text-white text-xs font-medium shrink-0">
                              {conversation.unread_count}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col bg-neutral-900 min-h-0 overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b border-neutral-700 bg-neutral-800 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold text-white">
                        {(() => {
                          const otherParticipant = getOtherParticipant(selectedConversation);
                          return otherParticipant?.display_name || otherParticipant?.username || 'Unknown';
                        })()}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-neutral-300 hover:text-white hover:bg-neutral-700"
                          type="button"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        side="bottom"
                        sideOffset={5}
                        className="bg-neutral-800 border-neutral-700"
                      >
                        <DropdownMenuItem
                          onSelect={() => handleDeleteConversation(selectedConversation._id)}
                          className="text-red-400 focus:text-red-300 focus:bg-neutral-700 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Conversation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 min-h-0 bg-neutral-900 overflow-hidden"
                ref={messagesContainerRef}>
                <div className="h-full">
                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center p-8 h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-neutral-400 mb-2" />
                      <span className="text-sm text-neutral-400">Loading messages...</span>
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {messages.map((message) => {
                        const isOwnMessage = message.sender_id === currentUserId;

                        // Determine read receipt status for own messages
                        let readReceiptIcon = null;
                        if (isOwnMessage && selectedConversation) {
                          const otherParticipant = getOtherParticipant(selectedConversation);
                          const otherParticipantId = otherParticipant?._id;
                          const readerIds = message.reader_ids || [];

                          // Check if the other participant has read the message
                          const isRead = otherParticipantId && readerIds.includes(otherParticipantId);

                          if (isRead) {
                            // Double check = read
                            readReceiptIcon = <CheckCheck className="h-3 w-3 text-blue-500" />;
                          } else {
                            // Single check = sent/delivered
                            readReceiptIcon = <Check className="h-3 w-3 text-neutral-400" />;
                          }
                        }

                        return (
                          <div key={message._id}
                            className={cn('flex', isOwnMessage ? 'justify-end' : 'justify-start')}>
                            <div
                              className={cn(
                                'max-w-[70%] rounded-lg px-4 py-2',
                                isOwnMessage ? 'bg-neutral-700 text-white' : 'bg-neutral-800 text-white',
                              )}
                            >
                              <MessageContent content={message.content}
                                isOwnMessage={isOwnMessage} />
                              <div className="flex items-center gap-1 mt-1 justify-end">
                                <span className="text-xs text-neutral-400">
                                  {formatMessageTime(message.created_at)}
                                </span>
                                {readReceiptIcon}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-2 border-t border-neutral-700 bg-neutral-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter message..."
                    className="flex-1 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
                  />

                  <Button onClick={sendMessage}
                    size="sm">
                    Send
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-400">
              Select a conversation to view messages
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
