/**
 * Every inbox thread, in the inbox's order, as the chat panel (always mounted) last built it: the command palette
 * finds conversations by trader name here without loading anything. Module level, like the chat feed.
 */
import { useSyncExternalStore } from 'react';
import { accountOf } from '@/lib/whisper-history';
import { threadAliases, type InboxThread } from './lib/inbox';

export interface ChatThreadEntry {
  /** The thread id (openPanel('chat', { threadId })). */
  id: string;
  /** Every id it is known by (a saved conversation id still finds it after it merged). */
  ids: string[];
  name: string;
  /** The other names the trader goes by: website username, in-game player, account and character names. */
  names: string[];
  unread: number;
  latest?: { text: string; at: number };
  archived: boolean;
}

/** One entry per thread; `names` without blanks, `name` itself or case-insensitive duplicates. */
export function chatThreadEntries(threads: readonly InboxThread[]): ChatThreadEntry[] {
  return threads.map((thread) => {
    const seen = new Set([thread.name.toLowerCase()]);
    const names: string[] = [];
    for (const raw of [
      thread.participant?.username,
      ...thread.people.flatMap((p) => [p.playerName, p.accountName && accountOf(p.accountName), p.characterName]),
      ...thread.accounts,
    ]) {
      const name = raw?.trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      names.push(name);
    }
    return {
      id: thread.id,
      ids: threadAliases(thread),
      name: thread.name,
      names,
      unread: thread.unread,
      latest: thread.latest && { text: thread.latest.text, at: thread.latest.at },
      archived: thread.archived,
    };
  });
}

const EMPTY: readonly ChatThreadEntry[] = [];
let entries = EMPTY;
let entriesKey = '';
const listeners = new Set<() => void>();

/** Publishes the threads (subscribers re-render only when an entry changed). */
export function publishChatThreads(threads: readonly InboxThread[]): void {
  const next = chatThreadEntries(threads);
  const key = JSON.stringify(next);
  if (key === entriesKey) return;
  entries = next;
  entriesKey = key;
  listeners.forEach((listener) => listener());
}

export const getChatThreads = (): readonly ChatThreadEntry[] => entries;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useChatThreads = (): readonly ChatThreadEntry[] => useSyncExternalStore(subscribe, getChatThreads);

/** Tests: back to no threads. */
export function resetChatThreads(): void {
  entries = EMPTY;
  entriesKey = '';
}
