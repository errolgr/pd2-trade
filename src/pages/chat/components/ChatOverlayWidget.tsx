import React, { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, MessageSquare, Send, Plus, Search, Check, CheckCheck, Smile, Paperclip, Mic, MoreVertical, Video, Phone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { usePd2Website } from "@/hooks/pd2website/usePD2Website";
import { useSocket } from "@/hooks/pd2website/useSocket";
import { Conversation, Message, ConversationListResponse, MessageListResponse } from "@/common/types/pd2-website/ChatTypes";
import { Badge } from "@/components/ui/badge";
import moment from "moment";
import { cn } from "@/lib/utils";
import { MessageContent } from "./MessageContent";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ChatOverlayWidgetProps {
  onClose: () => void;
}

export default function ChatOverlayWidget({ onClose }: ChatOverlayWidgetProps) {
  const { authData } = usePd2Website();
  const { isConnected, getConversations, getMessages, socket } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Get current user ID
  const currentUserId = authData?.user?._id;

  // Fetch conversations on mount and when connected
  useEffect(() => {
    if (isConnected && currentUserId) {
      loadConversations();
    }
  }, [isConnected, currentUserId]);

  // Load conversations
  const loadConversations = async () => {
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      const response = await getConversations(currentUserId);
      // Filter out conversations without a latest message
      const conversationsWithMessages = (response.data || []).filter(
        (conv) => conv.latest_message
      );
      setConversations(conversationsWithMessages);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load messages when a conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation._id);
    }
  }, [selectedConversation]);

  // Load messages for a conversation
  const loadMessages = async (conversationId: string) => {
    setLoading(true);
    try {
      const response = await getMessages(conversationId);
      setMessages(response.data || []);
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get the other participant in a conversation
  const getOtherParticipant = (conversation: Conversation) => {
    if (!currentUserId) return null;
    return conversation.participants.find(p => p._id !== currentUserId);
  };

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
    return moment(timestamp).format("h:mm A");
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Send message
  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || !socket) return;

    try {
      // TODO: Implement sending message via socket
      // For now, just clear the input
      setMessageInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  // Handle Enter key to send message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="w-screen h-screen shadow-2xl bg-neutral-900 border-neutral-700 rounded-none">
      {/* Top Bar */}
      <div
        data-tauri-drag-region
        id="titlebar-drag-handle"
        className="flex items-center justify-end border-b border-neutral-700 bg-neutral-800 p-2"
      >
        {!isConnected && (
          <Badge variant="destructive" className="text-xs mr-2">
            Disconnected
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex h-[calc(100vh-3rem)]">
        {/* Conversations List */}
        <div className="w-80 border-r border-neutral-700 bg-neutral-900 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-neutral-700">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-white">Chats</h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-neutral-800 hover:bg-neutral-700"
              >
                <Plus className="h-5 w-5 text-neutral-300" />
              </Button>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Chats search..."
                className="pl-9 bg-neutral-800 border-neutral-700 text-neutral-200 placeholder:text-neutral-500"
              />
            </div>
          </div>

          {/* Conversations */}
          <ScrollArea className="flex-1">
            {loading && conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-400">
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-400">
                No conversations
              </div>
            ) : (
              <div>
                {conversations.map((conversation) => {
                  const otherParticipant = getOtherParticipant(conversation);
                  const displayName = otherParticipant?.display_name || otherParticipant?.username || "Unknown";
                  const latestMessage = conversation.latest_message;
                  const isSelected = selectedConversation?._id === conversation._id;
                  
                  return (
                    <button
                      key={conversation._id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={cn(
                        "w-full text-left p-3 transition-colors border-b border-neutral-800",
                        isSelected
                          ? "bg-neutral-800"
                          : "hover:bg-neutral-800"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <Avatar className="h-12 w-12 shrink-0">
                          <AvatarFallback className="bg-neutral-700 text-neutral-300">
                            {getInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm text-white truncate">
                              {displayName}
                            </span>
                            {latestMessage && (
                              <span className="text-xs text-neutral-400 ml-2 shrink-0">
                                {formatConversationTime(latestMessage.created_at)}
                              </span>
                            )}
                          </div>
                          {latestMessage && (
                            <div className="flex items-center gap-1">
                              {latestMessage.sender_id === currentUserId && (
                                <CheckCheck className="h-3 w-3 text-green-500 shrink-0" />
                              )}
                              <span className="text-xs text-neutral-400 truncate">
                                {(() => {
                                  // Check if message contains a market listing URL
                                  const urlMatch = latestMessage.content.match(/https?:\/\/www\.projectdiablo2\.com\/market\/listing\/([a-f0-9]+)(?:\?display=([^"\s]+|"[^"]+"))?/i);
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
          </ScrollArea>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col bg-neutral-900">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b border-neutral-700 bg-neutral-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {(() => {
                        const otherParticipant = getOtherParticipant(selectedConversation);
                        const displayName = otherParticipant?.display_name || otherParticipant?.username || "Unknown";
                        return (
                          <AvatarFallback className="bg-neutral-700 text-neutral-300">
                            {getInitials(displayName)}
                          </AvatarFallback>
                        );
                      })()}
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-white">
                        {(() => {
                          const otherParticipant = getOtherParticipant(selectedConversation);
                          return otherParticipant?.display_name || otherParticipant?.username || "Unknown";
                        })()}
                      </h3>
                      <p className="text-xs text-green-500">Online</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-300 hover:text-white hover:bg-neutral-700">
                      <Video className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-300 hover:text-white hover:bg-neutral-700">
                      <Phone className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-300 hover:text-white hover:bg-neutral-700">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 bg-neutral-900" ref={messagesContainerRef}>
                <div className="p-4 space-y-3">
                  {messages.map((message) => {
                    const isOwnMessage = message.sender_id === currentUserId;
                    return (
                      <div
                        key={message._id}
                        className={cn(
                          "flex",
                          isOwnMessage ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg px-4 py-2",
                            isOwnMessage
                              ? "bg-neutral-700 text-white"
                              : "bg-neutral-800 text-white"
                          )}
                        >
                          <MessageContent content={message.content} isOwnMessage={isOwnMessage} />
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            <span className="text-xs text-neutral-400">
                              {formatMessageTime(message.created_at)}
                            </span>
                            {isOwnMessage && (
                              <CheckCheck className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-neutral-700 bg-neutral-800">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-300 hover:text-white hover:bg-neutral-700">
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-300 hover:text-white hover:bg-neutral-700">
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter message..."
                    className="flex-1 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
                  />
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-neutral-300 hover:text-white hover:bg-neutral-700">
                    <Mic className="h-5 w-5" />
                  </Button>
                  <Button 
                    onClick={sendMessage} 
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
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

