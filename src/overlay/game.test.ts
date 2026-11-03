// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_BLUR_DEBOUNCE_MS, gamePlayRect, useGameState } from './game';

const state = vi.hoisted(() => ({
  /** Rust game context (`is_diablo_focused` / `diablo-focus-changed`). */
  inGame: true,
  gameContext: null as ((e: { payload: boolean }) => void) | null,
  /** The overlay window's own focus listener, if the hook registers one. */
  overlayFocus: null as ((e: { payload: boolean }) => void) | null,
  /** `get_diablo_rect`: the Diablo II window in physical screen px. */
  diabloRect: null as { x: number; y: number; width: number; height: number } | null,
}));
const win = vi.hoisted(() => ({
  onFocusChanged: vi.fn(async (cb: (e: { payload: boolean }) => void) => {
    state.overlayFocus = cb;
    return () => {};
  }),
  onMoved: vi.fn(async () => () => {}),
  onResized: vi.fn(async () => () => {}),
  outerPosition: vi.fn(async () => ({ x: 0, y: 0 })),
  scaleFactor: vi.fn(async () => 1),
}));

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => true,
  invoke: vi.fn(async (command: string) =>
    command === 'is_diablo_focused' ? state.inGame : command === 'get_diablo_rect' ? state.diabloRect : null,
  ),
}));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => win, cursorPosition: vi.fn() }));
vi.mock('@/lib/browser-events', () => ({
  listen: vi.fn(async (_event: string, cb: (e: { payload: boolean }) => void) => {
    state.gameContext = cb;
    return () => {
      state.gameContext = null;
    };
  }),
}));

async function renderGameState() {
  const view = renderHook(() => useGameState());
  await act(async () => {}); // initial is_diablo_focused + listener subscriptions
  return view;
}
const advance = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));
const gameContext = (inGame: boolean) => act(() => state.gameContext!({ payload: inGame }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  state.inGame = true;
  state.gameContext = null;
  state.overlayFocus = null;
  state.diabloRect = null;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useGameState focus', () => {
  it('starts with in-game panels hidden until the game context is known (no flash at launch)', async () => {
    state.inGame = false;
    const outside = renderHook(() => useGameState());
    expect(outside.result.current.gameFocused).toBe(false);
    await act(async () => {});
    await advance(GAME_BLUR_DEBOUNCE_MS * 2);
    expect(outside.result.current.gameFocused).toBe(false);
    outside.unmount();

    state.inGame = true;
    const inGame = renderHook(() => useGameState());
    expect(inGame.result.current.gameFocused).toBe(false);
    await act(async () => {}); // is_diablo_focused answers: shown right away, no debounce
    expect(inGame.result.current.gameFocused).toBe(true);
  });

  it('follows the game context, hiding in-game panels only after the debounce', async () => {
    const { result } = await renderGameState();
    expect(result.current.gameFocused).toBe(true);

    gameContext(false);
    await advance(GAME_BLUR_DEBOUNCE_MS - 1);
    expect(result.current.gameFocused).toBe(true);
    await advance(1);
    expect(result.current.gameFocused).toBe(false);

    gameContext(true);
    expect(result.current.gameFocused).toBe(true);
  });

  it('a quick switch away and back never hides them', async () => {
    const { result } = await renderGameState();
    gameContext(false);
    await advance(GAME_BLUR_DEBOUNCE_MS / 2);
    gameContext(true);
    await advance(GAME_BLUR_DEBOUNCE_MS * 2);
    expect(result.current.gameFocused).toBe(true);
  });

  it('keeps in-game panels hidden when the overlay takes focus outside the game (Settings from the tray)', async () => {
    state.inGame = false;
    const { result } = await renderGameState();
    await advance(GAME_BLUR_DEBOUNCE_MS);
    expect(result.current.gameFocused).toBe(false);

    act(() => state.overlayFocus?.({ payload: true })); // the user clicks into a Settings text field
    await advance(GAME_BLUR_DEBOUNCE_MS);
    expect(result.current.gameFocused).toBe(false);
  });
});

describe('gamePlayRect', () => {
  it.each([
    ['16:9 1920x1080', { x: 0, y: 0, width: 1920, height: 1080 }, { x: 0, y: 0, width: 1920, height: 1080 }],
    ['16:9 1366x768', { x: 0, y: 0, width: 1366, height: 768 }, { x: 0, y: 0, width: 1366, height: 768 }],
    ['16:10 1920x1200', { x: 0, y: 0, width: 1920, height: 1200 }, { x: 0, y: 0, width: 1920, height: 1200 }],
    ['21:9 3440x1440', { x: 0, y: 0, width: 3440, height: 1440 }, { x: 440, y: 0, width: 2560, height: 1440 }],
    ['21:9 2560x1080', { x: 0, y: 0, width: 2560, height: 1080 }, { x: 320, y: 0, width: 1920, height: 1080 }],
    ['21:9 3433x1437 (#128)', { x: 0, y: 0, width: 3433, height: 1437 }, { x: 439, y: 0, width: 2555, height: 1437 }],
    ['32:9 5120x1440', { x: 0, y: 0, width: 5120, height: 1440 }, { x: 1280, y: 0, width: 2560, height: 1440 }],
    [
      '32:9 on a secondary monitor',
      { x: -5120, y: 200, width: 5120, height: 1440 },
      { x: -3840, y: 200, width: 2560, height: 1440 },
    ],
    [
      'windowed 1068x600 + frame',
      { x: 300, y: 100, width: 1084, height: 639 },
      { x: 300, y: 100, width: 1084, height: 639 },
    ],
  ])('%s', (_name, rect, expected) => {
    expect(gamePlayRect(rect)).toEqual(expected);
  });
});

describe('useGameState rect', () => {
  it('anchors to the pillarboxed 16:9 play area of a fullscreen game on an ultrawide monitor', async () => {
    state.diabloRect = { x: 0, y: 0, width: 3440, height: 1440 };
    const { result } = await renderGameState();
    expect(result.current.gameRect).toEqual({ x: 440, y: 0, width: 2560, height: 1440 });
  });

  it('keeps the whole window on a 16:9 monitor', async () => {
    state.diabloRect = { x: 0, y: 0, width: 1920, height: 1080 };
    const { result } = await renderGameState();
    expect(result.current.gameRect).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  });
});
