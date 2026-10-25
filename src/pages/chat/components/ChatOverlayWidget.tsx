import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { MessageSquare, MessagesSquare } from 'lucide-react';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { Badge } from '@/components/ui/badge';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { useWhisperHistory } from '@/hooks/useWhisperHistory';
import type { Conversation } from '@/common/types/pd2-website/ChatTypes';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { writeText } from '@/lib/browser-clipboard';
import {
  changeChatPrefs,
  isThreadMuted,
  reconcileThreadPrefs,
  setThreadPrefs,
  useChatPrefs,
  type ThreadPrefs,
} from '@/lib/chat-prefs';
import { isOpenTrade, unreadWhispers } from '@/lib/whisper-history';
import { setBadgeCount, showToast, undoToast, usePanel } from '@/overlay';
import { DUR, EASE_OUT, fadeIn, slideInRight } from '@/lib/motion';
import { EmptyState } from '@/pages/currency/components/StatePanel';
import poeWhisperSound from '@/assets/poe_whisper.mp3';
import { findMarketLinks } from '../lib/market-links';
import {
  buildInbox,
  buildTimeline,
  threadAliases,
  threadWhisperAccount,
  visibleThreads,
  type InboxFilter,
  type InboxThread,
} from '../lib/inbox';
import { useChatListings } from '../hooks/useChatListings';
import { EMPTY_THREAD, useChatStore } from '../hooks/useChatStore';
import { presenceLabel, useTraderProfile } from '../hooks/useTraderProfile';
import { Composer, type ComposerHandle, type ReplyChannel, type TemplateVars } from './Composer';
import { ConversationList } from './ConversationList';
import { MessageList } from './MessageList';
import { ThreadDeals } from './ThreadDeals';
import { ThreadHeader } from './ThreadHeader';
import { TraderSidebar } from './TraderSidebar';

interface ChatOverlayWidgetProps {
  onClose: () => void;
}

/** A panel-requested conversation that is not in the list yet; `reloaded` once the list was refetched for it. */
interface ConversationRequest {
  conversationId: string;
  version: number;
  reloaded: boolean;
}

/**
 * Where the "New" divider of the open thread goes: its first message that was unread when it was opened
 * (null: none was); undefined until its messages are in.
 */
interface UnreadMarker {
  threadId: string;
  key: string | null | undefined;
}

/** Open trade whispers are re-evaluated (they stop being pinned after a day) this often. */
const CLOCK_TICK_MS = 60_000;
/** Narrower than this the panel shows one column: the list, or the open thread with a back button. */
const COMPACT_BELOW_PX = 640;
/**
 * From this width the Trader sidebar is a third column (collapsible, remembered in chat prefs); narrower it
 * slides over the thread when asked for.
 */
const WIDE_FROM_PX = 1020;
/** The Trader sidebar's width. */
const TRADER_WIDTH_PX = 300;
/** A deleted conversation can be restored this long; the website is told to delete it after that. */
const DELETE_UNDO_MS = 6000;

/**
 * The thread `id` names, also after it was merged or split (a whisper-only thread whose sender got linked to
 * a website user, an offers-only thread that gained a conversation) or when it is named by another of its ids
 * (a toast's `whisper:<name>`).
 */
const findThread = (threads: InboxThread[], id: string | null) =>
  id === null ? undefined : (threads.find((t) => t.id === id) ?? threads.find((t) => threadAliases(t).includes(id)));

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
    refresh: refreshOffers,
  } = usePd2Website();
  const whispers = useWhisperHistory();
  const { markRead: markWhispersRead, recordCopied } = whispers;
  // keepMounted panel: payload is undefined until the first openPanel('chat', ...)
  const { payload, payloadVersion, visible, rect } = usePanel<'chat'>();
  // One column (list or thread) when the panel itself is narrow, whatever the window size
  const compact = rect.width < COMPACT_BELOW_PX;
  const wide = rect.width >= WIDE_FROM_PX;
  const { settings } = useOptions();
  const prefs = useChatPrefs();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [search, setSearch] = useState('');
  // Unsent text per thread; the panel stays mounted while hidden, so drafts survive hiding it
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Website users opened from the market (openPanel('chat', { userId })): a thread even before any message
  const [contacts, setContacts] = useState<{ userId: string; name: string }[]>([]);
  // Reply channel picked per thread (default: website when it reaches them, else whisper)
  const [channels, setChannels] = useState<Record<string, ReplyChannel>>({});
  // Conversations deleted but still undoable: hidden now, deleted on the website once the undo window closes
  const [deleting, setDeleting] = useState<ReadonlySet<string>>(() => new Set());
  // The Trader sidebar sliding over the thread (below WIDE_FROM_PX; wide panels show it as a column)
  const [traderOverlay, setTraderOverlay] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Offers change outside the overlay (made, declined or delisted on the website) without any socket push to
  // the buyer: refetch them each time the panel opens, so Buying shows the current ones
  useEffect(() => {
    if (visible) void refreshOffers();
    // On open only: refreshOffers changes with every settings change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
    onIncomingMessage: (message, viewing) => {
      // Whisper sound for messages outside the conversation on screen, if enabled and not muted: by the thread
      // it merged into, else (a conversation not listed yet) by the conversation or the sender's website user
      if (viewing || !(settings?.whisperNotificationsEnabled ?? true)) return;
      const muted =
        findThread(threads, message.conversation_id)?.muted ??
        isThreadMuted([message.conversation_id, `user:${message.sender_id}`]);
      if (!muted) playNotificationSound(settings?.whisperNotificationVolume ?? 70);
    },
  });
  const { conversations, loadingConversations, conversationsLoaded, loadConversations, loadMessages, loadOlder } = chat;
  const signedIn = !!authData?.accessToken;

  const threads = useMemo(
    () =>
      buildInbox({
        conversations: deleting.size > 0 ? conversations.filter((c) => !deleting.has(c._id)) : conversations,
        currentUserId,
        people: whispers.people,
        offers: [...incomingOffers, ...outgoingOffers],
        now,
        prefs,
        contacts,
      }),
    [conversations, deleting, currentUserId, whispers.people, incomingOffers, outgoingOffers, now, prefs, contacts],
  );
  // Pin/mute/archive follow a thread onto ids it gained since they were set (a conversation started later), so
  // notifications that only know a conversation id or a whisper sender find them
  useEffect(() => {
    changeChatPrefs((current) => reconcileThreadPrefs(current, threads.map(threadAliases)));
  }, [threads]);
  const listed = useMemo(() => visibleThreads(threads, filter, search), [threads, filter, search]);
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

  // The "New" divider: fixed when the thread is opened (once its newest website page is in), until it closes
  const [unreadMarker, setUnreadMarker] = useState<UnreadMarker | null>(null);
  const markerReady = !!selectedThread && (!conversation || websiteThread.loaded || websiteThread.failed);
  const markerSet = !!selectedThread && unreadMarker?.threadId === selectedThread.id && unreadMarker.key !== undefined;
  if (!selectedThread) {
    if (unreadMarker) setUnreadMarker(null);
  } else if (unreadMarker?.threadId !== selectedThread.id || (!markerSet && markerReady)) {
    setUnreadMarker({
      threadId: selectedThread.id,
      key: markerReady ? (entries.find((entry) => entry.unread)?.key ?? null) : undefined,
    });
  }
  const unreadKey = markerSet ? (unreadMarker?.key ?? null) : null;

  // Listings linked in the open thread render as item cards.
  const linkedListingIds = useMemo(
    () => entries.flatMap((entry) => findMarketLinks(entry.content).map((link) => link.listingId)),
    [entries],
  );
  const listings = useChatListings(linkedListingIds);

  // Whom a whisper reaches (the same accounts link incoming whispers to this thread)
  const person = people?.[0];
  const characterName = people?.find((p) => p.characterName)?.characterName;
  // Their market listings and presence (the header's status line, the Trader sidebar)
  const trader = useTraderProfile(selectedThread?.userId, now);
  const traderOpen = wide ? !prefs.sidebarCollapsed : traderOverlay;
  const whisperAccount = selectedThread && threadWhisperAccount(selectedThread);
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

  // Chat button badge: website and whisper unread, leaving out muted and archived threads
  const unreadTotal = threads.reduce(
    (total, thread) => (thread.muted || thread.archived ? total : total + thread.unread),
    0,
  );
  useEffect(() => {
    setBadgeCount('chatUnread', unreadTotal);
  }, [unreadTotal]);

  // Whispers in the thread on screen are read (once the "New" divider was placed by them)
  const unreadWhisperKeys =
    visible && people && markerSet
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

  // Apply openPanel('chat', { conversationId, conversation, threadId, newestUnread, reply, filter, userId, draft })
  // (every open bumps payloadVersion, so re-opening on the same conversation re-selects it). Adjusted during render.
  const [handledPayloadVersion, setHandledPayloadVersion] = useState(0);
  const [request, setRequest] = useState<ConversationRequest | null>(null);
  // The open that asked to focus the composer (a toast's Reply)
  const [replyVersion, setReplyVersion] = useState(0);
  // The open that asked to show the Trader sidebar (a market seller's name); applied in an effect below since the
  // wide column's state lives in the saved chat prefs
  const [traderVersion, setTraderVersion] = useState(0);
  if (payloadVersion !== handledPayloadVersion) {
    setHandledPayloadVersion(payloadVersion);
    const conversationId = payload?.conversationId;
    const newConversation = payload?.conversation as Conversation | undefined;
    // The newest unread thread outside muted and archived ones (the chat hotkey with unread messages)
    const newestUnread = payload?.newestUnread
      ? threads
          .filter((t) => t.unread > 0 && !t.muted && !t.archived)
          .reduce<
            InboxThread | undefined
          >((a, b) => (a && (a.latest?.at ?? 0) >= (b.latest?.at ?? 0) ? a : b), undefined)
      : undefined;
    // A website user (a market seller): their thread, else a new one whose first website message starts the
    // conversation
    const contact = payload?.userId ? { userId: payload.userId, name: payload.userName || 'Seller' } : undefined;
    const contactAlias = contact && `user:${contact.userId}`;
    const contactThreadId = contactAlias && (findThread(threads, contactAlias)?.id ?? contactAlias);
    if (contact && !threads.some((t) => t.userId === contact.userId)) {
      setContacts((current) => (current.some((c) => c.userId === contact.userId) ? current : [...current, contact]));
    }
    const draft = payload?.draft;
    if (contactThreadId && draft) {
      setDrafts((current) => {
        const unsent = current[contactThreadId]?.trim();
        return { ...current, [contactThreadId]: unsent ? `${unsent}\n${draft}` : draft };
      });
    }
    const threadId = payload?.threadId ?? contactThreadId ?? newestUnread?.id;
    // A requested conversation shows in the full list; a filter (offers hotkey) applies as asked
    if (payload?.filter) setFilter(payload.filter);
    else if (conversationId || threadId) setFilter('all');
    if (payload?.reply) setReplyVersion(payloadVersion);
    if (payload?.trader && threadId) setTraderVersion(payloadVersion);
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
    } else if (threadId) {
      setSelectedThreadId(threadId);
      setRequest(null);
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

  // Focus the composer when a thread is opened, and on a toast's Reply; while the panel is hidden (opened
  // with the game in the background) the focus waits until it shows
  const composerRef = useRef<ComposerHandle>(null);
  const openedThreadId = selectedThread?.id;
  const focusPendingRef = useRef(false);
  useEffect(() => {
    if (openedThreadId) focusPendingRef.current = true;
  }, [openedThreadId, replyVersion]);
  useEffect(() => {
    if (!visible || !focusPendingRef.current || !composerRef.current) return;
    focusPendingRef.current = false;
    composerRef.current.focus();
  }, [visible, openedThreadId, replyVersion]);

  const clearDraft = (threadId: string) =>
    setDrafts((current) => {
      const next = { ...current };
      delete next[threadId];
      return next;
    });

  const selectThread = (threadId: string | null) => {
    setSelectedThreadId(threadId);
    setRequest(null);
    setTraderOverlay(false);
  };

  /** Shows or hides the Trader sidebar: the column's collapsed state when wide (saved), else the slide-over. */
  const setTraderShown = (shown: boolean) => {
    if (!wide) {
      setTraderOverlay(shown);
      return;
    }
    changeChatPrefs((current) =>
      !shown === !!current.sidebarCollapsed ? current : { ...current, sidebarCollapsed: shown ? undefined : true },
    );
  };

  /** Opens a thread with its Trader details showing (an avatar was clicked). */
  const openTrader = (threadId: string) => {
    selectThread(threadId);
    setTraderShown(true);
  };

  // Show the Trader sidebar for an open that asked for it (after its thread was selected)
  useEffect(() => {
    if (traderVersion) setTraderShown(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on a new trader open
  }, [traderVersion]);

  /** Links one of their listings in the draft (the sidebar's market); the slide-over makes way for it. */
  const insertListing = (listing: MarketListingEntry) => {
    composerRef.current?.insertListing(listing);
    if (!wide) setTraderOverlay(false);
  };

  /** Pin/mute/archive the open thread (under every id it is known by). */
  const setPrefs = (thread: InboxThread, patch: ThreadPrefs) =>
    changeChatPrefs((current) => setThreadPrefs(current, threadAliases(thread), patch));

  // Deletes waiting out their undo window: the timer that sends them, and their toast
  const pendingDeletesRef = useRef(new Map<string, { timer: number; dismiss: () => void }>());
  /** Ends a delete's undo window (stops its timer); undefined when it already ended (sent or undone). */
  const takePendingDelete = (conversationId: string) => {
    const pending = pendingDeletesRef.current.get(conversationId);
    if (!pending) return undefined;
    pendingDeletesRef.current.delete(conversationId);
    window.clearTimeout(pending.timer);
    return pending;
  };

  /** Tells the website to delete a conversation whose undo window closed (once); a failure brings it back. */
  const commitDelete = async (conversationId: string) => {
    const pending = takePendingDelete(conversationId);
    if (!pending) return;
    pending.dismiss();
    const removed = await chat.deleteConversation(conversationId);
    setDeleting((current) => new Set([...current].filter((id) => id !== conversationId)));
    if (removed) {
      clearDraft(conversationId);
    } else {
      showToast({
        title: "Couldn't delete the conversation",
        description: 'It is back in your list.',
        variant: 'error',
      });
    }
  };

  /** Hides the conversation right away with an Undo toast; it is deleted on the website once that closes. */
  const handleDeleteConversation = (conversationId: string, name: string) => {
    if (pendingDeletesRef.current.has(conversationId)) return;
    setDeleting((current) => new Set(current).add(conversationId));
    setSelectedThreadId((current) => (current === conversationId ? null : current));
    const dismiss = undoToast({
      title: 'Conversation deleted',
      description: `Your chat with ${name}.`,
      duration: DELETE_UNDO_MS,
      onUndo: () => {
        if (!takePendingDelete(conversationId)) return;
        setDeleting((current) => new Set([...current].filter((id) => id !== conversationId)));
      },
    });
    const timer = window.setTimeout(() => void commitDelete(conversationId), DELETE_UNDO_MS);
    pendingDeletesRef.current.set(conversationId, { timer, dismiss });
  };

  // Deletes still in their undo window are sent right away when the panel unmounts or the app closes
  const flushDeletesRef = useRef(() => {});
  useEffect(() => {
    flushDeletesRef.current = () => {
      for (const conversationId of [...pendingDeletesRef.current.keys()]) void commitDelete(conversationId);
    };
  });
  useEffect(() => {
    const flush = () => flushDeletesRef.current();
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  /**
   * Website message to the open thread's person; starts the conversation for an offers-only thread.
   * Resolves whether the message was delivered.
   */
  const sendWebsite = async (thread: InboxThread, text: string): Promise<boolean> => {
    if (thread.conversation) return chat.send(thread.conversation._id, text);
    if (!thread.userId || !currentUserId) return false;
    try {
      const created: Conversation = await createConversation([currentUserId, thread.userId]);
      chat.upsertConversation({ ...created, unread_count: 0, participants: created.participants || [] });
      setSelectedThreadId(created._id);
      return await chat.send(created._id, text);
    } catch (error) {
      console.error('Failed to start chat:', error);
      showToast({ title: 'Message not sent', description: "Couldn't start the conversation.", variant: 'error' });
      return false;
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

  // In-panel keys: Alt+↑/↓ switch to the previous/next thread of the list as filtered; Esc closes the open
  // thread (back to the list when compact). Keys a field or menu already handled (the "/" template menu,
  // search's Escape), keys from popovers and menus (the listing picker; they render outside the panel) and
  // keys finishing an IME composition are left alone.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.nativeEvent.isComposing || !e.currentTarget.contains(e.target as Node)) return;
    if (e.key === 'Escape' && !e.altKey && !e.ctrlKey && !e.metaKey && !wide && traderOverlay) {
      // The slide-over closes first
      e.preventDefault();
      setTraderOverlay(false);
    } else if (e.key === 'Escape' && !e.altKey && !e.ctrlKey && !e.metaKey && selectedThread) {
      e.preventDefault();
      // Keep the keyboard in the panel: the focused composer is about to unmount
      e.currentTarget.focus();
      selectThread(null);
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && listed.length > 0) {
      e.preventDefault();
      const index = listed.findIndex((thread) => thread.id === selectedThread?.id);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const next =
        index < 0 ? (step > 0 ? 0 : listed.length - 1) : Math.min(Math.max(index + step, 0), listed.length - 1);
      selectThread(listed[next].id);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <WindowPanel animate
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative z-10 h-full w-full outline-none">
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
          {(!compact || !selectedThread) && (
            <ConversationList
              threads={listed}
              total={threads.length}
              unreadTotal={unreadTotal}
              filter={filter}
              onFilterChange={setFilter}
              search={search}
              onSearchChange={setSearch}
              selectedId={selectedThread?.id ?? null}
              onSelect={selectThread}
              onOpenTrader={openTrader}
              loading={loadingConversations}
              failed={chat.conversationsFailed}
              signedIn={signedIn}
              onReload={loadConversations}
              now={now}
              className={compact ? 'w-full border-r-0' : undefined}
            />
          )}

          {(!compact || selectedThread) && (
            <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              {selectedThread ? (
                <>
                  <ThreadHeader
                    name={selectedThread.name}
                    participant={participant}
                    account={whisperAccount}
                    inGameOnly={!selectedThread.userId}
                    characterName={characterName}
                    presence={trader.status === 'ready' ? trader.presence.kind : undefined}
                    presenceText={
                      trader.status === 'ready' && trader.presence.kind !== 'unknown'
                        ? presenceLabel(trader.presence, now)
                        : undefined
                    }
                    pinned={selectedThread.pinned}
                    muted={selectedThread.muted}
                    archived={selectedThread.archived}
                    traderOpen={traderOpen}
                    onToggleTrader={() => setTraderShown(!traderOpen)}
                    onBack={compact ? () => selectThread(null) : undefined}
                    onTogglePin={() =>
                      setPrefs(selectedThread, { pinnedAt: selectedThread.pinned ? undefined : Date.now() })
                    }
                    onToggleMute={() => setPrefs(selectedThread, { muted: !selectedThread.muted })}
                    onToggleArchive={() => {
                      if (selectedThread.archived) {
                        setPrefs(selectedThread, { archivedAt: undefined });
                        return;
                      }
                      // Not before its latest message (clock skew), or it would count as new and un-archive
                      setPrefs(selectedThread, { archivedAt: Math.max(Date.now(), selectedThread.latest?.at ?? 0) });
                      selectThread(null);
                    }}
                    onDeleteConversation={
                      conversation ? () => handleDeleteConversation(conversation._id, selectedThread.name) : undefined
                    }
                    onForgetWhispers={
                      people && people.length > 0
                        ? () => {
                            people.forEach((p) => whispers.forget(p.key));
                            if (!selectedThread.userId) clearDraft(selectedThread.id);
                          }
                        : undefined
                    }
                  />
                  <div className="shrink-0">
                    <ThreadDeals
                      offers={selectedThread.offers}
                      hiddenOffers={hiddenOutgoingOffers.filter(
                        (offer) => !!offer.userId && offer.userId === selectedThread.userId,
                      )}
                      whisperTrades={openTrades}
                      listingIds={linkedListingIds}
                      now={now}
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
                    key={`messages:${selectedThread.id}`}
                    threadId={selectedThread.id}
                    entries={entries}
                    thread={websiteThread}
                    readerId={participant?._id}
                    otherName={selectedThread.name}
                    onOpenTrader={() => setTraderShown(true)}
                    listings={listings}
                    unreadKey={unreadKey}
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
                      channel === 'whisper'
                        ? `Whisper *${whisperAccount} — copied for in-game chat`
                        : `Message ${selectedThread.name}…  (/ for templates)`
                    }
                    templateVars={templateVars}
                    channel={channel}
                    whisperTarget={whisperAccount}
                    onChannelChange={
                      websiteReachable && whisperAccount
                        ? (next) => setChannels((current) => ({ ...current, [selectedThread.id]: next }))
                        : undefined
                    }
                  />
                  {/* Narrower panels: the Trader sidebar slides over the thread */}
                  <AnimatePresence>
                    {!wide && traderOverlay && (
                      <>
                        <motion.div
                          key="scrim"
                          aria-hidden
                          variants={fadeIn}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          onClick={() => setTraderOverlay(false)}
                          className="absolute inset-0 z-20 bg-scrim backdrop-blur-[1px]"
                        />
                        <motion.div
                          key="trader"
                          variants={slideInRight}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="absolute inset-y-0 right-0 z-30 flex max-w-full"
                        >
                          <TraderSidebar
                            thread={selectedThread}
                            profile={trader}
                            whisperAccount={whisperAccount}
                            characterName={characterName}
                            linkedListingIds={linkedListingIds}
                            listings={listings}
                            now={now}
                            onInsertListing={insertListing}
                            onClose={() => setTraderOverlay(false)}
                            closeLabel="Close trader details"
                            className="max-w-full bg-card shadow-panel"
                          />
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
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
          )}

          {/* Wide panels: the Trader sidebar is a third column */}
          <AnimatePresence initial={false}>
            {wide && selectedThread && traderOpen && (
              <motion.div
                key="trader"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: TRADER_WIDTH_PX, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: DUR.slow, ease: EASE_OUT }}
                className="flex min-h-0 shrink-0 overflow-hidden"
              >
                <TraderSidebar
                  thread={selectedThread}
                  profile={trader}
                  whisperAccount={whisperAccount}
                  characterName={characterName}
                  linkedListingIds={linkedListingIds}
                  listings={listings}
                  now={now}
                  onInsertListing={insertListing}
                  onClose={() => setTraderShown(false)}
                  closeLabel="Collapse trader details"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </WindowPanel>
    </MotionConfig>
  );
}
