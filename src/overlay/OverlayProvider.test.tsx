// @vitest-environment happy-dom
import React, { useEffect } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { invoke } from '@tauri-apps/api/core';
import {
  CLOSE_ON_BLUR_MS,
  OUTSIDE_CLICK_EVENT,
  OverlayProvider,
  computePlacement,
  initialOverlayState,
  overlayReducer,
  useOverlay,
  type OverlayApi,
  type OverlayState,
} from './OverlayProvider';
import { OverlayRoot } from './OverlayRoot';
import { usePanel } from './Panel';
import { claimKeyboard, isKeyboardClaimed, releaseKeyboard } from './keyboard';
import { LAYOUT_STORAGE_KEY, savePanelRect } from './layout-storage';
import type { PanelDef, PanelDefs, PanelId } from './types';

const game = vi.hoisted(() => ({
  state: { gameRect: { x: 100, y: 50, width: 1280, height: 720 }, gameFocused: true },
  cursor: { x: 300, y: 200 },
  listeners: new Set<() => void>(),
}));

vi.mock('./game', async (importOriginal) => {
  // vi.mock factories are hoisted above the static imports, so React has to be loaded here
  const { useSyncExternalStore } = await import('react');
  const subscribe = (fn: () => void) => {
    game.listeners.add(fn);
    return () => game.listeners.delete(fn);
  };
  return {
    ...(await importOriginal<object>()),
    useGameState: () => useSyncExternalStore(subscribe, () => game.state),
    getCursorPoint: async () => game.cursor,
  };
});
/** Main's OS focus listener registered through trackKeyboardFocus (Tauri). */
const focus = vi.hoisted(() => ({ onChange: null as ((focused: boolean, handoff?: boolean) => void) | null }));
vi.mock('./keyboard', () => ({
  claimKeyboard: vi.fn(async () => {}),
  releaseKeyboard: vi.fn(async () => {}),
  isKeyboardClaimed: vi.fn(() => false),
  trackKeyboardFocus: (onChange: (focused: boolean, handoff?: boolean) => void) => {
    focus.onChange = onChange;
    return () => {
      focus.onChange = null;
    };
  },
}));
vi.mock('./region', () => ({ useRegionSync: () => {}, holdRegionLoop: () => () => {} }));
vi.mock('./toast', () => ({ ToastLayer: () => null, setToastBridge: vi.fn(), showToast: vi.fn() }));
const tauri = vi.hoisted(() => ({ on: false }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => tauri.on, invoke: vi.fn(async () => {}) }));
/** Rust events the provider listens to (e.g. the outside-click hook). */
const events = vi.hoisted(() => new Map<string, () => void>());
vi.mock('@/lib/browser-events', () => ({
  listen: vi.fn(async (event: string, cb: () => void) => {
    events.set(event, cb);
    return () => events.delete(event);
  }),
}));

const setGame = (next: Partial<typeof game.state>) =>
  act(() => {
    game.state = { ...game.state, ...next };
    game.listeners.forEach((fn) => fn());
  });

/** Panel content that records what usePanel gives it. */
const mounts: Record<string, number> = {};
const Probe: React.FC = () => {
  const { id, payload, payloadVersion } = usePanel();
  useEffect(() => {
    mounts[id] = (mounts[id] ?? 0) + 1;
  }, [id]);
  return (
    <>
      <div data-testid={`content-${id}`}>
        {JSON.stringify(payload ?? null)}#{payloadVersion}
      </div>
      <input data-testid={`field-${id}`} />
      <button data-testid={`button-${id}`}>act</button>
    </>
  );
};

const def = (id: PanelId, extra: Partial<PanelDef> = {}): PanelDef => ({
  id,
  component: Probe,
  size: { width: 200, height: 100 },
  resizable: false,
  placement: 'gameCenter',
  persist: false,
  keyboard: 'onPointerDown',
  keepMounted: false,
  hideOnGameBlur: true,
  ...extra,
});

const DEFS = {
  itemSearch: def('itemSearch', { placement: 'gameRight', keepMounted: true }),
  quickList: def('quickList', { placement: 'cursor' }),
  currency: def('currency', { placement: 'screenCenter', persist: true }),
  chat: def('chat', { keepMounted: true, closeOnBlur: true }),
  chatButton: def('chatButton', { placement: 'gameBottomRight', keyboard: 'never', keepMounted: true }),
  settings: def('settings', { closeOnBlur: true }),
  changeLog: def('changeLog'),
  signIn: def('signIn', { hideOnGameBlur: false }),
  delist: def('delist'),
  netWorthTicker: def('netWorthTicker', { keyboard: 'never', keepMounted: true }),
  netWorthPanel: def('netWorthPanel'),
} satisfies PanelDefs;

let api: OverlayApi;
const Capture: React.FC = () => {
  const overlay = useOverlay();
  useEffect(() => {
    api = overlay;
  });
  return null;
};

function mount() {
  return render(
    <OverlayProvider defs={DEFS}>
      <Capture />
      <OverlayRoot />
    </OverlayProvider>,
  );
}

const frame = (id: PanelId) => document.querySelector<HTMLElement>(`[data-panel-id="${id}"]`);
const shown = (id: PanelId) => !!frame(id) && frame(id)!.style.display !== 'none';

beforeEach(() => {
  tauri.on = false;
  game.state = { gameRect: { x: 100, y: 50, width: 1280, height: 720 }, gameFocused: true };
  for (const k of Object.keys(mounts)) delete mounts[k];
  localStorage.clear();
  vi.clearAllMocks();
  window.innerWidth = 1920;
  window.innerHeight = 1080;
});

afterEach(cleanup);

describe('overlayReducer', () => {
  const base: OverlayState = initialOverlayState(DEFS);
  const rect = { x: 1, y: 2, width: 3, height: 4 };

  it('mounts only keepMounted panels, closed', () => {
    expect(Object.keys(base.panels).sort()).toEqual(['chat', 'chatButton', 'itemSearch', 'netWorthTicker']);
    expect(Object.values(base.panels).every((p) => !p!.open)).toBe(true);
  });

  it('open bumps payloadVersion and z on every call; a payload-only update keeps the rect', () => {
    const a = overlayReducer(base, { type: 'open', id: 'settings', payload: undefined, rect });
    const b = overlayReducer(a, { type: 'open', id: 'settings', payload: 'x' });
    expect(a.panels.settings).toMatchObject({ open: true, payloadVersion: 1, z: 1, rect });
    expect(b.panels.settings).toMatchObject({ open: true, payload: 'x', payloadVersion: 2, z: 2, rect });
  });

  it('close keeps payload/version, ignores closed panels', () => {
    const a = overlayReducer(base, { type: 'open', id: 'chat', payload: { conversationId: 'c' }, rect });
    const b = overlayReducer(a, { type: 'close', id: 'chat' });
    expect(b.panels.chat).toMatchObject({ open: false, payload: { conversationId: 'c' }, payloadVersion: 1 });
    expect(overlayReducer(b, { type: 'close', id: 'chat' })).toBe(b);
  });

  it('front raises only when not already on top', () => {
    let s = overlayReducer(base, { type: 'open', id: 'chat', payload: undefined, rect });
    s = overlayReducer(s, { type: 'open', id: 'settings', payload: undefined, rect });
    const raised = overlayReducer(s, { type: 'front', id: 'chat' });
    expect(raised.panels.chat!.z).toBeGreaterThan(raised.panels.settings!.z);
    expect(overlayReducer(raised, { type: 'front', id: 'chat' })).toBe(raised);
  });

  it('place only applies to open panels and clears placing; setRect drops the game anchor', () => {
    const placing = overlayReducer(base, { type: 'open', id: 'quickList', payload: undefined, placing: true });
    expect(placing.panels.quickList!.placing).toBe(true);
    const placed = overlayReducer(placing, { type: 'place', id: 'quickList', rect });
    expect(placed.panels.quickList).toMatchObject({ placing: false, rect });
    expect(overlayReducer(base, { type: 'place', id: 'chat', rect })).toBe(base);

    const anchored = overlayReducer(base, { type: 'open', id: 'chat', payload: undefined, rect, anchor: 'gameCenter' });
    expect(anchored.panels.chat!.anchor).toBe('gameCenter');
    expect(overlayReducer(anchored, { type: 'setRect', id: 'chat', rect: { x: 9 } }).panels.chat).toMatchObject({
      anchor: null,
      rect: { ...rect, x: 9 },
    });
  });
});

describe('computePlacement', () => {
  const gameRect = { x: 100, y: 50, width: 1280, height: 720 };
  const viewport = { x: 0, y: 0, width: 1920, height: 1080 };
  const size = { width: 200, height: 100 };

  it.each([
    ['gameCenter', { x: 640, y: 360, width: 200, height: 100 }],
    ['gameRight', { x: 1180, y: 50, width: 200, height: 720 }],
    ['gameBottomRight', { x: 1160, y: 660, width: 200, height: 100 }],
    ['screenCenter', { x: 860, y: 490, width: 200, height: 100 }],
  ] as const)('%s', (placement, expected) => {
    expect(computePlacement(placement, size, gameRect, viewport)).toEqual(expected);
  });

  it('places at the cursor and clamps into the overlay', () => {
    expect(computePlacement('cursor', size, gameRect, viewport, { x: 300, y: 200 })).toMatchObject({ x: 300, y: 200 });
    expect(computePlacement('cursor', size, gameRect, viewport, { x: 1900, y: 1070 })).toMatchObject({
      x: 1720,
      y: 980,
    });
    expect(computePlacement({ x: -40, y: 20.6 }, size, gameRect, viewport)).toMatchObject({ x: 0, y: 21 });
  });
});

describe('OverlayProvider', () => {
  it('mounts keepMounted panels hidden at startup and others only when opened', () => {
    mount();
    expect(mounts).toEqual({ itemSearch: 1, chat: 1, chatButton: 1, netWorthTicker: 1 });
    expect(shown('chat')).toBe(false);
    expect(frame('settings')).toBeNull();
  });

  it('openPanel shows the panel at its placement and re-open bumps payloadVersion without moving it', () => {
    mount();
    act(() => api.openPanel('itemSearch', { text: 'a' }));
    expect(shown('itemSearch')).toBe(true);
    expect(frame('itemSearch')!.style).toMatchObject({ left: '1180px', top: '50px', height: '720px' });
    expect(screen.getByTestId('content-itemSearch').textContent).toBe('{"text":"a"}#1');

    setGame({ gameRect: { x: 0, y: 0, width: 800, height: 600 } }); // anchored: follows the game
    expect(frame('itemSearch')!.style.left).toBe('600px');

    act(() => api.openPanel('itemSearch', { text: 'b' }));
    expect(screen.getByTestId('content-itemSearch').textContent).toBe('{"text":"b"}#2');
    expect(mounts.itemSearch).toBe(1);
  });

  it('closePanel hides keepMounted panels (state survives) and unmounts the rest', () => {
    mount();
    act(() => {
      api.openPanel('chat', { conversationId: 'c1' });
      api.openPanel('settings');
    });
    act(() => {
      api.closePanel('chat');
      api.closePanel('settings');
    });
    expect(shown('chat')).toBe(false);
    expect(mounts.chat).toBe(1);
    expect(frame('settings')).toBeNull();
    expect(api.isOpen('chat')).toBe(false);
  });

  it('togglePanel closes a visible panel and opens a closed one, synchronously', () => {
    mount();
    act(() => {
      api.togglePanel('netWorthTicker');
      expect(api.isOpen('netWorthTicker')).toBe(true);
    });
    expect(shown('netWorthTicker')).toBe(true);
    act(() => api.togglePanel('netWorthTicker'));
    expect(shown('netWorthTicker')).toBe(false);
  });

  it('hideOnGameBlur hides (without unmounting) while the game is unfocused, and toggle then re-shows', () => {
    mount();
    act(() => {
      api.openPanel('chat');
      api.openPanel('signIn');
    });
    setGame({ gameFocused: false });
    expect(shown('chat')).toBe(false);
    expect(shown('signIn')).toBe(true);
    expect(api.isOpen('chat')).toBe(true);

    setGame({ gameFocused: true });
    expect(shown('chat')).toBe(true);

    setGame({ gameFocused: false });
    act(() => api.togglePanel('chat')); // open but hidden -> toggle opens instead of closing
    expect(api.isOpen('chat')).toBe(true);
  });

  it('cursor placement waits for the cursor position before showing', async () => {
    mount();
    act(() => api.openPanel('quickList', { item: 'x' }));
    expect(shown('quickList')).toBe(false);
    await act(async () => {});
    expect(shown('quickList')).toBe(true);
    expect(frame('quickList')!.style).toMatchObject({ left: '300px', top: '200px' });
  });

  it('a per-open placement overrides the default', () => {
    mount();
    act(() => api.openPanel('quickList', undefined, { placement: 'gameCenter' }));
    expect(shown('quickList')).toBe(true);
    expect(frame('quickList')!.style).toMatchObject({ left: '640px', top: '360px' });
  });

  it('restores a persisted rect, clamped into the overlay', () => {
    savePanelRect('currency', { x: 5000, y: 10, width: 200, height: 100 });
    mount();
    act(() => api.openPanel('currency'));
    expect(frame('currency')!.style).toMatchObject({ left: '1720px', top: '10px' });
  });

  it('persists programmatic rect changes only for persisted panels', () => {
    let setRect: ((r: { x: number }) => void) | null = null;
    const Mover: React.FC = () => {
      const panel = usePanel();
      useEffect(() => {
        setRect = panel.setRect;
      });
      return null;
    };
    render(
      <OverlayProvider defs={{ ...DEFS, currency: { ...DEFS.currency, component: Mover } }}>
        <Capture />
        <OverlayRoot />
      </OverlayProvider>,
    );
    act(() => api.openPanel('currency'));
    act(() => setRect!({ x: 42 }));
    expect(frame('currency')!.style.left).toBe('42px');
    expect(JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY)!).currency).toMatchObject({ x: 42 });
  });

  it('opening a panel leaves the game in front; only an explicit focus claims', () => {
    mount();
    act(() => api.openPanel('currency'));
    act(() => api.openPanel('chatButton'));
    expect(claimKeyboard).not.toHaveBeenCalled();
    act(() => api.openPanel('settings', undefined, { focus: true }));
    expect(claimKeyboard).toHaveBeenCalledTimes(1);
  });

  it('closing the last keyboard panel releases a claim', () => {
    mount();
    vi.mocked(isKeyboardClaimed).mockReturnValue(true);
    act(() => {
      api.openPanel('currency');
      api.openPanel('settings');
    });
    act(() => api.closePanel('currency'));
    expect(releaseKeyboard).not.toHaveBeenCalled(); // settings still takes typing
    act(() => api.closePanel('settings'));
    expect(releaseKeyboard).toHaveBeenCalledTimes(1);
  });

  it('pointerdown brings a panel to front without taking the keyboard', () => {
    mount();
    act(() => {
      api.openPanel('chat');
      api.openPanel('settings');
    });
    expect(Number(frame('settings')!.style.zIndex)).toBeGreaterThan(Number(frame('chat')!.style.zIndex));
    act(() => {
      frame('chat')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(claimKeyboard).not.toHaveBeenCalled();
    expect(Number(frame('chat')!.style.zIndex)).toBeGreaterThan(Number(frame('settings')!.style.zIndex));
  });

  it('clicking into a text field takes the keyboard; clicking anything else gives it back', () => {
    mount();
    act(() => api.openPanel('chat'));
    act(() => {
      screen.getByTestId('field-chat').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(claimKeyboard).toHaveBeenCalledTimes(1);

    vi.mocked(isKeyboardClaimed).mockReturnValue(true);
    act(() => {
      screen.getByTestId('button-chat').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(releaseKeyboard).toHaveBeenCalledTimes(1);
    expect(claimKeyboard).toHaveBeenCalledTimes(1);
  });

  it('a click outside a text field leaves an unclaimed keyboard alone', () => {
    mount();
    act(() => api.openPanel('chat'));
    act(() => {
      screen.getByTestId('button-chat').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(releaseKeyboard).not.toHaveBeenCalled();
  });

  it("keyboard: 'never' panels never take the keyboard, even from a text field", () => {
    mount();
    act(() => api.openPanel('chatButton'));
    act(() => {
      screen.getByTestId('field-chatButton').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(claimKeyboard).not.toHaveBeenCalled();
  });

  it("interactive: 'children' makes the frame click-through and leaves interactivity to the content", () => {
    render(
      <OverlayProvider defs={{ ...DEFS, chatButton: { ...DEFS.chatButton, interactive: 'children' } }}>
        <Capture />
        <OverlayRoot />
      </OverlayProvider>,
    );
    act(() => {
      api.openPanel('chatButton');
      api.openPanel('chat');
    });
    expect(frame('chatButton')!.hasAttribute('data-interactive')).toBe(false);
    expect(frame('chatButton')!.className).toContain('pointer-events-none');
    expect(frame('chat')!.getAttribute('data-interactive')).toBe('true');
    expect(frame('chat')!.className).toContain('pointer-events-auto');
  });

  it('exposes the dev hook', () => {
    mount();
    expect(window.__pd2Overlay!.isOpen('settings')).toBe(false);
    act(() => window.__pd2Overlay!.openPanel('settings'));
    expect(window.__pd2Overlay!.state.panels.settings?.open).toBe(true);
    expect(window.__pd2Overlay!.isOpen('settings')).toBe(true);
  });

  it('keeps the useOverlay value (and its consumers) stable across panel transitions', () => {
    const seen = new Set<OverlayApi>();
    let renders = 0;
    const Consumer: React.FC = () => {
      seen.add(useOverlay());
      renders++;
      return null;
    };
    render(
      <OverlayProvider defs={DEFS}>
        <Capture />
        <Consumer />
        <OverlayRoot />
      </OverlayProvider>,
    );
    act(() => api.openPanel('chat'));
    act(() => api.openPanel('settings'));
    act(() => api.bringToFront('chat'));
    act(() => api.closePanel('settings'));
    act(() => api.togglePanel('chat'));
    expect(seen.size).toBe(1);
    expect(renders).toBe(1);
  });

  it('a second open during an in-flight cursor placement still places the panel', async () => {
    mount();
    act(() => {
      api.openPanel('quickList', { item: 'a' });
      api.openPanel('quickList', { item: 'b' }); // e.g. the list hotkey pressed twice under IPC latency
    });
    expect(shown('quickList')).toBe(false);
    await act(async () => {});
    expect(shown('quickList')).toBe(true);
    expect(frame('quickList')!.style).toMatchObject({ left: '300px', top: '200px' });
    expect(screen.getByTestId('content-quickList').textContent).toBe('{"item":"b"}#2');
  });

  it('a new placement supersedes an in-flight cursor placement', async () => {
    mount();
    act(() => {
      api.openPanel('quickList', { item: 'a' });
      api.openPanel('quickList', undefined, { placement: 'gameCenter', reposition: true });
    });
    await act(async () => {});
    expect(frame('quickList')!.style).toMatchObject({ left: '640px', top: '360px' });
  });

  it('keepPayload brings an open panel to front without replacing its payload', () => {
    mount();
    act(() => {
      api.openPanel('quickList', { item: 'x' }, { placement: 'gameCenter' });
      api.openPanel('chat');
    });
    act(() => api.openPanel('quickList', undefined, { placement: 'gameCenter', keepPayload: true }));
    expect(screen.getByTestId('content-quickList').textContent).toBe('{"item":"x"}#1');
    expect(Number(frame('quickList')!.style.zIndex)).toBeGreaterThan(Number(frame('chat')!.style.zIndex));

    // closed: opens normally with the given payload
    act(() => api.closePanel('quickList'));
    act(() => api.openPanel('quickList', undefined, { placement: 'gameCenter', keepPayload: true }));
    expect(screen.getByTestId('content-quickList').textContent).toBe('null#2');
  });

  it('re-clamps open panels into a shrunken overlay without overwriting the saved layout', () => {
    savePanelRect('currency', { x: 1700, y: 900, width: 200, height: 100 });
    mount();
    act(() => api.openPanel('currency'));
    expect(frame('currency')!.style).toMatchObject({ left: '1700px', top: '900px' });

    window.innerWidth = 1280;
    window.innerHeight = 720;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(frame('currency')!.style).toMatchObject({ left: '1080px', top: '620px' });
    expect(JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY)!).currency).toMatchObject({ x: 1700, y: 900 });
  });

  it("drags 'children' panels fully inside the overlay, other panels only partly", () => {
    const Handle: React.FC = () => <div data-panel-drag
      className="h-full w-full" />;
    render(
      <OverlayProvider
        defs={{
          ...DEFS,
          chatButton: { ...DEFS.chatButton, component: Handle, interactive: 'children' },
          chat: { ...DEFS.chat, component: Handle },
        }}
      >
        <Capture />
        <OverlayRoot />
      </OverlayProvider>,
    );
    act(() => {
      api.openPanel('chatButton');
      api.openPanel('chat');
    });
    const drag = (id: PanelId, dx: number) => {
      const at = { pointerId: 1, button: 0, clientX: 500, clientY: 500 };
      act(() => {
        frame(id)!
          .querySelector('[data-panel-drag]')!
          .dispatchEvent(new PointerEvent('pointerdown', { ...at, bubbles: true }));
      });
      act(() => {
        frame(id)!.dispatchEvent(new PointerEvent('pointermove', { ...at, clientX: 500 + dx }));
        frame(id)!.dispatchEvent(new PointerEvent('pointerup', { ...at, clientX: 500 + dx }));
      });
    };
    drag('chatButton', -5000);
    expect(frame('chatButton')!.style.left).toBe('0px');
    drag('chat', -5000);
    expect(frame('chat')!.style.left).toBe('-160px'); // 40px stay visible
  });
});

describe('closeOnBlur', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('closes closeOnBlur panels shortly after Main loses OS focus; keepMounted ones keep their state', () => {
    mount();
    act(() => {
      api.openPanel('chat', { conversationId: 'c1' });
      api.openPanel('settings');
      api.openPanel('netWorthTicker');
    });
    act(() => focus.onChange!(false));
    act(() => vi.advanceTimersByTime(CLOSE_ON_BLUR_MS - 1));
    expect(api.isOpen('chat')).toBe(true);

    act(() => vi.advanceTimersByTime(1));
    expect(api.isOpen('chat')).toBe(false);
    expect(api.isOpen('settings')).toBe(false);
    expect(api.isOpen('netWorthTicker')).toBe(true); // not a closeOnBlur panel
    // hidden, not unmounted: the conversation survives
    expect(mounts.chat).toBe(1);
    expect(screen.getByTestId('content-chat').textContent).toBe('{"conversationId":"c1"}#1');
  });

  it('keeps panels open when the focus loss is our own hand-off to the game', () => {
    mount();
    act(() => api.openPanel('settings'));
    act(() => focus.onChange!(false, true));
    act(() => vi.advanceTimersByTime(CLOSE_ON_BLUR_MS * 2));
    expect(api.isOpen('settings')).toBe(true);
  });

  it('a click outside every panel closes closeOnBlur panels at once, without focus ever moving', async () => {
    mount();
    await act(async () => {}); // the listener subscribes asynchronously
    act(() => {
      api.openPanel('chat');
      api.openPanel('settings');
      api.openPanel('netWorthTicker');
    });
    act(() => events.get(OUTSIDE_CLICK_EVENT)!());
    expect(api.isOpen('chat')).toBe(false);
    expect(api.isOpen('settings')).toBe(false);
    expect(api.isOpen('netWorthTicker')).toBe(true); // not a closeOnBlur panel
  });

  it('runs the outside-click hook only while a closeOnBlur panel is open', () => {
    tauri.on = true;
    mount();
    expect(invoke).toHaveBeenLastCalledWith('set_outside_click_watch', { enabled: false });
    act(() => api.openPanel('netWorthTicker'));
    expect(invoke).not.toHaveBeenCalledWith('set_outside_click_watch', { enabled: true });
    act(() => api.openPanel('chat'));
    expect(invoke).toHaveBeenLastCalledWith('set_outside_click_watch', { enabled: true });
    act(() => api.closePanel('chat'));
    expect(invoke).toHaveBeenLastCalledWith('set_outside_click_watch', { enabled: false });
  });

  it('keeps panels open when focus returns within the delay', () => {
    mount();
    act(() => api.openPanel('chat'));
    act(() => focus.onChange!(false));
    act(() => vi.advanceTimersByTime(CLOSE_ON_BLUR_MS - 50));
    act(() => focus.onChange!(true));
    act(() => vi.advanceTimersByTime(CLOSE_ON_BLUR_MS * 2));
    expect(api.isOpen('chat')).toBe(true);
  });
});

describe('panel portal layer', () => {
  const PopoverProbe: React.FC = () => (
    <Popover open>
      <PopoverTrigger>trigger</PopoverTrigger>
      <PopoverContent>popper</PopoverContent>
    </Popover>
  );
  const SheetProbe: React.FC = () => (
    <Sheet open>
      <SheetContent side="left"
        aria-describedby={undefined}>
        <SheetTitle>Macros</SheetTitle>
      </SheetContent>
    </Sheet>
  );
  const popper = () => screen.getByText('popper');

  it('portals Radix layers into the panel, so they hide with it', () => {
    render(
      <OverlayProvider defs={{ ...DEFS, chat: { ...DEFS.chat, component: PopoverProbe } }}>
        <Capture />
        <OverlayRoot />
      </OverlayProvider>,
    );
    act(() => api.openPanel('chat'));
    expect(popper().closest('[data-panel-portal]')?.parentElement).toBe(frame('chat'));

    act(() => api.closePanel('chat'));
    expect(frame('chat')!.style.display).toBe('none');
    expect(frame('chat')!.contains(popper())).toBe(true);
  });

  it('portals to document.body outside panels', () => {
    render(
      <OverlayProvider defs={DEFS}>
        <PopoverProbe />
        <OverlayRoot />
      </OverlayProvider>,
    );
    expect(popper().closest('[data-panel-portal]')).toBeNull();
    expect(document.body.contains(popper())).toBe(true);
  });

  it('positions a sheet inside its panel instead of at the monitor edge', () => {
    render(
      <OverlayProvider defs={{ ...DEFS, chat: { ...DEFS.chat, component: SheetProbe } }}>
        <Capture />
        <OverlayRoot />
      </OverlayProvider>,
    );
    act(() => api.openPanel('chat'));
    const content = document.querySelector('[data-slot="sheet-content"]')!;
    const overlay = document.querySelector('[data-slot="sheet-overlay"]')!;
    expect(frame('chat')!.contains(content)).toBe(true);
    expect(content.classList).toContain('absolute');
    expect(content.classList).not.toContain('fixed');
    expect(overlay.classList).toContain('absolute');
    expect(overlay.classList).not.toContain('fixed');
  });

  it('keeps a sheet outside panels fixed to the viewport', () => {
    render(<SheetProbe />);
    expect(document.querySelector('[data-slot="sheet-content"]')!.classList).toContain('fixed');
  });
});
