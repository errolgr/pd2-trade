// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { Conversation, Message } from '@/common/types/pd2-website/ChatTypes';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { setBadgeCount, type PanelPayloads } from '@/overlay';
import ChatOverlayWidget from './ChatOverlayWidget';

vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
/**
 * The chat panel's payload/payloadVersion/visible as usePanel() reports them; `openChat()` mimics
 * openPanel('chat', ...). `visible`: on screen, so messages in the open conversation count as read.
 */
const panel = vi.hoisted(() => ({ payload: undefined as unknown, payloadVersion: 0, visible: true }));
vi.mock('@/overlay', () => ({ setBadgeCount: vi.fn(), usePanel: () => panel }));
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
  markMessagesAsRead: Mock<(ids: string[], userId: string) => Promise<void>>;
  deleteConversation: Mock<(conversationId: string) => Promise<void>>;
};
let messagesByConversation: Record<string, Message[]>;
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

async function renderWidget(conversations: Conversation[]) {
  api.getConversations.mockResolvedValue({ data: conversations });
  const onClose = vi.fn();
  const view = render(<ChatOverlayWidget onClose={onClose} />);
  rerenderWidget = () => view.rerender(<ChatOverlayWidget onClose={onClose} />);
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
    markMessagesAsRead: vi.fn(async () => {}),
    deleteConversation: vi.fn(async () => {}),
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
    expect(rowFor('Alice').textContent).toContain('3 minutes');
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

  it('keeps an empty list when loading conversations fails', async () => {
    api.getConversations.mockRejectedValue(new Error('offline'));
    render(<ChatOverlayWidget onClose={vi.fn()} />);
    await flush();
    expect(screen.queryByText('No conversations')).not.toBeNull();
    expect(screen.queryByText('Loading conversations...')).toBeNull();
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
    const pending = Promise.withResolvers<void>();
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
    await act(async () => pending.resolve());
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
    const view = render(<ChatOverlayWidget onClose={vi.fn()} />);
    rerenderWidget = () => view.rerender(<ChatOverlayWidget onClose={vi.fn()} />);

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
});

describe('ChatOverlayWidget composer', () => {
  async function openAlice() {
    messagesByConversation.c1 = [msg('a1', 'c1', 'alice', 'hi', 10, [ME])];
    await renderWidget([
      conv('c1', ALICE, { latest: msg('a1', 'c1', 'alice', 'hi', 10) }),
      conv('c2', BOB, { latest: msg('b1', 'c2', 'bob', 'yo', 5) }),
    ]);
    await select('Alice');
    return screen.getByPlaceholderText('Enter message...') as HTMLInputElement;
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

  async function sendText(input: HTMLInputElement, text: string) {
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
