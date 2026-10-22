/**
 * Persisted in-game whisper history (whisper-history.json in the app config dir; localStorage in a browser).
 *
 * One entry per person, keyed by their normalized account name (or the player/character name the chat log
 * gave when it showed no account). Every whisper to or from them is a message; "Hi, I'm interested in your…"
 * trade whispers are also kept as trades, which chat pins in the person's thread until dismissed. All
 * updates are pure functions on `WhisperHistory`; `useWhisperHistory` owns the state and the chat watcher
 * listeners.
 */
import { z } from 'zod';
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@/lib/browser-fs';

export const WHISPER_HISTORY_FILENAME = 'whisper-history.json';
const HISTORY_DIR = BaseDirectory.AppConfig;

/** Newest messages kept per person. */
export const MAX_MESSAGES_PER_PERSON = 200;
/** Messages and trades older than this are dropped. */
export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
/** A message with the same direction and text as the person's previous one within this window is an echo. */
export const DUPLICATE_WINDOW_MS = 2000;
/** Trades stay pinned (and count on the offers badge) for this long unless dismissed. */
export const OPEN_TRADE_MS = 24 * 60 * 60 * 1000;
/** Changes are written to disk once they stop for this long. */
export const SAVE_DEBOUNCE_MS = 1000;

/** `trade-message` from the Rust chat watcher (a "Hi, I'm interested in your…" whisper); Rust `None` arrives as null. */
export interface TradeMessageEvent {
  isIncoming: boolean;
  playerName: string;
  accountName?: string | null;
  characterName?: string | null;
  message: string;
  itemName?: string | null;
  price?: string | null;
}

/** `whisper-received` from the Rust chat watcher; `from` is the account name when the log shows one. */
export interface WhisperEvent {
  isTrade: boolean;
  from: string;
  message: string;
  itemName?: string;
  isJoin: boolean;
  isIncoming: boolean;
}

export interface WhisperMessage {
  id: string;
  isIncoming: boolean;
  message: string;
  /** Epoch ms. */
  timestamp: number;
  /** Sent from the overlay (copied as a /w command) and not seen in the game's chat log yet. */
  copied?: boolean;
}

export interface WhisperTrade {
  id: string;
  /** Incoming: they want to buy from you (selling). Outgoing: you asked them (buying). */
  isIncoming: boolean;
  message: string;
  itemName?: string;
  price?: string;
  timestamp: number;
  dismissed?: boolean;
}

export interface WhisperPerson {
  /** normalizeName(account) || normalizeName(player/character name). */
  key: string;
  accountName?: string;
  characterName?: string;
  /** Display name: the account name when known, else the name the log showed. */
  playerName: string;
  /** Oldest first. */
  messages: WhisperMessage[];
  /** Oldest first. */
  trades: WhisperTrade[];
  /** Incoming messages after this (epoch ms) are unread. */
  readAt: number;
}

export interface WhisperHistory {
  people: Record<string, WhisperPerson>;
}

export const EMPTY_HISTORY: WhisperHistory = { people: {} };

/** Case-insensitive, ignoring surrounding spaces and the "*" account prefix. */
export const normalizeName = (name: string | null | undefined) =>
  (name ?? '').trim().replace(/^\*/, '').trim().toLowerCase();

let idSeq = 0;
const nextId = (now: number) => `${now.toString(36)}-${(idSeq++).toString(36)}`;

/** The person any of `names` refers to (empty names never match). */
export function findPerson(history: WhisperHistory, names: readonly (string | null | undefined)[]) {
  const wanted = new Set(names.map(normalizeName).filter(Boolean));
  if (wanted.size === 0) return undefined;
  return Object.values(history.people).find((person) =>
    [person.key, person.accountName, person.characterName, person.playerName].some((name) => {
      const normalized = normalizeName(name);
      return normalized !== '' && wanted.has(normalized);
    }),
  );
}

/** Whom `/w *<target>` reaches. */
export const whisperTarget = (person: Pick<WhisperPerson, 'accountName' | 'playerName'>) =>
  person.accountName || person.playerName;

export const isOpenTrade = (trade: WhisperTrade, now: number) =>
  !trade.dismissed && now - trade.timestamp < OPEN_TRADE_MS;

export const unreadWhispers = (person: WhisperPerson) =>
  person.messages.filter((m) => m.isIncoming && m.timestamp > person.readAt).length;

const withPerson = (history: WhisperHistory, person: WhisperPerson): WhisperHistory => ({
  people: { ...history.people, [person.key]: person },
});

/** The person `names` refers to, created (unsaved) if new; undefined when every name is empty. */
function personFor(
  history: WhisperHistory,
  names: { accountName?: string; characterName?: string; playerName: string },
): WhisperPerson | undefined {
  const existing = findPerson(history, [names.accountName, names.characterName, names.playerName]);
  if (existing) {
    // Learn the account/character once the log shows them
    return {
      ...existing,
      accountName: existing.accountName || names.accountName?.trim() || undefined,
      characterName: existing.characterName || names.characterName?.trim() || undefined,
    };
  }
  const key = normalizeName(names.accountName) || normalizeName(names.playerName) || normalizeName(names.characterName);
  if (!key) return undefined;
  return {
    key,
    accountName: names.accountName?.trim() || undefined,
    characterName: names.characterName?.trim() || undefined,
    playerName: (names.accountName || names.playerName || names.characterName || '').trim().replace(/^\*/, ''),
    messages: [],
    trades: [],
    readAt: 0,
  };
}

/**
 * Appends a whisper (returns `person` itself when nothing changed). An outgoing one matching a message copied
 * from the overlay confirms that message instead (it was sent in game). An echo — same direction and text as
 * the previous message within DUPLICATE_WINDOW_MS — is dropped.
 */
function appendMessage(person: WhisperPerson, isIncoming: boolean, message: string, now: number): WhisperPerson {
  for (let i = person.messages.length - 1; !isIncoming && i >= 0; i--) {
    if (person.messages[i].copied && person.messages[i].message === message) {
      const messages = [...person.messages];
      messages[i] = { ...messages[i], copied: undefined };
      return { ...person, messages };
    }
  }
  const last = person.messages.at(-1);
  if (
    last &&
    last.isIncoming === isIncoming &&
    last.message === message &&
    now - last.timestamp < DUPLICATE_WINDOW_MS
  ) {
    return person;
  }
  return {
    ...person,
    messages: [...person.messages, { id: nextId(now), isIncoming, message, timestamp: now }],
  };
}

/**
 * A trade whisper: a message plus a trade, except that an outgoing trade whisper to someone who already has
 * an open trade only adds the message (it belongs to that deal).
 */
export function recordTrade(history: WhisperHistory, event: TradeMessageEvent, now: number): WhisperHistory {
  const person = personFor(history, event);
  if (!person) return history;
  const withMessage = appendMessage(person, event.isIncoming, event.message, now);
  if (withMessage === person) return history;
  if (!event.isIncoming && person.trades.some((t) => isOpenTrade(t, now))) return withPerson(history, withMessage);
  const trade: WhisperTrade = {
    id: nextId(now),
    isIncoming: event.isIncoming,
    message: event.message,
    itemName: event.itemName ?? undefined,
    price: event.price ?? undefined,
    timestamp: now,
  };
  return withPerson(history, { ...withMessage, trades: [...withMessage.trades, trade] });
}

/** Any whisper (trade whispers arrive here too, right after their trade-message). Joins are skipped. */
export function recordWhisper(history: WhisperHistory, event: WhisperEvent, now: number): WhisperHistory {
  if (event.isJoin) return history;
  const person = personFor(history, { playerName: event.from });
  if (!person) return history;
  const next = appendMessage(person, event.isIncoming, event.message, now);
  return next === person && history.people[person.key] ? history : withPerson(history, next);
}

/** A whisper sent from the overlay (copied as `/w *target text`), shown until the game log confirms it. */
export function recordCopiedWhisper(
  history: WhisperHistory,
  target: { accountName?: string; playerName: string },
  message: string,
  now: number,
): WhisperHistory {
  const person = personFor(history, target);
  if (!person) return history;
  const copied: WhisperMessage = { id: nextId(now), isIncoming: false, message, timestamp: now, copied: true };
  return withPerson(history, { ...person, messages: [...person.messages, copied] });
}

export function dismissTrade(history: WhisperHistory, key: string, tradeId: string): WhisperHistory {
  const person = history.people[key];
  if (!person) return history;
  return withPerson(history, {
    ...person,
    trades: person.trades.map((t) => (t.id === tradeId ? { ...t, dismissed: true } : t)),
  });
}

/** Marks everyone in `keys` read up to their newest message. */
export function markRead(history: WhisperHistory, keys: readonly string[]): WhisperHistory {
  let next = history;
  for (const key of keys) {
    const person = next.people[key];
    const newest = person?.messages.at(-1)?.timestamp;
    if (person && newest !== undefined && newest > person.readAt)
      next = withPerson(next, { ...person, readAt: newest });
  }
  return next;
}

export function forgetPerson(history: WhisperHistory, key: string): WhisperHistory {
  if (!history.people[key]) return history;
  const people = { ...history.people };
  delete people[key];
  return { people };
}

/** Drops messages/trades older than RETENTION_MS, keeps the newest MAX_MESSAGES_PER_PERSON, drops empty people. */
export function pruneHistory(history: WhisperHistory, now: number): WhisperHistory {
  const cutoff = now - RETENTION_MS;
  const people: Record<string, WhisperPerson> = {};
  for (const person of Object.values(history.people)) {
    const messages = person.messages.filter((m) => m.timestamp >= cutoff).slice(-MAX_MESSAGES_PER_PERSON);
    const trades = person.trades.filter((t) => t.timestamp >= cutoff);
    if (messages.length > 0 || trades.length > 0) people[person.key] = { ...person, messages, trades };
  }
  return { people };
}

const MessageSchema = z.object({
  id: z.string(),
  isIncoming: z.boolean(),
  message: z.string(),
  timestamp: z.number(),
  copied: z.literal(true).optional(),
});
const TradeSchema = z.object({
  id: z.string(),
  isIncoming: z.boolean(),
  message: z.string(),
  // Nullish: files written before recordTrade mapped the watcher's null to undefined.
  itemName: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  price: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  timestamp: z.number(),
  dismissed: z.literal(true).optional(),
});
const PersonSchema = z.object({
  key: z.string(),
  accountName: z.string().optional(),
  characterName: z.string().optional(),
  playerName: z.string().min(1),
  messages: z.array(MessageSchema),
  trades: z.array(TradeSchema),
  readAt: z.number(),
});
const FileSchema = z.object({ people: z.record(z.string(), z.unknown()) });

/** Reads a saved file; malformed people are skipped (a broken file yields an empty history). */
export function parseHistory(text: string): WhisperHistory {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return EMPTY_HISTORY;
  }
  const file = FileSchema.safeParse(raw);
  if (!file.success) return EMPTY_HISTORY;
  const people: Record<string, WhisperPerson> = {};
  for (const value of Object.values(file.data.people)) {
    const parsed = PersonSchema.safeParse(value);
    if (!parsed.success) continue;
    // The schema is this shape (zod infers optional fields when strict mode is off)
    const person = parsed.data as WhisperPerson;
    const key = normalizeName(person.key);
    if (!key) continue;
    people[key] = {
      ...person,
      key,
      messages: person.messages.sort((a, b) => a.timestamp - b.timestamp),
      trades: person.trades.sort((a, b) => a.timestamp - b.timestamp),
    };
  }
  return { people };
}

/** The saved history, pruned; empty when there is none yet or it can't be read. */
export async function loadWhisperHistory(now: number): Promise<WhisperHistory> {
  try {
    if (!(await exists(WHISPER_HISTORY_FILENAME, { baseDir: HISTORY_DIR }))) return EMPTY_HISTORY;
    return pruneHistory(parseHistory(await readTextFile(WHISPER_HISTORY_FILENAME, { baseDir: HISTORY_DIR })), now);
  } catch (error) {
    console.warn('Failed to load whisper history:', error);
    return EMPTY_HISTORY;
  }
}

export async function saveWhisperHistory(history: WhisperHistory, now: number): Promise<void> {
  try {
    if (!(await exists('', { baseDir: HISTORY_DIR }))) await mkdir('', { baseDir: HISTORY_DIR, recursive: true });
    await writeTextFile(WHISPER_HISTORY_FILENAME, JSON.stringify(pruneHistory(history, now)), {
      baseDir: HISTORY_DIR,
    });
  } catch (error) {
    console.error('Failed to save whisper history:', error);
  }
}

export interface HistorySaver {
  /** (Re)starts the SAVE_DEBOUNCE_MS timer for `history`. */
  schedule: (history: WhisperHistory) => void;
  /** Writes a pending save now. */
  flush: () => Promise<void>;
}

export function createHistorySaver(save: (history: WhisperHistory) => Promise<void>): HistorySaver {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: WhisperHistory | undefined;
  const flush = () => {
    clearTimeout(timer);
    const history = pending;
    pending = undefined;
    return history ? save(history) : Promise.resolve();
  };
  return {
    schedule(history) {
      pending = history;
      clearTimeout(timer);
      timer = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
    },
    flush,
  };
}
