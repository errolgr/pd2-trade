// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { useAppShortcuts } from '@/hooks/useShortcuts';
import { useClipboard } from '@/hooks/useClipboard';
import { useKeySender } from '@/hooks/useKeySender';
import { encodeItem, encodeItemForQuickList } from '@/lib/item-utils';
import type * as ItemUtils from '@/lib/item-utils';
import { showToast } from '@/overlay';
import { createOptionsStore, type OptionsStore } from '@/components/dialogs/optionsv2/test-utils';
import AppController from './AppController';

/** Overlay API spies. */
const h = vi.hoisted(() => ({
  overlay: { openPanel: vi.fn(), closePanel: vi.fn(), togglePanel: vi.fn() },
  /** An open panel (e.g. a price check) holds the keyboard. */
  keyboardClaimed: false,
  releaseKeyboard: vi.fn(async () => {
    h.keyboardClaimed = false;
  }),
  /** The chat badge: unread messages outside muted threads. */
  chatUnread: 0,
}));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(), invoke: vi.fn() }));
// A fresh value per render (like any context value that changes): hotkey handlers must not depend on its identity
vi.mock('@/overlay', () => ({
  showToast: vi.fn(),
  useOverlay: () => ({ ...h.overlay }),
  isKeyboardClaimed: () => h.keyboardClaimed,
  releaseKeyboard: () => h.releaseKeyboard(),
  getBadgeCount: (key: string) => (key === 'chatUnread' ? h.chatUnread : 0),
}));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useClipboard', () => ({ useClipboard: vi.fn() }));
vi.mock('@/hooks/useKeySender', () => ({ useKeySender: vi.fn() }));
const takeSnapshot = vi.hoisted(() => vi.fn(async (_kind: string) => null));
vi.mock('@/hooks/useNetWorth', () => ({ useNetWorth: () => ({ takeSnapshot: (kind: string) => takeSnapshot(kind) }) }));
vi.mock('@/hooks/useShortcuts', () => ({ useAppShortcuts: vi.fn() }));
vi.mock('@/hooks/useAppUpdates', () => ({ useAppUpdates: vi.fn() }));
vi.mock('@/hooks/usePD2Auth', () => ({ usePD2Auth: vi.fn() }));
vi.mock('@/hooks/useChangelog', () => ({ useChangelog: vi.fn() }));
vi.mock('@/hooks/useSocketNotifications', () => ({ useSocketNotifications: vi.fn() }));
vi.mock('@/pages/market/alerts/useMarketAlerts', () => ({ useMarketAlerts: vi.fn() }));
const delistItem = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/pages/delist/DelistHandler', () => ({ useDelist: () => ({ delistItem }) }));
// Item parsing has its own tests; here "ITEM…" is a valid item and "…stash…" marks it as in the shared stash.
vi.mock('@/lib/item-utils', async (importOriginal) => ({
  ...(await importOriginal<typeof ItemUtils>()),
  clipboardContainsValidItem: (raw: string | null) => !!raw?.startsWith('ITEM'),
  isStashItem: (raw: string) => raw.includes('stash'),
}));

const SETTINGS: Partial<ISettings> = {
  hotkeyModifier: 'ctrl',
  hotkeyKey: 'd',
  chatButtonOverlayEnabled: true,
  whisperNotificationsEnabled: true,
  tradeNotificationsEnabled: true,
  diablo2Directory: 'C:\\D2',
};

type Shortcuts = Parameters<typeof useAppShortcuts>;

let store: OptionsStore;
let clipboard: string | null;
let itemUnderCursor: string | null;
let diabloFocused: boolean;
let keyPress: ReturnType<typeof vi.fn>;
let invoked: string[];

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const shortcuts = () => vi.mocked(useAppShortcuts).mock.calls.at(-1) as Shortcuts;
// Fire-and-forget like the real global-shortcut handler; callers advance the clock past the 250ms copy wait.
const press = (index: number) => act(async () => void shortcuts()[index]!());
const toasts = () => vi.mocked(showToast).mock.calls.map(([p]) => p);

async function mount(settings: Partial<ISettings> = SETTINGS, isLoading = false) {
  store = createOptionsStore(settings, isLoading);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  const view = render(<AppController />);
  await advance(0);
  return view;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  clipboard = 'user text';
  itemUnderCursor = 'ITEM sword';
  diabloFocused = true;
  h.keyboardClaimed = false;
  h.chatUnread = 0;
  invoked = [];

  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(invoke).mockImplementation(async (cmd: string) => {
    invoked.push(cmd);
    if (cmd === 'is_diablo_focused') return diabloFocused;
    return undefined;
  });
  keyPress = vi.fn(async (combo: string) => {
    if (combo === 'ctrl+c') clipboard = itemUnderCursor;
  });
  const copy = vi.fn(async (text: string) => {
    clipboard = text;
  });
  vi.mocked(useClipboard).mockReturnValue({ read: async () => clipboard, copy } as never);
  vi.mocked(useKeySender).mockReturnValue(keyPress as never);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('AppController price check hotkey', () => {
  it('does nothing while Diablo is not focused', async () => {
    diabloFocused = false;
    await mount();
    await press(0);
    await advance(300);
    expect(keyPress).not.toHaveBeenCalled();
    expect(h.overlay.openPanel).not.toHaveBeenCalledWith('itemSearch', expect.anything());
  });

  it('rejects an unsupported item with a toast and restores the clipboard', async () => {
    itemUnderCursor = 'garbage';
    await mount();
    await press(0);
    await advance(300);
    expect(toasts()).toContainEqual(expect.objectContaining({ description: 'Item is not supported or invalid.' }));
    expect(clipboard).toBe('user text');
    expect(h.overlay.openPanel).not.toHaveBeenCalledWith('itemSearch', expect.anything());
  });

  it('hands the keyboard back to the game before copying when an open panel holds it', async () => {
    h.keyboardClaimed = true;
    await mount();
    await press(0);
    await advance(400);
    expect(h.releaseKeyboard).toHaveBeenCalledTimes(1);
    expect(h.releaseKeyboard.mock.invocationCallOrder[0]).toBeLessThan(keyPress.mock.invocationCallOrder[0]);
    expect(h.overlay.openPanel).toHaveBeenCalledWith('itemSearch', { text: encodeItem('ITEM sword') });
  });

  it('copies even with a Ctrl+C hotkey when a panel held the keyboard (the game never saw the press)', async () => {
    h.keyboardClaimed = true;
    await mount();
    act(() => store.replace({ ...SETTINGS, hotkeyKey: 'c' }));
    await press(0);
    await advance(400);
    expect(keyPress).toHaveBeenCalledWith('ctrl+c');
    expect(h.overlay.openPanel).toHaveBeenCalledWith('itemSearch', { text: encodeItem('ITEM sword') });
  });

  it('leaves focus alone when no panel holds the keyboard', async () => {
    await mount();
    await press(0);
    await advance(300);
    expect(h.releaseKeyboard).not.toHaveBeenCalled();
  });

  it('opens the item search panel with the copied item and gives the user their clipboard back', async () => {
    await mount();
    await press(0);
    await advance(300);
    expect(h.overlay.openPanel).toHaveBeenCalledWith('itemSearch', { text: encodeItem('ITEM sword') });
    expect(clipboard).toBe('user text');
  });

  it('does not send a second Ctrl+C when the price check hotkey already is Ctrl+C', async () => {
    await mount({ ...SETTINGS, hotkeyKey: 'c' });
    clipboard = 'ITEM copied by the hotkey itself';
    await press(0);
    await advance(300);
    expect(keyPress).not.toHaveBeenCalled();
    expect(h.overlay.openPanel).toHaveBeenCalledWith('itemSearch', {
      text: encodeItem('ITEM copied by the hotkey itself'),
    });
  });
});

describe('AppController list and delist hotkeys', () => {
  it('opens Quick List at the cursor with a stash item', async () => {
    itemUnderCursor = 'ITEM stash ring';
    await mount();
    await press(1);
    await advance(300);
    expect(h.overlay.openPanel).toHaveBeenCalledWith(
      'quickList',
      { item: encodeItemForQuickList('ITEM stash ring') },
      { placement: 'cursor' },
    );
    expect(toasts()).toEqual([]);
  });

  it('opens Quick List in an error state and explains when the item is not in the shared stash', async () => {
    itemUnderCursor = 'ITEM inventory ring';
    await mount();
    await press(1);
    await advance(300);
    expect(h.overlay.openPanel).toHaveBeenCalledWith(
      'quickList',
      { error: 'not_shared_stash' },
      { placement: 'cursor' },
    );
    expect(toasts()).toContainEqual(
      expect.objectContaining({
        title: 'Cannot List Item',
        description: expect.stringContaining('not in your shared stash'),
      }),
    );
  });

  it('explains an invalid item when listing', async () => {
    itemUnderCursor = 'nothing';
    await mount();
    await press(1);
    await advance(300);
    expect(h.overlay.openPanel).toHaveBeenCalledWith(
      'quickList',
      { error: 'not_shared_stash' },
      { placement: 'cursor' },
    );
    expect(toasts()).toContainEqual(expect.objectContaining({ description: 'Item is not supported or invalid.' }));
  });

  it('delist hotkey hands a valid item to the delist handler', async () => {
    await mount();
    await press(5);
    await advance(300);
    expect(delistItem).toHaveBeenCalledWith('ITEM sword');
  });

  it('delist hotkey toasts when no item is under the cursor', async () => {
    itemUnderCursor = null;
    await mount();
    await press(5);
    await advance(300);
    expect(delistItem).not.toHaveBeenCalled();
    expect(toasts()).toContainEqual(expect.objectContaining({ title: 'Delist', variant: 'error' }));
  });
});

describe('AppController hotkey registration', () => {
  it('hands useAppShortcuts the same handlers across re-renders, so hotkeys are not re-registered', async () => {
    await mount();
    const first = shortcuts();
    act(() => store.replace({ ...SETTINGS, diablo2Directory: 'D:\\D2' })); // any re-render
    expect(vi.mocked(useAppShortcuts).mock.calls.length).toBeGreaterThan(1);
    const last = shortcuts();
    first.forEach((handler, i) => expect(last[i]).toBe(handler));
  });

  it('the stable handlers run the latest settings', async () => {
    await mount();
    act(() => store.replace({ ...SETTINGS, hotkeyKey: 'c' }));
    clipboard = 'ITEM copied by the hotkey itself';
    await press(0);
    await advance(300);
    expect(keyPress).not.toHaveBeenCalled(); // Ctrl+C hotkey: no second copy
    expect(h.overlay.openPanel).toHaveBeenCalledWith('itemSearch', {
      text: encodeItem('ITEM copied by the hotkey itself'),
    });
  });

  it('market hotkey toggles the market panel', async () => {
    await mount();
    await press(7);
    expect(h.overlay.togglePanel).toHaveBeenCalledWith('market');
  });
});

describe('AppController panels', () => {
  it('currency hotkey opens the stash value panel only while Diablo is focused', async () => {
    await mount();
    await press(2);
    expect(h.overlay.openPanel).toHaveBeenLastCalledWith('currency');
    h.overlay.openPanel.mockClear();
    diabloFocused = false;
    await press(2);
    expect(h.overlay.openPanel).not.toHaveBeenCalled();
  });

  it('snapshot hotkey takes a manual net worth snapshot', async () => {
    await mount();
    await press(6);
    expect(takeSnapshot).toHaveBeenCalledWith('manual');
  });

  it('chat hotkey toggles chat; offers hotkey opens chat on the Selling filter', async () => {
    await mount();
    await press(3);
    expect(h.overlay.togglePanel).toHaveBeenLastCalledWith('chat');
    await press(4);
    expect(h.overlay.openPanel).toHaveBeenLastCalledWith('chat', { filter: 'selling' });
  });

  it('chat hotkey opens chat on the newest unread thread while there are unread messages', async () => {
    h.chatUnread = 3;
    await mount();
    await press(3);
    expect(h.overlay.togglePanel).toHaveBeenLastCalledWith('chat', { newestUnread: true });
  });

  it('shows the chat button once settings load and closes it when the overlay gets disabled', async () => {
    await mount(SETTINGS, true);
    expect(h.overlay.openPanel).not.toHaveBeenCalledWith('chatButton');
    act(() => store.replace(SETTINGS, false));
    expect(h.overlay.openPanel).toHaveBeenCalledWith('chatButton');
    act(() => store.replace({ ...SETTINGS, chatButtonOverlayEnabled: false }));
    expect(h.overlay.closePanel).toHaveBeenCalledWith('chatButton');
  });

  it('announces itself once after 2 seconds', async () => {
    await mount();
    await advance(1999);
    expect(showToast).not.toHaveBeenCalled();
    await advance(1);
    expect(toasts()).toEqual(['is now running in the background...']);
  });
});

describe('AppController chat watcher', () => {
  it('starts the watcher with the custom Diablo directory once settings load', async () => {
    await mount(SETTINGS, true);
    expect(invoked).not.toContain('start_chat_watcher');
    act(() => store.replace(SETTINGS, false));
    await advance(0);
    expect(vi.mocked(invoke)).toHaveBeenCalledWith('start_chat_watcher', { customD2Dir: 'C:\\D2' });
  });

  it('stops the watcher when both whisper and trade notifications are off', async () => {
    await mount();
    invoked = [];
    act(() => store.replace({ ...SETTINGS, whisperNotificationsEnabled: false, tradeNotificationsEnabled: false }));
    await advance(0);
    expect(invoked).toContain('stop_chat_watcher');
    expect(invoked).not.toContain('start_chat_watcher');
  });

  it('keeps watching while trade notifications alone are on', async () => {
    await mount({ ...SETTINGS, whisperNotificationsEnabled: false });
    expect(invoked).toContain('start_chat_watcher');
  });

  it('starts the watcher exactly once per settings change', async () => {
    await mount();
    expect(invoked.filter((c) => c === 'start_chat_watcher')).toHaveLength(1);
  });

  it.each([
    [
      'warns (no error report) when the chat log is missing from the Diablo II directory',
      'Could not find or create chat log file. Please check your Diablo II Directory settings.',
      'warn',
    ],
    ['still reports other watcher failures', 'Failed to watch chat log file: access denied', 'error'],
  ] as const)('%s', async (_label, message, level) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      invoked.push(cmd);
      if (cmd === 'start_chat_watcher') throw message;
      return undefined;
    });
    await mount();
    await advance(0);

    const reported = error.mock.calls.some((args) => args.includes(message));
    const warned = vi.mocked(console.warn).mock.calls.some((args) => args.includes(message));
    expect([reported, warned]).toEqual(level === 'error' ? [true, false] : [false, true]);
  });
});
