import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exists, mkdir, readTextFile, writeTextFile } from '@/lib/browser-fs';
import {
  createHistorySaver,
  dismissTrade,
  DUPLICATE_WINDOW_MS,
  EMPTY_HISTORY,
  findPerson,
  forgetPerson,
  isOpenTrade,
  loadWhisperHistory,
  markRead,
  MAX_MESSAGES_PER_PERSON,
  accountOf,
  nameAliases,
  normalizeName,
  OPEN_TRADE_MS,
  parseHistory,
  pruneHistory,
  recordCopiedWhisper,
  recordTrade,
  recordWhisper,
  RETENTION_MS,
  SAVE_DEBOUNCE_MS,
  saveWhisperHistory,
  unreadWhispers,
  WHISPER_HISTORY_FILENAME,
  whisperCommand,
  whisperTarget,
  type TradeMessageEvent,
  type WhisperEvent,
  type WhisperHistory,
} from './whisper-history';

vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(),
  mkdir: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

const T0 = Date.parse('2026-10-18T12:00:00Z');

const tradeFromBob: TradeMessageEvent = {
  isIncoming: true,
  playerName: 'Bob',
  accountName: 'Bob',
  characterName: 'BobSorc',
  message: "Hi, I'm interested in your Shako listed for 2 ist",
  itemName: 'Shako',
  price: '2 ist',
};
const whisper = (from: string, message: string, over: Partial<WhisperEvent> = {}): WhisperEvent => ({
  isTrade: false,
  from,
  message,
  isJoin: false,
  isIncoming: true,
  ...over,
});
const texts = (history: WhisperHistory, key: string) =>
  history.people[key]?.messages.map((m) => `${m.isIncoming ? '<' : '>'} ${m.message}`);

describe('normalizeName and findPerson', () => {
  it('ignores case, surrounding spaces and the account "*"', () => {
    expect(normalizeName('  *BoB ')).toBe('bob');
    expect(normalizeName(undefined)).toBe('');
  });

  it('matches by account, character or player name, but never on empty names', () => {
    const history = recordTrade(EMPTY_HISTORY, tradeFromBob, T0);
    expect(findPerson(history, ['bobsorc'])?.key).toBe('bob');
    expect(findPerson(history, [' *BOB'])?.key).toBe('bob');
    expect(findPerson(history, ['', undefined, '  '])).toBeUndefined();
  });

  it('nameAliases expands a legacy "character*account" into the whole, the character and the account', () => {
    expect(nameAliases('frostwind*tharok')).toEqual(['frostwind*tharok', 'frostwind', 'tharok']);
    expect(nameAliases('*tharok')).toEqual(['tharok']);
    expect(nameAliases('plainname')).toEqual(['plainname']);
    expect(nameAliases('')).toEqual([]);
  });

  it('finds a legacy "character*account" person by either half (so new whispers merge in)', () => {
    const legacy = {
      key: 'frostwind*tharok',
      accountName: undefined,
      characterName: undefined,
      playerName: 'frostwind*tharok',
      messages: [],
      trades: [],
      readAt: 0,
    };
    const history: WhisperHistory = { people: { 'frostwind*tharok': legacy } };
    expect(findPerson(history, ['tharok'])?.key).toBe('frostwind*tharok');
    expect(findPerson(history, ['frostwind'])?.key).toBe('frostwind*tharok');
  });

  it('accountOf is the account half of a legacy name, else the name without its "*"', () => {
    expect(accountOf('frostwind*tharok')).toBe('tharok');
    expect(accountOf(' *Tharok ')).toBe('Tharok');
    expect(accountOf('quietvale')).toBe('quietvale');
    expect(accountOf('odd*')).toBe('odd');
  });

  it('whispers a legacy "character*account" sender at their account', () => {
    expect(whisperTarget({ playerName: 'frostwind*tharok' })).toBe('tharok');
    expect(whisperTarget({ accountName: 'Bob', playerName: 'Bob' })).toBe('Bob');
  });

  // #148: accepting an offer copied `/w *frostwind*tharok …` ("user is not online")
  it('copies a whisper with exactly one "*" before the account', () => {
    const accept = 'Your offer has been accepted. Game: shako1////pw';
    expect(whisperCommand(whisperTarget({ playerName: 'frostwind*tharok' }), accept)).toBe(
      '/w *tharok Your offer has been accepted. Game: shako1////pw',
    );
    expect(whisperCommand('frostwind*tharok', accept)).toBe(
      '/w *tharok Your offer has been accepted. Game: shako1////pw',
    );
    expect(whisperCommand(whisperTarget({ accountName: 'tharok', playerName: 'tharok' }), 'yes')).toBe(
      '/w *tharok yes',
    );
    expect(whisperCommand('tharok', 'yes')).toBe('/w *tharok yes');
    expect(whisperCommand('*tharok', 'yes')).toBe('/w *tharok yes');
  });
});

describe('recordTrade / recordWhisper', () => {
  it('keeps a trade whisper as a message and a trade, and drops its whisper-received echo within 2s', () => {
    let history = recordTrade(EMPTY_HISTORY, tradeFromBob, T0);
    history = recordWhisper(history, whisper('Bob', tradeFromBob.message, { isTrade: true }), T0 + 10);
    const bob = history.people.bob;
    expect(bob).toMatchObject({ accountName: 'Bob', characterName: 'BobSorc', playerName: 'Bob' });
    expect(texts(history, 'bob')).toEqual([`< ${tradeFromBob.message}`]);
    expect(bob.trades).toEqual([expect.objectContaining({ isIncoming: true, itemName: 'Shako', price: '2 ist' })]);
  });

  it('records the same text again after the dedupe window, and in the other direction at once', () => {
    let history = recordWhisper(EMPTY_HISTORY, whisper('Bob', 'inv'), T0);
    history = recordWhisper(history, whisper('Bob', 'inv', { isIncoming: false }), T0 + 1);
    history = recordWhisper(history, whisper('Bob', 'inv', { isIncoming: false }), T0 + 2);
    history = recordWhisper(history, whisper('Bob', 'inv', { isIncoming: false }), T0 + 2 + DUPLICATE_WINDOW_MS);
    expect(texts(history, 'bob')).toEqual(['< inv', '> inv', '> inv']);
  });

  it('keeps every whisper per person (not only for trades) and skips joins', () => {
    let history = recordWhisper(EMPTY_HISTORY, whisper('Carl', 'hey'), T0);
    history = recordWhisper(history, whisper('Carl', 'Carl joined', { isJoin: true }), T0 + 5000);
    history = recordWhisper(history, whisper('Dana', 'yo', { isIncoming: false }), T0 + 6000);
    expect(texts(history, 'carl')).toEqual(['< hey']);
    expect(texts(history, 'dana')).toEqual(['> yo']);
    expect(history.people.carl.trades).toEqual([]);
  });

  it('ignores a whisper whose sender name is empty', () => {
    expect(recordWhisper(EMPTY_HISTORY, whisper('  ', 'hi'), T0)).toBe(EMPTY_HISTORY);
  });

  it('gives a trade whisper to a new player without an account its own person (empty names never match)', () => {
    let history = recordTrade(EMPTY_HISTORY, { ...tradeFromBob, accountName: undefined, playerName: 'Bob' }, T0);
    history = recordTrade(
      history,
      { ...tradeFromBob, isIncoming: false, accountName: undefined, characterName: 'Zed', playerName: 'Zed' },
      T0 + 5000,
    );
    expect(Object.keys(history.people).sort()).toEqual(['bob', 'zed']);
    expect(history.people.zed.trades).toHaveLength(1);
  });

  it("adds an outgoing trade whisper to a person's open deal instead of opening another", () => {
    let history = recordTrade(EMPTY_HISTORY, tradeFromBob, T0);
    history = recordTrade(history, { ...tradeFromBob, isIncoming: false, message: 'Hi, still have it?' }, T0 + 5000);
    expect(history.people.bob.trades).toHaveLength(1);
    expect(texts(history, 'bob')).toHaveLength(2);
  });

  it('learns the account once a later trade whisper shows it', () => {
    let history = recordWhisper(EMPTY_HISTORY, whisper('BobSorc', 'hi'), T0);
    history = recordTrade(history, tradeFromBob, T0 + 5000);
    expect(Object.keys(history.people)).toEqual(['bobsorc']);
    expect(history.people.bobsorc.accountName).toBe('Bob');
  });
});

describe('copied whispers, trades and read state', () => {
  it('records a copied reply and confirms it when the game log shows it sent', () => {
    let history = recordWhisper(EMPTY_HISTORY, whisper('Bob', 'price?'), T0);
    history = recordCopiedWhisper(history, { accountName: 'Bob', playerName: 'Bob' }, '2 ist', T0 + 1000);
    expect(history.people.bob.messages.at(-1)).toMatchObject({ isIncoming: false, message: '2 ist', copied: true });

    history = recordWhisper(history, whisper('Bob', '2 ist', { isIncoming: false }), T0 + 9000);
    expect(texts(history, 'bob')).toEqual(['< price?', '> 2 ist']);
    expect(history.people.bob.messages.at(-1)!.copied).toBeUndefined();
  });

  it('creates the person for a copied whisper to someone new', () => {
    const history = recordCopiedWhisper(EMPTY_HISTORY, { accountName: 'NewGuy', playerName: 'NewGuy' }, 'hi', T0);
    expect(history.people.newguy).toMatchObject({ accountName: 'NewGuy', playerName: 'NewGuy' });
  });

  it('dismisses trades and keeps them open for a day', () => {
    let history = recordTrade(EMPTY_HISTORY, tradeFromBob, T0);
    const [trade] = history.people.bob.trades;
    expect(isOpenTrade(trade, T0 + OPEN_TRADE_MS - 1)).toBe(true);
    expect(isOpenTrade(trade, T0 + OPEN_TRADE_MS)).toBe(false);
    history = dismissTrade(history, 'bob', trade.id);
    expect(isOpenTrade(history.people.bob.trades[0], T0)).toBe(false);
  });

  it('counts incoming whispers after readAt as unread and marks them read', () => {
    let history = recordWhisper(EMPTY_HISTORY, whisper('Bob', 'a'), T0);
    history = recordWhisper(history, whisper('Bob', 'b'), T0 + 5000);
    history = recordWhisper(history, whisper('Bob', 'mine', { isIncoming: false }), T0 + 9000);
    expect(unreadWhispers(history.people.bob)).toBe(2);
    history = markRead(history, ['bob', 'nobody']);
    expect(unreadWhispers(history.people.bob)).toBe(0);
    expect(markRead(history, ['bob'])).toBe(history);
  });

  it('forgets a person', () => {
    const history = recordWhisper(EMPTY_HISTORY, whisper('Bob', 'a'), T0);
    expect(forgetPerson(history, 'bob').people).toEqual({});
  });
});

describe('pruning and parsing', () => {
  it(`keeps the newest ${MAX_MESSAGES_PER_PERSON} messages per person and drops what is older than 30 days`, () => {
    let history = EMPTY_HISTORY;
    for (let i = 0; i < MAX_MESSAGES_PER_PERSON + 5; i++)
      history = recordWhisper(history, whisper('Bob', `m${i}`), T0 + i);
    history = recordTrade(history, { ...tradeFromBob, accountName: 'Old', playerName: 'Old' }, T0 - RETENTION_MS - 1);
    const pruned = pruneHistory(history, T0 + 1000);
    expect(pruned.people.bob.messages).toHaveLength(MAX_MESSAGES_PER_PERSON);
    expect(pruned.people.bob.messages[0].message).toBe('m5');
    expect(pruned.people.old).toBeUndefined();
  });

  it('round-trips through JSON and skips malformed people', () => {
    const history = recordTrade(EMPTY_HISTORY, tradeFromBob, T0);
    const text = JSON.stringify({ people: { ...history.people, broken: { key: 'broken' } } });
    expect(parseHistory(text)).toEqual(history);
    expect(parseHistory('not json')).toEqual(EMPTY_HISTORY);
    expect(parseHistory('{"people": 3}')).toEqual(EMPTY_HISTORY);
  });

  it('keeps a person whose trade whisper had no item or price (the watcher sends null)', () => {
    const history = recordTrade(EMPTY_HISTORY, { ...tradeFromBob, itemName: null, price: null }, T0);
    const loaded = parseHistory(JSON.stringify(history));
    expect(loaded.people.bob?.trades).toHaveLength(1);
    expect(loaded.people.bob.trades[0]).not.toHaveProperty('price', null);

    // A file saved with explicit nulls (before the fix) still loads.
    const legacy = JSON.parse(JSON.stringify(history));
    legacy.people.bob.trades[0].price = null;
    legacy.people.bob.trades[0].itemName = null;
    expect(parseHistory(JSON.stringify(legacy)).people.bob?.trades).toHaveLength(1);
  });
});

describe('persistence', () => {
  beforeEach(() => {
    vi.mocked(exists).mockReset();
    vi.mocked(readTextFile).mockReset();
    vi.mocked(writeTextFile).mockReset();
    vi.mocked(mkdir).mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads whisper-history.json from the app config dir, pruned', async () => {
    const old = recordWhisper(EMPTY_HISTORY, whisper('Old', 'ancient'), T0 - RETENTION_MS - 1);
    const saved = recordWhisper(old, whisper('Bob', 'hi'), T0);
    vi.mocked(exists).mockResolvedValue(true);
    vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(saved));
    const loaded = await loadWhisperHistory(T0);
    expect(readTextFile).toHaveBeenCalledWith(WHISPER_HISTORY_FILENAME, { baseDir: 13 });
    expect(Object.keys(loaded.people)).toEqual(['bob']);
  });

  it('loads an empty history when there is no file or it cannot be read', async () => {
    vi.mocked(exists).mockResolvedValue(false);
    expect(await loadWhisperHistory(T0)).toEqual(EMPTY_HISTORY);
    vi.mocked(exists).mockRejectedValue(new Error('denied'));
    expect(await loadWhisperHistory(T0)).toEqual(EMPTY_HISTORY);
  });

  it('saves pruned JSON, creating the config dir when missing', async () => {
    vi.mocked(exists).mockResolvedValue(false);
    const history = recordWhisper(EMPTY_HISTORY, whisper('Bob', 'hi'), T0);
    await saveWhisperHistory(history, T0);
    expect(mkdir).toHaveBeenCalledWith('', { baseDir: 13, recursive: true });
    const [file, json, options] = vi.mocked(writeTextFile).mock.calls[0];
    expect([file, options]).toEqual([WHISPER_HISTORY_FILENAME, { baseDir: 13 }]);
    expect(parseHistory(json)).toEqual(history);
  });

  it('debounces saves to the last history and flushes a pending one', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => {});
    const saver = createHistorySaver(save);
    const a = recordWhisper(EMPTY_HISTORY, whisper('Bob', 'a'), T0);
    const b = recordWhisper(a, whisper('Bob', 'b'), T0 + 5000);
    saver.schedule(a);
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS - 1);
    saver.schedule(b);
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS - 1);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save.mock.calls).toEqual([[b]]);

    saver.schedule(a);
    await saver.flush();
    expect(save.mock.calls).toEqual([[b], [a]]);
    vi.advanceTimersByTime(SAVE_DEBOUNCE_MS);
    await saver.flush();
    expect(save).toHaveBeenCalledTimes(2);
  });
});
