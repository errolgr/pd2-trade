import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { MotionConfig } from 'framer-motion';
import { MessageSquare, MessagesSquare } from 'lucide-react';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { Badge } from '@/components/ui/badge';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import type { Conversation } from '@/common/types/pd2-website/ChatTypes';
import { setBadgeCount, usePanel } from '@/overlay';
import { EmptyState } from '@/pages/currency/components/StatePanel';
import poeWhisperSound from '@/assets/poe_whisper.mp3';
import { findMarketLinks } from '../lib/market-links';
import { useChatListings } from '../hooks/useChatListings';
import { EMPTY_THREAD, totalUnreadCount, useChatStore } from '../hooks/useChatStore';
import { otherParticipant, participantName } from './chat-parts';
import { Composer, type TemplateVars } from './Composer';
import { ConversationList } from './ConversationList';
import { MessageList } from './MessageList';
import { ThreadDeals } from './ThreadDeals';
import { ThreadHeader } from './ThreadHeader';

interface ChatOverlayWidgetProps {
  onClose: () => void;
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
  // Unsent text per conversation; the panel stays mounted while hidden, so drafts survive hiding it
  const [drafts, setDrafts] = useState<Record<string, string>>({});

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
  const signedIn = !!authData?.accessToken;

  const selectedConversation = conversations.find((c) => c._id === selectedConversationId) ?? null;
  const selectedParticipant = selectedConversation ? otherParticipant(selectedConversation, currentUserId) : undefined;
  const selectedName = participantName(selectedParticipant);
  const thread = (selectedConversation && chat.threads[selectedConversation._id]) || EMPTY_THREAD;
  const messages = thread.messages;

  // Listings linked in the open conversation render as item cards.
  const linkedListingIds = useMemo(
    () => messages.flatMap((message) => findMarketLinks(message.content).map((link) => link.listingId)),
    [messages],
  );
  const listings = useChatListings(linkedListingIds);

  // Template tokens: the other side's account and the most recently linked listing in the thread
  const latestListing = linkedListingIds
    .map((id) => listings.get(id))
    .findLast((state) => state?.status === 'listed' || state?.status === 'unlisted');
  const linkedListing = latestListing && 'listing' in latestListing ? latestListing.listing : undefined;
  const accountName = selectedParticipant?.game?.accounts?.[0];
  const templateVars = useMemo<TemplateVars>(
    () => ({
      accountName,
      itemName: linkedListing?.item.name,
      price: linkedListing
        ? linkedListing.hr_price > 0
          ? `${linkedListing.hr_price} HR`
          : linkedListing.price
        : undefined,
    }),
    [accountName, linkedListing],
  );

  const totalUnread = totalUnreadCount(conversations);

  // Chat button badge
  useEffect(() => {
    setBadgeCount('chatUnread', totalUnread);
  }, [totalUnread]);

  // Fetch conversations on mount and when user is available
  // Guard on authData.accessToken to ensure we have a token before making API calls
  useEffect(() => {
    if (currentUserId && signedIn) {
      loadConversations();
    }
  }, [currentUserId, signedIn, loadConversations]);

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

  // Focus the composer when a conversation is opened
  const composerRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (selectedConversationId) composerRef.current?.focus();
  }, [selectedConversationId]);

  // Delete/archive conversation
  const handleDeleteConversation = async (conversationId: string) => {
    if (await chat.deleteConversation(conversationId)) {
      setSelectedConversationId((current) => (current === conversationId ? null : current));
      setDrafts((current) => {
        const next = { ...current };
        delete next[conversationId];
        return next;
      });
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <WindowPanel animate
        className="relative z-10 h-full w-full">
        {/* Top Bar (WindowChrome is the panel drag handle) */}
        <div id="titlebar-drag-handle">
          <WindowChrome
            title="PD2 Chat"
            icon={<MessageSquare className="text-primary" />}
            onClose={onClose}
            closeLabel="Close chat"
            actions={
              !signedIn && (
                <Badge variant="destructive"
                  className="mr-1 text-xs">
                  Not authenticated
                </Badge>
              )
            }
          />
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ConversationList
            conversations={conversations}
            currentUserId={currentUserId}
            selectedId={selectedConversation?._id ?? null}
            onSelect={(conversationId) => {
              setSelectedConversationId(conversationId);
              setRequest(null);
            }}
            loading={loadingConversations}
            failed={chat.conversationsFailed}
            signedIn={signedIn}
            onReload={loadConversations}
          />

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                <ThreadHeader
                  participant={selectedParticipant}
                  onDelete={() => handleDeleteConversation(selectedConversation._id)}
                />
                <div className="shrink-0 bg-background/30">
                  <ThreadDeals
                    otherUserId={selectedParticipant?._id}
                    listingIds={linkedListingIds}
                    onCounter={(text) => {
                      setDrafts((current) => ({ ...current, [selectedConversation._id]: text }));
                      composerRef.current?.focus();
                    }}
                  />
                </div>
                <MessageList
                  conversationId={selectedConversation._id}
                  thread={thread}
                  currentUserId={currentUserId}
                  readerId={selectedParticipant?._id}
                  otherName={selectedName}
                  listings={listings}
                  onRetry={chat.retry}
                  onLoadOlder={loadOlder}
                  onReload={loadMessages}
                />
                <Composer
                  key={selectedConversation._id}
                  ref={composerRef}
                  value={drafts[selectedConversation._id] ?? ''}
                  onChange={(text) => setDrafts((current) => ({ ...current, [selectedConversation._id]: text }))}
                  // Shows right away as a pending bubble; a failure stays on it with a retry
                  onSend={(text) => chat.send(selectedConversation._id, text)}
                  placeholder={`Message ${selectedName}...`}
                  templateVars={templateVars}
                />
              </>
            ) : (
              <EmptyState
                className="m-auto max-w-sm"
                icon={<MessagesSquare />}
                title="Select a conversation to view messages"
                description={conversations.length > 0 ? 'Pick a chat on the left.' : undefined}
              />
            )}
          </section>
        </div>
      </WindowPanel>
    </MotionConfig>
  );
}
