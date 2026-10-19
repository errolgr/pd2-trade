// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Conversation, Message } from '@/common/types/pd2-website/ChatTypes';
import {
  chatReducer,
  initialChatState,
  totalUnreadCount,
  useChatStore,
  type ChatAction,
  type ChatApi,
  type ChatMessage,
  type ChatState,
} from './useChatStore';

const ME = 'me';
const NOW = Date.parse('2026-05-01T12:00:00Z');

function msg(id: string, sender: string, content: string, minutesAgo: number, reader_ids: string[] = []): Message {
  const created_at = new Date(NOW - minutesAgo * 60_000).toISOString();
  return {
    _id: id,
    conversation_id: 'c1',
    sender_id: sender,
    content,
    reader_ids,
    created_at,
    updated_at: created_at,
    created_by_id: sender,
  };
}

function conv(id: string, unread = 0, latest?: Message): Conversation {
  return {
    _id: id,
    participant_ids: [ME, 'alice'],
    created_at: '',
    updated_at: '',
    created_by_id: ME,
    unread_count: unread,
    participants: [],
    latest_message: latest,
  };
}

function pending(clientId: string, content: string): ChatMessage {
  return { ...msg(clientId, ME, content, 0, [ME]), clientId, status: 'sending', live: true };
}

const run = (actions: ChatAction[], state: ChatState = initialChatState) => actions.reduce(chatReducer, state);
const withConversations = (...conversations: Conversation[]) => run([{ type: 'conversationsLoaded', conversations }]);
const thread = (state: ChatState, id = 'c1') => state.threads[id];
const ids = (state: ChatState, id = 'c1') => thread(state, id).messages.map((m) => m._id);
const received = (message: Message, viewingConversationId: string | null = null): ChatAction => ({
  type: 'messageReceived',
  message,
  currentUserId: ME,
  viewingConversationId,
});

describe('chatReducer pushes', () => {
  it('ignores a duplicate push: one message, one unread', () => {
    const push = received(msg('a1', 'alice', 'hi', 1));
    const once = run([push], withConversations(conv('c1')));
    const twice = run([push], once);

    expect(twice).toBe(once);
    expect(ids(twice)).toEqual(['a1']);
    expect(twice.conversations[0].unread_count).toBe(1);
    expect(twice.conversations[0].latest_message?._id).toBe('a1');
  });

  it('does not count messages in the conversation on screen, or own echoes, as unread', () => {
    const state = run(
      [received(msg('a1', 'alice', 'hi', 2), 'c1'), received(msg('m1', ME, 'from my phone', 1))],
      withConversations(conv('c1')),
    );
    expect(ids(state)).toEqual(['a1', 'm1']);
    expect(state.conversations[0].unread_count).toBe(0);
  });

  it('does not count a push that is already the listed latest message', () => {
    const latest = msg('a1', 'alice', 'hi', 1);
    const state = run([received(latest)], withConversations(conv('c1', 1, latest)));
    expect(state.conversations[0].unread_count).toBe(1);
  });

  it('keeps pushes for conversations that are not listed (cached until opened)', () => {
    const state = run([received(msg('a1', 'alice', 'hi', 1))]);
    expect(ids(state)).toEqual(['a1']);
    expect(state.conversations).toEqual([]);
  });
});

describe('chatReducer sends', () => {
  const queued = (clientId: string, content: string): ChatAction => ({
    type: 'sendQueued',
    message: pending(clientId, content),
  });

  it('an echo push acknowledges the pending send, and the later response does not duplicate it', () => {
    const server = msg('s1', ME, 'wts shako', 0, [ME]);
    let state = run([queued('local-1', 'wts shako'), received(server)], withConversations(conv('c1')));

    expect(thread(state).messages).toEqual([{ ...server, clientId: 'local-1', live: true }]);

    state = run([{ type: 'sendSucceeded', conversationId: 'c1', clientId: 'local-1', message: server }], state);
    expect(thread(state).messages).toEqual([{ ...server, clientId: 'local-1', live: true }]);
    expect(state.conversations[0].latest_message).toEqual(server);
  });

  it('an echo push after the response is a duplicate', () => {
    const server = msg('s1', ME, 'hello', 0, [ME]);
    const acked = run(
      [
        queued('local-1', 'hello'),
        { type: 'sendSucceeded', conversationId: 'c1', clientId: 'local-1', message: server },
      ],
      withConversations(conv('c1')),
    );
    expect(run([received(server)], acked)).toBe(acked);
  });

  it('an echo that did not match the pending send is dropped when the response confirms it', () => {
    const server = msg('s1', ME, 'hello', 0, [ME]);
    const state = run(
      [
        queued('local-1', 'hello '),
        received(server),
        { type: 'sendSucceeded', conversationId: 'c1', clientId: 'local-1', message: server },
      ],
      withConversations(conv('c1')),
    );
    expect(ids(state)).toEqual(['s1']);
  });

  it('failed send -> retry -> success keeps one message and ends confirmed', () => {
    const server = msg('s1', ME, 'hello', 0, [ME]);
    let state = run(
      [queued('local-1', 'hello'), { type: 'sendFailed', conversationId: 'c1', clientId: 'local-1' }],
      withConversations(conv('c1')),
    );
    expect(thread(state).messages.map((m) => m.status)).toEqual(['failed']);
    expect(state.conversations[0].latest_message).toBeUndefined();

    state = run([{ type: 'sendRetried', conversationId: 'c1', clientId: 'local-1' }], state);
    expect(thread(state).messages.map((m) => m.status)).toEqual(['sending']);

    state = run([{ type: 'sendSucceeded', conversationId: 'c1', clientId: 'local-1', message: server }], state);
    expect(thread(state).messages).toEqual([{ ...server, clientId: 'local-1', live: true }]);
    expect(state.conversations[0].latest_message).toEqual(server);
  });

  it('keeps pending sends after confirmed messages, even when older history arrives', () => {
    const state = run([
      queued('local-1', 'first'),
      queued('local-2', 'second'),
      received(msg('a1', 'alice', 'meanwhile', 0)),
      { type: 'threadLoaded', conversationId: 'c1', page: [msg('a0', 'alice', 'old', 5)], pageSize: 50 },
    ]);
    expect(ids(state)).toEqual(['a0', 'a1', 'local-1', 'local-2']);
  });

  it('ignores a response for a conversation deleted meanwhile', () => {
    const state = run(
      [queued('local-1', 'hello'), { type: 'conversationRemoved', conversationId: 'c1' }],
      withConversations(conv('c1')),
    );
    const after = run(
      [{ type: 'sendSucceeded', conversationId: 'c1', clientId: 'local-1', message: msg('s1', ME, 'hello', 0) }],
      state,
    );
    expect(after).toBe(state);
    expect(after.threads.c1).toBeUndefined();
  });
});

describe('chatReducer paging', () => {
  const newestFirst = (...messages: Message[]) => [...messages].reverse();

  it('loads the newest page in chronological order and knows whether older pages exist', () => {
    const full = run([
      {
        type: 'threadLoaded',
        conversationId: 'c1',
        page: newestFirst(msg('a1', 'alice', '1', 3), msg('a2', 'alice', '2', 2), msg('a3', 'alice', '3', 1)),
        pageSize: 3,
      },
    ]);
    expect(ids(full)).toEqual(['a1', 'a2', 'a3']);
    expect(thread(full)).toMatchObject({ loaded: true, loading: false, hasOlder: true });

    const short = run([
      { type: 'threadLoaded', conversationId: 'c1', page: [msg('a1', 'alice', '1', 3)], pageSize: 3 },
    ]);
    expect(thread(short).hasOlder).toBe(false);
  });

  it('prepends an older page without duplicating overlapping messages', () => {
    const state = run([
      {
        type: 'threadLoaded',
        conversationId: 'c1',
        page: newestFirst(msg('a3', 'alice', '3', 3), msg('a4', 'alice', '4', 2), msg('a5', 'alice', '5', 1)),
        pageSize: 3,
      },
      { type: 'olderLoading', conversationId: 'c1' },
      // Shifted by one (a message arrived server-side): a3 comes back again
      {
        type: 'olderLoaded',
        conversationId: 'c1',
        page: newestFirst(msg('a2', 'alice', '2', 4), msg('a3', 'alice', '3', 3)),
        pageSize: 3,
      },
    ]);
    expect(ids(state)).toEqual(['a2', 'a3', 'a4', 'a5']);
    expect(thread(state)).toMatchObject({ hasOlder: false, loadingOlder: false });
  });

  it('only starts loading older pages for a loaded thread that has them', () => {
    const notLoaded = run([{ type: 'olderLoading', conversationId: 'c1' }]);
    expect(notLoaded).toBe(initialChatState);

    const atStart = run([
      { type: 'threadLoaded', conversationId: 'c1', page: [msg('a1', 'alice', '1', 1)], pageSize: 3 },
      { type: 'olderLoading', conversationId: 'c1' },
    ]);
    expect(thread(atStart).loadingOlder).toBe(false);
  });

  it('a refetch of the newest page keeps loaded history and its paging state', () => {
    const page = (...m: Message[]) => ({ type: 'threadLoaded', conversationId: 'c1', page: m, pageSize: 2 }) as const;
    const state = run([
      page(msg('a3', 'alice', '3', 3), msg('a4', 'alice', '4', 2)),
      { type: 'olderLoaded', conversationId: 'c1', page: [msg('a2', 'alice', '2', 4)], pageSize: 2 },
      page(msg('a4', 'alice', '4', 2), msg('a5', 'alice', '5', 1)),
    ]);
    expect(ids(state)).toEqual(['a2', 'a3', 'a4', 'a5']);
    expect(thread(state).hasOlder).toBe(false);
  });

  it('a refetched newest page that no longer joins the held history replaces it', () => {
    const state = run([
      { type: 'threadLoaded', conversationId: 'c1', page: [msg('a1', 'alice', '1', 9)], pageSize: 2 },
      { type: 'sendQueued', message: pending('local-1', 'still sending') },
      {
        type: 'threadLoaded',
        conversationId: 'c1',
        page: [msg('a8', 'alice', '8', 2), msg('a9', 'alice', '9', 1)],
        pageSize: 2,
      },
    ]);
    expect(ids(state)).toEqual(['a8', 'a9', 'local-1']);
    expect(thread(state).hasOlder).toBe(true);
  });
});

describe('chatReducer read state', () => {
  it('marks messages read and lowers the unread count, never below zero', () => {
    let state = run(
      [
        {
          type: 'threadLoaded',
          conversationId: 'c1',
          page: [msg('a1', 'alice', '1', 2), msg('a2', 'alice', '2', 1)],
          pageSize: 50,
        },
      ],
      withConversations(conv('c1', 3), conv('c2', 2)),
    );
    expect(totalUnreadCount(state.conversations)).toBe(5);

    state = run([{ type: 'markedRead', conversationId: 'c1', messageIds: ['a1', 'a2'], readerId: ME }], state);
    expect(thread(state).messages.every((m) => m.reader_ids.includes(ME))).toBe(true);
    expect(state.conversations.map((c) => c.unread_count)).toEqual([1, 2]);
    expect(totalUnreadCount(state.conversations)).toBe(3);

    state = run([{ type: 'markedRead', conversationId: 'c1', messageIds: ['x', 'y'], readerId: ME }], state);
    expect(state.conversations[0].unread_count).toBe(0);
  });

  it('does not add the reader twice', () => {
    const state = run([
      { type: 'threadLoaded', conversationId: 'c1', page: [msg('a1', 'alice', '1', 1, [ME])], pageSize: 50 },
      { type: 'markedRead', conversationId: 'c1', messageIds: ['a1'], readerId: ME },
    ]);
    expect(thread(state).messages[0].reader_ids).toEqual([ME]);
  });
});

describe('useChatStore conversations', () => {
  afterEach(cleanup);

  it('pages through the conversation list when the total exceeds the page size', async () => {
    const all = Array.from({ length: 230 }, (_, i) => conv(`c${i}`, 0, msg(`m${i}`, 'alice', 'hi', i)));
    const getConversations = vi.fn<ChatApi['getConversations']>(async (_id, { limit = 100, skip = 0 } = {}) => ({
      total: all.length,
      limit,
      skip,
      data: all.slice(skip, skip + limit),
    }));
    const api = { getConversations } as unknown as ChatApi;
    const subscribeSocket = () => () => {};
    const { result } = renderHook(() =>
      useChatStore({ currentUserId: ME, api, subscribeSocket, viewingConversationId: null }),
    );

    await act(() => result.current.loadConversations());

    expect(getConversations.mock.calls.map(([, page]) => page)).toEqual([
      { limit: 100, skip: 0 },
      { limit: 100, skip: 100 },
      { limit: 100, skip: 200 },
    ]);
    expect(result.current.conversations).toHaveLength(230);
  });

  it('keeps the current list when the first page is unauthorized (null)', async () => {
    const getConversations = vi.fn<ChatApi['getConversations']>(async () => null);
    const api = { getConversations } as unknown as ChatApi;
    const subscribeSocket = () => () => {};
    const { result } = renderHook(() =>
      useChatStore({ currentUserId: ME, api, subscribeSocket, viewingConversationId: null }),
    );
    await act(() => result.current.loadConversations());
    expect(result.current).toMatchObject({ conversations: [], loadingConversations: false, conversationsLoaded: true });
  });
});
