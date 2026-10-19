import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { MotionConfig } from 'framer-motion';
import { MessageSquare, MessagesSquare } from 'lucide-react';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { Badge } from '@/components/ui/badge';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { useWhisperHistory } from '@/hooks/useWhisperHistory';
import type { Conversation } from '@/common/types/pd2-website/ChatTypes';
import { writeText } from '@/lib/browser-clipboard';
import { isOpenTrade, unreadWhispers, whisperTarget } from '@/lib/whisper-history';
import { setBadgeCount, showToast, usePanel } from '@/overlay';
import { EmptyState } from '@/pages/currency/components/StatePanel';
import poeWhisperSound from '@/assets/poe_whisper.mp3';
import { findMarketLinks } from '../lib/market-links';
import { buildInbox, buildTimeline, type InboxFilter, type InboxThread } from '../lib/inbox';
import { participantAccounts, whisperThreadId } from '../lib/identity';
import { useChatListings } from '../hooks/useChatListings';
import { EMPTY_THREAD, useChatStore } from '../hooks/useChatStore';
import { Composer, type ReplyChannel, type TemplateVars } from './Composer';
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

/** Open trade whispers are re-evaluated (they stop being pinned after a day) this often. */
const CLOCK_TICK_MS = 60_000;

/**
 * The thread `id` names, also after it was merged or split: a whisper-only thread whose sender got linked to a
 * website user, or an offers-only thread (`user:<id>`) that gained a conversation.
 */
const findThread = (threads: InboxThread[], id: string | null) =>
  id === null
    ? undefined
    : (threads.find((t) => t.id === id) ??
      threads.find((t) => t.people.some((p) => whisperThreadId(p.key) === id) || `user:${t.userId}` === id));

export default function ChatOverlayWidget({ onClose }: ChatOverlayWidgetProps) {
  const {
    authData,
    subscribeSocket,
    getConversations,
    getMessages,
    sendMessage,
    markMessagesAsRead,
    deleteConversation,
    createConversation,
    incomingOffers,
    outgoingOffers,
    hiddenOutgoingOffers,
  } = usePd2Website();
  const whispers = useWhisperHistory();
  const { markRead: markWhispersRead, recordCopied } = whispers;
  // keepMounted panel: payload is undefined until the first openPanel('chat', ...)
  const { payload, payloadVersion, visible } = usePanel<'chat'>();
  const { settings } = useOptions();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>('all');
  // Unsent text per thread; the panel stays mounted while hidden, so drafts survive hiding it
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Reply channel picked per thread (default: website when it reaches them, else whisper)
  const [channels, setChannels] = useState<Record<string, ReplyChannel>>({});
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

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
    // Messages count as read only while their conversation is actually on screen (thread ids of website
    // conversations are the conversation ids; other threads match no conversation)
    viewingConversationId: visible ? selectedThreadId : null,
    onIncomingMessage: (_message, viewing) => {
      // Whisper sound for messages outside the conversation on screen, if enabled
      if (viewing || !(settings?.whisperNotificationsEnabled ?? true)) return;
      playNotificationSound(settings?.whisperNotificationVolume ?? 70);
    },
  });
  const { conversations, loadingConversations, conversationsLoaded, loadConversations, loadMessages, loadOlder } = chat;
  const signedIn = !!authData?.accessToken;

  const threads = useMemo(
    () =>
      buildInbox({
        conversations,
        currentUserId,
        people: whispers.people,
        offers: [...incomingOffers, ...outgoingOffers],
        now,
      }),
    [conversations, currentUserId, whispers.people, incomingOffers, outgoingOffers, now],
  );
  const selectedThread = useMemo(() => findThread(threads, selectedThreadId), [threads, selectedThreadId]);
  // The open thread merged into another (its sender got linked, or a conversation with them appeared): follow
  // it, so the conversation on screen counts as viewed (mark-read, no sound) and its draft and reply channel
  // carry over. Adjusted during render; the re-render happens before anything commits.
  if (selectedThread && selectedThreadId !== null && selectedThread.id !== selectedThreadId) {
    const from = selectedThreadId;
    const to = selectedThread.id;
    setSelectedThreadId(to);
    setDrafts(({ [from]: draft, ...rest }) => (draft === undefined || rest[to] ? rest : { ...rest, [to]: draft }));
    setChannels(({ [from]: picked, ...rest }) => (picked === undefined || rest[to] ? rest : { ...rest, [to]: picked }));
  }
  const conversation = selectedThread?.conversation;
  const participant = selectedThread?.participant;
  const websiteThread = (conversation && chat.threads[conversation._id]) || EMPTY_THREAD;
  const { messages: websiteMessages, hasOlder: websiteHasOlder } = websiteThread;
  const people = selectedThread?.people;
  const entries = useMemo(
    () => buildTimeline(websiteMessages, people ?? [], currentUserId, websiteHasOlder),
    [websiteMessages, websiteHasOlder, people, currentUserId],
  );

  // Listings linked in the open thread render as item cards.
  const linkedListingIds = useMemo(
    () => entries.flatMap((entry) => findMarketLinks(entry.content).map((link) => link.listingId)),
    [entries],
  );
  const listings = useChatListings(linkedListingIds);

  // Whom a whisper reaches: their whisper sender, else their registered (or offer) account
  const person = people?.[0];
  const whisperAccount = person
    ? whisperTarget(person)
    : participantAccounts(participant)[0] || selectedThread?.offers.find((o) => o.accountName)?.accountName;
  const openTrades = (people ?? []).flatMap((p) =>
    p.trades.filter((trade) => isOpenTrade(trade, now)).map((trade) => ({ person: p, trade })),
  );
  const websiteReachable = signedIn && !!(conversation || selectedThread?.userId);
  const channel: ReplyChannel =
    whisperAccount && (!websiteReachable || channels[selectedThread?.id ?? ''] === 'whisper') ? 'whisper' : 'website';

  // Template tokens: their account and the most recently linked listing (or their latest trade whisper)
  const latestListing = linkedListingIds
    .map((id) => listings.get(id))
    .findLast((state) => state?.status === 'listed' || state?.status === 'unlisted');
  const linkedListing = latestListing && 'listing' in latestListing ? latestListing.listing : undefined;
  const latestTrade = openTrades.at(-1)?.trade;
  const templateVars = useMemo<TemplateVars>(
    () => ({
      accountName: whisperAccount,
      characterName: person?.characterName,
      itemName: linkedListing?.item.name ?? latestTrade?.itemName,
      price: linkedListing
        ? linkedListing.hr_price > 0
          ? `${linkedListing.hr_price} HR`
          : linkedListing.price
        : latestTrade?.price,
    }),
    [whisperAccount, person?.characterName, linkedListing, latestTrade?.itemName, latestTrade?.price],
  );

  const totalUnread = threads.reduce((total, thread) => total + thread.unread, 0);

  // Chat button badge: website and whisper unread
  useEffect(() => {
    setBadgeCount('chatUnread', totalUnread);
  }, [totalUnread]);

  // Whispers in the thread on screen are read
  const unreadWhisperKeys =
    visible && people
      ? people
          .filter((p) => unreadWhispers(p) > 0)
          .map((p) => p.key)
          .join('\n')
      : '';
  useEffect(() => {
    if (unreadWhisperKeys) markWhispersRead(unreadWhisperKeys.split('\n'));
  }, [unreadWhisperKeys, markWhispersRead]);

  // Fetch conversations on mount and when user is available
  // Guard on authData.accessToken to ensure we have a token before making API calls
  useEffect(() => {
    if (currentUserId && signedIn) {
      loadConversations();
    }
  }, [currentUserId, signedIn, loadConversations]);

  // Apply openPanel('chat', { conversationId, conversation, filter }) (every open bumps payloadVersion, so
  // re-opening on the same conversation re-selects it). Adjusted during render.
  const [handledPayloadVersion, setHandledPayloadVersion] = useState(0);
  const [request, setRequest] = useState<ConversationRequest | null>(null);
  if (payloadVersion !== handledPayloadVersion) {
    setHandledPayloadVersion(payloadVersion);
    const conversationId = payload?.conversationId;
    const newConversation = payload?.conversation as Conversation | undefined;
    // A requested conversation shows in the full list; a filter (offers hotkey) applies as asked
    if (payload?.filter) setFilter(payload.filter);
    else if (conversationId) setFilter('all');
    if (conversationId && newConversation) {
      // A freshly created conversation: inject it into the list and select it
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
      setSelectedThreadId(conversationId);
      setRequest(null);
    } else if (conversationId) {
      // Otherwise select an existing conversation, once the list has (or a reload brought) it
      setRequest({ conversationId, version: payloadVersion, reloaded: false });
    }
  }
  if (request) {
    if (conversations.some((c) => c._id === request.conversationId)) {
      setSelectedThreadId(request.conversationId);
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
  const selectedConversationId = conversation?._id;
  useEffect(() => {
    if (selectedConversationId) loadMessages(selectedConversationId);
  }, [selectedConversationId, loadMessages]);

  // Focus the composer when a thread is opened
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const openedThreadId = selectedThread?.id;
  useEffect(() => {
    if (openedThreadId) composerRef.current?.focus();
  }, [openedThreadId]);

  const clearDraft = (threadId: string) =>
    setDrafts((current) => {
      const next = { ...current };
      delete next[threadId];
      return next;
    });

  const handleDeleteConversation = async (conversationId: string) => {
    if (await chat.deleteConversation(conversationId)) {
      setSelectedThreadId((current) => (current === conversationId ? null : current));
      clearDraft(conversationId);
    }
  };

  /** Website message to the open thread's person; starts the conversation for an offers-only thread. */
  const sendWebsite = async (thread: InboxThread, text: string) => {
    if (thread.conversation) {
      chat.send(thread.conversation._id, text);
      return;
    }
    if (!thread.userId || !currentUserId) return;
    try {
      const created: Conversation = await createConversation([currentUserId, thread.userId]);
      chat.upsertConversation({ ...created, unread_count: 0, participants: created.participants || [] });
      setSelectedThreadId(created._id);
      chat.send(created._id, text);
    } catch (error) {
      console.error('Failed to start chat:', error);
      showToast({ title: 'Message not sent', description: "Couldn't start the conversation.", variant: 'error' });
    }
  };

  /** Copies `/w *<account> <text>` for the game chat and records it as an outgoing whisper. */
  const sendWhisper = async (target: { accountName?: string; playerName: string }, text: string) => {
    const account = target.accountName || target.playerName;
    try {
      await writeText(`/w *${account} ${text}`);
    } catch {
      showToast({ title: 'Whisper not copied', description: "Couldn't write to the clipboard.", variant: 'error' });
      return;
    }
    recordCopied(target, text);
    showToast({ title: 'Whisper copied', description: `Paste it into the game chat to send it to *${account}.` });
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
            threads={threads}
            filter={filter}
            onFilterChange={setFilter}
            selectedId={selectedThread?.id ?? null}
            onSelect={(threadId) => {
              setSelectedThreadId(threadId);
              setRequest(null);
            }}
            loading={loadingConversations}
            failed={chat.conversationsFailed}
            signedIn={signedIn}
            onReload={loadConversations}
          />

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {selectedThread ? (
              <>
                <ThreadHeader
                  name={selectedThread.name}
                  participant={participant}
                  account={whisperAccount}
                  inGameOnly={!selectedThread.userId}
                  characterName={people?.find((p) => p.characterName)?.characterName}
                  onDeleteConversation={conversation ? () => handleDeleteConversation(conversation._id) : undefined}
                  onForgetWhispers={
                    people && people.length > 0
                      ? () => {
                          people.forEach((p) => whispers.forget(p.key));
                          if (!selectedThread.userId) clearDraft(selectedThread.id);
                        }
                      : undefined
                  }
                />
                <div className="shrink-0 bg-background/30">
                  <ThreadDeals
                    offers={selectedThread.offers}
                    hiddenOffers={hiddenOutgoingOffers.filter(
                      (offer) => !!offer.userId && offer.userId === selectedThread.userId,
                    )}
                    whisperTrades={openTrades}
                    listingIds={linkedListingIds}
                    onCounter={(text) => {
                      setDrafts((current) => ({ ...current, [selectedThread.id]: text }));
                      composerRef.current?.focus();
                    }}
                    onSendWebsite={(text) => sendWebsite(selectedThread, text)}
                    onWhisper={(target, text) => void sendWhisper(target, text)}
                    onDismissTrade={(target, tradeId) => whispers.dismissTrade(target.key, tradeId)}
                  />
                </div>
                <MessageList
                  threadId={selectedThread.id}
                  entries={entries}
                  thread={websiteThread}
                  readerId={participant?._id}
                  otherName={selectedThread.name}
                  listings={listings}
                  onRetry={chat.retry}
                  onLoadOlder={loadOlder}
                  onReload={loadMessages}
                />
                <Composer
                  key={selectedThread.id}
                  ref={composerRef}
                  value={drafts[selectedThread.id] ?? ''}
                  onChange={(text) => setDrafts((current) => ({ ...current, [selectedThread.id]: text }))}
                  onSend={(text) => {
                    if (channel === 'website') {
                      // Shows right away as a pending bubble; a failure stays on it with a retry
                      void sendWebsite(selectedThread, text);
                    } else if (whisperAccount) {
                      void sendWhisper(person ?? { accountName: whisperAccount, playerName: whisperAccount }, text);
                    }
                  }}
                  placeholder={
                    channel === 'whisper' ? `Whisper *${whisperAccount}...` : `Message ${selectedThread.name}...`
                  }
                  templateVars={templateVars}
                  channel={channel}
                  onChannelChange={
                    websiteReachable && whisperAccount
                      ? (next) => setChannels((current) => ({ ...current, [selectedThread.id]: next }))
                      : undefined
                  }
                />
              </>
            ) : (
              <EmptyState
                className="m-auto max-w-sm"
                icon={<MessagesSquare />}
                title="Select a conversation to view messages"
                description={threads.length > 0 ? 'Pick a chat on the left.' : undefined}
              />
            )}
          </section>
        </div>
      </WindowPanel>
    </MotionConfig>
  );
}
