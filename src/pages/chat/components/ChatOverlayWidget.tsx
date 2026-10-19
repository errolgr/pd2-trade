import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
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
import { Conversation, Message } from '@/common/types/pd2-website/ChatTypes';
import { setBadgeCount, usePanel } from '@/overlay';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';
import { cn } from '@/lib/utils';
import { MessageContent } from './MessageContent';
import { findMarketLinks, messagePreview } from '../lib/market-links';
import { useChatListings, type ChatListingState } from '../hooks/useChatListings';
import { EMPTY_THREAD, totalUnreadCount, useChatStore, type ChatMessage } from '../hooks/useChatStore';
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

/** Scrolling within this distance of the top of a thread loads the previous page. */
const LOAD_OLDER_THRESHOLD_PX = 120;
/** Scrolled within this distance of the bottom counts as "pinned": growing rows keep the latest message in view. */
const PINNED_THRESHOLD_PX = 80;

interface MessageRow {
  message: ChatMessage;
  /** Stable across the server ack of an own send. */
  key: string;
  startsDay: boolean;
  continuesGroup: boolean;
}

function buildRows(messages: ChatMessage[]): MessageRow[] {
  return messages.map((message, index) => {
    const previous = index > 0 ? messages[index - 1] : null;
    const startsDay = !previous || !moment(message.created_at).isSame(previous.created_at, 'day');
    const continuesGroup =
      !!previous &&
      !startsDay &&
      previous.sender_id === message.sender_id &&
      moment(message.created_at).diff(previous.created_at, 'minutes') < 5;
    return { message, key: message.clientId ?? message._id, startsDay, continuesGroup };
  });
}

/** A panel-requested conversation that is not in the list yet; `reloaded` once the list was refetched for it. */
interface ConversationRequest {
  conversationId: string;
  version: number;
  reloaded: boolean;
}

export default function ChatOverlayWidget({ onClose }: ChatOverlayWidgetProps) {
  const {
    authData,
    subscribeSocket,
    getConversations,
    getMessages,
    sendMessage,
    markMessagesAsRead,
    deleteConversation,
  } = usePd2Website();
  // keepMounted panel: payload is undefined until the first openPanel('chat', ...)
  const { payload, payloadVersion, visible } = usePanel<'chat'>();
  const { settings } = useOptions();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  const api = useMemo(
    () => ({ getConversations, getMessages, sendMessage, markMessagesAsRead, deleteConversation }),
    [getConversations, getMessages, sendMessage, markMessagesAsRead, deleteConversation],
  );
  const chat = useChatStore({
    currentUserId,
    api,
    subscribeSocket,
    // Messages count as read only while their conversation is actually on screen
    viewingConversationId: visible ? selectedConversationId : null,
    onIncomingMessage: (_message, viewing) => {
      // Whisper sound for messages outside the conversation on screen, if enabled
      if (viewing || !(settings?.whisperNotificationsEnabled ?? true)) return;
      playNotificationSound(settings?.whisperNotificationVolume ?? 70);
    },
  });
  const { conversations, loadingConversations, conversationsLoaded, loadConversations, loadMessages, loadOlder } = chat;

  const selectedConversation = conversations.find((c) => c._id === selectedConversationId) ?? null;
  const thread = (selectedConversation && chat.threads[selectedConversation._id]) || EMPTY_THREAD;
  const messages = thread.messages;

  // Listings linked in the open conversation render as item cards.
  const linkedListingIds = useMemo(
    () => messages.flatMap((message) => findMarketLinks(message.content).map((link) => link.listingId)),
    [messages],
  );
  const listings = useChatListings(linkedListingIds);

  const totalUnread = totalUnreadCount(conversations);

  // Chat button badge
  useEffect(() => {
    setBadgeCount('chatUnread', totalUnread);
  }, [totalUnread]);

  // Fetch conversations on mount and when user is available
  // Guard on authData.accessToken to ensure we have a token before making API calls
  useEffect(() => {
    if (currentUserId && authData?.accessToken) {
      loadConversations();
    }
  }, [currentUserId, authData?.accessToken, loadConversations]);

  // Select the conversation requested by openPanel('chat', { conversationId, conversation }) (every open
  // bumps payloadVersion, so re-opening on the same conversation re-selects it). Adjusted during render.
  const [handledPayloadVersion, setHandledPayloadVersion] = useState(0);
  const [request, setRequest] = useState<ConversationRequest | null>(null);
  if (payloadVersion !== handledPayloadVersion) {
    setHandledPayloadVersion(payloadVersion);
    const conversationId = payload?.conversationId;
    const newConversation = payload?.conversation as Conversation | undefined;
    if (conversationId && newConversation) {
      // A freshly created conversation (e.g. "Start chat" on an offer): inject it into the list and select it
      chat.upsertConversation({
        _id: newConversation._id,
        participant_ids: newConversation.participant_ids,
        created_at: newConversation.created_at,
        updated_at: newConversation.updated_at,
        created_by_id: newConversation.created_by_id,
        unread_count: 0, // New conversation has no unread messages
        participants: newConversation.participants || [],
        latest_message: undefined, // No messages yet
      });
      setSelectedConversationId(conversationId);
      setRequest(null);
    } else if (conversationId) {
      // Otherwise select an existing conversation, once the list has (or a reload brought) it
      setRequest({ conversationId, version: payloadVersion, reloaded: false });
    }
  }
  if (request) {
    if (conversations.some((c) => c._id === request.conversationId)) {
      setSelectedConversationId(request.conversationId);
      setRequest(null);
    } else if (request.reloaded && !loadingConversations) {
      setRequest(null); // Unknown even after a reload: give up
    }
  }
  // Unknown conversation: reload the list once
  const reloadedForVersionRef = useRef<number | null>(null);
  useEffect(() => {
    if (!request || !conversationsLoaded || loadingConversations) return;
    if (reloadedForVersionRef.current === request.version) return;
    reloadedForVersionRef.current = request.version;
    const { version } = request;
    loadConversations().then(() => setRequest((r) => (r?.version === version ? { ...r, reloaded: true } : r)));
  }, [request, conversationsLoaded, loadingConversations, loadConversations]);

  // Load messages when a conversation is selected (cached messages show meanwhile)
  useEffect(() => {
    if (selectedConversationId) loadMessages(selectedConversationId);
  }, [selectedConversationId, loadMessages]);

  // Focus the composer when a conversation is opened (Input is not a forwardRef component)
  const composerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedConversationId) composerRef.current?.querySelector('input')?.focus();
  }, [selectedConversationId]);

  // Variable-height virtual message list. anchorTo 'end' keeps the reading position when older pages are
  // prepended and keeps the latest message in view while pinned to the bottom (listing cards load and grow).
  const rows = useMemo(() => buildRows(messages), [messages]);
  // eslint-disable-next-line react-hooks/incompatible-library -- no React Compiler; the virtualizer re-renders us
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () =>
      messagesContainerRef.current?.querySelector<HTMLDivElement>('[data-slot="scroll-area-viewport"]') ?? null,
    estimateSize: (index) =>
      60 + (rows[index].startsDay ? 28 : 0) + (index === 0 ? 0 : rows[index].continuesGroup ? 4 : 12),
    getItemKey: (index) => rows[index].key,
    overscan: 8,
    paddingStart: 12,
    paddingEnd: 12,
    anchorTo: 'end',
    scrollEndThreshold: PINNED_THRESHOLD_PX,
  });

  // Scroll to the bottom when a message is appended (not when older pages are prepended)
  const lastRowKey = rows.at(-1)?.key;
  useEffect(() => {
    if (lastRowKey) virtualizer.scrollToEnd();
  }, [lastRowKey, virtualizer]);

  const handleMessagesScroll = useCallback(
    (e: React.UIEvent) => {
      const el = e.target as HTMLElement;
      if (el.dataset.slot !== 'scroll-area-viewport' || !selectedConversationId) return;
      if (el.scrollTop < LOAD_OLDER_THRESHOLD_PX) loadOlder(selectedConversationId);
    },
    [selectedConversationId, loadOlder],
  );

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

  // Send message: it shows right away as a pending bubble; a failure stays on it with a retry
  const handleSend = () => {
    const content = messageInput.trim();
    if (!content || !selectedConversation || !currentUserId) return;
    setMessageInput('');
    chat.send(selectedConversation._id, content);
  };

  // Handle Enter key to send message (ignored while an IME composition is active)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // Delete/archive conversation
  const handleDeleteConversation = async (conversationId: string) => {
    if (await chat.deleteConversation(conversationId)) {
      setSelectedConversationId((current) => (current === conversationId ? null : current));
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
                  {totalUnread > 0 && (
                    <motion.span
                      key="unread"
                      variants={popIn}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="rounded-full bg-success px-2 py-0.5 text-xs font-semibold tabular-nums text-success-foreground"
                      title={`${totalUnread} unread`}
                    >
                      {totalUnread}
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
                          onClick={() => {
                            setSelectedConversationId(conversation._id);
                            setRequest(null);
                          }}
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
                                {latestMessage.sender_id === currentUserId && (
                                  <ReadReceipt
                                    message={latestMessage}
                                    readerId={otherParticipant?._id}
                                    className="shrink-0"
                                  />
                                )}
                                <span
                                  className={cn(
                                    'truncate text-xs',
                                    isUnread ? 'text-foreground/90' : 'text-muted-foreground',
                                  )}
                                >
                                  {messagePreview(latestMessage.content)}
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
                <div className="relative flex min-h-0 flex-1 flex-col">
                  <ScrollArea
                    className="min-h-0 flex-1 overflow-hidden [&_[data-radix-scroll-area-viewport]>div]:!block"
                    ref={messagesContainerRef}
                    onScrollCapture={handleMessagesScroll}
                  >
                    {messages.length === 0 && thread.loading ? (
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
                      <div className="relative w-full"
                        style={{ height: virtualizer.getTotalSize() }}>
                        {virtualizer.getVirtualItems().map((item) => {
                          const row = rows[item.index];
                          return (
                            <div
                              key={item.key}
                              ref={virtualizer.measureElement}
                              data-index={item.index}
                              className={cn(
                                'absolute left-0 top-0 w-full px-4',
                                row.continuesGroup ? 'pt-1' : item.index === 0 ? '' : 'pt-3',
                              )}
                              style={{ transform: `translateY(${item.start}px)` }}
                            >
                              <MessageRowView
                                row={row}
                                isOwnMessage={row.message.sender_id === currentUserId}
                                readerId={selectedParticipant?._id}
                                listings={listings}
                                onRetry={chat.retry}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                  {thread.loadingOlder && (
                    <div aria-busy
                      className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
                      <span className="flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                        <Loader2 className="size-3.5 animate-spin" />
                        Loading older messages...
                      </span>
                    </div>
                  )}
                </div>

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
                  <Button onClick={handleSend}
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

/** Own messages: double check once `readerId` (the other participant) has read it, else a single check. */
function ReadReceipt({ message, readerId, className }: { message: Message; readerId?: string; className?: string }) {
  return readerId && message.reader_ids?.includes(readerId) ? (
    <CheckCheck aria-label="Read"
      className={cn('size-3 text-info', className)} />
  ) : (
    <Check aria-label="Sent"
      className={cn('size-3 text-muted-foreground', className)} />
  );
}

function MessageRowView({
  row,
  isOwnMessage,
  readerId,
  listings,
  onRetry,
}: {
  row: MessageRow;
  isOwnMessage: boolean;
  readerId?: string;
  listings: ReadonlyMap<string, ChatListingState>;
  onRetry: (conversationId: string, clientId: string) => void;
}) {
  const { message, startsDay } = row;
  return (
    // Only messages that arrive while open animate in; history (and rows virtualized back in) appear as-is
    <motion.div variants={fadeInUp}
      initial={message.live ? 'hidden' : false}
      animate="visible">
      {startsDay && (
        <div className="mb-3 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {formatDayLabel(message.created_at)}
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
      <div className={cn('flex', isOwnMessage ? 'justify-end' : 'justify-start')}>
        <div
          aria-busy={message.status === 'sending' || undefined}
          className={cn(
            'max-w-[70%] rounded-2xl border px-3.5 py-2 text-foreground shadow-sm transition-opacity duration-(--dur-med)',
            isOwnMessage ? 'rounded-br-md border-primary/15 bg-primary/15' : 'rounded-bl-md border-transparent bg-card',
            message.status === 'sending' && 'opacity-60',
            message.status === 'failed' && 'border-destructive/40',
          )}
        >
          <MessageContent content={message.content}
            listings={listings} />
          <div className="mt-0.5 flex items-center justify-end gap-1">
            {message.status === 'failed' && message.clientId ? (
              <span className="text-[11px] text-destructive">
                Failed ·{' '}
                <button
                  type="button"
                  onClick={() => onRetry(message.conversation_id, message.clientId!)}
                  className="rounded-sm font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  Retry
                </button>
              </span>
            ) : (
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {moment(message.created_at).format('h:mm A')}
              </span>
            )}
            {isOwnMessage && !message.status && <ReadReceipt message={message}
              readerId={readerId} />}
          </div>
        </div>
      </div>
    </motion.div>
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
