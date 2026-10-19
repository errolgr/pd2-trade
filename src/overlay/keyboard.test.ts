import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke, isTauri } from '@tauri-apps/api/core';
import {
  claimKeyboard,
  isKeyboardClaimed,
  releaseKeyboard,
  resetKeyboardStateForTests,
  trackKeyboardFocus,
} from './keyboard';

const win = vi.hoisted(() => ({
  setFocusable: vi.fn(async (_focusable: boolean) => {}),
  setFocus: vi.fn(async () => {}),
  focusHandler: null as ((e: { payload: boolean }) => void) | null,
  onFocusChanged: vi.fn(async (handler: (e: { payload: boolean }) => void) => {
    win.focusHandler = handler;
    return () => {
      win.focusHandler = null;
    };
  }),
}));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(), invoke: vi.fn(async () => true) }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => win }));

/** Drain the microtasks of the onFocusChanged().then(...) subscription chain. */
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.clearAllMocks();
  resetKeyboardStateForTests();
  vi.mocked(isTauri).mockReturnValue(true);
});

describe('claimKeyboard', () => {
  it('makes Main focusable, then focuses it', async () => {
    await claimKeyboard();
    expect(win.setFocusable).toHaveBeenCalledWith(true);
    expect(win.setFocus).toHaveBeenCalledTimes(1);
    expect(win.setFocusable.mock.invocationCallOrder[0]).toBeLessThan(win.setFocus.mock.invocationCallOrder[0]);
    expect(isKeyboardClaimed()).toBe(true);
  });

  it('is idempotent while claimed', async () => {
    await claimKeyboard();
    await claimKeyboard();
    expect(win.setFocus).toHaveBeenCalledTimes(1);
  });

  it('stays unclaimed when the window call fails, so the next pointerdown retries', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    win.setFocus.mockRejectedValueOnce(new Error('nope'));
    await claimKeyboard();
    expect(isKeyboardClaimed()).toBe(false);
    await claimKeyboard();
    expect(isKeyboardClaimed()).toBe(true);
  });

  it('is a no-op in a browser', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    await claimKeyboard();
    expect(win.setFocusable).not.toHaveBeenCalled();
    expect(isKeyboardClaimed()).toBe(false);
  });
});

describe('releaseKeyboard', () => {
  it('makes Main non-focusable and hands focus back to Diablo', async () => {
    await claimKeyboard();
    await releaseKeyboard();
    expect(win.setFocusable).toHaveBeenLastCalledWith(false);
    expect(invoke).toHaveBeenCalledWith('focus_diablo');
    expect(isKeyboardClaimed()).toBe(false);
  });

  it('can skip focusing the game', async () => {
    await claimKeyboard();
    await releaseKeyboard({ focusGame: false });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('does nothing when the keyboard was not claimed', async () => {
    await releaseKeyboard();
    expect(win.setFocusable).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('trackKeyboardFocus', () => {
  it('drops the claim and the focusable flag when Main loses OS focus', async () => {
    const stop = trackKeyboardFocus();
    await flush();
    await claimKeyboard();
    win.setFocusable.mockClear();

    win.focusHandler!({ payload: false });
    expect(isKeyboardClaimed()).toBe(false);
    expect(win.setFocusable).toHaveBeenCalledWith(false);
    // Losing focus is the user clicking into the game: no focus_diablo round-trip
    expect(invoke).not.toHaveBeenCalled();
    stop();
    expect(win.focusHandler).toBeNull();
  });

  it('ignores focus loss while unclaimed and treats focus gain as claimed', async () => {
    const stop = trackKeyboardFocus();
    await flush();
    win.focusHandler!({ payload: false });
    expect(win.setFocusable).not.toHaveBeenCalled();
    win.focusHandler!({ payload: true });
    expect(isKeyboardClaimed()).toBe(true);
    stop();
  });

  it('unsubscribes even if stopped before the listener resolved', async () => {
    const stop = trackKeyboardFocus();
    stop();
    await flush();
    expect(win.focusHandler).toBeNull();
  });

  it('reports every focus change after updating the claim', async () => {
    const seen: [boolean, boolean][] = [];
    const stop = trackKeyboardFocus((focused) => seen.push([focused, isKeyboardClaimed()]));
    await flush();
    win.focusHandler!({ payload: true });
    win.focusHandler!({ payload: false });
    expect(seen).toEqual([
      [true, true],
      [false, false],
    ]);
    stop();
  });
});
