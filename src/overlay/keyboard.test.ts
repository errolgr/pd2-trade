import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke, isTauri } from '@tauri-apps/api/core';
import {
  claimKeyboard,
  FOREGROUND_EVENT,
  isHeldOverFullscreenGame,
  isKeyboardClaimed,
  releaseKeyboard,
  resetKeyboardStateForTests,
  showOverFullscreenGame,
  trackKeyboardFocus,
  type ForegroundOwner,
} from './keyboard';

const win = vi.hoisted(() => ({
  setFocusable: vi.fn(async (_focusable: boolean) => {}),
  setFocus: vi.fn(async () => {}),
}));
/** The Rust foreground hook's listener (FOREGROUND_EVENT), registered by trackKeyboardFocus. */
const events = vi.hoisted(() => ({
  foreground: null as ((e: { payload: string }) => void) | null,
  subscribed: [] as string[],
}));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(), invoke: vi.fn(async () => true) }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => win }));
vi.mock('@/lib/browser-events', () => ({
  listen: vi.fn(async (event: string, handler: (e: { payload: string }) => void) => {
    events.subscribed.push(event);
    events.foreground = handler;
    return () => {
      events.foreground = null;
    };
  }),
}));

/** Drain the microtasks of the listen().then(...) subscription chain. */
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};
/** The OS foreground moved to `owner`. */
const foreground = (owner: ForegroundOwner) => events.foreground!({ payload: owner });
/** Rust command answers; anything not listed resolves true (in the game, overlay came to the front, ...). */
let commands: Record<string, unknown>;
const calls = (command: string) => vi.mocked(invoke).mock.calls.filter(([name]) => name === command).length;
const callOrder = (command: string) =>
  vi.mocked(invoke).mock.invocationCallOrder[vi.mocked(invoke).mock.calls.findIndex(([name]) => name === command)];

beforeEach(() => {
  vi.clearAllMocks();
  resetKeyboardStateForTests();
  events.foreground = null;
  events.subscribed = [];
  commands = {};
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(invoke).mockImplementation(async (command: string) => (command in commands ? commands[command] : true));
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

describe('claimKeyboard', () => {
  it('makes Main focusable, then brings it to the front through focus_overlay', async () => {
    await claimKeyboard();
    expect(win.setFocusable).toHaveBeenCalledWith(true);
    expect(invoke).toHaveBeenCalledWith('focus_overlay');
    expect(win.setFocus).not.toHaveBeenCalled(); // refused by Windows while the game holds the foreground right
    expect(win.setFocusable.mock.invocationCallOrder[0]).toBeLessThan(callOrder('focus_overlay'));
    expect(isKeyboardClaimed()).toBe(true);
  });

  it('is idempotent while claimed', async () => {
    await claimKeyboard();
    await claimKeyboard();
    expect(calls('focus_overlay')).toBe(1);
  });

  it('backs out when the overlay could not come to the front, so it is not stuck claimed', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    commands.focus_overlay = false;
    await claimKeyboard();
    expect(isKeyboardClaimed()).toBe(false);
    expect(win.setFocusable).toHaveBeenLastCalledWith(false);

    commands.focus_overlay = true;
    await claimKeyboard(); // the next claim (e.g. a click on the panel) tries again
    expect(isKeyboardClaimed()).toBe(true);
  });

  it('stays unclaimed when the window call fails, so the next pointerdown retries', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(invoke).mockRejectedValueOnce(new Error('nope'));
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

describe('showOverFullscreenGame', () => {
  it('takes the foreground when the game fills its monitor, and holds it', async () => {
    commands.is_diablo_fullscreen = true;
    await showOverFullscreenGame();
    expect(win.setFocusable).toHaveBeenCalledWith(true);
    expect(calls('focus_overlay')).toBe(1);
    expect(isKeyboardClaimed()).toBe(true);
    expect(isHeldOverFullscreenGame()).toBe(true);

    await showOverFullscreenGame(); // the next panel while the overlay is in front
    expect(calls('focus_overlay')).toBe(1);
  });

  it('leaves a windowed game in front', async () => {
    commands.is_diablo_fullscreen = false;
    await showOverFullscreenGame();
    expect(win.setFocusable).not.toHaveBeenCalled();
    expect(calls('focus_overlay')).toBe(0);
    expect(isKeyboardClaimed()).toBe(false);
  });

  it('leaves another app in front while the game sits fullscreen behind it', async () => {
    commands.is_diablo_fullscreen = true;
    commands.is_diablo_focused = false;
    await showOverFullscreenGame();
    expect(calls('focus_overlay')).toBe(0);
    expect(isKeyboardClaimed()).toBe(false);
  });

  it('backs out when the overlay could not come to the front', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    commands.is_diablo_fullscreen = true;
    commands.focus_overlay = false;
    await showOverFullscreenGame();
    expect(isKeyboardClaimed()).toBe(false);
    expect(isHeldOverFullscreenGame()).toBe(false);
    expect(win.setFocusable).toHaveBeenLastCalledWith(false);
  });

  it('holds a text field claim over a fullscreen game too, but not over a windowed one', async () => {
    commands.is_diablo_fullscreen = true;
    await claimKeyboard();
    expect(isHeldOverFullscreenGame()).toBe(true);
    await releaseKeyboard();
    expect(isHeldOverFullscreenGame()).toBe(false);

    commands.is_diablo_fullscreen = false;
    await claimKeyboard();
    expect(isKeyboardClaimed()).toBe(true);
    expect(isHeldOverFullscreenGame()).toBe(false);
  });

  it('is a no-op in a browser', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    await showOverFullscreenGame();
    expect(invoke).not.toHaveBeenCalled();
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
    expect(invoke).not.toHaveBeenCalledWith('focus_diablo');
  });

  it('leaves the game in the background when the keyboard was claimed outside it (Settings from the tray)', async () => {
    commands.is_diablo_focused = false;
    await claimKeyboard();
    await releaseKeyboard();
    expect(win.setFocusable).toHaveBeenLastCalledWith(false);
    expect(invoke).not.toHaveBeenCalledWith('focus_diablo');
    expect(isKeyboardClaimed()).toBe(false);
  });

  it('still hands focus to the game on request (a hotkey copying the item under the cursor)', async () => {
    commands.is_diablo_focused = false;
    await claimKeyboard();
    await releaseKeyboard({ focusGame: true });
    expect(invoke).toHaveBeenCalledWith('focus_diablo');
  });

  it('does nothing when the keyboard was not claimed', async () => {
    await releaseKeyboard();
    expect(win.setFocusable).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('trackKeyboardFocus', () => {
  async function track() {
    const seen: [boolean, boolean][] = [];
    const stop = trackKeyboardFocus((focused, handoff) => seen.push([focused, handoff]));
    await flush();
    return { seen, stop };
  }

  it('follows the Rust foreground hook', async () => {
    const { stop } = await track();
    expect(events.subscribed).toEqual([FOREGROUND_EVENT]);
    stop();
    expect(events.foreground).toBeNull();
  });

  it('treats the overlay coming to the front as focused and claimed', async () => {
    const { seen, stop } = await track();
    foreground('diablo');
    foreground('ownWindow');
    expect(seen).toEqual([[true, false]]);
    expect(isKeyboardClaimed()).toBe(true);
    stop();
  });

  it('reports the user clicking from the overlay back into the game, and ends the claim', async () => {
    const { seen, stop } = await track();
    foreground('diablo');
    await claimKeyboard();
    foreground('ownWindow');
    win.setFocusable.mockClear();

    foreground('diablo');
    expect(seen).toEqual([
      [true, false],
      [false, false],
    ]);
    expect(isKeyboardClaimed()).toBe(false);
    expect(win.setFocusable).toHaveBeenCalledWith(false);
    // The user went there themselves: no focus_diablo round-trip
    expect(invoke).not.toHaveBeenCalledWith('focus_diablo');
    stop();
  });

  it('reports switching from the overlay to another app', async () => {
    const { seen, stop } = await track();
    foreground('ownWindow');
    foreground('other');
    expect(seen).toEqual([
      [true, false],
      [false, false],
    ]);
    stop();
  });

  it('reports leaving the game for another app even though the overlay never had focus', async () => {
    const { seen, stop } = await track();
    foreground('diablo');
    foreground('other');
    expect(seen).toEqual([[false, false]]);
    stop();
  });

  it('ignores switches that are not leaving: into the game, repeats and unknown foregrounds', async () => {
    const { seen, stop } = await track();
    foreground('other');
    foreground('diablo');
    foreground('diablo');
    foreground('unknown');
    foreground('other'); // from diablo: leaving, the unknown in between didn't reset it
    expect(seen).toEqual([[false, false]]);
    stop();
  });

  it('marks the loss caused by releaseKeyboard as a hand-off, and only that one', async () => {
    const { seen, stop } = await track();
    await claimKeyboard();
    foreground('ownWindow');
    await releaseKeyboard();
    foreground('diablo'); // our hand-off to the game
    await claimKeyboard();
    foreground('ownWindow');
    foreground('diablo'); // the user clicking into the game
    expect(seen).toEqual([
      [true, false],
      [false, true],
      [true, false],
      [false, false],
    ]);
    stop();
  });

  it('treats a loss long after a hand-off as the user leaving', async () => {
    vi.useFakeTimers();
    try {
      const { seen, stop } = await track();
      await claimKeyboard();
      foreground('ownWindow');
      await releaseKeyboard();
      vi.advanceTimersByTime(5000);
      foreground('diablo');
      expect(seen.at(-1)).toEqual([false, false]);
      stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not excuse the user leaving after a hand-off that changed nothing', async () => {
    // Chat closes (hand-off to the game, already in front: no foreground event), then Settings opens
    const { seen, stop } = await track();
    foreground('diablo');
    await claimKeyboard();
    await releaseKeyboard();
    await claimKeyboard();
    foreground('ownWindow');
    foreground('diablo'); // the user clicks into the game well within the hand-off window
    expect(seen).toEqual([
      [true, false],
      [false, false],
    ]);
    stop();
  });

  it('remembers that focus_overlay brought the overlay to the front even if the hook missed it', async () => {
    const { seen, stop } = await track();
    foreground('diablo');
    await claimKeyboard(); // focus_overlay -> true, but no 'ownWindow' report arrives
    foreground('diablo'); // the user clicks back into the game
    expect(seen).toEqual([[false, false]]);
    stop();
  });

  it('unsubscribes even if stopped before the listener resolved', async () => {
    const stop = trackKeyboardFocus();
    stop();
    await flush();
    expect(events.foreground).toBeNull();
  });

  it('does nothing in a browser', () => {
    vi.mocked(isTauri).mockReturnValue(false);
    trackKeyboardFocus()();
    expect(events.subscribed).toEqual([]);
  });
});
