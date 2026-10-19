// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit } from '@/lib/browser-events';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { useAppShortcuts } from '@/hooks/useShortcuts';
import { useTray } from '@/hooks/useTray';
import { useClipboard } from '@/hooks/useClipboard';
import { useKeySender } from '@/hooks/useKeySender';
import {
  attachWindowCloseHandler,
  getDiabloRectWithRetry,
  openCenteredWindow,
  openOverDiabloWindow,
  openWindowAtCursor,
  openWindowCenteredOnDiablo,
} from '@/lib/window';
import { encodeItem, encodeItemForQuickList } from '@/lib/item-utils';
import { NETWORTH_OPEN_EVENT } from '@/hooks/useNetWorth';
import { createOptionsStore, type OptionsStore } from '@/components/dialogs/optionsv2/test-utils';
import LandingPage from './LandingPage';

/** Event buses for app events (browser-events) and raw Tauri events, plus fake window handles. */
const h = vi.hoisted(() => {
  type Handler = (e: { payload?: unknown }) => unknown;
  const bus = (map: Map<string, Set<Handler>>) => ({
    listen: async (event: string, handler: Handler) => {
      if (!map.has(event)) map.set(event, new Set());
      map.get(event)!.add(handler);
      return () => map.get(event)!.delete(handler);
    },
    fire: async (event: string, payload?: unknown) => {
      await Promise.all([...(map.get(event) ?? [])].map((fn) => fn({ payload })));
    },
    count: (event: string) => map.get(event)?.size ?? 0,
    clear: () => map.clear(),
  });
  const makeWin = (label: string) => {
    let visible = false;
    return {
      label,
      show: vi.fn(async () => {
        visible = true;
      }),
      hide: vi.fn(async () => {
        visible = false;
      }),
      isVisible: vi.fn(async () => visible),
      setFocus: vi.fn(async () => {}),
      emit: vi.fn(async () => {}),
      onCloseRequested: vi.fn(),
      setTitle: vi.fn(),
    };
  };
  return { app: bus(new Map()), tauri: bus(new Map()), makeWin };
});

type FakeWin = ReturnType<typeof h.makeWin>;

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(), invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: h.tauri.listen }));
vi.mock('@tauri-apps/api/webviewWindow', () => {
  const WebviewWindow = vi.fn(function (this: object, label: string, opts: object) {
    Object.assign(this, h.makeWin(label), { opts });
  });
  Object.assign(WebviewWindow, { getCurrent: vi.fn(() => h.makeWin('Main')), getByLabel: vi.fn() });
  return { WebviewWindow };
});
vi.mock('@/lib/browser-events', () => ({ emit: vi.fn(), listen: h.app.listen }));
vi.mock('@/hooks/useOptions', () => ({
  useOptions: vi.fn(),
  OptionsProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/hooks/useClipboard', () => ({ useClipboard: vi.fn() }));
vi.mock('@/hooks/useKeySender', () => ({ useKeySender: vi.fn() }));
vi.mock('@/hooks/useTray', () => ({ useTray: vi.fn(), TrayProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/hooks/useDialog', () => ({ DialogProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({
  Pd2WebsiteProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/hooks/useItems', () => ({ ItemsProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/hooks/useNetWorth', () => ({
  NetWorthProvider: ({ children }: { children: React.ReactNode }) => children,
  NETWORTH_OPEN_EVENT: 'networth:open',
  requestNetWorthSnapshot: vi.fn(),
}));
vi.mock('@/pages/delist/DelistHandler', () => ({ default: () => null }));
vi.mock('@/pages/net-worth/NetWorthOverlayHost', () => ({ default: () => null }));
vi.mock('@/hooks/useShortcuts', () => ({ useAppShortcuts: vi.fn() }));
vi.mock('@/hooks/useAppUpdates', () => ({ useAppUpdates: vi.fn() }));
vi.mock('@/hooks/usePD2Auth', () => ({ usePD2Auth: vi.fn() }));
vi.mock('@/hooks/useChangelog', () => ({ useChangelog: vi.fn() }));
vi.mock('@/hooks/useSocketNotifications', () => ({ useSocketNotifications: vi.fn() }));
vi.mock('@/hooks/pd2website/useSocket', () => ({ useSocket: () => ({ isConnected: false }) }));
vi.mock('@/lib/window', () => ({
  openCenteredWindow: vi.fn(),
  openOverDiabloWindow: vi.fn(),
  openWindowAtCursor: vi.fn(),
  openWindowCenteredOnDiablo: vi.fn(),
  getDiabloRectWithRetry: vi.fn(),
  attachWindowCloseHandler: vi.fn(),
}));
// Item parsing has its own tests; here "ITEM…" is a valid item and "…stash…" marks it as in the shared stash.
vi.mock('@/lib/item-utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/item-utils')>()),
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
let copy: ReturnType<typeof vi.fn>;
let opened: { label: string; url: string; win: FakeWin }[];
let invoked: string[];

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const shortcuts = () => vi.mocked(useAppShortcuts).mock.calls.at(-1) as Shortcuts;
// Fire-and-forget like the real global-shortcut handler; callers advance the clock past the 250ms copy wait.
const press = (index: number) => act(async () => void shortcuts()[index]!());
const toasts = () => vi.mocked(emit).mock.calls.filter(([e]) => e === 'toast-event').map(([, p]) => p);
const openedAt = (label: string) => opened.filter((o) => o.label === label);
const fakeOpen = async (label: string, url: string) => {
  const win = h.makeWin(label);
  opened.push({ label, url, win });
  return win;
};

async function mount(settings: Partial<ISettings> = SETTINGS, isLoading = false) {
  store = createOptionsStore(settings, isLoading);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  const view = render(<LandingPage />);
  await advance(0);
  return view;
}

/** Lets the startup sequence (chat button, chat warm-up, trade window) finish. */
const settleStartup = () => advance(1500);

beforeEach(() => {
  vi.useFakeTimers();
  h.app.clear();
  h.tauri.clear();
  clipboard = 'user text';
  itemUnderCursor = 'ITEM sword';
  diabloFocused = true;
  opened = [];
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
  copy = vi.fn(async (text: string) => {
    clipboard = text;
  });
  vi.mocked(useClipboard).mockReturnValue({ read: async () => clipboard, copy } as never);
  vi.mocked(useKeySender).mockReturnValue(keyPress as never);
  vi.mocked(useTray).mockReturnValue({ settingsWindow: null } as never);

  for (const fn of [openCenteredWindow, openOverDiabloWindow, openWindowAtCursor, openWindowCenteredOnDiablo]) {
    vi.mocked(fn).mockImplementation(fakeOpen as never);
  }
  vi.mocked(getDiabloRectWithRetry).mockResolvedValue({ x: 100, y: 50, width: 1280, height: 720 } as never);
  vi.mocked(WebviewWindow.getByLabel).mockResolvedValue(null);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('LandingPage price check hotkey', () => {
  it('does nothing while Diablo is not focused', async () => {
    diabloFocused = false;
    await mount();
    await press(0);
    await advance(300);
    expect(keyPress).not.toHaveBeenCalled();
    expect(openOverDiabloWindow).not.toHaveBeenCalled();
  });

  it('rejects an unsupported item with a toast and restores the clipboard', async () => {
    itemUnderCursor = 'garbage';
    await mount();
    await press(0);
    await advance(300);
    expect(toasts()).toContainEqual(expect.objectContaining({ description: 'Item is not supported or invalid.' }));
    expect(clipboard).toBe('user text');
    expect(openOverDiabloWindow).not.toHaveBeenCalled();
  });

  it('opens the item window with the copied item and gives the user their clipboard back', async () => {
    await mount();
    await press(0);
    await advance(300);
    expect(openedAt('ItemSearch').map((o) => o.url)).toEqual([`/item?text=${encodeItem('ITEM sword')}`]);
    expect(clipboard).toBe('user text');
  });

  it('reuses the open item window for the next search', async () => {
    await mount();
    await press(0);
    await advance(300);
    itemUnderCursor = 'ITEM shield';
    await press(0);
    await advance(400);
    const [{ win }] = openedAt('ItemSearch');
    expect(openedAt('ItemSearch')).toHaveLength(1);
    expect(win.emit).toHaveBeenCalledWith('new-search', encodeItem('ITEM shield'));
    expect(win.show).toHaveBeenCalled();
  });

  it('opens a fresh window after the previous one was closed', async () => {
    await mount();
    await press(0);
    await advance(300);
    const win = openedAt('ItemSearch')[0].win as unknown;
    const onClose = vi.mocked(attachWindowCloseHandler).mock.calls.find(([w]) => w === win)![1];
    onClose();
    await press(0);
    await advance(300);
    expect(openedAt('ItemSearch')).toHaveLength(2);
  });

  it('does not send a second Ctrl+C when the price check hotkey already is Ctrl+C', async () => {
    await mount({ ...SETTINGS, hotkeyKey: 'c' });
    clipboard = 'ITEM copied by the hotkey itself';
    await press(0);
    await advance(300);
    expect(keyPress).not.toHaveBeenCalled();
    expect(openedAt('ItemSearch')[0].url).toBe(`/item?text=${encodeItem('ITEM copied by the hotkey itself')}`);
  });
});

describe('LandingPage list and delist hotkeys', () => {
  it('opens Quick List with a stash item', async () => {
    itemUnderCursor = 'ITEM stash ring';
    await mount();
    await press(1);
    await advance(300);
    expect(openedAt('QuickList').map((o) => o.url)).toEqual([`/quick-list?item=${encodeItemForQuickList('ITEM stash ring')}`]);
    expect(toasts()).toEqual([]);
  });

  it('opens Quick List in an error state and explains when the item is not in the shared stash', async () => {
    itemUnderCursor = 'ITEM inventory ring';
    await mount();
    await press(1);
    await advance(300);
    expect(openedAt('QuickList')[0].url).toBe('/quick-list?error=not_shared_stash');
    expect(toasts()).toContainEqual(expect.objectContaining({ title: 'Cannot List Item', description: expect.stringContaining('not in your shared stash') }));
  });

  it('sends the next item to an already open Quick List window', async () => {
    itemUnderCursor = 'ITEM stash a';
    await mount();
    await press(1);
    await advance(300);
    itemUnderCursor = 'ITEM stash b';
    await press(1);
    await advance(300);
    const [{ win }] = openedAt('QuickList');
    expect(openedAt('QuickList')).toHaveLength(1);
    expect(win.emit).toHaveBeenCalledWith('quick-list-new-item', encodeItemForQuickList('ITEM stash b'));

    itemUnderCursor = 'nothing';
    await press(1);
    await advance(300);
    expect(win.emit).toHaveBeenCalledWith('quick-list-error', 'not_shared_stash');
  });

  it('delist hotkey hands a valid item to the delist handler', async () => {
    await mount();
    await press(5);
    await advance(300);
    expect(emit).toHaveBeenCalledWith('delist-item', 'ITEM sword');
  });

  it('delist hotkey toasts when no item is under the cursor', async () => {
    itemUnderCursor = null;
    await mount();
    await press(5);
    await advance(300);
    expect(emit).not.toHaveBeenCalledWith('delist-item', expect.anything());
    expect(toasts()).toContainEqual(expect.objectContaining({ title: 'Delist', variant: 'error' }));
  });

  it('opens the delist picker with the listings, then updates it in place', async () => {
    await mount();
    const listings = [{ id: 'a' }, { id: 'b' }];
    await act(() => h.app.fire('delist-show-popup', listings));
    const [{ url, win }] = openedAt('Delist');
    const data = decodeURIComponent(url.split('data=')[1]);
    expect(JSON.parse(atob(data))).toEqual(listings);

    await act(() => h.app.fire('delist-show-popup', [{ id: 'c' }]));
    expect(openedAt('Delist')).toHaveLength(1);
    expect(win.emit).toHaveBeenCalledWith('delist-update', [{ id: 'c' }]);
    expect(win.setFocus).toHaveBeenCalled();
  });
});

describe('LandingPage stash value window', () => {
  it('deep-links a new window to the requested tab, then focuses it on later requests', async () => {
    await mount();
    await act(() => h.app.fire(NETWORTH_OPEN_EVENT, { tab: 'history' }));
    expect(openedAt('Currency').map((o) => o.url)).toEqual(['/currency?tab=history']);

    await act(() => h.app.fire(NETWORTH_OPEN_EVENT, {}));
    expect(openedAt('Currency')).toHaveLength(1);
    expect(openedAt('Currency')[0].win.setFocus).toHaveBeenCalled();
  });

  it('reopens the window when the old handle is dead', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await mount();
    await press(2);
    openedAt('Currency')[0].win.show.mockRejectedValue(new Error('window not found'));
    await press(2);
    await press(2);
    expect(openedAt('Currency').map((o) => o.url)).toEqual(['/currency', '/currency']);
  });
});

describe('LandingPage startup windows', () => {
  it('announces itself once after 2 seconds', async () => {
    await mount();
    await advance(1999);
    expect(emit).not.toHaveBeenCalledWith('toast-event', expect.anything());
    await advance(1);
    expect(emit).toHaveBeenCalledWith('toast-event', 'is now running in the background...');
  });

  it('places the chat button at the bottom-right of the Diablo window', async () => {
    await mount();
    await settleStartup();
    const button = vi.mocked(WebviewWindow).mock.instances[0] as unknown as FakeWin & { opts: { x: number; y: number } };
    expect(button.label).toBe('ChatButton');
    expect([button.opts.x, button.opts.y]).toEqual([100 + 1280 - 240 - 20, 50 + 720 - 240 - 10]);
    expect(button.show).toHaveBeenCalled();
  });

  it('skips the chat button when Diablo cannot be found', async () => {
    vi.mocked(getDiabloRectWithRetry).mockResolvedValue(null);
    await mount();
    await settleStartup();
    expect(WebviewWindow).not.toHaveBeenCalled();
  });

  it('hides the chat button when the overlay gets disabled', async () => {
    await mount();
    await settleStartup();
    const button = vi.mocked(WebviewWindow).mock.instances[0] as unknown as FakeWin;
    act(() => store.replace({ ...SETTINGS, chatButtonOverlayEnabled: false }));
    expect(button.hide).toHaveBeenCalled();
  });

  it('warms up the chat window hidden so notifications work, and creates the trade window hidden', async () => {
    await mount();
    await settleStartup();
    const [chat] = openedAt('Chat');
    expect(chat.win.show).toHaveBeenCalled();
    expect(await chat.win.isVisible()).toBe(false);
    expect(openedAt('TradeMessages')).toHaveLength(1);
  });

  it('chat toggle event shows a hidden chat and selects the requested conversation', async () => {
    await mount();
    await settleStartup();
    await act(() => h.app.fire('toggle-chat-window', { conversationId: 'c1', conversation: { id: 'c1' } }));
    expect(await openedAt('Chat')[0].win.isVisible()).toBe(true);
    await advance(200);
    expect(emit).toHaveBeenCalledWith('select-chat-conversation', { conversationId: 'c1', conversation: { id: 'c1' } });

    await act(() => h.app.fire('toggle-chat-window'));
    expect(await openedAt('Chat')[0].win.isVisible()).toBe(false);
  });

  it('trade messages toggle flips visibility of the existing window', async () => {
    await mount();
    await settleStartup();
    const [{ win }] = openedAt('TradeMessages');
    await act(() => h.app.fire('toggle-trade-messages-window'));
    expect(await win.isVisible()).toBe(true);
    await act(() => h.app.fire('toggle-trade-messages-window'));
    expect(await win.isVisible()).toBe(false);
  });

  // BUG: the chat warm-up effect depends on settings.chatButtonOverlayEnabled, so toggling the chat button
  // overlay re-runs it: the hidden chat window is shown again for ~300ms (a visible flash) and another
  // 'toggle-chat-window' listener is registered (LandingPage.tsx ~line 579-686).
  it.fails('toggling the chat button overlay does not flash the chat window', async () => {
    await mount();
    await settleStartup();
    const chat = openedAt('Chat')[0].win;
    const showsBefore = chat.show.mock.calls.length;
    act(() => store.replace({ ...SETTINGS, chatButtonOverlayEnabled: false }));
    await settleStartup();
    expect(chat.show.mock.calls.length).toBe(showsBefore);
  });
});

describe('LandingPage quick list manage requests', () => {
  it('attaches to a live Quick List window found by label instead of opening another', async () => {
    const existing = h.makeWin('QuickList');
    vi.mocked(WebviewWindow.getByLabel).mockResolvedValue(existing as never);
    await mount();
    await act(() => h.app.fire('open-quick-list-manage'));
    expect(existing.show).toHaveBeenCalled();
    expect(openWindowCenteredOnDiablo).not.toHaveBeenCalledWith('QuickList', expect.anything(), expect.anything());
  });

  it('opens a new Quick List when the labelled window is a zombie', async () => {
    const zombie = h.makeWin('QuickList');
    zombie.show.mockRejectedValue(new Error('gone'));
    vi.mocked(WebviewWindow.getByLabel).mockResolvedValue(zombie as never);
    await mount();
    await act(() => h.app.fire('open-quick-list-manage'));
    expect(openedAt('QuickList').map((o) => o.url)).toEqual(['/quick-list']);
    expect(openedAt('QuickList')[0].win.show).toHaveBeenCalled();
  });
});

describe('LandingPage chat watcher', () => {
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
});

describe('LandingPage focus-driven visibility', () => {
  async function withVisibleChat() {
    await mount();
    await settleStartup();
    const chat = openedAt('Chat')[0].win;
    const trade = openedAt('TradeMessages')[0].win;
    await act(() => h.app.fire('toggle-chat-window'));
    expect(await chat.isVisible()).toBe(true);
    return { chat, trade };
  }

  it('hides visible overlays 500ms after Diablo loses focus and restores only those on return', async () => {
    const { chat, trade } = await withVisibleChat();
    await act(() => h.tauri.fire('diablo-focus-changed', false));
    await advance(499);
    expect(await chat.isVisible()).toBe(true);
    await advance(1);
    expect(await chat.isVisible()).toBe(false);

    await act(() => h.tauri.fire('diablo-focus-changed', true));
    expect(await chat.isVisible()).toBe(true);
    // Trade window was hidden before focus loss, so it stays hidden
    expect(await trade.isVisible()).toBe(false);
  });

  it('does not hide anything when focus comes back within the debounce', async () => {
    const { chat } = await withVisibleChat();
    chat.hide.mockClear();
    await act(() => h.tauri.fire('diablo-focus-changed', false));
    await advance(200);
    await act(() => h.tauri.fire('diablo-focus-changed', true));
    await advance(1000);
    expect(chat.hide).not.toHaveBeenCalled();
  });

  it('creates the chat button on focus if Diablo was not running at startup', async () => {
    vi.mocked(getDiabloRectWithRetry).mockResolvedValueOnce(null);
    await mount();
    await settleStartup();
    expect(WebviewWindow).not.toHaveBeenCalled();
    await act(() => h.tauri.fire('diablo-focus-changed', true));
    expect(vi.mocked(WebviewWindow).mock.calls.map(([label]) => label)).toEqual(['ChatButton']);
  });

  it('includes the tray settings window in hide/restore', async () => {
    const settingsWin = h.makeWin('Settings');
    await settingsWin.show();
    vi.mocked(useTray).mockReturnValue({ settingsWindow: settingsWin } as never);
    await mount();
    await act(() => h.tauri.fire('diablo-focus-changed', false));
    await advance(500);
    expect(await settingsWin.isVisible()).toBe(false);
    await act(() => h.tauri.fire('diablo-focus-changed', true));
    expect(await settingsWin.isVisible()).toBe(true);
  });
});
