import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exists, readTextFile, writeTextFile } from '@/lib/browser-fs';
import {
  CHAT_PREFS_FILENAME,
  EMPTY_PREFS,
  changeChatPrefs,
  getChatPrefs,
  isArchived,
  isThreadMuted,
  loadChatPrefs,
  parseChatPrefs,
  prefsFor,
  resetChatPrefs,
  setThreadPrefs,
} from './chat-prefs';

vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(async () => false),
  mkdir: vi.fn(async () => {}),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(async () => {}),
}));

/** Lets the file read and writes (promise chains, no timers) settle. */
const flush = () => vi.advanceTimersByTimeAsync(0);
const written = () =>
  vi
    .mocked(writeTextFile)
    .mock.calls.filter(([path]) => path === CHAT_PREFS_FILENAME)
    .map(([, text]) => JSON.parse(String(text)));

beforeEach(() => {
  vi.useFakeTimers();
  resetChatPrefs();
  vi.mocked(writeTextFile).mockClear();
  vi.mocked(readTextFile).mockReset();
  vi.mocked(exists).mockResolvedValue(false);
});

afterEach(() => {
  vi.useRealTimers();
});
describe('thread preferences', () => {
  it('stores a change under every id of the thread and merges them back', () => {
    let prefs = setThreadPrefs(EMPTY_PREFS, ['c1', 'whisper:bob'], { pinnedAt: 5, muted: true });
    prefs = setThreadPrefs(prefs, ['c2'], { archivedAt: 9 });
    expect(prefs.threads).toEqual({
      c1: { pinnedAt: 5, muted: true },
      'whisper:bob': { pinnedAt: 5, muted: true },
      c2: { archivedAt: 9 },
    });
    expect(prefsFor(prefs, ['whisper:bob', 'c2'])).toEqual({ pinnedAt: 5, muted: true, archivedAt: 9 });
  });

  it('clears a preference with undefined or false and drops empty entries', () => {
    let prefs = setThreadPrefs(EMPTY_PREFS, ['c1'], { pinnedAt: 5, muted: true });
    prefs = setThreadPrefs(prefs, ['c1'], { pinnedAt: undefined });
    expect(prefs.threads).toEqual({ c1: { muted: true } });
    prefs = setThreadPrefs(prefs, ['c1'], { muted: false });
    expect(prefs.threads).toEqual({});
  });

  it('counts a thread archived until a message newer than the archive time', () => {
    expect(isArchived({ archivedAt: 100 }, 100)).toBe(true);
    expect(isArchived({ archivedAt: 100 }, 101)).toBe(false);
    expect(isArchived({}, 0)).toBe(false);
  });

  it('parses a saved file, skipping malformed entries', () => {
    const prefs = parseChatPrefs(JSON.stringify({ threads: { c1: { muted: true }, c2: { pinnedAt: 'x' }, c3: 4 } }));
    expect(prefs.threads).toEqual({ c1: { muted: true } });
    expect(parseChatPrefs('not json')).toEqual(EMPTY_PREFS);
    expect(parseChatPrefs('{"threads": 1}')).toEqual(EMPTY_PREFS);
  });
});

describe('chat-prefs store', () => {
  it('loads the saved file once and saves every change', async () => {
    vi.mocked(exists).mockResolvedValue(true);
    vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ threads: { c1: { muted: true } } }));
    loadChatPrefs();
    loadChatPrefs();
    await flush();
    expect(readTextFile).toHaveBeenCalledTimes(1);
    expect(isThreadMuted(['c1'])).toBe(true);

    changeChatPrefs((prefs) => setThreadPrefs(prefs, ['c2'], { pinnedAt: 1 }));
    await flush();
    expect(written()).toEqual([{ threads: { c1: { muted: true }, c2: { pinnedAt: 1 } } }]);
  });

  it('keeps changes made before the file was read, on top of it', async () => {
    const file = Promise.withResolvers<string>();
    vi.mocked(exists).mockResolvedValue(true);
    vi.mocked(readTextFile).mockReturnValue(file.promise);
    loadChatPrefs();
    changeChatPrefs((prefs) => setThreadPrefs(prefs, ['c2'], { muted: true }));
    expect(isThreadMuted(['c2'])).toBe(true);
    expect(written()).toEqual([]);

    file.resolve(JSON.stringify({ threads: { c1: { pinnedAt: 3 } } }));
    await flush();
    expect(getChatPrefs().threads).toEqual({ c1: { pinnedAt: 3 }, c2: { muted: true } });
    expect(written()).toEqual([{ threads: { c1: { pinnedAt: 3 }, c2: { muted: true } } }]);
  });
});
