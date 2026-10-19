// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import {
  attachWindowCloseHandler,
  attachWindowLifecycle,
  openCenteredWindow,
  openOverDiabloWindow,
  openWindowAtCursor,
  type BrowserWindow,
} from './browser-window';

interface FakePopup {
  closed: boolean;
  focus: MockInstance;
  blur: MockInstance;
  close: MockInstance;
  postMessage: MockInstance;
  document: { hasFocus: () => boolean };
  location: { href: string };
}

let popup: FakePopup;
let windowOpen: MockInstance<typeof window.open>;

beforeEach(() => {
  vi.useFakeTimers();
  popup = {
    closed: false,
    focus: vi.fn(),
    blur: vi.fn(),
    close: vi.fn(() => {
      popup.closed = true;
    }),
    postMessage: vi.fn(),
    document: { hasFocus: () => true },
    location: { href: 'http://localhost/quick-list' },
  };
  windowOpen = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  vi.spyOn(window.screen, 'width', 'get').mockReturnValue(1920);
  vi.spyOn(window.screen, 'height', 'get').mockReturnValue(1080);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

function openedFeatures(): Record<string, string> {
  const features = windowOpen.mock.calls[0][2] as string;
  return Object.fromEntries(features.split(',').map((f) => f.split('=') as [string, string]));
}

describe('openCenteredWindow geometry', () => {
  it('centers the requested size on the screen', async () => {
    await openCenteredWindow('QuickList', '/quick-list', { width: 800, height: 400 });

    expect(windowOpen.mock.calls[0][0]).toBe('/quick-list');
    expect(windowOpen.mock.calls[0][1]).toBe('QuickList');
    expect(openedFeatures()).toMatchObject({ width: '800', height: '400', left: '560', top: '340' });
  });

  it('defaults to 600x600 and rounds half-pixel offsets to integers', async () => {
    await openCenteredWindow('A', '/a');
    expect(openedFeatures()).toMatchObject({ width: '600', height: '600', left: '660', top: '240' });

    windowOpen.mockClear();
    await openCenteredWindow('B', '/b', { width: 601, height: 301 });
    const { left, top } = openedFeatures();
    expect(Number.isInteger(Number(left)) && Number.isInteger(Number(top))).toBe(true);
    expect(Math.abs(Number(left) - 659.5)).toBe(0.5);
    expect(Math.abs(Number(top) - 389.5)).toBe(0.5);
  });

  it('falls back to centering for cursor- and Diablo-anchored windows', async () => {
    await openWindowAtCursor('A', '/a', { width: 800, height: 400 });
    await openOverDiabloWindow('B', '/b', { width: 800, height: 400 });

    for (const call of windowOpen.mock.calls) {
      expect(call[2]).toContain('left=560');
      expect(call[2]).toContain('top=340');
    }
  });

  it('returns null when the popup is blocked', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    windowOpen.mockReturnValue(null);

    expect(await openCenteredWindow('A', '/a')).toBeNull();
  });
});

describe('popup wrapper', () => {
  async function open(): Promise<BrowserWindow> {
    return (await openCenteredWindow('QuickList', '/quick-list'))!;
  }

  it('notifies close listeners once after the popup is closed', async () => {
    const w = await open();
    const onClose = vi.fn();
    w.onCloseRequested(onClose);

    vi.advanceTimersByTime(300);
    expect(onClose).not.toHaveBeenCalled();

    popup.closed = true;
    vi.advanceTimersByTime(1000);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reports focus state from both the opener and the popup', async () => {
    const w = await open();
    const onFocus = vi.fn();
    w.onFocusChanged(onFocus);
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);

    vi.advanceTimersByTime(200);
    popup.document.hasFocus = () => false;
    vi.advanceTimersByTime(200);

    expect(onFocus.mock.calls.map(([e]) => e.payload)).toEqual([true, false]);
  });

  it('posts emitted events to the popup scoped to our own origin', async () => {
    const w = await open();

    await w.emit('item-selected', { id: 7 });

    expect(popup.postMessage).toHaveBeenCalledWith(
      { type: 'item-selected', payload: { id: 7 } },
      window.location.origin,
    );
  });

  it('ignores focus/blur/close/emit once the popup is closed', async () => {
    const w = await open();
    popup.closed = true;

    await w.setFocus();
    await w.hide();
    await w.close();
    await w.emit('evt');

    expect(popup.focus).not.toHaveBeenCalled();
    expect(popup.blur).not.toHaveBeenCalled();
    expect(popup.close).not.toHaveBeenCalled();
    expect(popup.postMessage).not.toHaveBeenCalled();
  });

  it('reopens the same URL under the same label when shown after closing', async () => {
    const w = await open();
    popup.closed = true;
    windowOpen.mockClear();

    await w.show();

    expect(windowOpen).toHaveBeenCalledWith('http://localhost/quick-list', 'QuickList');
  });

  it('focuses an open popup on show', async () => {
    const w = await open();

    await w.show();

    expect(popup.focus).toHaveBeenCalledTimes(1);
    expect(windowOpen).toHaveBeenCalledTimes(1);
  });
});

/** Minimal BrowserWindow whose close/focus events the test fires by hand. */
function controllableWindow() {
  let closeCb: () => void = () => {};
  let focusCb: (e: { payload: boolean }) => void = () => {};
  const w: BrowserWindow = {
    show: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    emit: vi.fn(),
    setFocus: vi.fn(),
    onCloseRequested: (cb) => {
      closeCb = cb;
    },
    onFocusChanged: (cb) => {
      focusCb = cb;
    },
  };
  return { w, requestClose: () => closeCb(), focus: (payload: boolean) => focusCb({ payload }) };
}

describe('attachWindowLifecycle', () => {
  it('closes the window and notifies when focus is lost, but not when focus is gained', () => {
    const { w, focus } = controllableWindow();
    const onClose = vi.fn();
    attachWindowLifecycle(w, onClose);

    focus(true);
    expect(onClose).not.toHaveBeenCalled();

    focus(false);
    expect(w.close).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('notifies on a close request', () => {
    const { w, requestClose } = controllableWindow();
    const onClose = vi.fn();
    attachWindowLifecycle(w, onClose);

    requestClose();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('attachWindowCloseHandler', () => {
  it('hides the window 150ms after focus loss and reports it', () => {
    const { w, focus } = controllableWindow();
    const onFocusLost = vi.fn();
    attachWindowCloseHandler(w, vi.fn(), onFocusLost);

    focus(false);
    vi.advanceTimersByTime(149);
    expect(w.hide).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(w.hide).toHaveBeenCalledTimes(1);
    expect(onFocusLost).toHaveBeenCalledTimes(1);
  });

  it('keeps the window when focus returns within the grace period', () => {
    const { w, focus } = controllableWindow();
    const onFocusLost = vi.fn();
    attachWindowCloseHandler(w, vi.fn(), onFocusLost);

    focus(false);
    vi.advanceTimersByTime(100);
    focus(true);
    vi.advanceTimersByTime(1000);

    expect(w.hide).not.toHaveBeenCalled();
    expect(onFocusLost).not.toHaveBeenCalled();
  });

  it('notifies on a close request without hiding', () => {
    const { w, requestClose } = controllableWindow();
    const onClose = vi.fn();
    attachWindowCloseHandler(w, onClose);

    requestClose();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(w.hide).not.toHaveBeenCalled();
  });
});
