/**
 * The notification log: what happened to the user (whispers, trade whispers, chat messages, offers, joins, market
 * watch alerts, Horadric Sim results, net worth moves, updates, errors), whether or not a toast showed it. Feedback
 * on the user's own actions ("Whisper copied") is never logged.
 *
 * An entry is *missed* when nobody saw it: its toast was suppressed (Diablo focused, popups or that type off) or
 * timed out without the pointer ever on it. Missed entries put the log's icon on the chat dock (none = no icon);
 * opening the log marks everything seen. Joins are logged but never missed (too frequent to call for attention).
 *
 * Kept in AppConfig/notification-log.json (newest LOG_MAX entries), saved shortly after each change.
 */
import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { ToastActionType } from '@/common/types/Events';
import type { ListingPanelPayload } from '@/pages/market/lib/types';
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@/lib/browser-fs';

export const NOTIFICATION_KINDS = [
  'whisper',
  'trade',
  'join',
  'chat',
  'offer',
  'market',
  'sim',
  'networth',
  'update',
  'error',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** The log's filter tabs and the kinds each holds. */
export const NOTIFICATION_GROUPS = {
  trade: ['offer', 'trade'],
  chat: ['whisper', 'chat', 'join'],
  alerts: ['market', 'sim', 'networth'],
  system: ['update', 'error'],
} as const satisfies Record<string, readonly NotificationKind[]>;
export type NotificationGroup = keyof typeof NOTIFICATION_GROUPS;

/** Missed entries of these kinds turn the dock icon to the warning color. */
const URGENT_KINDS: readonly NotificationKind[] = ['offer', 'trade', 'error'];
/** Logged, never missed. */
const QUIET_KINDS: readonly NotificationKind[] = ['join'];

/** Entries kept (newest first). */
export const LOG_MAX = 200;
/** A new entry with the group key of the newest one within this window folds into it ("×3"). */
export const GROUP_WINDOW_MS = 10 * 60_000;

export interface LoggedAction {
  label: string;
  type: ToastActionType;
  data?: unknown;
}

export interface NotificationEntry {
  id: string;
  kind: NotificationKind;
  title: string;
  description?: string;
  /** ms epoch of the latest occurrence. */
  at: number;
  /** The toast's action, still runnable from the log. */
  action?: LoggedAction;
  /** A market listing: Details opens it in the listing drawer. */
  listing?: ListingPanelPayload;
  tone?: 'success' | 'warning' | 'error' | 'muted';
  /** Occurrences folded into this entry. */
  count: number;
  /** Entries with the same key fold together (a sender's whispers, a sim report). */
  groupKey?: string;
  missed: boolean;
}

export type NewNotification = Omit<NotificationEntry, 'id' | 'at' | 'count' | 'missed'>;

// ---- pure ----

/** The log with `entry` added on top (or folded into the newest entry of its group), capped at LOG_MAX. */
export function addEntry(
  log: readonly NotificationEntry[],
  entry: NewNotification & { id: string; at: number; missed: boolean },
): { log: NotificationEntry[]; id: string } {
  const missed = entry.missed && !QUIET_KINDS.includes(entry.kind);
  const head = log[0];
  if (head && entry.groupKey && head.groupKey === entry.groupKey && entry.at - head.at <= GROUP_WINDOW_MS) {
    const folded: NotificationEntry = {
      ...head,
      ...entry,
      id: head.id,
      count: head.count + 1,
      missed: head.missed || missed,
    };
    return { log: [folded, ...log.slice(1)], id: head.id };
  }
  return { log: [{ ...entry, count: 1, missed }, ...log].slice(0, LOG_MAX), id: entry.id };
}

export function markMissed(log: readonly NotificationEntry[], id: string): readonly NotificationEntry[] {
  const i = log.findIndex((e) => e.id === id);
  if (i < 0 || log[i].missed || QUIET_KINDS.includes(log[i].kind)) return log;
  return log.map((e, j) => (j === i ? { ...e, missed: true } : e));
}

export function markAllSeen(log: readonly NotificationEntry[]): readonly NotificationEntry[] {
  return log.some((e) => e.missed) ? log.map((e) => (e.missed ? { ...e, missed: false } : e)) : log;
}

export interface MissedSummary {
  count: number;
  /** A missed offer, trade whisper or error. */
  urgent: boolean;
  /** The newest missed entry. */
  latest: NotificationEntry | null;
}

export function missedSummary(log: readonly NotificationEntry[]): MissedSummary {
  const missed = log.filter((e) => e.missed);
  return {
    count: missed.length,
    urgent: missed.some((e) => URGENT_KINDS.includes(e.kind)),
    latest: missed[0] ?? null,
  };
}

const savedEntrySchema = z.object({
  id: z.string(),
  kind: z.enum(NOTIFICATION_KINDS),
  title: z.string(),
  description: z.string().optional(),
  at: z.number(),
  action: z.object({ label: z.string(), type: z.nativeEnum(ToastActionType), data: z.unknown() }).optional(),
  listing: z.object({ listingId: z.string(), savedSearchId: z.string().optional() }).passthrough().optional(),
  tone: z.enum(['success', 'warning', 'error', 'muted']).optional(),
  count: z.number().int().positive().catch(1),
  groupKey: z.string().optional(),
  missed: z.boolean().catch(false),
});
const savedLogSchema = z.object({ entries: z.array(z.unknown()) });

/** Saved entries: well-formed ones, newest first, at most LOG_MAX. */
export function parseLog(text: string): NotificationEntry[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return [];
  }
  const file = savedLogSchema.safeParse(raw);
  if (!file.success) return [];
  return file.data.entries
    .flatMap((value) => {
      const entry = savedEntrySchema.safeParse(value);
      // Validated above; zod reads every field as optional without strictNullChecks (off in this project)
      return entry.success ? [entry.data as NotificationEntry] : [];
    })
    .sort((a, b) => b.at - a.at)
    .slice(0, LOG_MAX);
}

// ---- store ----

const FILENAME = 'notification-log.json';
const DIR = BaseDirectory.AppConfig;
const SAVE_DELAY_MS = 1_000;

let log: readonly NotificationEntry[] = [];
let summary: MissedSummary = missedSummary(log);
let loaded = false;
let saveTimer: number | undefined;
let nextId = 0;
const listeners = new Set<() => void>();

function set(next: readonly NotificationEntry[]): void {
  if (next === log) return;
  log = next;
  summary = missedSummary(log);
  listeners.forEach((listener) => listener());
  if (loaded) scheduleSave();
}

function scheduleSave(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void save(), SAVE_DELAY_MS);
}

async function save(): Promise<void> {
  try {
    if (!(await exists('', { baseDir: DIR }))) await mkdir('', { baseDir: DIR, recursive: true });
    await writeTextFile(FILENAME, JSON.stringify({ entries: log }), { baseDir: DIR });
  } catch (error) {
    console.error('Failed to save the notification log:', error);
  }
}

/** Reads the saved log once (AppController); entries logged before it finished stay on top. */
export async function loadNotificationLog(): Promise<void> {
  if (loaded) return;
  let saved: NotificationEntry[] = [];
  try {
    if (await exists(FILENAME, { baseDir: DIR })) saved = parseLog(await readTextFile(FILENAME, { baseDir: DIR }));
  } catch (error) {
    console.warn('Failed to load the notification log:', error);
  }
  loaded = true;
  const ids = new Set(log.map((e) => e.id));
  set([...log, ...saved.filter((e) => !ids.has(e.id))].slice(0, LOG_MAX));
}

/** Adds an entry; returns its id (an existing one when it folded into its group). */
export function logNotification(entry: NewNotification, { missed, at = Date.now() }: { missed: boolean; at?: number }) {
  const id = `${at.toString(36)}-${(nextId++).toString(36)}`;
  const result = addEntry(log, { ...entry, id, at, missed });
  set(result.log);
  return result.id;
}

/** Its toast timed out unseen. */
export const markNotificationMissed = (id: string): void => set(markMissed(log, id));
/** The log was opened. */
export const markAllNotificationsSeen = (): void => set(markAllSeen(log));
export const clearNotificationLog = (): void => set([]);
/** Slid away in the log. */
export const removeNotification = (id: string): void => set(log.filter((e) => e.id !== id));

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getNotificationLog = (): readonly NotificationEntry[] => log;
export const useNotificationLog = (): readonly NotificationEntry[] =>
  useSyncExternalStore(subscribe, getNotificationLog);
export const useMissedNotifications = (): MissedSummary => useSyncExternalStore(subscribe, () => summary);

/** Tests: an empty, unloaded log. */
export function resetNotificationLog(): void {
  clearTimeout(saveTimer);
  log = [];
  summary = missedSummary(log);
  loaded = false;
  listeners.forEach((listener) => listener());
}
