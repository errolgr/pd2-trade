// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_BLUR_DEBOUNCE_MS, useGameState } from './game';

const state = vi.hoisted(() => ({
  /** Rust game context (`is_diablo_focused` / `diablo-focus-changed`). */
  inGame: true,
  gameContext: null as ((e: { payload: boolean }) => void) | null,
  /** The overlay window's own focus listener, if the hook registers one. */
  overlayFocus: null as ((e: { payload: boolean }) => void) | null,
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
  invoke: vi.fn(async (command: string) => (command === 'is_diablo_focused' ? state.inGame : null)),
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
