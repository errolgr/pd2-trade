// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emit } from '@tauri-apps/api/event';
import { isTauri } from '@tauri-apps/api/core';
import { useTradeMessages } from './useTradeMessages';

const bus = vi.hoisted(() => {
  const handlers = new Map<string, Set<(event: { payload: unknown }) => unknown>>();
  return {
    handlers,
    async fire(event: string, payload: unknown) {
      await Promise.all([...(handlers.get(event) ?? [])].map((handler) => handler({ payload })));
    },
  };
});

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => true) }));
vi.mock('@tauri-apps/api/event', () => ({
  emit: vi.fn(async () => {}),
  listen: vi.fn(async (event: string, handler: (event: { payload: unknown }) => unknown) => {
    if (!bus.handlers.has(event)) bus.handlers.set(event, new Set());
    bus.handlers.get(event)!.add(handler);
    return () => bus.handlers.get(event)!.delete(handler);
  }),
}));

const NOW = new Date('2026-10-18T12:00:00Z').getTime();

interface TradeEvent {
  isIncoming: boolean;
  playerName: string;
  accountName?: string;
  characterName?: string;
  message: string;
  itemName?: string;
  price?: string;
}

async function renderTrades() {
  const hook = renderHook(() => useTradeMessages());
  // Listener registration is async (three awaited listen calls).
  await act(async () => {});
  return hook;
}

async function fire(event: string, payload: unknown) {
  await act(() => bus.fire(event, payload));
}

const incomingFromBob: TradeEvent = {
  isIncoming: true,
  playerName: 'Bob',
  accountName: 'Bob',
  characterName: 'BobSorc',
  message: "Hi, I'm interested in your Shako listed for 2 ist",
  itemName: 'Shako',
  price: '2 ist',
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.mocked(isTauri).mockReturnValue(true);
  bus.handlers.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useTradeMessages trade-message events', () => {
  it('adds new trades newest-first with the opening message as history', async () => {
    const { result } = await renderTrades();

    await fire('trade-message', incomingFromBob);
    vi.setSystemTime(NOW + 1000);
    await fire('trade-message', { ...incomingFromBob, playerName: 'Carl', accountName: 'Carl', characterName: 'CarlPal' });

    expect(result.current.trades.map((t) => t.playerName)).toEqual(['Carl', 'Bob']);
    const bob = result.current.trades[1];
    expect(bob).toMatchObject({ isIncoming: true, itemName: 'Shako', price: '2 ist', accountName: 'Bob' });
    expect(bob.history.map((h) => [h.isIncoming, h.message])).toEqual([[true, incomingFromBob.message]]);
    expect(new Set(result.current.trades.map((t) => t.id)).size).toBe(2);
  });

  it('appends an outgoing reply to the matching trade (case and * prefix ignored) instead of creating one', async () => {
    const { result } = await renderTrades();
    await fire('trade-message', incomingFromBob);

    await fire('trade-message', {
      isIncoming: false,
      playerName: '*bob',
      accountName: '*BOB',
      characterName: 'other',
      message: 'sure, 2 ist works',
    });

    expect(result.current.trades).toHaveLength(1);
    expect(result.current.trades[0].history.map((h) => [h.isIncoming, h.message])).toEqual([
      [true, incomingFromBob.message],
      [false, 'sure, 2 ist works'],
    ]);
  });

  it('never merges a second incoming trade from the same player into the first', async () => {
    const { result } = await renderTrades();
    await fire('trade-message', incomingFromBob);
    await fire('trade-message', { ...incomingFromBob, itemName: 'Arach', message: 'your Arach listed for 1 ber' });

    expect(result.current.trades.map((t) => t.itemName)).toEqual(['Arach', 'Shako']);
  });

  // BUG: useTradeMessages.tsx:72-77 compares normalized names with `===` even when both sides are
  // missing ('' === ''). chat_watcher.rs sends accountName=None for senders without "(*account)", so an
  // outgoing whisper to a brand-new player is appended to an unrelated trade instead of opening its own.
  it.fails('opens a new trade for an outgoing whisper to an unrelated player when account names are absent', async () => {
    const { result } = await renderTrades();
    await fire('trade-message', { isIncoming: true, playerName: 'Alice', characterName: 'Alice', message: 'wtb' });

    await fire('trade-message', { isIncoming: false, playerName: 'Zed', characterName: 'Zed', message: 'your Shako listed for 2 ist?' });

    expect(result.current.trades.map((t) => t.playerName)).toEqual(['Zed', 'Alice']);
  });
});

describe('useTradeMessages whisper history', () => {
  it('skips the echo of the opening message within 2s but records a repeat after that', async () => {
    const { result } = await renderTrades();
    await fire('trade-message', incomingFromBob);
    const whisper = { isTrade: true, from: 'Bob', message: incomingFromBob.message, isJoin: false, isIncoming: true };

    vi.setSystemTime(NOW + 1999);
    await fire('whisper-received', whisper);
    expect(result.current.trades[0].history).toHaveLength(1);

    vi.setSystemTime(NOW + 2000);
    await fire('whisper-received', whisper);
    expect(result.current.trades[0].history).toHaveLength(2);
  });

  it('records a same-text whisper in the opposite direction', async () => {
    const { result } = await renderTrades();
    await fire('trade-message', incomingFromBob);

    await fire('whisper-received', { isTrade: false, from: 'Bob', message: incomingFromBob.message, isJoin: false, isIncoming: false });

    expect(result.current.trades[0].history.map((h) => h.isIncoming)).toEqual([true, false]);
  });

  it('matches by character name, ignores joins and unrelated senders', async () => {
    const { result } = await renderTrades();
    await fire('trade-message', incomingFromBob);

    await fire('whisper-received', { isTrade: false, from: '*bobsorc', message: 'still there?', isJoin: false, isIncoming: true });
    await fire('whisper-received', { isTrade: false, from: 'Bob', message: 'Bob joined', isJoin: true, isIncoming: true });
    await fire('whisper-received', { isTrade: false, from: 'Stranger', message: 'hi', isJoin: false, isIncoming: true });

    expect(result.current.trades[0].history.map((h) => h.message)).toEqual([incomingFromBob.message, 'still there?']);
  });
});

describe('useTradeMessages removal and counts', () => {
  it('removeTrade drops the trade locally and broadcasts the removal', async () => {
    const { result } = await renderTrades();
    await fire('trade-message', incomingFromBob);
    const id = result.current.trades[0].id;

    act(() => result.current.removeTrade(id));

    expect(result.current.trades).toEqual([]);
    expect(emit).toHaveBeenCalledWith('trade-message-removed', { id });
  });

  it('applies removals broadcast by other windows and ignores unknown ids', async () => {
    const { result } = await renderTrades();
    await fire('trade-message', incomingFromBob);
    await fire('trade-message', { ...incomingFromBob, playerName: 'Carl', accountName: 'Carl', characterName: 'Carl' });
    const [carl, bob] = result.current.trades;

    await fire('trade-message-removed', { id: 'missing' });
    expect(result.current.trades).toEqual([carl, bob]);

    await fire('trade-message-removed', { id: carl.id });
    expect(result.current.trades).toEqual([bob]);
  });

  it('publishes the trade count as it changes, including clearAll', async () => {
    const { result } = await renderTrades();
    await fire('trade-message', incomingFromBob);
    await fire('trade-message', { ...incomingFromBob, playerName: 'Carl', accountName: 'Carl', characterName: 'Carl' });

    act(() => result.current.clearAll());

    expect(result.current.trades).toEqual([]);
    const countPayloads = vi
      .mocked(emit)
      .mock.calls.filter(([event]) => event === 'trade-messages-count-updated')
      .map(([, payload]) => payload);
    expect(countPayloads).toEqual([{ count: 0 }, { count: 1 }, { count: 2 }, { count: 0 }]);
  });

  it('stops receiving events after unmount', async () => {
    const { unmount } = await renderTrades();
    unmount();
    expect([...bus.handlers.values()].every((set) => set.size === 0)).toBe(true);
  });

  it('registers no listeners and emits nothing outside Tauri', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    const { result } = await renderTrades();

    expect(bus.handlers.size).toBe(0);
    act(() => result.current.removeTrade('x'));
    expect(emit).not.toHaveBeenCalled();
  });
});
