// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@/overlay';
import { invoke, isTauri } from '@tauri-apps/api/core';
import type { ISettings } from '@/hooks/useOptions';
import { ToastActionType } from '@/common/types/Events';
import { changeChatPrefs, resetChatPrefs, setThreadPrefs } from '@/lib/chat-prefs';
import { isToastEnabled, useSocketNotifications } from './useSocketNotifications';

type Handler = (event: { payload: unknown }) => unknown;
type SocketHandler = (data: unknown) => void;

/** Rust events (async listen) and socket push events (sync subscribe) on one test bus. */
const bus = vi.hoisted(() => {
  const handlers = new Map<string, Set<Handler>>();
  const socketHandlers = new Map<string, Set<SocketHandler>>();
  /** When set, listen() registrations stay pending until `releaseListens()`. */
  const held: Array<() => void> = [];
  const state = { hold: false };
  async function listen(event: string, handler: Handler) {
    if (state.hold) {
      const gate = Promise.withResolvers<void>();
      held.push(gate.resolve);
      await gate.promise;
    }
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(handler);
    return () => handlers.get(event)!.delete(handler);
  }
  function subscribe(type: string, handler: SocketHandler) {
    if (!socketHandlers.has(type)) socketHandlers.set(type, new Set());
    socketHandlers.get(type)!.add(handler);
    return () => {
      socketHandlers.get(type)!.delete(handler);
    };
  }
  return {
    handlers,
    socketHandlers,
    held,
    state,
    listen,
    subscribe,
    async fire(event: string, payload: unknown) {
      socketHandlers.get(event)?.forEach((handler) => handler(payload));
      await Promise.all([...(handlers.get(event) ?? [])].map((handler) => handler({ payload })));
    },
    listenerCount(event: string) {
      return (handlers.get(event)?.size ?? 0) + (socketHandlers.get(event)?.size ?? 0);
    },
  };
});

/** usePd2Website() as seen by the hook: the provider's socket state and the offers owner's refresh. */
const pd2 = vi.hoisted(() => ({ isConnected: false, refresh: vi.fn() }));

vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('@/assets/poe_whisper.mp3', () => ({ default: 'whisper.mp3' }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => true), invoke: vi.fn() }));
vi.mock('@/lib/browser-events', () => ({ listen: bus.listen }));
vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(async () => false),
  mkdir: vi.fn(async () => {}),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(async () => {}),
}));
vi.mock('./pd2website/usePD2Website', () => ({
  usePd2Website: () => ({ isConnected: pd2.isConnected, subscribeSocket: bus.subscribe, refresh: pd2.refresh }),
}));

const OFFER_EVENT = 'system/notification_pushed';
const CHAT_EVENT = 'social/message_pushed';

let sounds: number[];
let diabloFocused: boolean;

class FakeAudio {
  volume = 1;
  constructor(public src: string) {}
  play() {
    sounds.push(this.volume);
    return Promise.resolve();
  }
}

function offer(id: string, overrides: Record<string, unknown> = {}) {
  return {
    _id: id,
    user_id: 'u1',
    type: 'offer_received',
    data: { listing_id: 'listing-1' },
    meta: { string: 'Bob offered 2 ist' },
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function whisper(overrides: Record<string, unknown> = {}) {
  return { isTrade: false, from: 'Bob', message: 'hello', isJoin: false, isIncoming: true, ...overrides };
}

function toasts() {
  return vi.mocked(showToast).mock.calls.map(([payload]) => payload);
}

async function renderNotifications(props: {
  isConnected: boolean;
  settings?: Partial<ISettings>;
  whisperNotificationsEnabled?: boolean;
}) {
  const hook = renderHook(
    ({ isConnected, ...p }: typeof props) => {
      pd2.isConnected = isConnected;
      return useSocketNotifications({ ...p, settings: p.settings as ISettings });
    },
    { initialProps: props },
  );
  await act(async () => {});
  return hook;
}

async function fire(event: string, payload: unknown) {
  await act(() => bus.fire(event, payload));
}

beforeEach(() => {
  sounds = [];
  diabloFocused = false;
  bus.handlers.clear();
  bus.socketHandlers.clear();
  pd2.refresh.mockReset();
  bus.held.length = 0;
  bus.state.hold = false;
  resetChatPrefs();
  vi.stubGlobal('Audio', FakeAudio);
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(invoke).mockImplementation(async (cmd) => (cmd === 'is_diablo_focused' ? diabloFocused : undefined));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('isToastEnabled', () => {
  it('defaults to every type enabled', () => {
    expect(['whispers', 'trade', 'joins', 'offers', 'networth'].every((t) => isToastEnabled(undefined, t))).toBe(true);
  });

  it('honors the global switch over the type list', () => {
    expect(isToastEnabled({ toastPopupsEnabled: false, toastPopupTypes: ['offers'] } as ISettings, 'offers')).toBe(
      false,
    );
  });

  it('only enables the listed types', () => {
    const settings = { toastPopupTypes: ['trade'] } as ISettings;
    expect([isToastEnabled(settings, 'trade'), isToastEnabled(settings, 'offers')]).toEqual([true, false]);
  });
});

describe('useSocketNotifications offer notifications', () => {
  it('plays the sound at the configured volume, shows a listing toast and asks offers to refresh', async () => {
    await renderNotifications({ isConnected: true, settings: { whisperNotificationVolume: 40 } });

    await fire(OFFER_EVENT, offer('n1'));

    expect(sounds).toEqual([0.4]);
    expect(toasts()).toEqual([
      {
        title: 'New Offer',
        description: 'Bob offered 2 ist',
        action: { label: 'View Listing', type: ToastActionType.OPEN_MARKET_LISTING, data: { listingId: 'listing-1' } },
      },
    ]);
    expect(pd2.refresh).toHaveBeenCalledTimes(1);
  });

  it('processes each notification id once', async () => {
    await renderNotifications({ isConnected: true });

    await fire(OFFER_EVENT, offer('n1'));
    await fire(OFFER_EVENT, offer('n1'));

    expect(sounds).toHaveLength(1);
    expect(toasts()).toHaveLength(1);
  });

  it('forgets the oldest id once more than 100 are tracked', async () => {
    await renderNotifications({ isConnected: true, settings: { toastPopupsEnabled: false } });

    for (let i = 0; i <= 100; i++) await fire(OFFER_EVENT, offer(`n${i}`));
    await fire(OFFER_EVENT, offer('n100'));
    expect(sounds).toHaveLength(101);

    await fire(OFFER_EVENT, offer('n0'));
    expect(sounds).toHaveLength(102);
  });

  it('ignores other notification types and offers without a listing', async () => {
    await renderNotifications({ isConnected: true });

    await fire(OFFER_EVENT, offer('a', { type: 'listing_sold' }));
    await fire(OFFER_EVENT, offer('b', { data: {} }));

    expect(sounds).toEqual([]);
    expect(pd2.refresh).not.toHaveBeenCalled();
  });

  it('still refreshes offers with sound and toast both disabled, using a default description', async () => {
    await renderNotifications({
      isConnected: true,
      settings: { tradeNotificationsEnabled: false, toastPopupTypes: ['whispers'] },
    });

    await fire(OFFER_EVENT, offer('n1', { meta: {} }));

    expect(sounds).toEqual([]);
    expect(toasts()).toEqual([]);
    expect(pd2.refresh).toHaveBeenCalledTimes(1);
  });

  it('shows the default description when the notification has no text', async () => {
    await renderNotifications({ isConnected: true });
    await fire(OFFER_EVENT, offer('n1', { meta: {} }));
    expect(toasts()).toEqual([expect.objectContaining({ description: 'New offer received' })]);
  });

  it('only listens while connected', async () => {
    const { rerender } = await renderNotifications({ isConnected: false });
    expect(bus.listenerCount(OFFER_EVENT)).toBe(0);
    expect(bus.listenerCount(CHAT_EVENT)).toBe(0);

    rerender({ isConnected: true });
    await act(async () => {});
    expect(bus.listenerCount(OFFER_EVENT)).toBe(1);
    expect(bus.listenerCount(CHAT_EVENT)).toBe(1);

    rerender({ isConnected: false });
    await act(async () => {});
    expect(bus.listenerCount(OFFER_EVENT)).toBe(0);
    expect(bus.listenerCount(CHAT_EVENT)).toBe(0);
  });

  it('applies changed settings to later notifications', async () => {
    const { rerender } = await renderNotifications({
      isConnected: true,
      settings: { tradeNotificationsEnabled: true },
    });
    rerender({ isConnected: true, settings: { tradeNotificationsEnabled: false } });
    await act(async () => {});

    await fire(OFFER_EVENT, offer('n1'));

    expect(bus.listenerCount(OFFER_EVENT)).toBe(1);
    expect(sounds).toEqual([]);
  });
});

describe('useSocketNotifications whispers', () => {
  it('notifies a general whisper with sound and a truncated toast when tabbed out', async () => {
    await renderNotifications({ isConnected: false, settings: { whisperNotificationVolume: 100 } });

    await fire('whisper-received', whisper({ message: 'x'.repeat(81) }));

    expect(sounds).toEqual([1]);
    expect(toasts()).toEqual([
      {
        title: 'Whisper from Bob',
        description: `${'x'.repeat(80)}...`,
        duration: 5000,
        action: { label: 'Reply', type: ToastActionType.OPEN_CHAT_CONVERSATION, data: { threadId: 'whisper:bob' } },
      },
    ]);
  });

  it("stays silent for a whisper from someone whose chat thread is muted, under any of the thread's names", async () => {
    changeChatPrefs((prefs) => setThreadPrefs(prefs, ['c1', 'whisper:bobacc', 'whisper:bob'], { muted: true }));
    await renderNotifications({ isConnected: false });

    await fire('whisper-received', whisper({ from: '*BobAcc' }));
    await fire('whisper-received', whisper({ isTrade: true, itemName: 'Shako' }));
    await fire('whisper-received', whisper({ from: 'Carl' }));

    expect(sounds).toHaveLength(1);
    expect(toasts()).toEqual([expect.objectContaining({ title: 'Whisper from Carl' })]);
  });

  it('keeps an 80-character whisper intact', async () => {
    await renderNotifications({ isConnected: false });
    await fire('whisper-received', whisper({ message: 'y'.repeat(80) }));
    expect(toasts()).toEqual([expect.objectContaining({ description: 'y'.repeat(80) })]);
  });

  it('plays the sound but skips the toast while Diablo is focused', async () => {
    diabloFocused = true;
    await renderNotifications({ isConnected: false });

    await fire('whisper-received', whisper());

    expect(sounds).toEqual([0.7]);
    expect(toasts()).toEqual([]);
  });

  it.each([
    ['outgoing', whisper({ isIncoming: false }), {}],
    ['announcement (default off)', whisper({ from: '*Announcements' }), {}],
    ['ignored player (normalized)', whisper({ from: '*BOB' }), { whisperIgnoreList: ['bob'] }],
    ['general whispers disabled', whisper(), { whisperNotificationsEnabled: false }],
    ['timing never', whisper(), { whisperNotificationTiming: 'never' }],
    ['timing in-game while tabbed out', whisper(), { whisperNotificationTiming: 'in-game' }],
  ])('stays silent for %s', async (_label, payload, settings) => {
    await renderNotifications({ isConnected: false, settings: settings as Partial<ISettings> });

    await fire('whisper-received', payload);

    expect(sounds).toEqual([]);
    expect(toasts()).toEqual([]);
  });

  it('notifies announcements when enabled', async () => {
    await renderNotifications({ isConnected: false, settings: { whisperAnnouncementsEnabled: true } });
    await fire('whisper-received', whisper({ from: 'announcements' }));
    expect(sounds).toHaveLength(1);
  });

  it.each([
    ['in-game', true, 1],
    ['in-game', false, 0],
    ['out-of-game', true, 0],
    ['out-of-game', false, 1],
  ] as const)('timing %s with Diablo focused=%s plays %i sound(s)', async (timing, focused, expected) => {
    diabloFocused = focused;
    await renderNotifications({ isConnected: false, settings: { whisperNotificationTiming: timing } });
    await fire('whisper-received', whisper());
    expect(sounds).toHaveLength(expected);
  });

  it('shows a trade toast with the item only when tabbed out and an item is known', async () => {
    await renderNotifications({ isConnected: false });

    await fire('whisper-received', whisper({ isTrade: true, itemName: 'Shako' }));
    await fire('whisper-received', whisper({ isTrade: true }));
    diabloFocused = true;
    await fire('whisper-received', whisper({ isTrade: true, itemName: 'Arach' }));

    expect(sounds).toHaveLength(3);
    expect(toasts()).toEqual([
      {
        title: 'Trade Whisper',
        description: 'Bob: Shako',
        duration: 5000,
        action: { label: 'Reply', type: ToastActionType.OPEN_CHAT_CONVERSATION, data: { threadId: 'whisper:bob' } },
      },
    ]);
  });

  it('trade whispers follow the trade switch, not the general whisper switch', async () => {
    await renderNotifications({
      isConnected: false,
      settings: { tradeNotificationsEnabled: false, whisperNotificationsEnabled: true },
    });
    await fire('whisper-received', whisper({ isTrade: true, itemName: 'Shako' }));
    expect(sounds).toEqual([]);
  });

  it('notifies joins only when enabled and tabbed out', async () => {
    const { rerender } = await renderNotifications({ isConnected: false });
    await fire('whisper-received', whisper({ isJoin: true }));
    expect(sounds).toEqual([]);

    rerender({ isConnected: false, settings: { whisperJoinNotificationsEnabled: true } });
    await act(async () => {});
    await fire('whisper-received', whisper({ isJoin: true }));
    diabloFocused = true;
    await fire('whisper-received', whisper({ isJoin: true }));

    expect(sounds).toHaveLength(1);
    expect(toasts()).toEqual([
      { title: 'Player Joined', description: 'Bob joined the game', duration: 5000, variant: 'default' },
    ]);
  });

  it('does not listen for whispers outside Tauri or when disabled by prop', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    await renderNotifications({ isConnected: false });
    cleanup();
    vi.mocked(isTauri).mockReturnValue(true);
    await renderNotifications({ isConnected: false, whisperNotificationsEnabled: false });

    expect(bus.listenerCount('whisper-received')).toBe(0);
  });

  // BUG: useSocketNotifications.tsx:304-309 — the whisper listener's `unlisten` is assigned only after
  // listen() resolves; a settings change before that leaks the first listener, so every whisper
  // notifies twice for the rest of the session.
  it.fails('notifies a whisper once after settings change during listener registration', async () => {
    bus.state.hold = true;
    const { rerender } = await renderNotifications({ isConnected: false, settings: { whisperNotificationVolume: 50 } });
    rerender({ isConnected: false, settings: { whisperNotificationVolume: 60 } });
    bus.state.hold = false;
    await act(async () => bus.held.splice(0).forEach((release) => release()));

    await fire('whisper-received', whisper());

    expect(sounds).toEqual([0.6]);
  });
});

describe('useSocketNotifications chat messages', () => {
  const chat = { _id: 'm1', sender_id: 's1', conversation_id: 'c1', content: 'hi there' };

  it('shows a chat toast whose Reply opens the conversation, once per message id', async () => {
    await renderNotifications({ isConnected: true });

    await fire(CHAT_EVENT, chat);
    await fire(CHAT_EVENT, chat);

    expect(toasts()).toEqual([
      {
        title: 'New Chat Message',
        description: 'hi there',
        action: { label: 'Reply', type: ToastActionType.OPEN_CHAT_CONVERSATION, data: { conversationId: 'c1' } },
      },
    ]);
  });

  it('shows no toast for a muted conversation', async () => {
    changeChatPrefs((prefs) => setThreadPrefs(prefs, ['c1'], { muted: true }));
    await renderNotifications({ isConnected: true });
    await fire(CHAT_EVENT, chat);
    await fire(CHAT_EVENT, { ...chat, _id: 'm2', conversation_id: 'c2' });
    expect(toasts()).toEqual([
      expect.objectContaining({ action: expect.objectContaining({ data: { conversationId: 'c2' } }) }),
    ]);
  });

  it("shows no toast for a conversation a muted person started after muting (by the sender's website user)", async () => {
    changeChatPrefs((prefs) => setThreadPrefs(prefs, ['user:s1'], { muted: true }));
    await renderNotifications({ isConnected: true });
    await fire(CHAT_EVENT, { ...chat, conversation_id: 'c-new' });
    expect(toasts()).toEqual([]);
  });

  it('truncates long previews and ignores malformed messages', async () => {
    await renderNotifications({ isConnected: true });

    await fire(CHAT_EVENT, { ...chat, conversation_id: '' });
    await fire(CHAT_EVENT, { ...chat, _id: 'm2', content: 'z'.repeat(100) });

    expect(toasts()).toEqual([expect.objectContaining({ description: `${'z'.repeat(80)}...` })]);
  });

  it('respects the whispers toast type', async () => {
    await renderNotifications({ isConnected: true, settings: { toastPopupTypes: ['offers'] } });
    await fire(CHAT_EVENT, chat);
    expect(toasts()).toEqual([]);
  });
});
