import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Conversation, Message } from '@/common/types/pd2-website/ChatTypes';
import { CONVERSATION_PAGE_SIZE, MESSAGE_PAGE_SIZE, type SocialActions } from '@/hooks/pd2website/useSocialActions';
import type { SubscribeSocket } from '@/hooks/pd2website/useSocket';
import { isNetworkError } from '@/lib/network-errors';

export type SendStatus = 'sending' | 'failed';

export interface ChatMessage extends Message {
  /** Messages sent from this client keep their client id as a stable list key across the server ack. */
  clientId?: string;
  /** Set only while a send is unacknowledged; such a message's `_id` is its client id. */
  status?: SendStatus;
  /** Arrived while the chat was mounted (push or own send), as opposed to fetched history. */
  live?: boolean;
}

export interface ThreadState {
  /** Confirmed messages oldest first, then unacknowledged sends in send order. */
  messages: ChatMessage[];
  /** The newest page has been fetched (older pages are paged off it). */
  loaded: boolean;
  loading: boolean;
  hasOlder: boolean;
  loadingOlder: boolean;
  /** Bumped whenever a newest page replaces the held history; older pages requested before it are stale. */
  resets: number;
  /** The last attempt to fetch the newest page failed. */
  failed: boolean;
}

export interface ChatState {
  conversations: Conversation[];
  loadingConversations: boolean;
  /** The conversation list has been requested once (successfully or not). */
  conversationsLoaded: boolean;
  /** The last attempt to load the conversation list failed. */
  conversationsFailed: boolean;
  threads: Record<string, ThreadState>;
}

export const EMPTY_THREAD: ThreadState = {
  messages: [],
  loaded: false,
  loading: false,
  hasOlder: false,
  loadingOlder: false,
  resets: 0,
  failed: false,
};

export const initialChatState: ChatState = {
  conversations: [],
  loadingConversations: false,
  conversationsLoaded: false,
  conversationsFailed: false,
  threads: {},
};

export type ChatAction =
  | { type: 'conversationsLoading' }
  | { type: 'conversationsLoaded'; conversations: Conversation[] }
  | { type: 'conversationsFailed' }
  | { type: 'conversationUpserted'; conversation: Conversation }
  | { type: 'conversationRemoved'; conversationId: string }
  | { type: 'threadLoading'; conversationId: string }
  /** `page`: the newest `pageSize` messages, in any order. */
  | { type: 'threadLoaded'; conversationId: string; page: Message[]; pageSize: number }
  | { type: 'threadFailed'; conversationId: string }
  | { type: 'olderLoading'; conversationId: string }
  /** `resets`: the thread's `resets` when the page was requested. */
  | { type: 'olderLoaded'; conversationId: string; page: Message[]; pageSize: number; resets: number }
  | { type: 'olderFailed'; conversationId: string }
  | { type: 'messageReceived'; message: Message; currentUserId: string; viewingConversationId: string | null }
  | { type: 'sendQueued'; message: ChatMessage }
  | { type: 'sendSucceeded'; conversationId: string; clientId: string; message: Message }
  | { type: 'sendFailed'; conversationId: string; clientId: string }
  | { type: 'sendRetried'; conversationId: string; clientId: string }
  /**
   * `clears`: the conversation's unread count when `messageIds` were found to be all its unread messages; the
   * count drops by that rather than by the ids (it may have counted differently; later pushes stay unread).
   */
  | { type: 'markedRead'; conversationId: string; messageIds: string[]; readerId: string; clears?: number };

/**
 * Confirmed messages de-duplicated by id (an incoming copy wins but keeps the local key/animation flags) in
 * chronological order, followed by the unacknowledged sends in send order.
 */
function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const confirmed = new Map<string, ChatMessage>();
  const pending: ChatMessage[] = [];
  for (const m of existing) {
    if (m.status) pending.push(m);
    else confirmed.set(m._id, m);
  }
  for (const m of incoming) {
    const prev = confirmed.get(m._id);
    confirmed.set(
      m._id,
      prev?.clientId || prev?.live ? { ...m, clientId: prev.clientId ?? m.clientId, live: prev.live ?? m.live } : m,
    );
  }
  const sorted = [...confirmed.values()].sort(
    (a, b) => (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0),
  );
  return [...sorted, ...pending];
}

function withThread(state: ChatState, id: string, update: (thread: ThreadState) => ThreadState): ChatState {
  const prev = state.threads[id] ?? EMPTY_THREAD;
  const next = update(prev);
  return next === prev ? state : { ...state, threads: { ...state.threads, [id]: next } };
}

function withConversation(state: ChatState, id: string, update: (c: Conversation) => Conversation): ChatState {
  if (!state.conversations.some((c) => c._id === id)) return state;
  return { ...state, conversations: state.conversations.map((c) => (c._id === id ? update(c) : c)) };
}

function withPendingStatus(state: ChatState, id: string, clientId: string, status: SendStatus): ChatState {
  return withThread(state, id, (t) =>
    t.messages.some((m) => m.clientId === clientId && m.status)
      ? { ...t, messages: t.messages.map((m) => (m.clientId === clientId && m.status ? { ...m, status } : m)) }
      : t,
  );
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'conversationsLoading':
      return { ...state, loadingConversations: true, conversationsFailed: false };
    case 'conversationsLoaded':
      return { ...state, conversations: action.conversations, loadingConversations: false, conversationsLoaded: true };
    case 'conversationsFailed':
      return { ...state, loadingConversations: false, conversationsLoaded: true, conversationsFailed: true };
    case 'conversationUpserted': {
      const { conversation } = action;
      const exists = state.conversations.some((c) => c._id === conversation._id);
      return {
        ...state,
        conversations: exists
          ? state.conversations.map((c) => (c._id === conversation._id ? conversation : c))
          : [conversation, ...state.conversations],
      };
    }
    case 'conversationRemoved': {
      const threads = { ...state.threads };
      delete threads[action.conversationId];
      return { ...state, conversations: state.conversations.filter((c) => c._id !== action.conversationId), threads };
    }
    case 'threadLoading':
      return withThread(state, action.conversationId, (t) => ({ ...t, loading: true, failed: false }));
    case 'threadLoaded':
      return withThread(state, action.conversationId, (t) => {
        const { page, pageSize } = action;
        const full = page.length >= pageSize;
        const known = new Set(t.messages.filter((m) => !m.status).map((m) => m._id));
        // A full newest page sharing nothing with what we hold (e.g. many messages missed while the socket was
        // down): the held history no longer joins up with it, so start over from this page.
        const gap = t.loaded && full && known.size > 0 && !page.some((m) => known.has(m._id));
        return {
          ...t,
          messages: mergeMessages(gap ? t.messages.filter((m) => m.status) : t.messages, page),
          loaded: true,
          loading: false,
          hasOlder: t.loaded && !gap ? t.hasOlder : full,
          resets: gap ? t.resets + 1 : t.resets,
        };
      });
    case 'threadFailed':
      return withThread(state, action.conversationId, (t) => (t.loading ? { ...t, loading: false, failed: true } : t));
    case 'olderLoading':
      return withThread(state, action.conversationId, (t) =>
        t.loaded && t.hasOlder && !t.loadingOlder ? { ...t, loadingOlder: true } : t,
      );
    case 'olderLoaded':
      return withThread(state, action.conversationId, (t) =>
        // Requested against history that has since been replaced: its offset no longer joins up, drop it
        action.resets !== t.resets
          ? { ...t, loadingOlder: false }
          : {
              ...t,
              messages: mergeMessages(t.messages, action.page),
              hasOlder: action.page.length >= action.pageSize,
              loadingOlder: false,
            },
      );
    case 'olderFailed':
      return withThread(state, action.conversationId, (t) => (t.loadingOlder ? { ...t, loadingOlder: false } : t));
    case 'messageReceived': {
      const { message, currentUserId, viewingConversationId } = action;
      const id = message.conversation_id;
      const thread = state.threads[id] ?? EMPTY_THREAD;
      // Duplicate push, or the send response already confirmed this message
      if (thread.messages.some((m) => m._id === message._id)) return state;

      const fromOther = message.sender_id !== currentUserId;
      // Our own message echoed back before its send response: it acknowledges the matching in-flight send
      // (not a failed one: the same text may have been sent again since)
      const ack = fromOther
        ? undefined
        : thread.messages.find((m) => m.status === 'sending' && m.content === message.content);
      const messages = ack
        ? mergeMessages(
            thread.messages.filter((m) => m !== ack),
            [{ ...message, clientId: ack.clientId, live: true }],
          )
        : mergeMessages(thread.messages, [{ ...message, live: true }]);
      const next = withThread(state, id, (t) => ({ ...t, messages }));
      return withConversation(next, id, (c) => ({
        ...c,
        latest_message: message,
        unread_count:
          fromOther && id !== viewingConversationId && c.latest_message?._id !== message._id
            ? (c.unread_count || 0) + 1
            : c.unread_count,
      }));
    }
    case 'sendQueued':
      return withThread(state, action.message.conversation_id, (t) => ({
        ...t,
        messages: [...t.messages, action.message],
      }));
    case 'sendSucceeded': {
      const { conversationId, clientId, message } = action;
      if (!state.threads[conversationId]) return state; // deleted meanwhile
      const next = withThread(state, conversationId, (t) => ({
        ...t,
        messages: mergeMessages(
          t.messages
            // Drop the unacknowledged entry and any echo of this message that did not match it
            .filter((m) => !(m.clientId === clientId && m.status) && m._id !== message._id)
            // An echo of the same text sent elsewhere acknowledged this send by mistake: it is its own message
            .map((m) => (m.clientId === clientId ? { ...m, clientId: undefined } : m)),
          [{ ...message, clientId, live: true }],
        ),
      }));
      return withConversation(next, conversationId, (c) => ({
        ...c,
        latest_message: message,
        updated_at: message.created_at,
      }));
    }
    case 'sendFailed':
      return withPendingStatus(state, action.conversationId, action.clientId, 'failed');
    case 'sendRetried':
      return withPendingStatus(state, action.conversationId, action.clientId, 'sending');
    case 'markedRead': {
      const { conversationId, messageIds, readerId } = action;
      const ids = new Set(messageIds);
      const next = withThread(state, conversationId, (t) => ({
        ...t,
        messages: t.messages.map((m) =>
          ids.has(m._id) && !m.reader_ids?.includes(readerId)
            ? { ...m, reader_ids: [...(m.reader_ids || []), readerId] }
            : m,
        ),
      }));
      return withConversation(next, conversationId, (c) => ({
        ...c,
        unread_count: Math.max(0, (c.unread_count || 0) - (action.clears ?? messageIds.length)),
      }));
    }
  }
}

export const totalUnreadCount = (conversations: Conversation[]) =>
  conversations.reduce((total, c) => total + (c.unread_count || 0), 0);

/** Safety cap on conversation paging (MAX_CONVERSATION_PAGES * CONVERSATION_PAGE_SIZE conversations). */
const MAX_CONVERSATION_PAGES = 20;
/** Push ids remembered to suppress duplicate side effects (sound, list reloads). */
const SEEN_PUSH_LIMIT = 500;
/** Mark all read reads at most this many pages of a conversation looking for its unread messages. */
const MAX_UNREAD_PAGES = 20;

async function fetchAllConversations(
  getConversations: SocialActions['getConversations'],
  participantId: string,
): Promise<Conversation[] | null> {
  const byId = new Map<string, Conversation>();
  for (let page = 0; page < MAX_CONVERSATION_PAGES; page++) {
    const response = await getConversations(participantId, { limit: CONVERSATION_PAGE_SIZE, skip: byId.size });
    if (!response) return page === 0 ? null : [...byId.values()];
    const data = response.data ?? [];
    for (const conversation of data) byId.set(conversation._id, conversation);
    const hasMore = typeof response.total === 'number' && byId.size < response.total && data.length > 0;
    if (!hasMore) break;
  }
  return [...byId.values()];
}

let clientIdSeq = 0;

export type ChatApi = Pick<
  SocialActions,
  'getConversations' | 'getMessages' | 'sendMessage' | 'markMessagesAsRead' | 'deleteConversation'
>;

export interface UseChatStoreOptions {
  currentUserId: string | undefined;
  api: ChatApi;
  subscribeSocket: SubscribeSocket;
  /** The conversation on screen (selected in a visible panel), or null. Its incoming messages are marked read. */
  viewingConversationId: string | null;
  /** A new message from someone else was pushed; `viewing` = it belongs to the conversation on screen. */
  onIncomingMessage?: (message: Message, viewing: boolean) => void;
}

/**
 * Chat data: conversations, message threads with paging, the pending-send queue and read bookkeeping. Every
 * mutation (socket push, loads, send/retry, delete, mark-read) goes through `chatReducer`.
 */
export function useChatStore({
  currentUserId,
  api,
  subscribeSocket,
  viewingConversationId,
  onIncomingMessage,
}: UseChatStoreOptions) {
  const { getConversations, getMessages, sendMessage, markMessagesAsRead, deleteConversation } = api;
  const [state, dispatch] = useReducer(chatReducer, initialChatState);

  // Latest values for async callbacks (socket pushes, retries, scroll-triggered paging)
  const stateRef = useRef(state);
  const viewingRef = useRef(viewingConversationId);
  const onIncomingRef = useRef(onIncomingMessage);
  useEffect(() => {
    stateRef.current = state;
    viewingRef.current = viewingConversationId;
    onIncomingRef.current = onIncomingMessage;
  });

  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    dispatch({ type: 'conversationsLoading' });
    try {
      const conversations = await fetchAllConversations(getConversations, currentUserId);
      if (!conversations) {
        dispatch({ type: 'conversationsFailed' });
        return;
      }
      // Conversations without messages are not listed
      dispatch({ type: 'conversationsLoaded', conversations: conversations.filter((c) => c.latest_message) });
    } catch (error) {
      console.error('Failed to load conversations:', error);
      dispatch({ type: 'conversationsFailed' });
    }
  }, [currentUserId, getConversations]);

  /** Fetch the newest page of a thread and merge it with what is held (cached history, pushes, pending sends). */
  const loadMessages = useCallback(
    async (conversationId: string) => {
      dispatch({ type: 'threadLoading', conversationId });
      try {
        const response = await getMessages(conversationId, { limit: MESSAGE_PAGE_SIZE, skip: 0 });
        if (!response) {
          dispatch({ type: 'threadFailed', conversationId });
          return;
        }
        dispatch({ type: 'threadLoaded', conversationId, page: response.data ?? [], pageSize: MESSAGE_PAGE_SIZE });
      } catch (error) {
        console.error('Failed to load messages:', error);
        dispatch({ type: 'threadFailed', conversationId });
      }
    },
    [getMessages],
  );

  const olderInFlightRef = useRef(new Set<string>());
  /**
   * Fetch the page before the oldest held message; no-op while one is loading, while the newest page is being
   * refetched (it may replace the held history the offset is based on) or when the start was reached.
   */
  const loadOlder = useCallback(
    async (conversationId: string) => {
      const thread = stateRef.current.threads[conversationId];
      const inFlight = olderInFlightRef.current;
      if (!thread?.loaded || thread.loading || !thread.hasOlder || inFlight.has(conversationId)) return;
      inFlight.add(conversationId);
      dispatch({ type: 'olderLoading', conversationId });
      // Newest-first offset: every confirmed message we hold is newer than the next page
      const skip = thread.messages.filter((m) => !m.status).length;
      try {
        const response = await getMessages(conversationId, { limit: MESSAGE_PAGE_SIZE, skip });
        dispatch(
          response
            ? {
                type: 'olderLoaded',
                conversationId,
                page: response.data ?? [],
                pageSize: MESSAGE_PAGE_SIZE,
                resets: thread.resets,
              }
            : { type: 'olderFailed', conversationId },
        );
      } catch (error) {
        console.error('Failed to load older messages:', error);
        dispatch({ type: 'olderFailed', conversationId });
      } finally {
        inFlight.delete(conversationId);
      }
    },
    [getMessages],
  );

  const sendsInFlightRef = useRef(new Set<string>());
  const deliver = useCallback(
    async (conversationId: string, clientId: string, content: string): Promise<boolean> => {
      if (!currentUserId) return false;
      sendsInFlightRef.current.add(clientId);
      try {
        const message = await sendMessage(conversationId, content, currentUserId);
        dispatch(
          message
            ? { type: 'sendSucceeded', conversationId, clientId, message }
            : { type: 'sendFailed', conversationId, clientId },
        );
        return !!message;
      } catch (error) {
        // Offline / PD2 unreachable: the bubble shows the failure with Retry; nothing to report
        if (isNetworkError(error)) console.warn('Failed to send message:', error);
        else console.error('Failed to send message:', error);
        dispatch({ type: 'sendFailed', conversationId, clientId });
        return false;
      } finally {
        sendsInFlightRef.current.delete(clientId);
      }
    },
    [currentUserId, sendMessage],
  );

  /**
   * Append a pending message right away and send it; a failure keeps it in the thread as `failed`.
   * Resolves whether it was delivered.
   */
  const send = useCallback(
    (conversationId: string, content: string): Promise<boolean> => {
      if (!currentUserId) return Promise.resolve(false);
      const clientId = `local-${Date.now().toString(36)}-${++clientIdSeq}`;
      const now = new Date().toISOString();
      dispatch({
        type: 'sendQueued',
        message: {
          _id: clientId,
          clientId,
          status: 'sending',
          live: true,
          conversation_id: conversationId,
          sender_id: currentUserId,
          content,
          reader_ids: [currentUserId],
          created_at: now,
          updated_at: now,
          created_by_id: currentUserId,
        },
      });
      return deliver(conversationId, clientId, content);
    },
    [currentUserId, deliver],
  );

  const retry = useCallback(
    (conversationId: string, clientId: string) => {
      const pending = stateRef.current.threads[conversationId]?.messages.find((m) => m.clientId === clientId);
      if (pending?.status !== 'failed' || sendsInFlightRef.current.has(clientId)) return;
      dispatch({ type: 'sendRetried', conversationId, clientId });
      void deliver(conversationId, clientId, pending.content);
    },
    [deliver],
  );

  /** Archive a conversation; resolves whether it was removed (false on failure or a 401). */
  const removeConversation = useCallback(
    async (conversationId: string) => {
      try {
        if (!(await deleteConversation(conversationId))) return false;
        dispatch({ type: 'conversationRemoved', conversationId });
        return true;
      } catch (error) {
        console.error('Failed to delete conversation:', error);
        return false;
      }
    },
    [deleteConversation],
  );

  const upsertConversation = useCallback(
    (conversation: Conversation) => dispatch({ type: 'conversationUpserted', conversation }),
    [],
  );

  // New messages pushed by the PD2 socket
  const seenPushesRef = useRef(new Set<string>());
  useEffect(() => {
    if (!currentUserId) return;
    return subscribeSocket<Message>('social/message_pushed', (message) => {
      if (!message?._id || !message.conversation_id) return;
      const seen = seenPushesRef.current;
      if (seen.has(message._id)) return;
      seen.add(message._id);
      if (seen.size > SEEN_PUSH_LIMIT) seenPushesRef.current = new Set([...seen].slice(-SEEN_PUSH_LIMIT));

      const viewing = viewingRef.current;
      const known = stateRef.current.conversations.some((c) => c._id === message.conversation_id);
      dispatch({ type: 'messageReceived', message, currentUserId, viewingConversationId: viewing });
      if (message.sender_id === currentUserId) return;
      // A new conversation: the list comes from the server
      if (!known) void loadConversations();
      onIncomingRef.current?.(message, message.conversation_id === viewing);
    });
  }, [currentUserId, subscribeSocket, loadConversations]);

  // The mark-read path of the conversation on screen: unread messages from the other participant are marked
  // once its newest page is in (so opening a thread sends one request covering cached and fetched messages).
  // Ids in flight (here or in Mark all read) are skipped so overlapping triggers (re-renders, pushes) never
  // re-send; ids that failed are not retried until the conversation is opened again.
  const markInFlightRef = useRef(new Set<string>());
  const markFailedRef = useRef(new Set<string>());
  useEffect(() => {
    markFailedRef.current.clear();
  }, [viewingConversationId]);
  const viewingThread = viewingConversationId ? state.threads[viewingConversationId] : undefined;
  const viewingMessages = viewingThread?.loaded && !viewingThread.loading ? viewingThread.messages : undefined;
  useEffect(() => {
    if (!viewingConversationId || !currentUserId || !viewingMessages) return;
    const inFlight = markInFlightRef.current;
    const failed = markFailedRef.current;
    const ids = viewingMessages
      .filter(
        (m) =>
          !m.status &&
          m.sender_id !== currentUserId &&
          !m.reader_ids?.includes(currentUserId) &&
          !inFlight.has(m._id) &&
          !failed.has(m._id),
      )
      .map((m) => m._id);
    if (ids.length === 0) return;

    const conversationId = viewingConversationId;
    ids.forEach((id) => inFlight.add(id));
    markMessagesAsRead(ids, currentUserId)
      .then(
        (marked) => {
          // false: unauthorized (re-auth started), nothing was marked server-side
          if (marked) dispatch({ type: 'markedRead', conversationId, messageIds: ids, readerId: currentUserId });
          else ids.forEach((id) => failed.add(id));
        },
        (error) => {
          console.error('Failed to mark messages as read:', error);
          ids.forEach((id) => failed.add(id));
        },
      )
      .finally(() => ids.forEach((id) => inFlight.delete(id)));
  }, [viewingConversationId, viewingMessages, currentUserId, markMessagesAsRead]);

  /**
   * Mark all read: every unread website message of every conversation is marked read on PD2 the way the open
   * thread (and the website) does it, by adding the user to the messages' reader_ids, so it holds on every
   * device and after a restart. A conversation's unread messages come from its held thread when that has them
   * all, else from its newest pages. Resolves whether every conversation was marked.
   */
  const markAllRead = useCallback(async (): Promise<boolean> => {
    if (!currentUserId) return false;
    const inFlight = markInFlightRef.current;
    const isUnread = (m: ChatMessage) =>
      !m.status && m.sender_id !== currentUserId && !m.reader_ids?.includes(currentUserId);

    const markConversation = async (conversation: Conversation): Promise<boolean> => {
      const conversationId = conversation._id;
      const unread = conversation.unread_count || 0;
      const held = stateRef.current.threads[conversationId]?.messages ?? [];
      const ids = new Set(held.filter(isUnread).map((m) => m._id));
      // Its newest pages, until they hold as many unread messages as it counts (or the thread starts)
      let complete = ids.size >= unread;
      for (let skip = 0, page = 0; !complete && page < MAX_UNREAD_PAGES; page++) {
        const response = await getMessages(conversationId, { limit: MESSAGE_PAGE_SIZE, skip });
        if (!response) return false;
        const data = response.data ?? [];
        data.filter(isUnread).forEach((m) => ids.add(m._id));
        skip += data.length;
        complete = ids.size >= unread || data.length < MESSAGE_PAGE_SIZE;
      }

      // The open thread's own marking already covers its ids in flight
      const pending = [...ids].filter((id) => !inFlight.has(id));
      pending.forEach((id) => inFlight.add(id));
      const marked: string[] = [];
      let ok = true;
      try {
        // Batches keep the `_id[$in]` query string short
        for (let i = 0; ok && i < pending.length; i += MESSAGE_PAGE_SIZE) {
          const batch = pending.slice(i, i + MESSAGE_PAGE_SIZE);
          // false: unauthorized (re-auth started) or the conversation is gone; nothing was marked
          ok = await markMessagesAsRead(batch, currentUserId);
          if (ok) marked.push(...batch);
        }
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
        ok = false;
      } finally {
        pending.forEach((id) => inFlight.delete(id));
      }
      const all = ok && complete;
      if (marked.length > 0 || all) {
        dispatch({
          type: 'markedRead',
          conversationId,
          messageIds: marked,
          readerId: currentUserId,
          clears: all ? unread - (ids.size - pending.length) : undefined,
        });
      }
      return all;
    };

    const unread = stateRef.current.conversations.filter((c) => (c.unread_count || 0) > 0);
    const results = await Promise.all(
      unread.map((conversation) =>
        markConversation(conversation).catch((error) => {
          console.error('Failed to mark the conversation as read:', error);
          return false;
        }),
      ),
    );
    return results.every(Boolean);
  }, [currentUserId, getMessages, markMessagesAsRead]);

  return {
    conversations: state.conversations,
    loadingConversations: state.loadingConversations,
    conversationsLoaded: state.conversationsLoaded,
    conversationsFailed: state.conversationsFailed,
    threads: state.threads,
    loadConversations,
    loadMessages,
    loadOlder,
    send,
    retry,
    deleteConversation: removeConversation,
    upsertConversation,
    markAllRead,
  };
}
