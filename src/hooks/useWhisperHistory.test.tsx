// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isTauri } from '@tauri-apps/api/core';
import { exists, readTextFile, writeTextFile } from '@/lib/browser-fs';
import { setBadgeCount } from '@/overlay';
import { OPEN_TRADE_MS, parseHistory, SAVE_DEBOUNCE_MS, WHISPER_HISTORY_FILENAME } from '@/lib/whisper-history';
import { changeChatPrefs, resetChatPrefs } from '@/lib/chat-prefs';
import { markOffersSeen } from '@/pages/chat/lib/offers-seen';
import { useWhisperHistory, WhisperHistoryProvider } from './useWhisperHistory';

const bus = vi.hoisted(() => {
  const handlers = new Map<string, Set<(event: { payload: unknown }) => unknown>>();
  return {
    handlers,
    fire(event: string, payload: unknown) {
      for (const handler of handlers.get(event) ?? []) handler({ payload });
    },
  };
});

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => true) }));
vi.mock('@/overlay', () => ({ setBadgeCount: vi.fn() }));
vi.mock('@/lib/browser-events', () => ({
  listen: vi.fn(async (event: string, handler: (event: { payload: unknown }) => unknown) => {
    if (!bus.handlers.has(event)) bus.handlers.set(event, new Set());
    bus.handlers.get(event)!.add(handler);
    return () => bus.handlers.get(event)!.delete(handler);
  }),
}));
vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(),
  mkdir: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

const NOW = Date.parse('2026-10-18T12:00:00Z');
const tradeFromBob = {
  isIncoming: true,
  playerName: 'Bob',
  accountName: 'Bob',
  characterName: 'BobSorc',
  message: "Hi, I'm interested in your Shako listed for 2 ist",
  itemName: 'Shako',
  price: '2 ist',
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WhisperHistoryProvider>{children}</WhisperHistoryProvider>
);

async function renderHistory() {
  const hook = renderHook(() => useWhisperHistory(), { wrapper });
  // Load, then the async listener registration
  await act(async () => {});
  await act(async () => {});
  return hook;
}

const fire = (event: string, payload: unknown) => act(() => bus.fire(event, payload));
const savedFiles = () => vi.mocked(writeTextFile).mock.calls.filter(([file]) => file === WHISPER_HISTORY_FILENAME);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  bus.handlers.clear();
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(exists).mockReset().mockResolvedValue(true);
  vi.mocked(readTextFile)
    .mockReset()
    .mockResolvedValue(
      JSON.stringify({
        people: {
          carl: {
            key: 'carl',
            playerName: 'Carl',
            messages: [{ id: 'm1', isIncoming: true, message: 'saved earlier', timestamp: NOW - 60_000 }],
            trades: [],
            readAt: 0,
          },
        },
      }),
    );
  vi.mocked(writeTextFile).mockReset().mockResolvedValue(undefined);
  vi.mocked(setBadgeCount).mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('WhisperHistoryProvider', () => {
  it('loads the saved history, then records trade and whisper events with the echo dropped', async () => {
    const { result } = await renderHistory();
    expect(result.current.loaded).toBe(true);
    expect(result.current.people.carl.messages.map((m) => m.message)).toEqual(['saved earlier']);

    fire('trade-message', tradeFromBob);
    fire('whisper-received', {
      isTrade: true,
      from: 'Bob',
      message: tradeFromBob.message,
      isJoin: false,
      isIncoming: true,
    });
    fire('whisper-received', { isTrade: false, from: 'Bob', message: 'Bob joined', isJoin: true, isIncoming: true });
    expect(result.current.people.bob.messages.map((m) => m.message)).toEqual([tradeFromBob.message]);
    expect(result.current.people.bob.trades).toHaveLength(1);
    expect(vi.mocked(setBadgeCount).mock.calls.at(-1)).toEqual(['whisperTrades', 1]);
  });

  it('does not listen outside Tauri', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    await renderHistory();
    expect(bus.handlers.size).toBe(0);
  });

  it('saves once changes settle, not on load, and flushes a pending save on unmount', async () => {
    const { result, unmount } = await renderHistory();
    await act(async () => vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS * 2));
    expect(savedFiles()).toEqual([]);

    fire('whisper-received', { isTrade: false, from: 'Carl', message: 'one', isJoin: false, isIncoming: true });
    await act(async () => vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS / 2));
    act(() => result.current.recordCopied({ accountName: 'Carl', playerName: 'Carl' }, 'two'));
    await act(async () => vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS - 1));
    expect(savedFiles()).toEqual([]);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(savedFiles()).toHaveLength(1);
    const saved = parseHistory(savedFiles()[0][1]);
    expect(saved.people.carl.messages.map((m) => [m.message, !!m.copied])).toEqual([
      ['saved earlier', false],
      ['one', false],
      ['two', true],
    ]);

    act(() => result.current.dismissTrade('carl', 'none'));
    act(() => result.current.markRead(['carl']));
    unmount();
    await act(async () => {});
    expect(savedFiles()).toHaveLength(2);
    const carl = parseHistory(savedFiles()[1][1]).people.carl;
    expect(carl.readAt).toBe(carl.messages.at(-1)!.timestamp);
  });

  it('keeps its actions stable across changes', async () => {
    const { result } = await renderHistory();
    const first = result.current;
    fire('whisper-received', { isTrade: false, from: 'Carl', message: 'new', isJoin: false, isIncoming: true });
    expect(result.current.people).not.toBe(first.people);
    expect(result.current.markRead).toBe(first.markRead);
    expect(result.current.recordCopied).toBe(first.recordCopied);
    act(() => result.current.forget('carl'));
    expect(result.current.people.carl).toBeUndefined();
  });

  it('drops a trade from the badge once it ages out of the open window, with no other change', async () => {
    await renderHistory();
    fire('trade-message', tradeFromBob);
    expect(vi.mocked(setBadgeCount).mock.calls.at(-1)).toEqual(['whisperTrades', 1]);

    await act(async () => vi.advanceTimersByTimeAsync(OPEN_TRADE_MS - 60_000));
    expect(vi.mocked(setBadgeCount).mock.calls.at(-1)).toEqual(['whisperTrades', 1]);
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(vi.mocked(setBadgeCount).mock.calls.at(-1)).toEqual(['whisperTrades', 0]);
  });

  it('counts only trades received since the offers were last looked at (chat prefs)', async () => {
    resetChatPrefs();
    await renderHistory();
    fire('trade-message', tradeFromBob);
    expect(vi.mocked(setBadgeCount).mock.calls.at(-1)).toEqual(['whisperTrades', 1]);

    act(() => changeChatPrefs((prefs) => markOffersSeen(prefs, Date.now())));
    expect(vi.mocked(setBadgeCount).mock.calls.at(-1)).toEqual(['whisperTrades', 0]);

    await act(async () => vi.advanceTimersByTimeAsync(1000));
    fire('trade-message', { ...tradeFromBob, playerName: 'Zed', accountName: 'Zed', characterName: 'ZedChar' });
    expect(vi.mocked(setBadgeCount).mock.calls.at(-1)).toEqual(['whisperTrades', 1]);
  });
});
