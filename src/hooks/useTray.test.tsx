// @vitest-environment happy-dom
import * as React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { Menu } from '@tauri-apps/api/menu';
import { TrayIcon } from '@tauri-apps/api/tray';
import { openPath } from '@tauri-apps/plugin-opener';
import { exit } from '@tauri-apps/plugin-process';
import { useOverlay } from '@/overlay';
import { useOptions } from '@/hooks/useOptions';
import { TrayProvider, useTray } from './useTray';

type PressCallback = (e: { state: 'Pressed' | 'Released' }) => void;
type MenuItem = { id: string; action: () => void | Promise<void> };

const state = vi.hoisted(() => ({
  tauri: true,
  // Shortcuts held by this app in the OS plugin
  owned: new Map<string, (e: { state: 'Pressed' | 'Released' }) => void>(),
  // Shortcuts held by some other process: register() fails with "already registered"
  foreign: new Set<string>(),
  listeners: new Map<string, ((e: { payload: unknown }) => void)[]>(),
  // Tray icon ids alive in Rust (they outlive the page)
  trays: [] as string[],
}));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => state.tauri }));
vi.mock('@tauri-apps/plugin-global-shortcut', () => ({
  isRegistered: vi.fn(async (s: string) => state.owned.has(s)),
  register: vi.fn(async (s: string, cb: (e: { state: 'Pressed' | 'Released' }) => void) => {
    if (state.owned.has(s) || state.foreign.has(s)) throw new Error(`HotKey ${s} already registered`);
    state.owned.set(s, cb);
  }),
  unregister: vi.fn(async (s: string) => {
    state.owned.delete(s);
  }),
}));
vi.mock('@tauri-apps/api/menu', () => ({ Menu: { new: vi.fn(async (opts: unknown) => opts) } }));
vi.mock('@tauri-apps/api/tray', () => ({
  TrayIcon: {
    new: vi.fn(async (opts: { id: string }) => {
      state.trays.push(opts.id);
      return { id: opts.id };
    }),
    removeById: vi.fn(async (id: string) => {
      state.trays = state.trays.filter((t) => t !== id);
    }),
  },
}));
vi.mock('@tauri-apps/api/app', () => ({ defaultWindowIcon: vi.fn(async () => 'icon') }));
vi.mock('@tauri-apps/api/path', () => ({ appConfigDir: vi.fn(async () => '/cfg/pd2') }));
vi.mock('@tauri-apps/plugin-opener', () => ({ openPath: vi.fn(async () => {}) }));
vi.mock('@tauri-apps/plugin-process', () => ({ exit: vi.fn() }));
vi.mock('@/overlay', () => ({ useOverlay: vi.fn() }));
vi.mock('@/lib/browser-events', () => ({
  listen: vi.fn(async (event: string, cb: (e: { payload: unknown }) => void) => {
    state.listeners.set(event, [...(state.listeners.get(event) ?? []), cb]);
    return () =>
      state.listeners.set(
        event,
        (state.listeners.get(event) ?? []).filter((l) => l !== cb),
      );
  }),
}));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));

const openPanel = vi.fn();

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

async function fire(event: string, payload?: unknown) {
  await act(async () => {
    for (const cb of state.listeners.get(event) ?? []) cb({ payload });
  });
  await flush();
}

function setHotkey(modifier: 'ctrl' | 'alt' | undefined, key: string | undefined) {
  vi.mocked(useOptions).mockReturnValue({
    settings: { hotkeyModifierSettings: modifier, hotkeyKeySettings: key },
  } as never);
}

async function renderTray() {
  const view = renderHook(() => useTray(), {
    wrapper: ({ children }: { children: React.ReactNode }) => <TrayProvider>{children}</TrayProvider>,
  });
  await flush();
  return view;
}

function menuItem(id: string): MenuItem {
  const opts = vi.mocked(Menu.new).mock.calls[0][0] as unknown as { items: MenuItem[] };
  const item = opts.items.find((i) => i.id === id);
  if (!item) throw new Error(`no menu item ${id}`);
  return item;
}

beforeEach(() => {
  state.tauri = true;
  state.owned.clear();
  state.foreign.clear();
  state.listeners.clear();
  state.trays = [];
  vi.mocked(useOverlay).mockReturnValue({ openPanel } as never);
  setHotkey('ctrl', 'O');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('tray icon', () => {
  it('exposes the created tray through useTray', async () => {
    const { result } = await renderTray();
    expect(result.current.tray).toEqual({ id: 'pd2-trader' });
  });

  it('replaces the icon a previous page load left behind instead of adding another', async () => {
    state.trays = ['pd2-trader'];
    await renderTray();
    expect(state.trays).toEqual(['pd2-trader']);
    expect(vi.mocked(TrayIcon.removeById).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(TrayIcon.new).mock.invocationCallOrder[0],
    );
  });

  it('removes its icon on unmount, so a remount still leaves exactly one', async () => {
    const first = await renderTray();
    first.unmount();
    await flush();
    expect(state.trays).toEqual([]);

    await renderTray();
    expect(state.trays).toEqual(['pd2-trader']);
  });

  it('is not created outside Tauri', async () => {
    state.tauri = false;
    const { result } = await renderTray();
    expect(result.current.tray).toBeNull();
    expect(Menu.new).not.toHaveBeenCalled();
  });

  it('"Open config location" opens the app config dir and survives a failure', async () => {
    await renderTray();
    await act(async () => menuItem('open-config').action());
    expect(openPath).toHaveBeenCalledWith('/cfg/pd2');

    vi.mocked(openPath).mockRejectedValueOnce(new Error('no opener'));
    await expect(act(async () => menuItem('open-config').action())).resolves.toBeUndefined();
  });

  it('"Quit" exits the app', async () => {
    await renderTray();
    menuItem('quit').action();
    expect(exit).toHaveBeenCalledTimes(1);
  });
});

describe('settings panel', () => {
  it('the tray menu opens the settings panel', async () => {
    await renderTray();
    await act(async () => menuItem('settings').action());
    expect(openPanel).toHaveBeenCalledWith('settings');
  });
});

describe('settings hotkey', () => {
  it('is registered (lowercased) only while Diablo is focused and opens settings on press', async () => {
    await renderTray();
    expect(state.owned.size).toBe(0);

    await fire('diablo-focus-changed', true);
    const cb: PressCallback | undefined = state.owned.get('ctrl+o');
    expect(cb).toBeTypeOf('function');

    cb!({ state: 'Released' });
    await flush();
    expect(openPanel).not.toHaveBeenCalled();
    cb!({ state: 'Pressed' });
    await flush();
    expect(openPanel).toHaveBeenCalledTimes(1);
    expect(openPanel).toHaveBeenCalledWith('settings');

    await fire('diablo-focus-changed', false);
    expect(state.owned.size).toBe(0);
  });

  it('serializes a burst of focus events so the final state wins', async () => {
    await renderTray();
    await act(async () => {
      for (const payload of [true, false, true, true]) {
        for (const cb of state.listeners.get('diablo-focus-changed') ?? []) cb({ payload });
      }
    });
    await flush();

    expect([...state.owned.keys()]).toEqual(['ctrl+o']);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('does not claim a chord held by another app, so blur leaves it alone', async () => {
    state.foreign.add('ctrl+o');
    await renderTray();
    await fire('diablo-focus-changed', true);
    expect(console.error).toHaveBeenCalledWith('Failed to register settings shortcut:', expect.any(Error));

    await fire('diablo-focus-changed', false);
    expect(unregister).not.toHaveBeenCalled();
  });

  it('moves the registration when the hotkey setting changes', async () => {
    const { rerender } = await renderTray();
    await fire('diablo-focus-changed', true);

    setHotkey('alt', 'P');
    rerender();
    await flush();
    expect(state.owned.has('ctrl+o')).toBe(false);

    await fire('diablo-focus-changed', true);
    expect([...state.owned.keys()]).toEqual(['alt+p']);
  });

  it('adopts a chord it already owns when a register race reports "already registered"', async () => {
    await renderTray();
    // Stale cleanup from a previous effect run still holds the chord when the new run checks
    state.owned.set('ctrl+o', () => {});
    vi.mocked(isRegistered).mockResolvedValueOnce(false);
    await fire('diablo-focus-changed', true);
    expect(console.error).not.toHaveBeenCalled();

    await fire('diablo-focus-changed', false);
    expect(state.owned.size).toBe(0);
  });

  it('is skipped when the hotkey is unset', async () => {
    setHotkey('ctrl', undefined);
    await renderTray();
    await fire('diablo-focus-changed', true);
    expect(register).not.toHaveBeenCalled();
  });

  it('is released on unmount', async () => {
    const { unmount } = await renderTray();
    await fire('diablo-focus-changed', true);

    unmount();
    await flush();
    expect(state.owned.size).toBe(0);
    expect(state.listeners.get('diablo-focus-changed')).toHaveLength(0);
  });
});
