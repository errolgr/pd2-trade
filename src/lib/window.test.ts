import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { currentMonitor, cursorPosition } from '@tauri-apps/api/window';
import { saveWindowState } from '@tauri-apps/plugin-window-state';
import * as browserWindow from './browser-window';
import {
  attachWindowCloseHandler,
  attachWindowLifecycle,
  centerWindowOverRect,
  getDiabloRectWithRetry,
  getLogicalRect,
  moveWindowBy,
  openCenteredWindow,
  openOverDiabloWindow,
  openWindowAtCursor,
  openWindowCenteredOnDiablo,
  updateMainWindowBounds,
  updateWindowPositionRelative,
} from './window';

const tauri = vi.hoisted(() => ({ value: true }));

const created = vi.hoisted(() => [] as FakeWebview[]);

interface FakeWebview {
  label: string;
  options: Record<string, unknown>;
  closeHandlers: Array<(e: { preventDefault: () => void }) => unknown>;
  focusHandlers: Array<(e: { payload: boolean }) => void>;
  close: Mock;
  hide: Mock;
  outerSize: Mock;
  outerPosition: Mock;
  setSize: Mock;
  setPosition: Mock;
  onCloseRequested: (cb: FakeWebview['closeHandlers'][number]) => void;
  onFocusChanged: (cb: FakeWebview['focusHandlers'][number]) => void;
}

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => tauri.value, invoke: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({ currentMonitor: vi.fn(), cursorPosition: vi.fn() }));
vi.mock('@tauri-apps/plugin-window-state', () => ({ saveWindowState: vi.fn(), StateFlags: { ALL: 63 } }));
vi.mock('./browser-window', () => ({
  openCenteredWindow: vi.fn(),
  openOverDiabloWindow: vi.fn(),
  openWindowAtCursor: vi.fn(),
  attachWindowLifecycle: vi.fn(),
  attachWindowCloseHandler: vi.fn(),
  updateMainWindowBounds: vi.fn(),
}));
vi.mock('@tauri-apps/api/webviewWindow', () => ({
  WebviewWindow: class {
    label: string;
    options: Record<string, unknown>;
    closeHandlers: FakeWebview['closeHandlers'] = [];
    focusHandlers: FakeWebview['focusHandlers'] = [];
    close = vi.fn();
    hide = vi.fn();
    outerSize = vi.fn().mockResolvedValue({ width: 800, height: 600 });
    outerPosition = vi.fn().mockResolvedValue({ x: 10, y: 10 });
    setSize = vi.fn();
    setPosition = vi.fn();
    constructor(label: string, options: Record<string, unknown>) {
      this.label = label;
      this.options = options;
      created.push(this as unknown as FakeWebview);
    }
    onCloseRequested(cb: FakeWebview['closeHandlers'][number]) {
      this.closeHandlers.push(cb);
    }
    onFocusChanged(cb: FakeWebview['focusHandlers'][number]) {
      this.focusHandlers.push(cb);
    }
  },
}));

function monitor(overrides: Partial<{ x: number; y: number; width: number; height: number; scaleFactor: number }>) {
  const m = { x: 0, y: 0, width: 1920, height: 1080, scaleFactor: 1, ...overrides };
  return { position: { x: m.x, y: m.y }, size: { width: m.width, height: m.height }, scaleFactor: m.scaleFactor };
}

function geometry(w: FakeWebview) {
  const { x, y, width, height } = w.options;
  return { x, y, width, height };
}

beforeEach(() => {
  tauri.value = true;
  created.length = 0;
  vi.mocked(currentMonitor).mockResolvedValue(monitor({}) as never);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getDiabloRectWithRetry', () => {
  it('returns the first rect found, retrying with exponential backoff', async () => {
    vi.useFakeTimers();
    const rect = { x: 1, y: 2, width: 3, height: 4 };
    vi.mocked(invoke).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(rect);

    const pending = getDiabloRectWithRetry(5, 100);
    await vi.advanceTimersByTimeAsync(100);
    expect(invoke).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(199);
    expect(invoke).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);

    expect(await pending).toEqual(rect);
    expect(invoke).toHaveBeenCalledTimes(3);
    expect(invoke).toHaveBeenCalledWith('get_diablo_rect');
  });

  it('gives up with null after maxRetries attempts without waiting after the last one', async () => {
    vi.useFakeTimers();
    vi.mocked(invoke).mockResolvedValue(null);

    const pending = getDiabloRectWithRetry(3, 100);
    await vi.advanceTimersByTimeAsync(100 + 200);

    expect(await pending).toBeNull();
    expect(invoke).toHaveBeenCalledTimes(3);
  });
});

describe('getLogicalRect', () => {
  it('divides physical pixels by the scale factor and rounds', () => {
    expect(getLogicalRect({ x: 301, y: 0, width: 2561, height: 1441 }, 1.5)).toEqual({
      x: 201,
      y: 0,
      width: 1707,
      height: 961,
    });
    expect(getLogicalRect({ x: 10, y: 20, width: 30, height: 40 }, 1)).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });
});

describe('openCenteredWindow (Tauri)', () => {
  it('centers on the current monitor, including its offset in a multi-monitor layout', async () => {
    vi.mocked(currentMonitor).mockResolvedValue(monitor({ x: 1920, y: -200, width: 2560, height: 1440 }) as never);

    await openCenteredWindow('Settings', '/settings', { width: 800, height: 600 });

    expect(created).toHaveLength(1);
    expect(created[0].label).toBe('Settings');
    expect(created[0].options.url).toBe('/settings');
    expect(geometry(created[0])).toEqual({ x: 1920 + 880, y: -200 + 420, width: 800, height: 600 });
  });

  it('uses 600x600 by default and computed position wins over caller x/y', async () => {
    await openCenteredWindow('A', '/a', { x: 5, y: 5, alwaysOnTop: true });

    expect(geometry(created[0])).toEqual({ x: 660, y: 240, width: 600, height: 600 });
    expect(created[0].options.alwaysOnTop).toBe(true);
  });

  it('returns null without creating a window when there is no monitor', async () => {
    vi.mocked(currentMonitor).mockResolvedValue(null);

    expect(await openCenteredWindow('A', '/a')).toBeNull();
    expect(created).toHaveLength(0);
  });
});

describe('openOverDiabloWindow (Tauri)', () => {
  it('right-aligns to the Diablo window in logical pixels and spans its full height', async () => {
    vi.mocked(invoke).mockResolvedValue({ x: 200, y: 100, width: 1600, height: 900 });
    vi.mocked(currentMonitor).mockResolvedValue(monitor({ scaleFactor: 2 }) as never);

    await openOverDiabloWindow('ItemSearch', '/item-search', { height: 123 });

    // logical rect: x=100 y=50 w=800 h=450; default width 500 → x = 100 + 800 - 500
    expect(geometry(created[0])).toEqual({ x: 400, y: 50, width: 500, height: 450 });
  });

  it('falls back to a monitor-centered window when Diablo is not found', async () => {
    vi.useFakeTimers();
    vi.mocked(invoke).mockResolvedValue(null);

    const pending = openOverDiabloWindow('ItemSearch', '/item-search', { width: 400, height: 200 });
    await vi.runAllTimersAsync();
    await pending;

    expect(invoke).toHaveBeenCalledTimes(5);
    expect(geometry(created[0])).toEqual({ x: 760, y: 440, width: 400, height: 200 });
  });
});

describe('openWindowCenteredOnDiablo (Tauri)', () => {
  it('centers the requested size over the Diablo window in logical pixels', async () => {
    vi.mocked(invoke).mockResolvedValue({ x: 300, y: 150, width: 2400, height: 1350 });
    vi.mocked(currentMonitor).mockResolvedValue(monitor({ scaleFactor: 1.5 }) as never);

    await openWindowCenteredOnDiablo('Currency', '/currency', { width: 700, height: 500 });

    // logical rect: x=200 y=100 w=1600 h=900
    expect(geometry(created[0])).toEqual({ x: 200 + 450, y: 100 + 200, width: 700, height: 500 });
  });

  it('treats a missing monitor scale factor as 1', async () => {
    vi.mocked(invoke).mockResolvedValue({ x: 0, y: 0, width: 1000, height: 800 });
    vi.mocked(currentMonitor).mockResolvedValue(null);

    await openWindowCenteredOnDiablo('A', '/a');

    expect(geometry(created[0])).toEqual({ x: 200, y: 100, width: 600, height: 600 });
  });
});

describe('openWindowAtCursor (Tauri)', () => {
  it('places the window top-left at the cursor', async () => {
    vi.mocked(cursorPosition).mockResolvedValue({ x: 1234, y: 567 } as never);

    await openWindowAtCursor('QuickList', '/quick-list', { width: 300 });

    expect(geometry(created[0])).toEqual({ x: 1234, y: 567, width: 300, height: 600 });
  });
});

describe('save-on-close behavior of opened windows', () => {
  async function requestClose(w: FakeWebview) {
    const event = { preventDefault: vi.fn() };
    await Promise.all(w.closeHandlers.map((h) => h(event)));
    return event;
  }

  it('saves window state, then closes, deferring the native close', async () => {
    const order: string[] = [];
    vi.mocked(saveWindowState).mockImplementation(async () => {
      order.push('save');
    });
    await openCenteredWindow('A', '/a');
    const w = created[0];
    w.close.mockImplementation(() => order.push('close'));

    const event = await requestClose(w);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(order).toEqual(['save', 'close']);
    expect(w.setSize).not.toHaveBeenCalled();
    expect(w.setPosition).not.toHaveBeenCalled();
  });

  it.each([
    ['oversized width', { width: 10001, height: 600 }, { x: 0, y: 0 }],
    ['far-off position', { width: 800, height: 600 }, { x: 0, y: -50001 }],
  ])('resets corrupt bounds (%s) to 800x600 at (100,100) before saving', async (_case, size, pos) => {
    await openCenteredWindow('A', '/a');
    const w = created[0];
    w.outerSize.mockResolvedValue(size);
    w.outerPosition.mockResolvedValue(pos);

    await requestClose(w);

    expect(w.setSize.mock.calls[0][0]).toMatchObject({ width: 800, height: 600 });
    expect(w.setPosition.mock.calls[0][0]).toMatchObject({ x: 100, y: 100 });
    expect(saveWindowState).toHaveBeenCalled();
  });

  it('still closes when saving state fails', async () => {
    vi.mocked(saveWindowState).mockRejectedValue(new Error('io'));
    await openCenteredWindow('A', '/a');

    await requestClose(created[0]);

    expect(created[0].close).toHaveBeenCalledTimes(1);
  });
});

describe('attachWindowCloseHandler / attachWindowLifecycle (Tauri)', () => {
  async function tauriWindow() {
    await openWindowAtCursor('A', '/a');
    const w = created[0];
    w.closeHandlers.length = 0;
    return w;
  }

  beforeEach(() => {
    vi.mocked(cursorPosition).mockResolvedValue({ x: 0, y: 0 } as never);
  });

  it('hides 150ms after blur unless focus returns first', async () => {
    vi.useFakeTimers();
    const w = await tauriWindow();
    const onFocusLost = vi.fn();
    attachWindowCloseHandler(w as never, vi.fn(), onFocusLost);
    const [focusChanged] = w.focusHandlers;

    focusChanged({ payload: false });
    vi.advanceTimersByTime(100);
    focusChanged({ payload: true });
    vi.advanceTimersByTime(500);
    expect(w.hide).not.toHaveBeenCalled();

    focusChanged({ payload: false });
    vi.advanceTimersByTime(150);
    expect(w.hide).toHaveBeenCalledTimes(1);
    expect(onFocusLost).toHaveBeenCalledTimes(1);
    expect(browserWindow.attachWindowCloseHandler).not.toHaveBeenCalled();
  });

  it('lifecycle: blur closes and notifies; close request saves state and notifies', async () => {
    const w = await tauriWindow();
    const onClose = vi.fn();
    attachWindowLifecycle(w as never, onClose);

    w.focusHandlers[0]({ payload: false });
    expect(w.close).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    vi.mocked(saveWindowState).mockRejectedValue(new Error('io'));
    await w.closeHandlers[0]({ preventDefault: vi.fn() });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('browser fallbacks', () => {
  beforeEach(() => {
    tauri.value = false;
  });

  it('opens browser popups and never builds a Tauri webview', async () => {
    const popup = { show: vi.fn() } as unknown as browserWindow.BrowserWindow;
    vi.mocked(browserWindow.openCenteredWindow).mockResolvedValue(popup);

    expect(await openCenteredWindow('A', '/a')).toBe(popup);
    expect(await openWindowCenteredOnDiablo('B', '/b')).toBe(popup);
    expect(created).toHaveLength(0);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('does not ask the backend to update window bounds', async () => {
    await updateMainWindowBounds();
    expect(invoke).not.toHaveBeenCalled();

    tauri.value = true;
    await updateMainWindowBounds();
    expect(invoke).toHaveBeenCalledWith('update_window_bounds');
  });
});

describe('positioning existing windows', () => {
  function liveWindow(visible: boolean) {
    return {
      isVisible: vi.fn().mockResolvedValue(visible),
      scaleFactor: vi.fn().mockResolvedValue(2),
      innerSize: vi.fn().mockResolvedValue({ width: 400, height: 300 }),
      outerPosition: vi.fn().mockResolvedValue({ x: 50, y: -20 }),
      setPosition: vi.fn(),
      setSize: vi.fn(),
    };
  }

  it('centerWindowOverRect centers the window (physical) over the Diablo rect', async () => {
    vi.mocked(currentMonitor).mockResolvedValue(monitor({ scaleFactor: 2 }) as never);
    const w = liveWindow(true);

    await centerWindowOverRect(w, { x: 200, y: 100, width: 1600, height: 900 });

    // Diablo center (physical) = (1000, 550); window is 400x300 physical → top-left (800, 400)
    expect(w.setPosition.mock.calls[0][0]).toMatchObject({ x: 800, y: 400 });
  });

  it('leaves hidden windows where they are', async () => {
    const w = liveWindow(false);

    await centerWindowOverRect(w, { x: 0, y: 0, width: 100, height: 100 });
    await updateWindowPositionRelative(w, { x: 0, y: 0, width: 100, height: 100 });

    expect(w.setPosition).not.toHaveBeenCalled();
    expect(w.setSize).not.toHaveBeenCalled();
  });

  it('moveWindowBy offsets the current physical position', async () => {
    const w = liveWindow(false);

    await moveWindowBy(w, 30, -15);

    expect(w.setPosition.mock.calls[0][0]).toMatchObject({ x: 80, y: -35 });
  });
});
