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
import { useOptions } from '@/hooks/useOptions';
import { useChatContext } from '@/contexts/ChatContext';

interface ChatOverlayWidgetProps {
  onClose: () => void;
}

export default function ChatOverlayWidget({ onClose }: ChatOverlayWidgetProps) {
  const { authData, deleteConversation: deleteConversationApi, sendMessage: sendMessageApi } = usePd2Website();
  const { isConnected } = useSocket();
  const { settings } = useOptions();
  const {
    conversations,
    selectedConversation,
    setSelectedConversation,
    messagesCache,
    markUnreadMessagesAsRead: markUnreadMessagesAsReadContext,
    loadMessages: loadMessagesContext,
    loadConversations,
    updateConversations,
    setOnNewMessage,
  } = useChatContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const selectedConversationRef = useRef<Conversation | null>(null);
  const loadConversationsRef = useRef<(() => Promise<void>) | null>(null);

  // Get current user ID
  const currentUserId = authData?.user?._id;

  // Keep ref in sync with context state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Set up callback to receive new messages from context
  useEffect(() => {
    setOnNewMessage((newMessage: Message) => {
      // Only update local messages state if this message is for the currently open conversation
      if (selectedConversation?._id === newMessage.conversation_id) {
        setMessages((prev) => {
          // Check if message already exists in state (defensive check)
          if (prev.some((m) => m._id === newMessage._id)) {
            return prev; // Return previous state to avoid re-render
          }
          return [...prev, newMessage]; // Only add the new message
        });
      }
    });

    return () => {
      setOnNewMessage(undefined);
    };
  }, [selectedConversation, setOnNewMessage]);
  // Load messages for a conversation
  const loadMessages = useCallback(
    async (conversationId: string) => {
      // Always set loading to true when switching conversations
      setLoadingMessages(true);

      // Check cache first - show cached messages immediately for better UX
      const cachedMessages = messagesCache.current.get(conversationId);
      if (cachedMessages && cachedMessages.length > 0) {
        // Use setTimeout to ensure loading state is visible briefly
        setTimeout(() => {
          setMessages(cachedMessages);
          setLoadingMessages(false);
          // Mark unread messages as read
          markUnreadMessagesAsReadContext(cachedMessages, conversationId);
          // Scroll to bottom after messages load
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }, 50);
      }

      // Load messages from context (which handles API fetch and cache merge)
      try {
        const mergedMessages = await loadMessagesContext(conversationId);

        // Update state (only if we didn't already show cached messages, or if merged is different)
        if (!cachedMessages || cachedMessages.length === 0 || mergedMessages.length !== cachedMessages.length) {
          setMessages(mergedMessages);
          setLoadingMessages(false);

          // Scroll to bottom after messages load
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } catch (error) {
        console.error('[ChatOverlayWidget] Failed to load messages:', error);
        // If we have cached messages, keep showing them even if API fails
        if (!cachedMessages || cachedMessages.length === 0) {
          setLoadingMessages(false);
        }
      }
    },
    [loadMessagesContext, markUnreadMessagesAsReadContext],
  );

  // Wrapper for loadConversations that also sets loading state
  const loadConversationsWithLoading = useCallback(async () => {
    setLoadingConversations(true);
    try {
      await loadConversations();
    } finally {
      setLoadingConversations(false);
    }
  }, [loadConversations]);

  // Fetch conversations on mount and when user is available
  useEffect(() => {
    if (currentUserId) {
      loadConversationsWithLoading();
    }
  }, [currentUserId, loadConversationsWithLoading]);

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
              updateConversations((prev) => {
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
              updateConversations((prev) => {
                if (prev.length === 0) {
                  // If conversations aren't loaded yet, wait a bit and try again
                  setTimeout(() => {
                    updateConversations((current) => {
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
                        updateConversations((current) => {
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
    if (newUnreadMessages.length > 0 && selectedConversation) {
      markUnreadMessagesAsReadContext(newUnreadMessages, selectedConversation._id).then(() => {
        // Update local messages state to reflect read status
        const updatedMessages = messages.map((message) => {
          const cachedMessages = messagesCache.current.get(selectedConversation._id);
          const cachedMessage = cachedMessages?.find((m) => m._id === message._id);
          return cachedMessage || message;
        });
        setMessages(updatedMessages);
      });
    }
  }, [messages, selectedConversation, currentUserId, markUnreadMessagesAsReadContext]);

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
      const cachedMessages = messagesCache.current.get(conversationId) || [];
      messagesCache.current.set(conversationId, [...cachedMessages, newMessage]);

      // Update messages state
      setMessages((prev) => [...prev, newMessage]);

      // Update conversation's latest_message in the conversations list
      updateConversations((prev) => {
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
      if (selectedConversation && selectedConversation._id === conversationId) {
        setSelectedConversation({
          ...selectedConversation,
          latest_message: newMessage,
          updated_at: newMessage.created_at,
        });
      }

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
      updateConversations((prev) => prev.filter((conv) => conv._id !== conversationId));

      // Clear messages from cache
      messagesCache.current.delete(conversationId);

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
    <Card className="w-full h-full shadow-2xl bg-neutral-900 border-neutral-700 rounded-sm relative z-10 opacity-90 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div
        data-drag-handle
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
