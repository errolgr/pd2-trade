// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { Conversation, Message } from '@/common/types/pd2-website/ChatTypes';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { ItemsProvider } from '@/hooks/useItems';
import { useOptions } from '@/hooks/useOptions';
import type { OfferNotification } from '@/hooks/pd2website/useOfferNotifications';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { WhisperHistoryProvider } from '@/hooks/useWhisperHistory';
import { writeText } from '@/lib/browser-clipboard';
import { openUrl } from '@/lib/browser-opener';
import { exists, readTextFile, writeTextFile } from '@/lib/browser-fs';
import {
  CHAT_PREFS_FILENAME,
  changeChatPrefs,
  getChatPrefs,
  parseChatPrefs,
  resetChatPrefs,
  setThreadPrefs,
} from '@/lib/chat-prefs';
import { parseHistory, SAVE_DEBOUNCE_MS, WHISPER_HISTORY_FILENAME } from '@/lib/whisper-history';
import { setBadgeCount, showToast, type PanelPayloads } from '@/overlay';
import { chatFeedActions, getChatFeed, resetChatFeed } from '../chat-feed';
import { _resetResolvedSellers } from '../hooks/useResolvedSellers';
import ChatOverlayWidget from './ChatOverlayWidget';
import { typeDraft } from './composer-test-utils';

vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }));
vi.mock('@/lib/browser-clipboard', () => ({ writeText: vi.fn(async () => {}) }));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));
// Market prices of listings the Trader sidebar shows: none known
vi.mock('@/pages/currency/lib/price-api', () => ({ fetchMultipleItemPrices: vi.fn(async () => new Map()) }));
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
const overlayOpenPanel = vi.hoisted(() => vi.fn());
/**
 * The chat panel's payload/payloadVersion/visible/rect as usePanel() reports them; `openChat()` mimics
 * openPanel('chat', ...). `visible`: on screen, so messages in the open conversation count as read. `rect`:
 * wide (two columns) unless a test makes it compact.
 */
const panel = vi.hoisted(() => ({
  payload: undefined as unknown,
  payloadVersion: 0,
  visible: true,
  rect: { x: 0, y: 0, width: 1000, height: 700 },
}));
/** undoToast calls: the Undo callbacks of the toasts shown, and whether each was dismissed. */
const undoToasts = vi.hoisted(() => [] as { title: string; onUndo: () => void; dismissed: boolean }[]);
vi.mock('@/overlay', () => ({
  setBadgeCount: vi.fn(),
  showToast: vi.fn(),
  confirmToast: vi.fn(),
  undoToast: (options: { title: string; onUndo: () => void }) => {
    const entry = { title: options.title, onUndo: options.onUndo, dismissed: false };
    undoToasts.push(entry);
    return () => {
      entry.dismissed = true;
    };
  },
  usePanel: () => panel,
  // The composer's "Manage templates…"
  useOverlay: () => ({ openPanel: overlayOpenPanel }),
}));
vi.mock('@/assets/poe_whisper.mp3', () => ({ default: 'whisper.mp3' }));
// useSocketNotifications fetches the sound at import to make its blob: URL; keep that off the network
vi.hoisted(() =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Promise.reject(new Error('offline'))),
  ),
);
/** Website owners of in-game accounts (the seller lookup that links whisper senders), by lowercase account. */
const sellerOwners = vi.hoisted(() => new Map<string, { userId: string; username: string; accounts: string[] }>());
vi.mock('@/pages/chat/lib/seller-lookup', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/pages/chat/lib/seller-lookup')>()),
  lookupSellerByName: vi.fn(async (name: string) => {
    const seller = sellerOwners.get(name.toLowerCase());
    return seller ? { status: 'found', seller } : { status: 'none' };
  }),
}));

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
/** Active market listings per website user id (the Trader sidebar's market and presence). */
let traderListings: Record<string, MarketListingEntry[]>;
let outgoingOffers: TradeOffer[];
let createConversation: Mock<(participantIds: string[]) => Promise<Conversation>>;
let refreshOffers: Mock<() => Promise<void>>;
/** PD2's unacknowledged offer notifications and the accepted-offer fallback (Pd2WebsiteProvider). */
let offerNotifications: OfferNotification[];
let newAcceptedOffers: TradeOffer[];
let acknowledgeOfferNotifications: Mock<(ids: readonly string[]) => void>;
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
    <ItemsProvider items={[]}>
      <WhisperHistoryProvider>
        <ChatOverlayWidget onClose={onClose} />
      </WhisperHistoryProvider>
    </ItemsProvider>
  );
  const view = render(widget());
  rerenderWidget = () => view.rerender(widget());
  await flush();
  return { ...view, onClose };
}

/** Conversation rows in the list, in display order. */
function rows() {
  const list = screen.queryByRole('list', { name: 'Conversations' });
  return list ? (within(list).queryAllByRole('listitem') as HTMLElement[]) : [];
}
const rowFor = (name: string) => rows().find((r) => r.textContent?.includes(name))! as HTMLElement;
const headerUnread = () => screen.queryByTitle(/unread$/)?.textContent ?? null;
const lastEmittedUnread = () =>
  vi
    .mocked(setBadgeCount)
    .mock.calls.filter(([key]) => key === 'chatUnread')
    .at(-1)?.[1];
/** Message bubble texts in the open conversation, in order. */
const bubbles = () =>
  Array.from(document.querySelectorAll('section [data-slot="scroll-area-viewport"] .whitespace-pre-wrap')).map(
    (el) => el.textContent,
  );

async function select(name: string) {
  await act(async () => {
    // The row's own button (its avatar opens the Trader details)
    fireEvent.click(within(rowFor(name)).getAllByRole('button').at(-1)!);
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
  panel.rect = { x: 0, y: 0, width: 1000, height: 700 };
  undoToasts.length = 0;
  resetChatPrefs();
  settings = {};
  auth = { accessToken: 'tok', user: { _id: ME } };
  messagesByConversation = {};
  incomingOffers = [];
  traderListings = {};
  vi.mocked(openUrl).mockClear();
  outgoingOffers = [];
  createConversation = vi.fn();
  refreshOffers = vi.fn(async () => {});
  offerNotifications = [];
  newAcceptedOffers = [];
  acknowledgeOfferNotifications = vi.fn();
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
  // Linked listings resolve to nothing, so listing links stay link chips in these tests; a user's listings
  // (the Trader sidebar) come from traderListings.
  const noListings = async () => ({ total: 0, limit: 0, skip: 0, data: [] as MarketListingEntry[] });
  const getMarketListings = async (query: { user_id?: string }) => {
    const data = (query.user_id && traderListings[query.user_id]) || [];
    return { total: data.length, limit: 24, skip: 0, data };
  };
  vi.mocked(usePd2Website).mockImplementation(
    () =>
      ({
        authData: auth,
        subscribeSocket,
        getMarketListings,
        getMarketListingsArchive: noListings,
        incomingOffers,
        outgoingOffers,
        hiddenOutgoingOffers: [],
        createConversation,
        refresh: refreshOffers,
        offerNotifications,
        newAcceptedOffers,
        acknowledgeOfferNotifications,
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
  _resetResolvedSellers();
  sellerOwners.clear();
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

    expect(rowFor('Alice').querySelector('[aria-current]')?.getAttribute('aria-current')).toBe('true');
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

    expect(rowFor('Alice').querySelector('[aria-current]')?.getAttribute('aria-current')).toBe('true');
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
    expect(rowFor('bob').querySelector('[aria-current]')?.getAttribute('aria-current')).toBe('true');

    await openChat({ conversationId: 'c1' });
    await flush(200);
    expect(rowFor('Alice').querySelector('[aria-current]')?.getAttribute('aria-current')).toBe('true');
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
    expect(rowFor('Alice').querySelector('[aria-current]')?.getAttribute('aria-current')).toBe('true');
  });

  it('ignores opens without a conversation id', async () => {
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    await openChat(undefined);
    expect(rowFor('Alice').querySelector('[aria-current]')?.getAttribute('aria-current')).not.toBe('true');
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
    expect(rowFor('bob').querySelector('[aria-current]')?.getAttribute('aria-current')).toBe('true');
  });

  async function deleteOpenConversation() {
    const trigger = screen.getByRole('button', { name: 'Conversation options' });
    await act(async () => {
      fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: /Delete Conversation/ }));
    });
    await flush();
  }

  it('removes a deleted conversation at once and deletes it on the website exactly once after the undo window', async () => {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([
      conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) }),
      conv('c2', BOB, { latest: msg('b1', 'c2', 'bob', 'yo', 20) }),
    ]);
    await select('Alice');
    await deleteOpenConversation();

    expect(rows().map((r) => r.textContent?.includes('bob'))).toEqual([true]);
    expect(screen.queryByText('Select a conversation to view messages')).not.toBeNull();
    expect(undoToasts.map((t) => t.title)).toEqual(['Conversation deleted']);
    await flush(5999);
    expect(api.deleteConversation).not.toHaveBeenCalled();

    await flush(1);
    expect(api.deleteConversation).toHaveBeenCalledTimes(1);
    expect(api.deleteConversation).toHaveBeenCalledWith('c1');
    expect(undoToasts[0].dismissed).toBe(true);
    await flush(10_000);
    expect(api.deleteConversation).toHaveBeenCalledTimes(1);
    expect(rows()).toHaveLength(1);
  });

  it('Undo brings the conversation back and never deletes it on the website', async () => {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    await select('Alice');
    await deleteOpenConversation();
    expect(rows()).toHaveLength(0);

    await act(async () => undoToasts[0].onUndo());
    expect(rows().map((r) => r.textContent?.includes('Alice'))).toEqual([true]);
    await flush(10_000);
    expect(api.deleteConversation).not.toHaveBeenCalled();
  });

  it('sends a delete still in its undo window when the panel unmounts, once', async () => {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    const { unmount } = await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    await select('Alice');
    await deleteOpenConversation();

    unmount();
    expect(api.deleteConversation).toHaveBeenCalledTimes(1);
    await flush(10_000);
    expect(api.deleteConversation).toHaveBeenCalledTimes(1);
  });

  it('brings the conversation back with an error when deleting it on the website fails', async () => {
    api.deleteConversation.mockResolvedValue(false);
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    await select('Alice');
    await deleteOpenConversation();
    expect(rows()).toHaveLength(0);

    await flush(6000);
    expect(api.deleteConversation).toHaveBeenCalledWith('c1');
    expect(rows().map((r) => r.textContent?.includes('Alice'))).toEqual([true]);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Couldn't delete the conversation" }));
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
    return screen.getByRole('textbox', { name: 'Message' });
  }

  it('sends trimmed text on Enter, appends it and moves the conversation to the top', async () => {
    api.sendMessage.mockImplementation(async (c, content, sender) => msg('sent1', c, sender, content, 0));
    const input = await openAlice();
    expect(rows()[0].textContent).toContain('bob');

    typeDraft(input, '  sure, 2 ist  ');
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    await flush(200);

    expect(api.sendMessage).toHaveBeenCalledWith('c1', 'sure, 2 ist', ME);
    expect(input.textContent).toBe('');
    expect(bubbles()).toEqual(['hi', 'sure, 2 ist']);
    expect(rows()[0].textContent).toContain('Alice');
    expect(within(rows()[0] as HTMLElement).queryByLabelText('Sent')).not.toBeNull();
  });

  it('does not send blank input or on Shift+Enter', async () => {
    const input = await openAlice();
    const send = screen.getByRole('button', { name: /Send/ }) as HTMLButtonElement;

    typeDraft(input, '   ');
    expect(send.disabled).toBe(true);
    fireEvent.keyDown(input, { key: 'Enter' });

    typeDraft(input, 'draft');
    // Shift+Enter starts a new line
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    await flush();

    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(input.textContent).toBe('draft\n');
  });

  async function sendText(input: HTMLElement, text: string) {
    typeDraft(input, text);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send/ }));
    });
    await flush();
  }
  /** The bubble element of a message in the open conversation. */
  const bubbleOf = (text: string) =>
    Array.from(document.querySelectorAll('section [data-slot="scroll-area-viewport"] .whitespace-pre-wrap')).find(
      (el) => el.textContent === text,
    )!.parentElement!;

  it('shows a pending send as a dimmed bubble until the server acknowledges it', async () => {
    const response = Promise.withResolvers<Message>();
    api.sendMessage.mockReturnValue(response.promise);
    const input = await openAlice();
    await sendText(input, 'hello');

    expect(input.textContent).toBe('');
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

    expect(input.textContent).toBe('');
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
  const composer = () => screen.getByRole('textbox', { name: 'Message' });

  it("keeps each conversation's unsent text when switching threads and hiding the panel", async () => {
    await openBoth();
    await select('Alice');
    typeDraft(composer(), 'half-typed offer');

    await select('bob');
    expect(composer().textContent).toBe('');
    typeDraft(composer(), 'for bob');

    panel.visible = false;
    await act(async () => rerenderWidget());
    panel.visible = true;
    await act(async () => rerenderWidget());

    await select('Alice');
    expect(composer().textContent).toBe('half-typed offer');
    await select('bob');
    expect(composer().textContent).toBe('for bob');
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  it("keeps a thread's inline listing pills with its draft when switching threads", async () => {
    const url = 'https://www.projectdiablo2.com/market/listing/dd01?display="Griffon\'s Eye"';
    await openBoth();
    await select('Alice');
    // A typed or pasted listing link becomes an inline pill (named by its link until looked up)
    await act(async () => {
      typeDraft(composer(), `how about ${url} ok?`);
    });
    const pill = () => within(composer()).queryByText("Griffon's Eye");
    expect(composer().textContent).toBe("how about Griffon's Eye ok?");
    expect(pill()).not.toBeNull();

    await select('bob');
    expect(pill()).toBeNull();
    await select('Alice');
    expect(composer().textContent).toBe("how about Griffon's Eye ok?");
    expect(pill()).not.toBeNull();
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
    expect(composer().textContent).toBe('Counter for Shako: ');
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
  const composer = () => screen.getByRole('textbox', { name: 'Message' });
  const heading = () => screen.queryByRole('heading', { level: 3 })?.textContent ?? null;
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
      typeDraft(composer(), text);
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
    expect(composer().getAttribute('aria-placeholder')).toBe('Whisper *Zed — copied for in-game chat');

    await type('2 ist');
    expect(writeText).toHaveBeenCalledWith('/w *Zed 2 ist');
    expect(api.sendMessage).not.toHaveBeenCalled();
    expect(bubbles()).toEqual(['wtb shako?', '2 ist']);
    expect(screen.queryByText('copied')).not.toBeNull();

    // The game log showing it sent confirms the copied entry instead of adding another
    await whisperAt(0, 'Zed', '2 ist', false);
    expect(bubbles()).toEqual(['wtb shako?', '2 ist']);
    expect(screen.queryByText('copied')).toBeNull();

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

  describe('whisper senders linked by the seller lookup', () => {
    const THAROK = { userId: 'u-tharok', username: 'tharok_web', accounts: ['Tharok'] };
    const notLinked = () => screen.queryByText('Not linked to a website account');

    beforeEach(() => {
      // Wide enough for the Trader sidebar
      panel.rect = { ...panel.rect, width: 1100 };
    });

    it('links a whisperer to the website user owning their account, and still replies in game', async () => {
      sellerOwners.set('tharok', THAROK);
      await renderWidget([]);
      await gameEvent('trade-message', {
        isIncoming: true,
        playerName: 'tharok',
        accountName: 'tharok',
        characterName: 'frostwind',
        message: "Hi, I'm interested in your Entrapping Grand Charm of Quality listed for 9 wss",
        itemName: 'Entrapping Grand Charm of Quality',
        price: '9 wss',
      });
      await flush();

      await select('tharok_web');
      expect(heading()).toBe('tharok_web');
      expect(notLinked()).toBeNull();
      expect(screen.getAllByRole('button', { name: '@tharok_web' }).length).toBeGreaterThan(0);

      await type('still here');
      expect(writeText).toHaveBeenCalledWith('/w *tharok still here');
      expect(api.sendMessage).not.toHaveBeenCalled();
    });

    it('links a sender saved as "character*account" by the account, and whispers that account', async () => {
      sellerOwners.set('tharok', THAROK);
      const legacy = JSON.stringify({
        people: {
          'frostwind*tharok': {
            key: 'frostwind*tharok',
            playerName: 'frostwind*tharok',
            messages: [{ id: 'm1', isIncoming: true, message: 'still there?', timestamp: NOW.getTime() - 60_000 }],
            trades: [],
            readAt: 0,
          },
        },
      });
      vi.mocked(exists).mockImplementation(async (path) => path === WHISPER_HISTORY_FILENAME);
      vi.mocked(readTextFile).mockImplementation(async (path) => (path === WHISPER_HISTORY_FILENAME ? legacy : ''));
      await renderWidget([]);
      await flush();

      await select('tharok_web');
      expect(notLinked()).toBeNull();
      await type('yes');
      expect(writeText).toHaveBeenCalledWith('/w *tharok yes');
    });

    it('never links a whisper from one of your own accounts to you', async () => {
      sellerOwners.set('mymain', { userId: ME, username: 'me', accounts: ['MyMain'] });
      await renderWidget([]);
      await whisperFrom('MyMain', 'test');
      await flush();

      expect(rows()).toHaveLength(1);
      await select('MyMain');
      expect(notLinked()).not.toBeNull();
    });
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

  it('refetches the offers each time the panel opens, not while it stays open or hidden', async () => {
    panel.visible = false;
    await renderWidget([]);
    expect(refreshOffers).not.toHaveBeenCalled();

    panel.visible = true;
    await act(async () => rerenderWidget());
    await act(async () => rerenderWidget());
    expect(refreshOffers).toHaveBeenCalledTimes(1);

    panel.visible = false;
    await act(async () => rerenderWidget());
    panel.visible = true;
    await act(async () => rerenderWidget());
    expect(refreshOffers).toHaveBeenCalledTimes(2);
  });

  it("View build opens the trader's character in the builds panel", async () => {
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
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Trader details' })));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'View build' })));
    expect(overlayOpenPanel).toHaveBeenCalledWith('builds', { character: { name: 'DanChar' } });
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

  // #148: a sender saved as "character*account" got `/w *frostwind*tharok …` ("user is not online")
  it('Accept (Enter in the game field) copies the whisper with one "*" before the account', async () => {
    settings.acceptOfferMessageTemplate = 'Your offer has been accepted. Game: {gameInfo}';
    const legacy = JSON.stringify({
      people: {
        'frostwind*tharok': {
          key: 'frostwind*tharok',
          playerName: 'frostwind*tharok',
          messages: [
            {
              id: 'm1',
              isIncoming: true,
              message: "Hi, I'm interested in your Shako",
              timestamp: NOW.getTime() - 60_000,
            },
          ],
          trades: [
            {
              id: 't1',
              isIncoming: true,
              message: "Hi, I'm interested in your Shako",
              itemName: 'Shako',
              timestamp: NOW.getTime() - 60_000,
            },
          ],
          readAt: 0,
        },
      },
    });
    vi.mocked(exists).mockImplementation(async (path) => path === WHISPER_HISTORY_FILENAME);
    vi.mocked(readTextFile).mockImplementation(async (path) => (path === WHISPER_HISTORY_FILENAME ? legacy : ''));
    await renderWidget([]);
    await flush();
    await gameEvent('trade-message', {
      isIncoming: true,
      playerName: 'Dan',
      accountName: 'Dan',
      characterName: 'DanChar',
      message: "Hi, I'm interested in your Arach listed for 1 ist",
      itemName: 'Arach',
      price: '1 ist',
    });

    const acceptWithEnter = async (game: string) => {
      const deals = screen.getByRole('list', { name: 'Offers with this user' });
      await act(async () => fireEvent.click(within(deals).getByRole('button', { name: /^Accept$/ })));
      const field = screen.getByRole('textbox', { name: 'Game name' });
      fireEvent.change(field, { target: { value: game } });
      await act(async () => fireEvent.submit(field.closest('form')!));
      await flush();
    };

    await select('tharok');
    await acceptWithEnter('shako1');
    expect(writeText).toHaveBeenLastCalledWith('/w *tharok Your offer has been accepted. Game: shako1');

    await select('Dan');
    await acceptWithEnter('arach1');
    expect(writeText).toHaveBeenLastCalledWith('/w *Dan Your offer has been accepted. Game: arach1');
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

  it('opens a market seller with no history as a new thread with the draft; the first send starts it', async () => {
    createConversation.mockResolvedValue(conv('c9', { id: 'erin', username: 'erin' }));
    api.sendMessage.mockImplementation(async (c, content, sender) => msg('sent1', c, sender, content, 0));
    await renderWidget([]);
    await openChat({ userId: 'erin', userName: 'erin', draft: 'Hi, is this still available?', reply: true });
    expect(heading()).toBe('erin');
    expect(composer().textContent).toBe('Hi, is this still available?');
    expect(document.activeElement).toBe(composer());

    await act(async () => {
      fireEvent.keyDown(composer(), { key: 'Enter' });
    });
    await flush();
    expect(createConversation).toHaveBeenCalledWith([ME, 'erin']);
    expect(api.sendMessage).toHaveBeenCalledWith('c9', 'Hi, is this still available?', ME);
  });

  it("opens a market seller's existing conversation, adding the draft after unsent text", async () => {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    await select('Alice');
    typeDraft(composer(), 'half typed');
    await openChat({ userId: 'alice', userName: 'alice', draft: 'listing link' });
    expect(heading()).toBe('Alice');
    expect(composer().textContent).toContain('half typed');
    expect(composer().textContent).toContain('listing link');
    expect(rows()).toHaveLength(1);
  });

  it('follows the open whisper thread into the conversation it merges with: reads it, keeps the draft', async () => {
    await renderWidget([]);
    await whisperAt(1, 'Zed', 'wtb shako?');
    await select('Zed');
    typeDraft(composer(), 'half typed');

    // A website conversation with Zed (account registered) appears while his whisper thread is open
    const first = msg('z1', 'c9', 'zed', 'hi from the site', 0);
    messagesByConversation.c9 = [first];
    api.getConversations.mockResolvedValue({
      data: [withAccount(conv('c9', { id: 'zed', username: 'zedweb' }, { unread: 1, latest: first }), ['Zed'])],
    });
    await fire('social/message_pushed', first);
    await flush();

    expect(rows()).toHaveLength(1);
    expect(rowFor('zedweb').querySelector('[aria-current]')?.getAttribute('aria-current')).toBe('true');
    expect(bubbles()).toEqual(['wtb shako?', 'hi from the site']);
    expect(composer().textContent).toBe('half typed');
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
    expect(rowFor('u2web').querySelector('[aria-current]')?.getAttribute('aria-current')).toBe('true');
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

describe('ChatOverlayWidget overlay fit', () => {
  const composer = () => screen.getByRole('textbox', { name: 'Message' });
  const filterButton = (name: string) => screen.getByRole('radio', { name });
  const heading = () => screen.queryByRole('heading', { level: 3 })?.textContent ?? null;
  const jumpButton = () => screen.queryByRole('button', { name: /Jump to latest/ });
  const divider = () => screen.queryByRole('separator', { name: 'New messages' });
  const DAN = { id: 'dan', username: 'dan' };

  async function key(target: Element, init: KeyboardEventInit) {
    await act(async () => {
      fireEvent.keyDown(target, init);
    });
    await flush(200);
  }

  async function chooseFromMenu(name: RegExp) {
    await act(async () => {
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Conversation options' }), {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name }));
    });
    await flush();
  }

  async function resize(width: number) {
    panel.rect = { ...panel.rect, width };
    await act(async () => rerenderWidget());
    await flush();
  }

  /** The last chat-prefs.json written. */
  const savedPrefs = () =>
    parseChatPrefs(
      String(
        vi
          .mocked(writeTextFile)
          .mock.calls.filter(([path]) => path === CHAT_PREFS_FILENAME)
          .at(-1)?.[1] ?? '',
      ),
    );

  it('shows the list or the open thread with a back button when narrow, both side by side when wide', async () => {
    panel.rect = { ...panel.rect, width: 400 };
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([
      conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) }),
      conv('c2', BOB, { latest: msg('b1', 'c2', 'bob', 'yo', 20) }),
    ]);
    expect(rows()).toHaveLength(2);
    expect(screen.queryByText('Select a conversation to view messages')).toBeNull();

    await select('Alice');
    expect(rows()).toHaveLength(0);
    expect(heading()).toBe('Alice');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Back to conversations' }));
    });
    expect(rows()).toHaveLength(2);
    expect(heading()).toBeNull();

    await select('Alice');
    await resize(800);
    expect(rows()).toHaveLength(2);
    expect(heading()).toBe('Alice');
    expect(screen.queryByRole('button', { name: 'Back to conversations' })).toBeNull();

    await resize(639);
    expect(rows()).toHaveLength(0);
    expect(heading()).toBe('Alice');
  });

  it('the chat hotkey payload opens the newest unread thread, leaving out muted ones', async () => {
    changeChatPrefs((prefs) => setThreadPrefs(prefs, ['c3'], { muted: true }));
    await renderWidget([
      conv('c1', ALICE, { unread: 1, latest: msg('a1', 'c1', 'alice', 'older unread', 30) }),
      conv('c2', BOB, { unread: 2, latest: msg('b1', 'c2', 'bob', 'newest unread', 5) }),
      conv('c3', { id: 'carol', username: 'carol' }, { unread: 1, latest: msg('k1', 'c3', 'carol', 'muted', 1) }),
      conv('c4', DAN, { latest: msg('d1', 'c4', 'dan', 'read', 0, [ME]) }),
    ]);
    expect(lastEmittedUnread()).toBe(3);

    await openChat({ newestUnread: true });
    expect(heading()).toBe('bob');
  });

  it('Reply from a toast opens the conversation or whisper thread with the composer focused', async () => {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    await openChat({ conversationId: 'c1', reply: true });
    expect(heading()).toBe('Alice');
    expect(document.activeElement).toBe(composer());

    await whisperFrom('Zed', 'wtb shako?');
    await openChat({ threadId: 'whisper:zed', reply: true });
    expect(heading()).toBe('Zed');
    expect(document.activeElement).toBe(composer());
  });

  it('Alt+Arrow keys step through the threads of the filtered list', async () => {
    incomingOffers = [
      {
        id: 'o1',
        isIncoming: true,
        playerName: 'bob',
        itemName: 'Shako',
        timestamp: new Date(NOW.getTime() - 60_000),
        userId: 'bob',
      },
      {
        id: 'o2',
        isIncoming: true,
        playerName: 'dan',
        itemName: 'Arach',
        timestamp: new Date(NOW.getTime() - 120_000),
        userId: 'dan',
      },
    ];
    await renderWidget([
      conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 0) }),
      conv('c2', BOB, { latest: msg('b1', 'c2', 'bob', 'yo', 10) }),
      conv('c3', DAN, { latest: msg('d1', 'c3', 'dan', 'sup', 20) }),
    ]);
    await openChat({ filter: 'selling' });
    await select('bob');

    await key(composer(), { key: 'ArrowDown', altKey: true });
    expect(heading()).toBe('dan');
    await key(composer(), { key: 'ArrowDown', altKey: true });
    expect(heading()).toBe('dan');
    await key(composer(), { key: 'ArrowUp', altKey: true });
    expect(heading()).toBe('bob');
    await key(composer(), { key: 'ArrowUp', altKey: true });
    expect(heading()).toBe('bob');
  });

  it('Esc closes the open thread (back to the list when narrow), not while the template menu or an IME has it', async () => {
    settings.acceptOfferMessageTemplate = 'Accepted. Game: {gameInfo}';
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    await select('Alice');

    typeDraft(composer(), '/');
    expect(screen.queryByRole('listbox', { name: 'Message templates' })).not.toBeNull();
    await key(composer(), { key: 'Escape' });
    expect(screen.queryByRole('listbox', { name: 'Message templates' })).toBeNull();
    expect(heading()).toBe('Alice');

    await key(composer(), { key: 'Escape', isComposing: true });
    expect(heading()).toBe('Alice');

    await key(composer(), { key: 'Escape' });
    expect(heading()).toBeNull();
    expect(screen.queryByText('Select a conversation to view messages')).not.toBeNull();

    await resize(400);
    await select('Alice');
    expect(rows()).toHaveLength(0);
    typeDraft(composer(), '');
    await key(composer(), { key: 'Escape' });
    expect(heading()).toBeNull();
    expect(rows()).toHaveLength(1);
  });

  it('opens a thread with unread messages at a "New" divider above the first unread, kept until it closes', async () => {
    messagesByConversation.c1 = [
      msg('a1', 'c1', 'alice', 'read before', 30, [ME]),
      msg('a2', 'c1', ME, 'my reply', 20, [ME]),
      msg('a3', 'c1', 'alice', 'first unread', 10),
      msg('a4', 'c1', 'alice', 'second unread', 5),
    ];
    await renderWidget([
      conv('c1', ALICE, { unread: 2, latest: msg('a4', 'c1', 'alice', 'second unread', 5) }),
      conv('c2', BOB, { latest: msg('b1', 'c2', 'bob', 'yo', 20) }),
    ]);
    await select('Alice');

    expect(api.markMessagesAsRead).toHaveBeenCalledWith(['a3', 'a4'], ME);
    const row = divider()!.parentElement!;
    expect(row.textContent).toContain('first unread');
    expect(row.textContent).not.toContain('my reply');

    await select('bob');
    await select('Alice');
    expect(divider()).toBeNull();
  });

  it('puts the divider above unread whispers too, then marks them read', async () => {
    await renderWidget([]);
    await whisperFrom('Zed', 'wtb shako?');
    await whisperFrom('Zed', 'still there?');
    expect(lastEmittedUnread()).toBe(2);
    await select('Zed');
    expect(divider()!.parentElement!.textContent).toContain('wtb shako?');
    expect(lastEmittedUnread()).toBe(0);
    expect(divider()).not.toBeNull();
  });

  it('offers "N new · Jump to latest" only for messages arriving while scrolled up', async () => {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    await select('Alice');

    await fire('social/message_pushed', msg('a2', 'c1', 'alice', 'at the bottom', 1));
    expect(jumpButton()).toBeNull();

    const viewport = document.querySelector<HTMLElement>('section [data-slot="scroll-area-viewport"]')!;
    Object.defineProperty(viewport, 'scrollHeight', { configurable: true, value: 2000 });
    await act(async () => {
      fireEvent.scroll(viewport, { target: { scrollTop: 500 } });
    });
    expect(jumpButton()).toBeNull();

    await fire('social/message_pushed', msg('a3', 'c1', 'alice', 'while scrolled up', 0));
    await fire('social/message_pushed', msg('a4', 'c1', 'alice', 'and another', 0));
    expect(jumpButton()?.textContent).toBe('2 new · Jump to latest');

    await act(async () => {
      fireEvent.click(jumpButton()!);
    });
    expect(jumpButton()).toBeNull();
  });

  it('pins, mutes and archives from the ⋯ menu and saves it to chat-prefs.json', async () => {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 1, [ME])];
    messagesByConversation.c2 = [msg('b1', 'c2', 'bob', 'yo', 5, [ME])];
    await renderWidget([
      conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 1) }),
      conv('c2', BOB, { latest: msg('b1', 'c2', 'bob', 'yo', 5) }),
    ]);
    expect(rows()[0].textContent).toContain('Alice');

    // Pinned threads sort first, with a pin
    await select('bob');
    await chooseFromMenu(/^Pin$/);
    expect(rows()[0].textContent).toContain('bob');
    expect(within(rows()[0] as HTMLElement).queryByLabelText('Pinned')).not.toBeNull();
    expect(savedPrefs().threads.c2).toEqual({ pinnedAt: expect.any(Number) });

    // Muted: no sound and no badge for its messages
    await chooseFromMenu(/^Mute$/);
    expect(within(rowFor('bob')).queryByLabelText('Muted')).not.toBeNull();
    await select('Alice');
    await fire('social/message_pushed', msg('b2', 'c2', 'bob', 'ping', 0));
    expect(audio).toHaveLength(0);
    expect(rowFor('bob').textContent).toContain('ping');
    expect(lastEmittedUnread()).toBe(0);
    expect(savedPrefs().threads.c2).toEqual({ pinnedAt: expect.any(Number), muted: true });

    // Archived: out of All, in Archived, back in All with a new message
    await chooseFromMenu(/^Archive$/);
    expect(heading()).toBeNull();
    expect(rows().map((r) => r.textContent?.includes('Alice'))).toEqual([false]);
    await act(async () => fireEvent.click(filterButton('Archived')));
    expect(rows().map((r) => r.textContent?.includes('Alice'))).toEqual([true]);
    await act(async () => fireEvent.click(filterButton('All')));
    await fire('social/message_pushed', msg('a2', 'c1', 'alice', 'back again', -1));
    expect(rows().map((r) => r.textContent?.includes('Alice'))).toEqual([false, true]);
    expect(lastEmittedUnread()).toBe(1);
  });

  it('restores pinned, muted and archived threads saved earlier', async () => {
    vi.mocked(exists).mockImplementation(async (path) => path === CHAT_PREFS_FILENAME);
    vi.mocked(readTextFile).mockImplementation(async (path) =>
      path === CHAT_PREFS_FILENAME
        ? JSON.stringify({ threads: { c2: { pinnedAt: 1, muted: true }, c3: { archivedAt: NOW.getTime() } } })
        : '',
    );
    await renderWidget([
      conv('c1', ALICE, { unread: 1, latest: msg('a1', 'c1', 'alice', 'hi', 1) }),
      conv('c2', BOB, { unread: 2, latest: msg('b1', 'c2', 'bob', 'yo', 5) }),
      conv('c3', DAN, { unread: 4, latest: msg('d1', 'c3', 'dan', 'old', 10) }),
    ]);
    expect(rows().map((r) => r.textContent?.includes('bob'))).toEqual([true, false]);
    expect(lastEmittedUnread()).toBe(1);
    expect(headerUnread()).toBe('1');
  });

  it('focuses the composer for a Reply that opened the hidden panel only once it shows', async () => {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);
    // Whether the panel was on screen at each focus of the composer (a hidden one can't take focus)
    const focusedWhileVisible: boolean[] = [];
    const focus = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('aria-label') === 'Message') focusedWhileVisible.push(panel.visible);
    });

    panel.visible = false;
    await openChat({ conversationId: 'c1', reply: true });
    expect(heading()).toBe('Alice');
    expect(focusedWhileVisible).toEqual([]);

    panel.visible = true;
    await act(async () => rerenderWidget());
    await flush();
    expect(focusedWhileVisible).toEqual([true]);
    focus.mockRestore();
  });

  it('keeps a muted person muted once they start a website conversation', async () => {
    incomingOffers = [
      { id: 'o1', isIncoming: true, playerName: 'carol', itemName: 'Shako', timestamp: new Date(NOW), userId: 'carol' },
    ];
    await renderWidget([]);
    await select('carol');
    await chooseFromMenu(/^Mute$/);
    await key(composer(), { key: 'Escape' });
    expect(heading()).toBeNull();

    // Their first website message starts conversation c9, unknown until the list reloads
    const carol = { id: 'carol', username: 'carol' };
    api.getConversations.mockResolvedValue({
      data: [conv('c9', carol, { latest: msg('k1', 'c9', 'carol', 'hi', 0) })],
    });
    await fire('social/message_pushed', msg('k1', 'c9', 'carol', 'hi', 0));
    await fire('social/message_pushed', msg('k2', 'c9', 'carol', 'still there?', 0));

    expect(audio).toHaveLength(0);
    expect(rows()).toHaveLength(1);
    expect(within(rowFor('carol')).queryByLabelText('Muted')).not.toBeNull();
    // Saved under the conversation too, so its socket notifications find it
    expect(getChatPrefs().threads.c9).toEqual({ muted: true });
    expect(lastEmittedUnread()).toBe(0);
  });
});

describe('ChatOverlayWidget trader sidebar', () => {
  const composer = () => screen.getByRole('textbox', { name: 'Message' });
  const sidebar = () => screen.queryByRole('complementary', { name: 'Trader' });
  const heading = () => screen.queryByRole('heading', { level: 3 })?.textContent ?? null;
  const savedPrefs = () =>
    parseChatPrefs(
      vi
        .mocked(writeTextFile)
        .mock.calls.filter(([file]) => file === CHAT_PREFS_FILENAME)
        .at(-1)?.[1] ?? '{}',
    );
  // The trader cache lives for the app's lifetime: every test uses its own users
  const listing = (id: string, userId: string, name: string, stamps: { ingame?: number; online?: number } = {}) =>
    ({
      _id: id,
      user_id: userId,
      type: 'item',
      is_hardcore: false,
      is_ladder: true,
      price: '',
      hr_price: 2,
      bumped_at: minutesAgo(30),
      created_at: minutesAgo(60),
      updated_at: minutesAgo(30),
      user_last_ingame: stamps.ingame === undefined ? undefined : minutesAgo(stamps.ingame),
      user_last_online: stamps.online === undefined ? undefined : minutesAgo(stamps.online),
      user: { username: userId },
      item: { name, quality: { name: 'Unique' }, base: { name: 'Shako' }, modifiers: [] },
    }) as unknown as MarketListingEntry;

  async function click(element: HTMLElement) {
    await act(async () => {
      fireEvent.click(element);
    });
    await flush();
  }

  it('shows the Trader sidebar as a third column from 1020px wide, collapsible and remembered', async () => {
    panel.rect = { ...panel.rect, width: 1100 };
    const tara = { id: 'tr-wide', username: 'tara', display_name: 'Tara' };
    traderListings[tara.id] = [listing('aa01', tara.id, 'Harlequin Crest', { ingame: 2, online: 1 })];
    messagesByConversation.c1 = [msg('t1', 'c1', tara.id, 'hi', 10, [ME])];
    const conversations = [conv('c1', tara, { latest: msg('t1', 'c1', tara.id, 'hi', 10) })];
    await renderWidget(conversations);
    // Nothing to show before a thread is open
    expect(sidebar()).toBeNull();

    await select('Tara');
    expect(sidebar()).not.toBeNull();
    expect(within(sidebar()!).getByRole('heading', { level: 4, name: 'Tara' })).not.toBeNull();
    // Presence from their listings, in the header's status line and the sidebar
    expect(screen.getAllByText('In game now')).toHaveLength(2);

    await click(screen.getByRole('button', { name: 'Collapse trader details' }));
    expect(sidebar()).toBeNull();
    expect(heading()).toBe('Tara');
    await flush();
    expect(savedPrefs().sidebarCollapsed).toBe(true);

    // Reopened later: still collapsed until shown from the header
    cleanup();
    resetChatPrefs();
    const saved = JSON.stringify(savedPrefs());
    vi.mocked(exists).mockImplementation(async (path) => path === CHAT_PREFS_FILENAME);
    vi.mocked(readTextFile).mockImplementation(async (path) => (path === CHAT_PREFS_FILENAME ? saved : ''));
    await renderWidget(conversations);
    await select('Tara');
    expect(sidebar()).toBeNull();
    await click(screen.getByRole('button', { name: 'Trader details' }));
    expect(sidebar()).not.toBeNull();
    await flush();
    expect(savedPrefs().sidebarCollapsed).toBeUndefined();
  });

  it('below 1020px slides the sidebar over the thread from the header or an avatar; Esc closes it first', async () => {
    const tom = { id: 'tr-narrow', username: 'tom', display_name: 'Tom' };
    messagesByConversation.c1 = [msg('t1', 'c1', tom.id, 'hi', 10, [ME])];
    await renderWidget([conv('c1', tom, { latest: msg('t1', 'c1', tom.id, 'hi', 10) })]);
    await select('Tom');
    expect(sidebar()).toBeNull();

    await click(screen.getByRole('button', { name: 'Trader details' }));
    expect(sidebar()).not.toBeNull();
    // No listings: presence and market say so
    expect(within(sidebar()!).queryByText('Unknown')).not.toBeNull();
    expect(within(sidebar()!).queryByText('No active listings.')).not.toBeNull();

    await act(async () => {
      fireEvent.keyDown(composer(), { key: 'Escape' });
    });
    expect(sidebar()).toBeNull();
    expect(heading()).toBe('Tom');

    // A list avatar opens it too
    await click(
      within(screen.getByRole('list', { name: 'Conversations' })).getByRole('button', {
        name: 'Trader details for Tom',
      }),
    );
    expect(sidebar()).not.toBeNull();
    await click(screen.getByRole('button', { name: 'Close trader details' }));
    expect(sidebar()).toBeNull();
  });

  it("opens a market seller's thread with the Trader sidebar when asked (slide-over and wide column)", async () => {
    const sam = { id: 'tr-market', username: 'sam', display_name: 'Sam' };
    messagesByConversation.c1 = [msg('s1', 'c1', sam.id, 'hi', 10, [ME])];
    await renderWidget([conv('c1', sam, { latest: msg('s1', 'c1', sam.id, 'hi', 10) })]);
    // Without trader: just the thread
    await openChat({ userId: sam.id, userName: 'sam' });
    expect(heading()).toBe('Sam');
    expect(sidebar()).toBeNull();
    await openChat({ userId: sam.id, userName: 'sam', trader: true });
    expect(heading()).toBe('Sam');
    expect(sidebar()).not.toBeNull();

    // Wide with the column collapsed: shown again (and remembered)
    panel.rect = { ...panel.rect, width: 1100 };
    await openChat({ userId: sam.id, userName: 'sam' });
    await click(screen.getByRole('button', { name: 'Collapse trader details' }));
    expect(sidebar()).toBeNull();
    await openChat({ userId: sam.id, userName: 'sam', trader: true });
    expect(sidebar()).not.toBeNull();
    await flush();
    expect(savedPrefs().sidebarCollapsed).toBeUndefined();
  });

  it('opens their PD2 profile, market and character pages with the names encoded', async () => {
    panel.rect = { ...panel.rect, width: 1100 };
    const odd = { id: 'tr-links', username: 'ali ce/2', display_name: 'Alicia' };
    traderListings[odd.id] = [listing('bb01', odd.id, 'Shako', { ingame: 600, online: 12 })];
    messagesByConversation.c1 = [msg('o1', 'c1', odd.id, 'hi', 10, [ME])];
    await renderWidget([conv('c1', odd, { latest: msg('o1', 'c1', odd.id, 'hi', 10) })]);
    await select('Alicia');

    const profile = 'https://www.projectdiablo2.com/@ali%20ce%2F2';
    // The header's @username and the sidebar's both open the profile
    const usernameLinks = screen.getAllByRole('button', { name: '@ali ce/2' });
    expect(usernameLinks).toHaveLength(2);
    for (const link of usernameLinks) await click(link);
    expect(vi.mocked(openUrl).mock.calls).toEqual([[profile], [profile]]);

    await click(within(sidebar()!).getByRole('button', { name: 'View profile' }));
    await click(within(sidebar()!).getByRole('button', { name: 'Their market' }));
    expect(vi.mocked(openUrl).mock.calls.slice(2)).toEqual([[profile], [`${profile}/market`]]);
    // The newest of their in-game/online stamps
    expect(screen.getAllByText('Online 12m ago').length).toBeGreaterThan(0);
  });

  it("shows an offers-only trader's website profile, and never calls a website user unlinked", async () => {
    panel.rect = { ...panel.rect, width: 1100 };
    const kai = {
      _id: 'tr-offer',
      username: 'kai',
      created_at: '2023-09-28T05:06:13.767Z',
      game: { accounts: ['Kai'] },
    };
    outgoingOffers = [
      { id: 'o1', isIncoming: false, playerName: 'kai', itemName: 'Shako', timestamp: NOW, userId: kai._id, user: kai },
    ];
    await renderWidget([]);
    await select('kai');
    // Header and sidebar both show who they are on the website
    expect(screen.getAllByRole('button', { name: '@kai' })).toHaveLength(2);
    expect(within(sidebar()!).queryByText('Joined Sep 2023')).not.toBeNull();
    expect(screen.queryByText('Not linked to a website account')).toBeNull();

    // A market seller messaged before any conversation or offer: a website user, username unknown
    await openChat({ userId: 'tr-seller', userName: 'SellerAcc' });
    expect(heading()).toBe('SellerAcc');
    expect(sidebar()).not.toBeNull();
    expect(screen.queryByText('Not linked to a website account')).toBeNull();
  });

  it('links one of their listings in the composer when it is clicked in the sidebar', async () => {
    const nia = { id: 'tr-insert', username: 'nia', display_name: 'Nia' };
    traderListings[nia.id] = [listing('cc01', nia.id, 'Harlequin Crest'), listing('cc02', nia.id, 'Tal Rasha Belt')];
    messagesByConversation.c1 = [msg('n1', 'c1', nia.id, 'hi', 10, [ME])];
    await renderWidget([conv('c1', nia, { latest: msg('n1', 'c1', nia.id, 'hi', 10) })]);
    // The list avatar opens the thread with its Trader details (a slide-over at this width)
    await click(screen.getByRole('button', { name: 'Trader details for Nia' }));
    expect(heading()).toBe('Nia');

    await act(async () => {
      typeDraft(composer(), 'how much for');
    });
    await click(within(sidebar()!).getByRole('button', { name: 'Link Harlequin Crest in your message' }));
    // Linked inline at the caret as a pill (by the name its link carries until looked up), not as URL text
    expect(composer().textContent).toBe('how much for Harlequin Crest');
    expect(within(composer()).getByText('Harlequin Crest')).not.toBeNull();
    // The slide-over made way for the composer
    expect(sidebar()).toBeNull();

    await act(async () => {
      fireEvent.keyDown(composer(), { key: 'Enter' });
    });
    await flush();
    expect(api.sendMessage).toHaveBeenCalledWith(
      'c1',
      'how much for https://www.projectdiablo2.com/market/listing/cc01?display="Harlequin Crest"',
      ME,
    );
  });
});

describe('ChatOverlayWidget mark all read and the offers badge', () => {
  afterEach(() => resetChatFeed());

  const markAllRead = () => screen.getByRole('button', { name: 'Mark all read' }) as HTMLButtonElement;
  const filterButton = (name: string) => screen.getByRole('radio', { name });
  /** The last chat-prefs.json written. */
  const savedPrefs = () =>
    parseChatPrefs(
      String(
        vi
          .mocked(writeTextFile)
          .mock.calls.filter(([path]) => path === CHAT_PREFS_FILENAME)
          .at(-1)?.[1] ?? '',
      ),
    );
  const notification = (
    id: string,
    listingId: string,
    minutesAgo: number,
    type: OfferNotification['type'] = 'offer_received',
  ) => ({
    id,
    type,
    listingId,
    at: NOW.getTime() - minutesAgo * 60_000,
  });
  const tradeFromDan = () =>
    gameEvent('trade-message', {
      isIncoming: true,
      playerName: 'Dan',
      accountName: 'Dan',
      characterName: 'DanChar',
      message: "Hi, I'm interested in your Arach listed for 1 ist",
      itemName: 'Arach',
      price: '1 ist',
    });

  it('marks every website conversation read on PD2 (loading unread ids it does not hold) and whispers too', async () => {
    messagesByConversation.c1 = [
      msg('a0', 'c1', 'alice', 'old', 40, [ME]),
      msg('m1', 'c1', ME, 'mine', 35, [ME]),
      msg('a1', 'c1', 'alice', 'one', 30),
      msg('a2', 'c1', 'alice', 'two', 20),
    ];
    messagesByConversation.c2 = [msg('b1', 'c2', 'bob', 'yo', 10)];
    await renderWidget([
      conv('c1', ALICE, { unread: 2, latest: msg('a2', 'c1', 'alice', 'two', 20) }),
      conv('c2', BOB, { unread: 1, latest: msg('b1', 'c2', 'bob', 'yo', 10) }),
    ]);
    await whisperFrom('Dan', 'still there?');
    expect(lastEmittedUnread()).toBe(4);
    expect(markAllRead().disabled).toBe(false);

    await act(async () => fireEvent.click(markAllRead()));
    await flush();

    // Only their unread messages, by id: the same PATCH the open thread (and the website) sends
    expect(api.markMessagesAsRead.mock.calls.map(([ids, reader]) => [[...ids].sort(), reader]).sort()).toEqual([
      [['a1', 'a2'], ME],
      [['b1'], ME],
    ]);
    expect(lastEmittedUnread()).toBe(0);
    expect(headerUnread()).toBeNull();
    expect(markAllRead().disabled).toBe(true);
    // Nothing was opened for it
    expect(screen.getByText('Select a conversation to view messages')).not.toBeNull();
  });

  it('is disabled when nothing is unread', async () => {
    await renderWidget([conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10, [ME]) })]);
    expect(markAllRead().disabled).toBe(true);
  });

  it('keeps the unread count and says so when PD2 refuses', async () => {
    api.markMessagesAsRead.mockResolvedValue(false);
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10)];
    await renderWidget([conv('c1', ALICE, { unread: 1, latest: msg('a1', 'c1', 'alice', 'hi', 10) })]);

    await act(async () => fireEvent.click(markAllRead()));
    await flush();

    expect(lastEmittedUnread()).toBe(1);
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Couldn't mark every chat read" }));
  });

  it('also acknowledges the offer notifications on PD2 and marks trade whispers seen (saved)', async () => {
    offerNotifications = [notification('n1', 'L1', 5)];
    await renderWidget([]);
    // Offers alone enable it
    expect(markAllRead().disabled).toBe(false);
    await tradeFromDan();

    await act(async () => fireEvent.click(markAllRead()));
    await flush();

    expect(acknowledgeOfferNotifications).toHaveBeenCalledWith(['n1']);
    expect(savedPrefs().offersSeenAt).toBeGreaterThanOrEqual(NOW.getTime());
    expect(getChatFeed().items.filter((item) => item.kind === 'trade')).toEqual([]);
  });

  it('the Selling or Buying list on screen counts as looking at the offers; the All list does not', async () => {
    offerNotifications = [notification('n1', 'L1', 5)];
    await renderWidget([]);
    await tradeFromDan();
    expect(acknowledgeOfferNotifications).not.toHaveBeenCalled();
    expect(getChatFeed().items.map((item) => item.kind)).toContain('trade');

    await act(async () => fireEvent.click(filterButton('Buying')));
    await flush();

    expect(acknowledgeOfferNotifications).toHaveBeenCalledWith(['n1']);
    expect(savedPrefs().offersSeenAt).toBeGreaterThanOrEqual(NOW.getTime());
    expect(getChatFeed().items.map((item) => item.kind)).not.toContain('trade');
  });

  it('looking at the offers settles while the acknowledged notifications are still listed', async () => {
    // The provider drops acknowledged notifications with a lower-priority update than the chat-prefs re-render
    // the look causes: that render (this stub, always) still lists them, and a running clock gives every look
    // a new "now" (fake timers freeze it)
    offerNotifications = [notification('n1', 'L1', 5)];
    await renderWidget([]);
    let clock = NOW.getTime();
    vi.spyOn(Date, 'now').mockImplementation(() => (clock += 1));
    vi.mocked(writeTextFile).mockClear();

    await act(async () => fireEvent.click(filterButton('Selling')));
    await flush();

    expect(acknowledgeOfferNotifications).toHaveBeenCalledWith(['n1']);
    // Marked once, not once per re-render until React gives up ("Maximum update depth exceeded")
    expect(vi.mocked(writeTextFile).mock.calls.filter(([path]) => path === CHAT_PREFS_FILENAME)).toHaveLength(1);
    expect(filterButton('Selling').getAttribute('aria-checked')).toBe('true');
  });

  it('nothing counts as looked at while the panel is hidden', async () => {
    panel.visible = false;
    offerNotifications = [notification('n1', 'L1', 5)];
    await renderWidget([]);
    await openChat({ filter: 'selling' });
    expect(acknowledgeOfferNotifications).not.toHaveBeenCalled();
  });

  it('an open thread counts as looking at its own offers only', async () => {
    incomingOffers = [
      {
        id: 'o1',
        isIncoming: true,
        playerName: 'carol',
        itemName: 'Shako',
        timestamp: new Date(NOW),
        userId: 'carol',
        listingId: 'L1',
      },
      {
        id: 'o2',
        isIncoming: true,
        playerName: 'dave',
        itemName: 'Ber',
        timestamp: new Date(NOW),
        userId: 'dave',
        listingId: 'L2',
      },
    ];
    offerNotifications = [notification('n1', 'L1', 5), notification('n2', 'L2', 4)];
    await renderWidget([]);

    await select('carol');

    // (this stub keeps them listed; the real provider drops acknowledged ones and never resends them)
    expect(new Set(acknowledgeOfferNotifications.mock.calls.flat(2))).toEqual(new Set(['n1']));
  });

  it('an open thread settles on its offers while their notifications are still listed', async () => {
    incomingOffers = [
      {
        id: 'o1',
        isIncoming: true,
        playerName: 'carol',
        itemName: 'Shako',
        timestamp: new Date(NOW),
        userId: 'carol',
        listingId: 'L1',
      },
    ];
    offerNotifications = [notification('n1', 'L1', 5)];
    await renderWidget([]);
    // As in the Selling list test: the stub keeps n1 listed, and the clock runs
    let clock = NOW.getTime();
    vi.spyOn(Date, 'now').mockImplementation(() => (clock += 1));
    vi.mocked(writeTextFile).mockClear();

    await select('carol');

    expect(acknowledgeOfferNotifications).toHaveBeenCalledWith(['n1']);
    expect(vi.mocked(writeTextFile).mock.calls.filter(([path]) => path === CHAT_PREFS_FILENAME)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Trader details' })).not.toBeNull();
  });

  it('publishes the peek feed newest first, matched to the offers, and provides its actions', async () => {
    incomingOffers = [
      {
        id: 'o1',
        isIncoming: true,
        playerName: 'carol',
        itemName: 'Shako',
        price: '2 ist',
        timestamp: new Date(NOW.getTime() - 60_000),
        userId: 'carol',
        listingId: 'L1',
      },
    ];
    offerNotifications = [notification('n1', 'L1', 1)];
    await renderWidget([conv('c1', ALICE, { unread: 1, latest: msg('a1', 'c1', 'alice', 'you there?', 10) })]);
    await tradeFromDan();

    expect(
      getChatFeed().items.map(({ kind, name, itemName, price, open }) => ({ kind, name, itemName, price, open })),
    ).toEqual([
      { kind: 'trade', name: 'Dan', itemName: 'Arach', price: '1 ist', open: { threadId: 'whisper:dan' } },
      { kind: 'offerReceived', name: 'carol', itemName: 'Shako', price: '2 ist', open: { threadId: 'user:carol' } },
      { kind: 'message', name: 'Alice', itemName: undefined, price: undefined, open: { threadId: 'c1' } },
    ]);
    expect(getChatFeed().canMarkAllRead).toBe(true);

    await act(async () => chatFeedActions().seeOffers());
    await flush();
    expect(acknowledgeOfferNotifications).toHaveBeenCalledWith(['n1']);
    expect(getChatFeed().items.map((item) => item.kind)).not.toContain('trade');
  });
});
