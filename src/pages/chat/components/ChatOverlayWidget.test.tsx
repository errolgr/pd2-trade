// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { Conversation, Message } from '@/common/types/pd2-website/ChatTypes';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { WhisperHistoryProvider } from '@/hooks/useWhisperHistory';
import { writeText } from '@/lib/browser-clipboard';
import { exists, writeTextFile } from '@/lib/browser-fs';
import { parseHistory, SAVE_DEBOUNCE_MS, WHISPER_HISTORY_FILENAME } from '@/lib/whisper-history';
import { setBadgeCount, showToast, type PanelPayloads } from '@/overlay';
import ChatOverlayWidget from './ChatOverlayWidget';

vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }));
vi.mock('@/lib/browser-clipboard', () => ({ writeText: vi.fn(async () => {}) }));
vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(async () => false),
  mkdir: vi.fn(async () => {}),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(async () => {}),
}));
/** The Rust chat watcher's events (the whisper history provider listens to them). */
const gameLog = vi.hoisted(() => new Map<string, Set<(event: { payload: unknown }) => void>>());
vi.mock('@/lib/browser-events', () => ({
  listen: vi.fn(async (event: string, handler: (event: { payload: unknown }) => void) => {
    if (!gameLog.has(event)) gameLog.set(event, new Set());
    gameLog.get(event)!.add(handler);
    return () => gameLog.get(event)!.delete(handler);
  }),
}));
/**
 * The chat panel's payload/payloadVersion/visible as usePanel() reports them; `openChat()` mimics
 * openPanel('chat', ...). `visible`: on screen, so messages in the open conversation count as read.
 */
const panel = vi.hoisted(() => ({ payload: undefined as unknown, payloadVersion: 0, visible: true }));
vi.mock('@/overlay', () => ({
  setBadgeCount: vi.fn(),
  showToast: vi.fn(),
  confirmToast: vi.fn(),
  usePanel: () => panel,
}));
vi.mock('@/assets/poe_whisper.mp3', () => ({ default: 'whisper.mp3' }));

const NOW = new Date('2026-05-01T12:00:00Z');
const ME = 'me';

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

type SocketHandler = (data: unknown) => void;
let handlers: Map<string, Set<SocketHandler>>;
/** Stable like the provider's: the widget subscribes once per user. */
function subscribeSocket(type: string, cb: SocketHandler) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type)!.add(cb);
  return () => {
    handlers.get(type)!.delete(cb);
  };
}
let rerenderWidget: () => void;
let settings: Record<string, unknown>;
let auth: { accessToken?: string; user?: { _id: string } } | null;
let api: {
  getConversations: Mock<
    (
      participantId: string,
      page?: { limit?: number; skip?: number },
    ) => Promise<{ data: Conversation[]; total?: number }>
  >;
  getMessages: Mock<(conversationId: string, page?: { limit?: number; skip?: number }) => Promise<{ data: Message[] }>>;
  sendMessage: Mock<(conversationId: string, content: string, senderId: string) => Promise<Message>>;
  markMessagesAsRead: Mock<(ids: string[], userId: string) => Promise<boolean>>;
  deleteConversation: Mock<(conversationId: string) => Promise<boolean>>;
};
let messagesByConversation: Record<string, Message[]>;
let incomingOffers: TradeOffer[];
let outgoingOffers: TradeOffer[];
let createConversation: Mock<(participantIds: string[]) => Promise<Conversation>>;
let audio: { src: string; volume: number }[];

const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

function msg(
  id: string,
  conversation_id: string,
  sender_id: string,
  content: string,
  ago: number,
  reader_ids: string[] = [],
): Message {
  const created_at = minutesAgo(ago);
  return {
    _id: id,
    conversation_id,
    sender_id,
    content,
    reader_ids,
    created_at,
    updated_at: created_at,
    created_by_id: sender_id,
  };
}

function conv(
  id: string,
  other: { id: string; username: string; display_name?: string },
  opts: { unread?: number; latest?: Message } = {},
): Conversation {
  return {
    _id: id,
    participant_ids: [ME, other.id],
    created_at: minutesAgo(1000),
    updated_at: minutesAgo(1000),
    created_by_id: ME,
    unread_count: opts.unread ?? 0,
    participants: [
      { _id: ME, username: 'me', created_at: '' },
      { _id: other.id, username: other.username, display_name: other.display_name, created_at: '' },
    ],
    latest_message: opts.latest,
  };
}

const ALICE = { id: 'alice', username: 'alice99', display_name: 'Alice' };
const BOB = { id: 'bob', username: 'bob' };

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/** A socket push event delivered by the provider's socket. */
async function fire(type: string, data: unknown) {
  await act(async () => {
    for (const handler of handlers.get(type) ?? []) handler(data);
  });
  await flush();
}

async function openChat(payload: PanelPayloads['chat']) {
  panel.payload = payload;
  panel.payloadVersion += 1;
  await act(async () => rerenderWidget());
  await flush();
}

/** A line of the game's chat log, as the chat watcher emits it. */
async function gameEvent(event: 'whisper-received' | 'trade-message', payload: unknown) {
  await act(async () => {
    for (const handler of gameLog.get(event) ?? []) handler({ payload });
  });
  await flush();
}

const whisperFrom = (from: string, message: string, isIncoming = true) =>
  gameEvent('whisper-received', { isTrade: false, from, message, isJoin: false, isIncoming });

async function renderWidget(conversations: Conversation[]) {
  api.getConversations.mockResolvedValue({ data: conversations });
  const onClose = vi.fn();
  const widget = () => (
    <WhisperHistoryProvider>
      <ChatOverlayWidget onClose={onClose} />
    </WhisperHistoryProvider>
  );
  const view = render(widget());
  rerenderWidget = () => view.rerender(widget());
  await flush();
  return { ...view, onClose };
}

/** Conversation rows in the sidebar, in display order. */
function rows() {
  return Array.from(document.querySelectorAll('aside button[type="button"]')).filter((b) =>
    b.querySelector('[aria-hidden].rounded-full'),
  );
}
const rowFor = (name: string) => rows().find((r) => r.textContent?.includes(name))! as HTMLElement;
const headerUnread = () => screen.queryByTitle(/unread$/)?.textContent ?? null;
const lastEmittedUnread = () =>
  vi
    .mocked(setBadgeCount)
    .mock.calls.filter(([key]) => key === 'chatUnread')
    .at(-1)?.[1];
/** Message bubble texts in the open conversation, in order. */
const bubbles = () => Array.from(document.querySelectorAll('section .whitespace-pre-wrap')).map((el) => el.textContent);

async function select(name: string) {
  await act(async () => {
    fireEvent.click(rowFor(name));
  });
  await flush(200);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  handlers = new Map();
  panel.payload = undefined;
  panel.payloadVersion = 0;
  panel.visible = true;
  settings = {};
  auth = { accessToken: 'tok', user: { _id: ME } };
  messagesByConversation = {};
  incomingOffers = [];
  outgoingOffers = [];
  createConversation = vi.fn();
  gameLog.clear();
  vi.mocked(writeText).mockClear();
  vi.mocked(writeTextFile).mockClear();
  vi.mocked(exists).mockResolvedValue(false);
  vi.mocked(showToast).mockClear();
  audio = [];
  api = {
    getConversations: vi.fn(),
    // Newest first, paged like the server
    getMessages: vi.fn(async (id: string, { limit = 50, skip = 0 } = {}) => ({
      data: [...(messagesByConversation[id] ?? [])]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(skip, skip + limit),
    })),
    sendMessage: vi.fn(),
    markMessagesAsRead: vi.fn(async () => true),
    deleteConversation: vi.fn(async () => true),
  };
  // Linked listings resolve to nothing, so listing links stay link chips in these tests.
  const noListings = async () => ({ total: 0, limit: 0, skip: 0, data: [] });
  vi.mocked(usePd2Website).mockImplementation(
    () =>
      ({
        authData: auth,
        subscribeSocket,
        getMarketListings: noListings,
        getMarketListingsArchive: noListings,
        incomingOffers,
        outgoingOffers,
        hiddenOutgoingOffers: [],
        createConversation,
        ...api,
      }) as unknown as ReturnType<typeof usePd2Website>,
  );
  vi.mocked(useOptions).mockImplementation(() => ({ settings }) as unknown as ReturnType<typeof useOptions>);
  vi.mocked(setBadgeCount).mockReset();
  vi.stubGlobal(
    'Audio',
    class {
      volume = 1;
      constructor(public src: string) {
        audio.push(this);
      }
      play() {
        return Promise.resolve();
      }
    },
  );
  // The virtual message list renders the rows that fit its viewport: give the viewport a height (rows measure 0).
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset.slot === 'scroll-area-viewport' ? 600 : 0;
    },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight');
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('ChatOverlayWidget conversation list', () => {
  it('lists conversations with messages, most recent first, with names and unread badges', async () => {
    await renderWidget([
      conv('c-old', BOB, { latest: msg('m1', 'c-old', 'bob', 'old news', 120) }),
      conv('c-empty', { id: 'carol', username: 'carol' }),
      conv('c-new', ALICE, { unread: 2, latest: msg('m2', 'c-new', 'alice', 'you there?', 3) }),
    ]);

    expect(api.getConversations).toHaveBeenCalledWith(ME, { limit: 100, skip: 0 });
    expect(rows().map((r) => r.textContent)).toEqual([
      expect.stringContaining('Alice'),
      expect.stringContaining('bob'),
    ]);
    expect(rowFor('Alice').textContent).toContain('2');
    expect(rowFor('Alice').textContent).toContain('3m');
    expect(rowFor('Alice').textContent).toContain('you there?');
    expect(screen.queryByText('carol')).toBeNull();
  });

  it('sums unread counts into the header badge and broadcasts the total', async () => {
    await renderWidget([
      conv('c1', ALICE, { unread: 2, latest: msg('m1', 'c1', 'alice', 'a', 1) }),
      conv('c2', BOB, { unread: 3, latest: msg('m2', 'c2', 'bob', 'b', 2) }),
    ]);
    expect(headerUnread()).toBe('5');
    expect(lastEmittedUnread()).toBe(5);
  });

  it('summarises listing links in previews by display name', async () => {
    await renderWidget([
      conv('c1', ALICE, {
        latest: msg(
          'm1',
          'c1',
          'alice',
          'https://www.projectdiablo2.com/market/listing/abc123?display="Harlequin%20Crest"',
          1,
        ),
      }),
      conv('c2', BOB, {
        latest: msg('m2', 'c2', 'bob', 'see https://www.projectdiablo2.com/market/listing/def456', 2),
      }),
    ]);
    expect(rowFor('Alice').textContent).toContain('📦 Harlequin Crest');
    expect(rowFor('bob').textContent).toContain('📦 Market Listing');
  });

  it('marks own latest messages as Read once the other participant has read them, otherwise Sent', async () => {
    await renderWidget([
      conv('c1', ALICE, { latest: msg('m1', 'c1', ME, 'read one', 1, ['alice']) }),
      conv('c2', BOB, { latest: msg('m2', 'c2', ME, 'unread one', 2, [ME]) }),
      conv('c3', { id: 'dan', username: 'dan' }, { latest: msg('m3', 'c3', 'dan', 'theirs', 3) }),
    ]);
    expect(within(rowFor('Alice')).queryByLabelText('Read')).not.toBeNull();
    expect(within(rowFor('bob')).queryByLabelText('Sent')).not.toBeNull();
    expect(within(rowFor('dan')).queryByLabelText('Read')).toBeNull();
    expect(within(rowFor('dan')).queryByLabelText('Sent')).toBeNull();
  });

  it('filters by participant name or message text, and clears with Escape', async () => {
    await renderWidget([
      conv('c1', ALICE, { latest: msg('m1', 'c1', 'alice', 'selling shako', 1) }),
      conv('c2', BOB, { latest: msg('m2', 'c2', 'bob', 'wtb enigma', 2) }),
    ]);
    const search = screen.getByPlaceholderText('Search chats...');

    fireEvent.change(search, { target: { value: '  ALICE99 ' } });
    expect(rows().map((r) => r.textContent?.includes('Alice'))).toEqual([true]);

    fireEvent.change(search, { target: { value: 'enigma' } });
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('bob');

    fireEvent.change(search, { target: { value: 'zod' } });
    expect(rows()).toHaveLength(0);
    expect(screen.queryByText('No conversations match your search')).not.toBeNull();

    fireEvent.keyDown(search, { key: 'Escape' });
    expect(rows()).toHaveLength(2);
  });

  it('shows a sign-in hint and loads nothing when not authenticated', async () => {
    auth = { user: { _id: ME } };
    await renderWidget([]);
    expect(api.getConversations).not.toHaveBeenCalled();
    expect(screen.queryByText('Not authenticated')).not.toBeNull();
    expect(screen.queryByText('Sign in to Project Diablo 2 in Settings → Account to chat.')).not.toBeNull();
  });

  it('shows an error with a retry when loading conversations fails', async () => {
    api.getConversations.mockRejectedValue(new Error('offline'));
    render(
      <WhisperHistoryProvider>
        <ChatOverlayWidget onClose={vi.fn()} />
      </WhisperHistoryProvider>,
    );
    await flush();
    expect(screen.queryByText("Couldn't load conversations")).not.toBeNull();
    expect(screen.queryByText('Loading conversations...')).toBeNull();

    api.getConversations.mockResolvedValue({
      data: [conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 1) })],
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    });
    await flush();
    expect(screen.queryByText("Couldn't load conversations")).toBeNull();
    expect(rows()).toHaveLength(1);
  });

  it('closes via the window chrome', async () => {
    const { onClose } = await renderWidget([]);
    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ChatOverlayWidget conversation switching', () => {
  it('loads messages in chronological order when a conversation is opened', async () => {
    messagesByConversation.c1 = [
      msg('a2', 'c1', ME, 'second', 5, ['alice']),
      msg('a1', 'c1', 'alice', 'first', 10, [ME]),
    ];
    await renderWidget([conv('c1', ALICE, { latest: msg('a2', 'c1', ME, 'second', 5) })]);
    expect(screen.queryByText('Select a conversation to view messages')).not.toBeNull();

    await select('Alice');

    expect(rowFor('Alice').getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('Alice');
    expect(screen.queryByText('@alice99')).not.toBeNull();
    expect(bubbles()).toEqual(['first', 'second']);
    expect(screen.queryByText('Today')).not.toBeNull();
  });

  it('replaces the message list when switching, and shows cached messages when switching back', async () => {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'from alice', 10, [ME])];
    messagesByConversation.c2 = [msg('b1', 'c2', 'bob', 'from bob', 20, [ME])];
    await renderWidget([
      conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'from alice', 10) }),
      conv('c2', BOB, { latest: msg('b1', 'c2', 'bob', 'from bob', 20) }),
    ]);

    await select('Alice');
    expect(bubbles()).toEqual(['from alice']);

    await select('bob');
    expect(bubbles()).toEqual(['from bob']);
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('bob');

    // Second visit: the API hangs, but the cached thread is shown anyway
    api.getMessages.mockImplementation(() => Promise.withResolvers<{ data: Message[] }>().promise);
    await select('Alice');
    expect(bubbles()).toEqual(['from alice']);
  });

  it('marks unread incoming messages read on open and decrements the unread counts', async () => {
    messagesByConversation.c1 = [
      msg('a1', 'c1', 'alice', 'hi', 10),
      msg('a2', 'c1', 'alice', 'still there?', 9),
      msg('a3', 'c1', ME, 'yes', 8),
      msg('a4', 'c1', 'alice', 'already seen', 7, [ME]),
    ];
    await renderWidget([
      conv('c1', ALICE, { unread: 2, latest: msg('a4', 'c1', 'alice', 'already seen', 7) }),
      conv('c2', BOB, { unread: 1, latest: msg('b1', 'c2', 'bob', 'yo', 20) }),
    ]);
    expect(headerUnread()).toBe('3');

    await select('Alice');

    // One batched request covering only unread messages from the other participant
    expect(api.markMessagesAsRead.mock.calls).toEqual([[['a1', 'a2'], ME]]);
    expect(headerUnread()).toBe('1');
    expect(lastEmittedUnread()).toBe(1);
  });

  it('keeps the unread count when marking as read fails', async () => {
    api.markMessagesAsRead.mockRejectedValue(new Error('500'));
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10)];
    await renderWidget([conv('c1', ALICE, { unread: 1, latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    await select('Alice');
    expect(headerUnread()).toBe('1');
  });

  it('keeps the unread count when marking as read is unauthorized', async () => {
    api.markMessagesAsRead.mockResolvedValue(false);
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10)];
    await renderWidget([conv('c1', ALICE, { unread: 1, latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    await select('Alice');
    await act(async () => rerenderWidget());
    await flush();
    expect(api.markMessagesAsRead).toHaveBeenCalledTimes(1);
    expect(headerUnread()).toBe('1');
    expect(lastEmittedUnread()).toBe(1);
  });

  it('marks cached and freshly fetched unread messages read in a single request on open', async () => {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    messagesByConversation.c2 = [msg('b1', 'c2', 'bob', 'yo', 20), msg('b2', 'c2', 'bob', 'pushed earlier', 0)];
    await renderWidget([
      conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) }),
      conv('c2', BOB, { unread: 1, latest: msg('b1', 'c2', 'bob', 'yo', 20) }),
    ]);
    // Cached before the thread is opened
    await fire('social/message_pushed', msg('b2', 'c2', 'bob', 'pushed earlier', 0));
    expect(headerUnread()).toBe('2');

    await select('bob');
    await act(async () => rerenderWidget());
    await flush(200);

    expect(api.markMessagesAsRead.mock.calls).toEqual([[['b1', 'b2'], ME]]);
    expect(headerUnread()).toBeNull();
    expect(lastEmittedUnread()).toBe(0);
  });

  it('does not re-send a mark-read that is still in flight', async () => {
    const pending = Promise.withResolvers<boolean>();
    api.markMessagesAsRead.mockReturnValue(pending.promise);
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10)];
    await renderWidget([conv('c1', ALICE, { unread: 1, latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    await select('Alice');
    // More triggers while the request is pending: a re-render and a new push into the open thread
    await act(async () => rerenderWidget());
    await fire('social/message_pushed', msg('a2', 'c1', 'alice', 'again', 0));

    expect(api.markMessagesAsRead.mock.calls).toEqual([
      [['a1'], ME],
      [['a2'], ME],
    ]);
    await act(async () => pending.resolve(true));
    await flush();
    expect(api.markMessagesAsRead).toHaveBeenCalledTimes(2);
    expect(headerUnread()).toBeNull();
  });

  it('opens a conversation requested through the panel payload, injecting it when new', async () => {
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    const fresh = conv('c-new', BOB);
    await openChat({ conversationId: 'c-new', conversation: fresh });
    await flush(200);

    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('bob');
    expect(screen.queryByText('Say hi to bob.')).not.toBeNull();
    expect(api.getMessages).toHaveBeenCalledWith('c-new', { limit: 50, skip: 0 });
  });

  it('opens an existing conversation requested by id', async () => {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hello again', 10, [ME])];
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hello again', 10) })]);
    await openChat({ conversationId: 'c1' });
    await flush(200);

    expect(rowFor('Alice').getAttribute('aria-current')).toBe('true');
    expect(bubbles()).toEqual(['hello again']);
  });

  it('re-selects on every open, even with the same conversation id', async () => {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([
      conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) }),
      conv('c2', BOB, { latest: msg('b1', 'c2', 'bob', 'yo', 20) }),
    ]);
    await openChat({ conversationId: 'c1' });
    await flush(200);
    await select('bob');
    expect(rowFor('bob').getAttribute('aria-current')).toBe('true');

    await openChat({ conversationId: 'c1' });
    await flush(200);
    expect(rowFor('Alice').getAttribute('aria-current')).toBe('true');
  });

  it('selects a requested conversation once a still-loading list arrives', async () => {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    const list = Promise.withResolvers<{ data: Conversation[] }>();
    api.getConversations.mockReturnValue(list.promise);
    const widget = () => (
      <WhisperHistoryProvider>
        <ChatOverlayWidget onClose={vi.fn()} />
      </WhisperHistoryProvider>
    );
    const view = render(widget());
    rerenderWidget = () => view.rerender(widget());

    await openChat({ conversationId: 'c1' });
    await act(async () => list.resolve({ data: [conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })] }));
    await flush(600);
    expect(rowFor('Alice').getAttribute('aria-current')).toBe('true');
  });

  it('ignores opens without a conversation id', async () => {
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    await openChat(undefined);
    expect(rowFor('Alice').getAttribute('aria-current')).not.toBe('true');
    expect(api.getMessages).not.toHaveBeenCalled();
  });

  it('reloads conversations to find a requested id it does not know yet', async () => {
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    api.getConversations.mockResolvedValue({
      data: [
        conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) }),
        conv('c2', BOB, { latest: msg('b1', 'c2', 'bob', 'new chat', 1) }),
      ],
    });
    await openChat({ conversationId: 'c2' });
    await flush(600);

    expect(api.getConversations).toHaveBeenCalledTimes(2);
    expect(rowFor('bob').getAttribute('aria-current')).toBe('true');
  });

  it('deletes the open conversation and clears the selection', async () => {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([
      conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) }),
      conv('c2', BOB, { latest: msg('b1', 'c2', 'bob', 'yo', 20) }),
    ]);
    await select('Alice');

    const trigger = screen.getByRole('button', { name: 'Conversation options' });
    await act(async () => {
      fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: /Delete Conversation/ }));
    });
    await flush();

    expect(api.deleteConversation).toHaveBeenCalledWith('c1');
    expect(rows().map((r) => r.textContent?.includes('bob'))).toEqual([true]);
    expect(screen.queryByText('Select a conversation to view messages')).not.toBeNull();
  });

  it('keeps the conversation when deleting it is unauthorized', async () => {
    api.deleteConversation.mockResolvedValue(false);
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    await select('Alice');

    const trigger = screen.getByRole('button', { name: 'Conversation options' });
    await act(async () => {
      fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: /Delete Conversation/ }));
    });
    await flush();

    expect(api.deleteConversation).toHaveBeenCalledWith('c1');
    expect(rowFor('Alice').getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('Alice');
  });
});

describe('ChatOverlayWidget composer', () => {
  async function openAlice() {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([
      conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) }),
      conv('c2', BOB, { latest: msg('b1', 'c2', 'bob', 'yo', 5) }),
    ]);
    await select('Alice');
    return screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
  }

  it('sends trimmed text on Enter, appends it and moves the conversation to the top', async () => {
    api.sendMessage.mockImplementation(async (c, content, sender) => msg('sent1', c, sender, content, 0));
    const input = await openAlice();
    expect(rows()[0].textContent).toContain('bob');

    fireEvent.change(input, { target: { value: '  sure, 2 ist  ' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    await flush(200);

    expect(api.sendMessage).toHaveBeenCalledWith('c1', 'sure, 2 ist', ME);
    expect(input.value).toBe('');
    expect(bubbles()).toEqual(['hi', 'sure, 2 ist']);
    expect(rows()[0].textContent).toContain('Alice');
    expect(within(rows()[0] as HTMLElement).queryByLabelText('Sent')).not.toBeNull();
  });

  it('does not send blank input or on Shift+Enter', async () => {
    const input = await openAlice();
    const send = screen.getByRole('button', { name: /Send/ }) as HTMLButtonElement;

    fireEvent.change(input, { target: { value: '   ' } });
    expect(send.disabled).toBe(true);
    fireEvent.keyDown(input, { key: 'Enter' });

    fireEvent.change(input, { target: { value: 'draft' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    await flush();

    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(input.value).toBe('draft');
  });

  async function sendText(input: HTMLTextAreaElement, text: string) {
    fireEvent.change(input, { target: { value: text } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send/ }));
    });
    await flush();
  }
  /** The bubble element of a message in the open conversation. */
  const bubbleOf = (text: string) =>
    Array.from(document.querySelectorAll('section .whitespace-pre-wrap')).find((el) => el.textContent === text)!
      .parentElement!;

  it('shows a pending send as a dimmed bubble until the server acknowledges it', async () => {
    const response = Promise.withResolvers<Message>();
    api.sendMessage.mockReturnValue(response.promise);
    const input = await openAlice();
    await sendText(input, 'hello');

    expect(input.value).toBe('');
    expect(bubbles()).toEqual(['hi', 'hello']);
    expect(bubbleOf('hello').getAttribute('aria-busy')).toBe('true');
    expect(within(bubbleOf('hello')).queryByLabelText('Sent')).toBeNull();

    await act(async () => response.resolve(msg('srv1', 'c1', ME, 'hello', 0)));
    await flush();
    expect(bubbles()).toEqual(['hi', 'hello']);
    expect(bubbleOf('hello').getAttribute('aria-busy')).toBeNull();
    expect(within(bubbleOf('hello')).queryByLabelText('Sent')).not.toBeNull();
  });

  it('keeps a failed send on its bubble with a retry that resends it', async () => {
    api.sendMessage.mockRejectedValueOnce(new Error('network'));
    const input = await openAlice();
    await sendText(input, 'hello');

    expect(input.value).toBe('');
    expect(bubbles()).toEqual(['hi', 'hello']);
    expect(within(bubbleOf('hello')).queryByText(/Failed/)).not.toBeNull();
    // The conversation preview only moves for delivered messages
    expect(rowFor('Alice').textContent).not.toContain('hello');

    api.sendMessage.mockImplementation(async (c, content, sender) => msg('srv1', c, sender, content, 0));
    await act(async () => {
      fireEvent.click(within(bubbleOf('hello')).getByRole('button', { name: 'Retry' }));
    });
    await flush();

    expect(api.sendMessage.mock.calls).toEqual([
      ['c1', 'hello', ME],
      ['c1', 'hello', ME],
    ]);
    expect(bubbles()).toEqual(['hi', 'hello']);
    expect(within(bubbleOf('hello')).queryByText(/Failed/)).toBeNull();
    expect(rowFor('Alice').textContent).toContain('hello');
  });

  it('a socket echo of a pending send acknowledges it instead of adding a second bubble', async () => {
    const response = Promise.withResolvers<Message>();
    api.sendMessage.mockReturnValue(response.promise);
    const input = await openAlice();
    await sendText(input, 'hello');

    await fire('social/message_pushed', msg('srv1', 'c1', ME, 'hello', 0));
    expect(bubbles()).toEqual(['hi', 'hello']);
    expect(bubbleOf('hello').getAttribute('aria-busy')).toBeNull();

    await act(async () => response.resolve(msg('srv1', 'c1', ME, 'hello', 0)));
    await flush();
    expect(bubbles()).toEqual(['hi', 'hello']);
  });
});

describe('ChatOverlayWidget drafts and offers', () => {
  async function openBoth() {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    messagesByConversation.c2 = [msg('b1', 'c2', 'bob', 'yo', 5, [ME])];
    await renderWidget([
      conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) }),
      conv('c2', BOB, { latest: msg('b1', 'c2', 'bob', 'yo', 5) }),
    ]);
  }
  const composer = () => screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;

  it("keeps each conversation's unsent text when switching threads and hiding the panel", async () => {
    await openBoth();
    await select('Alice');
    fireEvent.change(composer(), { target: { value: 'half-typed offer' } });

    await select('bob');
    expect(composer().value).toBe('');
    fireEvent.change(composer(), { target: { value: 'for bob' } });

    panel.visible = false;
    await act(async () => rerenderWidget());
    panel.visible = true;
    await act(async () => rerenderWidget());

    await select('Alice');
    expect(composer().value).toBe('half-typed offer');
    await select('bob');
    expect(composer().value).toBe('for bob');
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  it('pins offers with the other participant above the thread; Counter puts a reply in the composer', async () => {
    incomingOffers = [
      {
        id: 'o1',
        isIncoming: true,
        playerName: 'alice',
        itemName: 'Shako',
        timestamp: new Date(NOW),
        listingId: 'l1',
        userId: 'alice',
      },
    ];
    await openBoth();
    await select('bob');
    expect(screen.queryByRole('list', { name: 'Offers with this user' })).toBeNull();

    await select('Alice');
    const deals = screen.getByRole('list', { name: 'Offers with this user' });
    // Opening the thread focused the composer; take focus away so the Counter has to bring it back
    composer().blur();
    await act(async () => {
      fireEvent.click(within(deals).getByRole('button', { name: /Counter/ }));
    });
    expect(composer().value).toBe('Counter for Shako: ');
    expect(document.activeElement).toBe(composer());
  });
});

describe('ChatOverlayWidget socket messages', () => {
  async function setup() {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([
      conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) }),
      conv('c2', BOB, { unread: 1, latest: msg('b1', 'c2', 'bob', 'yo', 20) }),
    ]);
  }

  it('bumps unread, updates the preview and plays the whisper sound for a background conversation', async () => {
    settings.whisperNotificationVolume = 25;
    await setup();
    await fire('social/message_pushed', msg('b2', 'c2', 'bob', 'still selling?', 0));

    expect(rowFor('bob').textContent).toContain('still selling?');
    expect(rowFor('bob').textContent).toContain('Just now');
    expect(headerUnread()).toBe('2');
    expect(rows()[0].textContent).toContain('bob');
    expect(audio).toEqual([expect.objectContaining({ src: 'whisper.mp3', volume: 0.25 })]);
  });

  it('ignores a duplicate push of the same message', async () => {
    await setup();
    const m = msg('b2', 'c2', 'bob', 'dup', 0);
    await fire('social/message_pushed', m);
    await fire('social/message_pushed', m);
    expect(headerUnread()).toBe('2');
    expect(audio).toHaveLength(1);
  });

  it('stays silent when whisper notifications are disabled', async () => {
    settings.whisperNotificationsEnabled = false;
    await setup();
    await fire('social/message_pushed', msg('b2', 'c2', 'bob', 'quiet', 0));
    expect(headerUnread()).toBe('2');
    expect(audio).toHaveLength(0);
  });

  it('appends to the open conversation and marks it read once, without bumping unread or playing a sound', async () => {
    await setup();
    await select('Alice');
    api.markMessagesAsRead.mockClear();

    const pushed = msg('a2', 'c1', 'alice', 'new while open', 0);
    await fire('social/message_pushed', pushed);
    await fire('social/message_pushed', pushed);
    await act(async () => rerenderWidget());
    await flush();

    expect(bubbles()).toEqual(['hi', 'new while open']);
    expect(api.markMessagesAsRead.mock.calls).toEqual([[['a2'], ME]]);
    expect(headerUnread()).toBe('1');
    expect(audio).toHaveLength(0);
  });

  it('treats the open conversation as background while the panel is hidden, and reads it when shown', async () => {
    await setup();
    await select('Alice');
    api.markMessagesAsRead.mockClear();
    panel.visible = false;
    await act(async () => rerenderWidget());

    await fire('social/message_pushed', msg('a2', 'c1', 'alice', 'while hidden', 0));
    expect(bubbles()).toEqual(['hi', 'while hidden']);
    expect(api.markMessagesAsRead).not.toHaveBeenCalled();
    expect(headerUnread()).toBe('2');
    expect(audio).toHaveLength(1);

    panel.visible = true;
    await act(async () => rerenderWidget());
    await flush();
    expect(api.markMessagesAsRead.mock.calls).toEqual([[['a2'], ME]]);
    expect(headerUnread()).toBe('1');
  });

  it('does not count own messages echoed from another device as unread', async () => {
    await setup();
    await fire('social/message_pushed', msg('b2', 'c2', ME, 'mine', 0));
    expect(headerUnread()).toBe('1');
    expect(audio).toHaveLength(0);
    expect(within(rowFor('bob')).queryByLabelText('Sent')).not.toBeNull();
  });

  it('reloads conversations when a message arrives for an unknown conversation', async () => {
    await setup();
    api.getConversations.mockResolvedValue({
      data: [
        conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) }),
        conv('c3', { id: 'eve', username: 'eve' }, { unread: 1, latest: msg('e1', 'c3', 'eve', 'new person', 0) }),
      ],
    });
    await fire('social/message_pushed', msg('e1', 'c3', 'eve', 'new person', 0));
    await flush();

    expect(api.getConversations).toHaveBeenCalledTimes(2);
    expect(rowFor('eve').textContent).toContain('new person');
  });

  it('shows a cached background message immediately when its conversation is opened later', async () => {
    await setup();
    await fire('social/message_pushed', msg('b2', 'c2', 'bob', 'pushed earlier', 0));
    api.getMessages.mockImplementation(() => Promise.withResolvers<{ data: Message[] }>().promise);
    await select('bob');
    expect(bubbles()).toEqual(['pushed earlier']);
  });

  it('unsubscribes from socket messages on unmount', async () => {
    const { unmount } = await renderWidget([]);
    expect(handlers.get('social/message_pushed')?.size).toBe(1);
    unmount();
    expect(handlers.get('social/message_pushed')?.size).toBe(0);
  });
});

describe('ChatOverlayWidget message paging', () => {
  /** `count` read messages from alice, one minute apart, oldest first ('m1' is the oldest). */
  function history(count: number) {
    return Array.from({ length: count }, (_, i) => msg(`m${i + 1}`, 'c1', 'alice', `line ${i + 1}`, count - i, [ME]));
  }
  async function scrollToTop() {
    const viewport = document.querySelector('section [data-slot="scroll-area-viewport"]')!;
    await act(async () => {
      fireEvent.scroll(viewport, { target: { scrollTop: 0 } });
    });
    await flush();
  }

  it('opens on the newest page and loads older pages near the top until a short page', async () => {
    messagesByConversation.c1 = history(120);
    await renderWidget([conv('c1', ALICE, { latest: messagesByConversation.c1[119] })]);
    await select('Alice');

    expect(api.getMessages.mock.calls).toEqual([['c1', { limit: 50, skip: 0 }]]);
    expect(bubbles()).toHaveLength(50);
    expect(bubbles()[0]).toBe('line 71');
    expect(bubbles().at(-1)).toBe('line 120');

    await scrollToTop();
    expect(api.getMessages.mock.calls.at(-1)).toEqual(['c1', { limit: 50, skip: 50 }]);
    // The prepended page sits above the reading position, which stays on the previous top message
    expect(bubbles()).toContain('line 71');
    expect(bubbles()).not.toContain('line 21');

    await scrollToTop();
    expect(api.getMessages.mock.calls.at(-1)).toEqual(['c1', { limit: 50, skip: 100 }]);

    // The last page was short: the start of the thread is reached
    await scrollToTop();
    expect(api.getMessages).toHaveBeenCalledTimes(3);
    expect(new Set(bubbles()).size).toBe(bubbles().length);
  });

  it('does not page a thread whose first page was short', async () => {
    messagesByConversation.c1 = history(3);
    await renderWidget([conv('c1', ALICE, { latest: messagesByConversation.c1[2] })]);
    await select('Alice');
    await scrollToTop();
    expect(api.getMessages).toHaveBeenCalledTimes(1);
    expect(bubbles()).toEqual(['line 1', 'line 2', 'line 3']);
  });

  it('skips past messages pushed since the thread opened, so older pages do not repeat them', async () => {
    messagesByConversation.c1 = history(60);
    await renderWidget([conv('c1', ALICE, { latest: messagesByConversation.c1[59] })]);
    await select('Alice');
    const pushed = msg('m61', 'c1', 'alice', 'line 61', 0);
    messagesByConversation.c1.push(pushed);
    await fire('social/message_pushed', pushed);

    await scrollToTop();
    expect(api.getMessages.mock.calls.at(-1)).toEqual(['c1', { limit: 50, skip: 51 }]);
    expect(new Set(bubbles()).size).toBe(bubbles().length);
  });
});

describe('ChatOverlayWidget unified inbox', () => {
  /** Alice registered the in-game account AliceAcc. */
  const withAccount = (conversation: Conversation, accounts: string[]) => {
    conversation.participants[1].game = { accounts };
    return conversation;
  };
  const composer = () => screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
  const filterButton = (name: string) => screen.getByRole('radio', { name });
  const sourceTags = () =>
    Array.from(document.querySelectorAll('section [role="img"][aria-label]')).map((el) =>
      el.getAttribute('aria-label'),
    );
  async function whisperAt(minutesAgo: number, from: string, message: string, isIncoming = true) {
    vi.setSystemTime(NOW.getTime() - minutesAgo * 60_000);
    await whisperFrom(from, message, isIncoming);
    vi.setSystemTime(NOW);
  }
  async function type(text: string) {
    await act(async () => {
      fireEvent.change(composer(), { target: { value: text } });
    });
    await act(async () => {
      fireEvent.keyDown(composer(), { key: 'Enter' });
    });
    await flush();
  }

  it("merges a linked sender's whispers into their website thread, interleaved by time with source tags", async () => {
    messagesByConversation.c1 = [
      msg('a1', 'c1', 'alice', 'website hi', 10, [ME]),
      msg('a2', 'c1', ME, 'website reply', 2),
    ];
    await renderWidget([
      withAccount(conv('c1', ALICE, { latest: msg('a2', 'c1', ME, 'website reply', 2) }), ['AliceAcc']),
      conv('c2', BOB, { latest: msg('b1', 'c2', 'bob', 'yo', 20) }),
    ]);
    await whisperAt(5, '*aliceacc', 'whisper in between');

    expect(rows().map((r) => r.textContent)).toEqual([
      expect.stringContaining('Alice'),
      expect.stringContaining('bob'),
    ]);
    // The newest item is the website reply; the whisper counts as unread
    expect(rowFor('Alice').textContent).toContain('website reply');
    expect(headerUnread()).toBe('1');
    expect(lastEmittedUnread()).toBe(1);

    await select('Alice');
    expect(bubbles()).toEqual(['website hi', 'whisper in between', 'website reply']);
    expect(sourceTags()).toEqual(['Website message', 'In-game whisper', 'Website message']);
    expect(headerUnread()).toBeNull();
    expect(lastEmittedUnread()).toBe(0);

    await whisperAt(0, 'AliceAcc', 'newest whisper');
    expect(rowFor('Alice').textContent).toContain('newest whisper');
    expect(bubbles().at(-1)).toBe('newest whisper');
  });

  it('gives an unknown sender an in-game only thread that replies by copying a /w whisper', async () => {
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    await whisperAt(1, 'Zed', 'wtb shako?');
    expect(rows().map((r) => r.textContent)).toEqual([
      expect.stringContaining('Zed'),
      expect.stringContaining('Alice'),
    ]);

    await select('Zed');
    expect(screen.queryByText('in-game only')).not.toBeNull();
    expect(screen.queryByRole('group', { name: 'Reply via' })).toBeNull();
    expect(composer().placeholder).toBe('Whisper *Zed...');

    await type('2 ist');
    expect(writeText).toHaveBeenCalledWith('/w *Zed 2 ist');
    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(bubbles()).toEqual(['wtb shako?', '2 ist']);
    expect(screen.queryByText('· copied')).not.toBeNull();

    // The game log showing it sent confirms the copied entry instead of adding another
    await whisperAt(0, 'Zed', '2 ist', false);
    expect(bubbles()).toEqual(['wtb shako?', '2 ist']);
    expect(screen.queryByText('· copied')).toBeNull();

    // Persisted, debounced
    await flush(SAVE_DEBOUNCE_MS);
    const saved = vi
      .mocked(writeTextFile)
      .mock.calls.filter(([file]) => file === WHISPER_HISTORY_FILENAME)
      .at(-1)!;
    expect(parseHistory(saved[1]).people.zed.messages.map((m) => [m.isIncoming, m.message])).toEqual([
      [true, 'wtb shako?'],
      [false, '2 ist'],
    ]);
  });

  it('sends website DMs by default in a merged thread and whispers after switching to Whisper', async () => {
    api.sendMessage.mockImplementation(async (c, content, sender) => msg('sent1', c, sender, content, 0));
    await renderWidget([withAccount(conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) }), ['AliceAcc'])]);
    await select('Alice');

    await type('via website');
    expect(api.sendMessage).toHaveBeenCalledWith('c1', 'via website', ME);
    expect(writeText).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(within(screen.getByRole('group', { name: 'Reply via' })).getByRole('radio', { name: /Whisper/ }));
    });
    await type('via game');
    expect(writeText).toHaveBeenCalledWith('/w *AliceAcc via game');
    expect(api.sendMessage).toHaveBeenCalledTimes(1);
    expect(bubbles().at(-1)).toBe('via game');
    expect(sourceTags().at(-1)).toBe('In-game whisper');
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Whisper copied' }));
  });

  it('filters the list to Selling or Buying threads, and the offers payload opens on Selling', async () => {
    incomingOffers = [
      { id: 'o1', isIncoming: true, playerName: 'carol', itemName: 'Shako', timestamp: new Date(NOW), userId: 'carol' },
    ];
    outgoingOffers = [
      { id: 'o2', isIncoming: false, playerName: 'bob', itemName: 'Ber', timestamp: new Date(NOW), userId: 'bob' },
    ];
    await renderWidget([
      conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) }),
      conv('c2', BOB, { latest: msg('b1', 'c2', 'bob', 'yo', 20) }),
    ]);
    await gameEvent('trade-message', {
      isIncoming: true,
      playerName: 'Dan',
      accountName: 'Dan',
      characterName: 'DanChar',
      message: "Hi, I'm interested in your Arach listed for 1 ist",
      itemName: 'Arach',
      price: '1 ist',
    });
    const names = () => rows().map((r) => ['Alice', 'bob', 'carol', 'Dan'].find((n) => r.textContent?.includes(n)));
    expect(names().sort()).toEqual(['Alice', 'Dan', 'bob', 'carol']);

    await act(async () => fireEvent.click(filterButton('Selling')));
    expect(names().sort()).toEqual(['Dan', 'carol']);
    await act(async () => fireEvent.click(filterButton('Buying')));
    expect(names()).toEqual(['bob']);
    await act(async () => fireEvent.click(filterButton('All')));
    expect(names()).toHaveLength(4);

    await openChat({ filter: 'selling' });
    expect(filterButton('Selling').getAttribute('aria-checked')).toBe('true');
    expect(names().sort()).toEqual(['Dan', 'carol']);
    // Opening a conversation shows the full list again
    await openChat({ conversationId: 'c1' });
    expect(filterButton('All').getAttribute('aria-checked')).toBe('true');
  });

  it("pins a trade whisper in the sender's thread; Sold copies the template whisper and records it", async () => {
    settings.soldOfferMessageTemplate = 'Sorry, {itemName} is sold.';
    await renderWidget([]);
    await gameEvent('trade-message', {
      isIncoming: true,
      playerName: 'Dan',
      accountName: 'Dan',
      characterName: 'DanChar',
      message: "Hi, I'm interested in your Arach listed for 1 ist",
      itemName: 'Arach',
      price: '1 ist',
    });
    await select('Dan');
    const deals = screen.getByRole('list', { name: 'Offers with this user' });
    expect(deals.textContent).toContain('Arach');
    await act(async () => {
      fireEvent.click(within(deals).getByRole('button', { name: /Sold/ }));
    });
    await flush();
    expect(writeText).toHaveBeenCalledWith('/w *Dan Sorry, Arach is sold.');
    expect(bubbles().at(-1)).toBe('Sorry, Arach is sold.');

    await act(async () => {
      fireEvent.click(within(deals).getByRole('button', { name: /Dismiss/ }));
    });
    expect(screen.queryByRole('list', { name: 'Offers with this user' })).toBeNull();
  });

  it('starts the conversation on the first website message to an offers-only person', async () => {
    incomingOffers = [
      { id: 'o1', isIncoming: true, playerName: 'carol', itemName: 'Shako', timestamp: new Date(NOW), userId: 'carol' },
    ];
    createConversation.mockResolvedValue(conv('c9', { id: 'carol', username: 'carol' }));
    api.sendMessage.mockImplementation(async (c, content, sender) => msg('sent1', c, sender, content, 0));
    await renderWidget([]);
    await select('carol');
    expect(screen.queryByText('in-game only')).toBeNull();

    await type('still for sale?');
    expect(createConversation).toHaveBeenCalledWith([ME, 'carol']);
    expect(api.sendMessage).toHaveBeenCalledWith('c9', 'still for sale?', ME);
    expect(rows()).toHaveLength(1);
    expect(bubbles()).toEqual(['still for sale?']);
  });

  it('follows the open whisper thread into the conversation it merges with: reads it, keeps the draft', async () => {
    await renderWidget([]);
    await whisperAt(1, 'Zed', 'wtb shako?');
    await select('Zed');
    fireEvent.change(composer(), { target: { value: 'half typed' } });

    // A website conversation with Zed (account registered) appears while his whisper thread is open
    const first = msg('z1', 'c9', 'zed', 'hi from the site', 0);
    messagesByConversation.c9 = [first];
    api.getConversations.mockResolvedValue({
      data: [withAccount(conv('c9', { id: 'zed', username: 'zedweb' }, { unread: 1, latest: first }), ['Zed'])],
    });
    await fire('social/message_pushed', first);
    await flush();

    expect(rows()).toHaveLength(1);
    expect(rowFor('zedweb')?.getAttribute('aria-current')).toBe('true');
    expect(bubbles()).toEqual(['wtb shako?', 'hi from the site']);
    expect(composer().value).toBe('half typed');
    expect(api.markMessagesAsRead.mock.calls).toEqual([[['z1'], ME]]);
    expect(headerUnread()).toBeNull();
    const sounds = audio.length;

    // Now on screen as a conversation: a new message is read right away, silently
    await fire('social/message_pushed', msg('z2', 'c9', 'zed', 'still there?', 0));
    expect(api.markMessagesAsRead.mock.calls.at(-1)).toEqual([['z2'], ME]);
    expect(audio).toHaveLength(sounds);
    expect(headerUnread()).toBeNull();
  });

  it("keeps whispers in the thread when the partner's account is only known from their offer", async () => {
    // u2 registered no account on their profile; their offer's user carries the account Thumoi
    incomingOffers = [
      {
        id: 'o1',
        isIncoming: true,
        playerName: 'u2web',
        accountName: 'Thumoi',
        itemName: 'Shako',
        timestamp: new Date(NOW.getTime() - 60 * 60_000),
        listingId: 'l1',
        userId: 'u2',
      },
    ];
    messagesByConversation.c2 = [msg('m1', 'c2', 'u2', 'hi', 90, [ME])];
    await renderWidget([conv('c2', { id: 'u2', username: 'u2web' }, { latest: msg('m1', 'c2', 'u2', 'hi', 90) })]);
    await select('u2web');
    expect(screen.queryByText('Thumoi')).not.toBeNull();

    await act(async () => {
      fireEvent.click(within(screen.getByRole('group', { name: 'Reply via' })).getByRole('radio', { name: /Whisper/ }));
    });
    await type('inv me pls');
    expect(writeText).toHaveBeenCalledWith('/w *Thumoi inv me pls');
    expect(rows()).toHaveLength(1);
    expect(rowFor('u2web').getAttribute('aria-current')).toBe('true');
    expect(bubbles()).toEqual(['hi', 'inv me pls']);

    await whisperFrom('Thumoi', 'omw');
    expect(rows()).toHaveLength(1);
    expect(bubbles()).toEqual(['hi', 'inv me pls', 'omw']);
    expect(rowFor('u2web').textContent).toContain('omw');

    await act(async () => fireEvent.click(filterButton('Selling')));
    expect(rows()).toHaveLength(1);
    expect(rowFor('u2web').textContent).toContain('omw');
  });
});
