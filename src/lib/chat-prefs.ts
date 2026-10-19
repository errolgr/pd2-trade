/**
 * Client-only chat thread preferences: pinned, muted and archived threads (chat-prefs.json in the app config
 * dir; localStorage in a browser). The PD2 website keeps no such state.
 *
 * A thread's preference is stored under every id it is known by (its thread id, conversation id, `user:<id>`
 * and `whisper:<name>` for each name of its whisper senders, see `threadAliases`), so it follows the thread
 * when it merges or splits, and notifications can look it up by a conversation id or a whisper sender's name.
 *
 * One module-level store (like the overlay badges): the chat panel changes it, socket and whisper
 * notifications read it.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { z } from 'zod';
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@/lib/browser-fs';

export const CHAT_PREFS_FILENAME = 'chat-prefs.json';
const PREFS_DIR = BaseDirectory.AppConfig;

export interface ThreadPrefs {
  /** Epoch ms it was pinned at. */
  pinnedAt?: number;
  muted?: boolean;
  /** Epoch ms it was archived at; a message after this un-archives it. */
  archivedAt?: number;
}

export interface ChatPrefs {
  threads: Record<string, ThreadPrefs>;
}

export const EMPTY_PREFS: ChatPrefs = { threads: {} };

/** The preferences of a thread known by `ids`, merged. */
export function prefsFor(prefs: ChatPrefs, ids: readonly string[]): ThreadPrefs {
  const merged: ThreadPrefs = {};
  for (const id of ids) {
    const saved = prefs.threads[id];
    if (!saved) continue;
    if (saved.pinnedAt !== undefined) merged.pinnedAt = Math.max(merged.pinnedAt ?? 0, saved.pinnedAt);
    if (saved.muted) merged.muted = true;
    if (saved.archivedAt !== undefined) merged.archivedAt = Math.max(merged.archivedAt ?? 0, saved.archivedAt);
  }
  return merged;
}

/** Archived, unless the thread's latest message (epoch ms) came after it was archived. */
export const isArchived = (prefs: ThreadPrefs, latestAt: number) =>
  prefs.archivedAt !== undefined && latestAt <= prefs.archivedAt;

/** Applies `patch` under every id of a thread; an undefined or false field clears that preference. */
export function setThreadPrefs(prefs: ChatPrefs, ids: readonly string[], patch: ThreadPrefs): ChatPrefs {
  const threads = { ...prefs.threads };
  for (const id of new Set(ids)) {
    const next: ThreadPrefs = { ...threads[id], ...patch };
    if (next.pinnedAt === undefined) delete next.pinnedAt;
    if (!next.muted) delete next.muted;
    if (next.archivedAt === undefined) delete next.archivedAt;
    if (Object.keys(next).length === 0) delete threads[id];
    else threads[id] = next;
  }
  return { threads };
}

const ThreadPrefsSchema = z.object({
  pinnedAt: z.number().optional(),
  muted: z.boolean().optional(),
  archivedAt: z.number().optional(),
});
const FileSchema = z.object({ threads: z.record(z.string(), z.unknown()) });

/** Reads a saved file; malformed entries are skipped (a broken file yields no preferences). */
export function parseChatPrefs(text: string): ChatPrefs {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return EMPTY_PREFS;
  }
  const file = FileSchema.safeParse(raw);
  if (!file.success) return EMPTY_PREFS;
  let prefs = EMPTY_PREFS;
  for (const [id, value] of Object.entries(file.data.threads)) {
    const parsed = ThreadPrefsSchema.safeParse(value);
    if (parsed.success) prefs = setThreadPrefs(prefs, [id], parsed.data);
  }
  return prefs;
}

async function readPrefsFile(): Promise<ChatPrefs> {
  try {
    if (!(await exists(CHAT_PREFS_FILENAME, { baseDir: PREFS_DIR }))) return EMPTY_PREFS;
    return parseChatPrefs(await readTextFile(CHAT_PREFS_FILENAME, { baseDir: PREFS_DIR }));
  } catch (error) {
    console.warn('Failed to load chat preferences:', error);
    return EMPTY_PREFS;
  }
}

async function writePrefsFile(prefs: ChatPrefs): Promise<void> {
  try {
    if (!(await exists('', { baseDir: PREFS_DIR }))) await mkdir('', { baseDir: PREFS_DIR, recursive: true });
    await writeTextFile(CHAT_PREFS_FILENAME, JSON.stringify(prefs), { baseDir: PREFS_DIR });
  } catch (error) {
    console.error('Failed to save chat preferences:', error);
  }
}

let current: ChatPrefs = EMPTY_PREFS;
let loadState: 'idle' | 'loading' | 'loaded' = 'idle';
/** Changes made before the file was read, replayed over it. */
let early: ((prefs: ChatPrefs) => ChatPrefs)[] = [];
/** Writes in order, each with the then-current preferences. */
let writes: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

/** Makes `next` current, writes it (after any earlier write) when `persist`, and notifies subscribers. */
function publish(next: ChatPrefs, persist: boolean) {
  current = next;
  if (persist) writes = writes.then(() => writePrefsFile(next));
  listeners.forEach((listener) => listener());
}

/** Reads chat-prefs.json once (later calls do nothing). */
export function loadChatPrefs(): void {
  if (loadState !== 'idle') return;
  loadState = 'loading';
  void readPrefsFile().then((saved) => {
    const changes = early;
    early = [];
    loadState = 'loaded';
    publish(
      changes.reduce((prefs, change) => change(prefs), saved),
      changes.length > 0,
    );
  });
}

/** The preferences right now (for callbacks; components use `useChatPrefs`). */
export const getChatPrefs = (): ChatPrefs => current;

/** Changes the preferences and saves them. */
export function changeChatPrefs(change: (prefs: ChatPrefs) => ChatPrefs): void {
  const next = change(current);
  if (next === current) return;
  if (loadState !== 'loaded') early.push(change);
  publish(next, loadState === 'loaded');
}

/** Muted under any of `ids` (no sound, no toast). */
export const isThreadMuted = (ids: readonly string[]) => !!prefsFor(current, ids).muted;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The preferences, re-rendering on every change; loads the saved file on first use. */
export function useChatPrefs(): ChatPrefs {
  useEffect(loadChatPrefs, []);
  return useSyncExternalStore(subscribe, getChatPrefs);
}

/** Tests: forget the in-memory preferences; the next load reads the file again. */
export function resetChatPrefs(): void {
  current = EMPTY_PREFS;
  loadState = 'idle';
  early = [];
  writes = Promise.resolve();
}
