// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { useAppShortcuts, useShortcuts } from './useShortcuts';

type PressCallback = (e: { state: 'Pressed' | 'Released' }) => void;

const state = vi.hoisted(() => ({
  tauri: true,
  focused: true as boolean | Promise<boolean>,
  // Shortcuts currently held by the OS plugin
  registered: new Map<string, (e: { state: 'Pressed' | 'Released' }) => void>(),
  // Per-shortcut forced registration error
  registerErrors: new Map<string, Error>(),
  focusListeners: [] as ((e: { payload: boolean }) => void)[],
  listenGate: null as Promise<void> | null,
  unlistenCalls: 0,
}));

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => state.tauri,
  invoke: vi.fn(async () => state.focused),
}));
vi.mock('@tauri-apps/plugin-global-shortcut', () => ({
  register: vi.fn(async (shortcut: string, cb: (e: { state: 'Pressed' | 'Released' }) => void) => {
    const err = state.registerErrors.get(shortcut);
    if (err) throw err;
    state.registered.set(shortcut, cb);
  }),
  unregister: vi.fn(async (shortcut: string) => {
    state.registered.delete(shortcut);
  }),
}));
vi.mock('@/lib/browser-events', () => ({
  listen: vi.fn(async (_event: string, cb: (e: { payload: boolean }) => void) => {
    if (state.listenGate) await state.listenGate;
    state.focusListeners.push(cb);
    return () => {
      state.unlistenCalls++;
      state.focusListeners = state.focusListeners.filter((l) => l !== cb);
    };
  }),
}));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

async function focus(isFocused: boolean) {
  await act(async () => {
    for (const cb of state.focusListeners) cb({ payload: isFocused });
  });
  await flush();
}

function press(shortcut: string, pressState: 'Pressed' | 'Released' = 'Pressed') {
  const cb: PressCallback | undefined = state.registered.get(shortcut);
  if (!cb) throw new Error(`${shortcut} is not registered`);
  cb({ state: pressState });
}

beforeEach(() => {
  state.tauri = true;
  state.focused = true;
  state.registered.clear();
  state.registerErrors.clear();
  state.focusListeners = [];
  state.listenGate = null;
  state.unlistenCalls = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useShortcuts', () => {
  it('registers Control+KEY for ctrl and both Alt and AltGr (Control+Alt) chords for alt', async () => {
    const shortcuts = [
      { modifier: 'ctrl' as const, key: 'd', handler: vi.fn() },
      { modifier: 'alt' as const, key: 'k', handler: vi.fn() },
    ];
    renderHook(() => useShortcuts(shortcuts));
    await flush();

    expect([...state.registered.keys()].sort()).toEqual(['Alt+K', 'Control+Alt+K', 'Control+D']);
  });

  it('runs the handler on key press only, not on release', async () => {
    const handler = vi.fn();
    const shortcuts = [{ modifier: 'alt' as const, key: 'k', handler }];
    renderHook(() => useShortcuts(shortcuts));
    await flush();

    press('Control+Alt+K', 'Released');
    expect(handler).not.toHaveBeenCalled();
    press('Control+Alt+K');
    press('Alt+K');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('releases the shortcuts when Diablo turns out not to be focused at startup', async () => {
    state.focused = false;
    const shortcuts = [{ modifier: 'ctrl' as const, key: 'd', handler: vi.fn() }];
    renderHook(() => useShortcuts(shortcuts));
    await flush();

    expect(state.registered.size).toBe(0);
  });

  it('follows Diablo focus changes and ignores repeated focus events', async () => {
    const shortcuts = [{ modifier: 'ctrl' as const, key: 'd', handler: vi.fn() }];
    renderHook(() => useShortcuts(shortcuts));
    await flush();

    await focus(false);
    expect(state.registered.size).toBe(0);

    await focus(true);
    expect([...state.registered.keys()]).toEqual(['Control+D']);
    const registerCalls = vi.mocked(register).mock.calls.length;

    await focus(true);
    expect(vi.mocked(register).mock.calls.length).toBe(registerCalls);
  });

  it('applies rapid focus toggles in order', async () => {
    const shortcuts = [{ modifier: 'ctrl' as const, key: 'd', handler: vi.fn() }];
    renderHook(() => useShortcuts(shortcuts));
    await flush();

    await act(async () => {
      for (const payload of [false, true, false]) {
        for (const cb of state.focusListeners) cb({ payload });
      }
    });
    await flush();

    expect(state.registered.size).toBe(0);
  });

  it('treats an "already registered" conflict as owned, so it is released on blur', async () => {
    state.registerErrors.set('Control+D', new Error('HotKey already registered'));
    state.registerErrors.set('Control+X', new Error('permission denied'));
    const shortcuts = [
      { modifier: 'ctrl' as const, key: 'd', handler: vi.fn() },
      { modifier: 'ctrl' as const, key: 'x', handler: vi.fn() },
    ];
    renderHook(() => useShortcuts(shortcuts));
    await flush();

    await focus(false);

    const released = vi.mocked(unregister).mock.calls.map(([s]) => s);
    expect(released).toContain('Control+D');
    expect(released).not.toContain('Control+X');
  });

  it('still registers the other shortcuts when one fails', async () => {
    state.registerErrors.set('Control+X', new Error('permission denied'));
    const shortcuts = [
      { modifier: 'ctrl' as const, key: 'x', handler: vi.fn() },
      { modifier: 'ctrl' as const, key: 'd', handler: vi.fn() },
    ];
    renderHook(() => useShortcuts(shortcuts));
    await flush();

    expect([...state.registered.keys()]).toEqual(['Control+D']);
  });

  it('swaps registrations when the shortcut list changes', async () => {
    const first = [{ modifier: 'ctrl' as const, key: 'd', handler: vi.fn() }];
    const second = [{ modifier: 'ctrl' as const, key: 'q', handler: vi.fn() }];
    const { rerender } = renderHook(({ list }) => useShortcuts(list), { initialProps: { list: first } });
    await flush();

    rerender({ list: second });
    await flush();

    expect([...state.registered.keys()]).toEqual(['Control+Q']);
  });

  it('unregisters everything and releases the focus listener on unmount', async () => {
    const shortcuts = [{ modifier: 'alt' as const, key: 'k', handler: vi.fn() }];
    const { unmount } = renderHook(() => useShortcuts(shortcuts));
    await flush();

    unmount();
    await flush();

    expect(state.registered.size).toBe(0);
    expect(state.focusListeners).toHaveLength(0);
    expect(state.unlistenCalls).toBe(1);
  });

  it('releases a focus listener that resolves after unmount', async () => {
    let openGate!: () => void;
    state.listenGate = new Promise<void>((resolve) => (openGate = resolve));
    const shortcuts = [{ modifier: 'ctrl' as const, key: 'd', handler: vi.fn() }];
    const { unmount } = renderHook(() => useShortcuts(shortcuts));
    await flush();

    unmount();
    await act(async () => openGate());
    await flush();

    expect(state.focusListeners).toHaveLength(0);
    expect(state.registered.size).toBe(0);
  });

  it('does nothing outside Tauri', async () => {
    state.tauri = false;
    const shortcuts = [{ modifier: 'ctrl' as const, key: 'd', handler: vi.fn() }];
    renderHook(() => useShortcuts(shortcuts));
    await flush();

    expect(register).not.toHaveBeenCalled();
  });

  it('registers parser key names for keys older versions saved as typed characters', async () => {
    const shortcuts = [
      { modifier: 'ctrl' as const, key: '+', handler: vi.fn() },
      { modifier: 'ctrl' as const, key: ' ', handler: vi.fn() },
      // Russian layout: the [ key types х
      { modifier: 'ctrl' as const, key: 'х', handler: vi.fn() },
    ];
    renderHook(() => useShortcuts(shortcuts));
    await flush();

    expect([...state.registered.keys()].sort()).toEqual(['Control+BracketLeft', 'Control+Equal', 'Control+Space']);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('never hands the plugin a key it cannot parse, and still binds the others', async () => {
    const shortcuts = [
      { modifier: 'alt' as const, key: 'é', handler: vi.fn() },
      { modifier: 'ctrl' as const, key: 'd', handler: vi.fn() },
    ];
    renderHook(() => useShortcuts(shortcuts));
    await flush();

    expect(vi.mocked(register).mock.calls.map(([s]) => s)).toEqual(['Control+D']);
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('useAppShortcuts', () => {
  const baseSettings: Partial<ISettings> = {
    hotkeyModifier: 'ctrl',
    hotkeyKey: 'd',
    hotkeyModifierListItem: 'ctrl',
    hotkeyKeyListItem: 'l',
    hotkeyModifierCurrencyValuation: 'alt',
    hotkeyKeyCurrencyValuation: 'x',
    hotkeyModifierChat: 'ctrl',
    hotkeyKeyChat: 't',
    hotkeyModifierOffers: 'ctrl',
    hotkeyKeyOffers: 'b',
    hotkeyModifierDelist: 'ctrl',
    hotkeyKeyDelist: 'u',
    hotkeyKeySnapshot: '',
  };

  function mockOptions(settings: Partial<ISettings>, isLoading = false) {
    vi.mocked(useOptions).mockReturnValue({ settings, isLoading } as never);
  }

  const handlers = {
    search: vi.fn(),
    list: vi.fn(),
    currency: vi.fn(),
    chat: vi.fn(),
    offers: vi.fn(),
    delist: vi.fn(),
    snapshot: vi.fn(),
    market: vi.fn(),
    builds: vi.fn(),
  };

  it('registers nothing while settings are loading', async () => {
    mockOptions(baseSettings, true);
    renderHook(() => useAppShortcuts(handlers.search, handlers.list, handlers.currency));
    await flush();

    expect(state.registered.size).toBe(0);
  });

  it('binds each configured hotkey to its handler and skips optional ones without handlers', async () => {
    mockOptions(baseSettings);
    renderHook(() => useAppShortcuts(handlers.search, handlers.list, handlers.currency, handlers.chat));
    await flush();

    expect([...state.registered.keys()].sort()).toEqual([
      'Alt+X',
      'Control+Alt+X',
      'Control+D',
      'Control+L',
      'Control+T',
    ]);
    press('Control+L');
    expect(handlers.list).toHaveBeenCalledTimes(1);
    press('Alt+X');
    expect(handlers.currency).toHaveBeenCalledTimes(1);
    expect(handlers.search).not.toHaveBeenCalled();
  });

  it('skips a hotkey whose key is cleared', async () => {
    mockOptions({ ...baseSettings, hotkeyKeyListItem: '' });
    renderHook(() => useAppShortcuts(handlers.search, handlers.list, handlers.currency));
    await flush();

    expect(state.registered.has('Control+L')).toBe(false);
    expect(state.registered.has('Control+D')).toBe(true);
  });

  it('binds the snapshot hotkey only when set, defaulting its modifier to ctrl', async () => {
    mockOptions({ ...baseSettings, hotkeyKeySnapshot: 'n', hotkeyModifierSnapshot: undefined });
    renderHook(() =>
      useAppShortcuts(
        handlers.search,
        handlers.list,
        handlers.currency,
        handlers.chat,
        handlers.offers,
        handlers.delist,
        handlers.snapshot,
      ),
    );
    await flush();

    press('Control+N');
    expect(handlers.snapshot).toHaveBeenCalledTimes(1);
    press('Control+U');
    expect(handlers.delist).toHaveBeenCalledTimes(1);
    press('Control+B');
    expect(handlers.offers).toHaveBeenCalledTimes(1);
  });

  it('binds the market hotkey when set and a handler is given', async () => {
    mockOptions({ ...baseSettings, hotkeyModifierMarket: 'ctrl', hotkeyKeyMarket: 'm' });
    renderHook(() =>
      useAppShortcuts(
        handlers.search,
        handlers.list,
        handlers.currency,
        handlers.chat,
        handlers.offers,
        handlers.delist,
        handlers.snapshot,
        handlers.market,
      ),
    );
    await flush();

    press('Control+M');
    expect(handlers.market).toHaveBeenCalledTimes(1);
  });

  it('leaves the market hotkey unbound when its key is cleared', async () => {
    mockOptions({ ...baseSettings, hotkeyKeyMarket: '' });
    renderHook(() =>
      useAppShortcuts(
        handlers.search,
        handlers.list,
        handlers.currency,
        undefined,
        undefined,
        undefined,
        undefined,
        handlers.market,
      ),
    );
    await flush();

    expect(state.registered.has('Control+M')).toBe(false);
  });

  it('binds the builds hotkey only once a key is set', async () => {
    const useBuildsShortcuts = () =>
      useAppShortcuts(
        handlers.search,
        handlers.list,
        handlers.currency,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        handlers.builds,
      );
    mockOptions({ ...baseSettings, hotkeyModifierBuilds: 'alt', hotkeyKeyBuilds: '' });
    const { rerender } = renderHook(useBuildsShortcuts);
    await flush();
    expect(state.registered.has('Alt+K')).toBe(false);

    mockOptions({ ...baseSettings, hotkeyModifierBuilds: 'alt', hotkeyKeyBuilds: 'k' });
    rerender();
    await flush();
    press('Alt+K');
    expect(handlers.builds).toHaveBeenCalledTimes(1);
  });

  it('rebinds when a hotkey setting changes', async () => {
    mockOptions(baseSettings);
    const { rerender } = renderHook(() => useAppShortcuts(handlers.search, handlers.list, handlers.currency));
    await flush();

    mockOptions({ ...baseSettings, hotkeyKey: 'f' });
    rerender();
    await flush();

    expect(state.registered.has('Control+D')).toBe(false);
    press('Control+F');
    expect(handlers.search).toHaveBeenCalledTimes(1);
  });
});
