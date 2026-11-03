import React, { useMemo } from 'react';
import { MessageSquare, Reply, UserRound } from 'lucide-react';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { t } from '@/i18n';
import { useChatThreads, type ChatThreadEntry } from '@/pages/chat/chat-threads';
import { timeAgo } from '@/pages/chat/components/ChatPeek';
import { matchTier } from '../lib/match';
import type { PaletteItem, PaletteRef, PaletteRunContext, PaletteSource } from '../lib/types';

const ICON = 'h-4 w-4';

export interface RankedThread {
  thread: ChatThreadEntry;
  /** The other name the query matched (username, in-game name) when the display name didn't match as well. */
  matched?: string;
}

/**
 * Threads whose trader names match `query`: the best tier (prefix > word start > contains) over the display name
 * and the other names, then inbox order (pinned, newest).
 */
export function rankThreads(threads: readonly ChatThreadEntry[], query: string, limit: number): RankedThread[] {
  const ranked: { thread: ChatThreadEntry; matched?: string; tier: number; order: number }[] = [];
  threads.forEach((thread, order) => {
    let tier = matchTier(thread.name, query);
    let matched: string | undefined;
    for (const name of thread.names) {
      const nameTier = matchTier(name, query);
      if (nameTier > tier) {
        tier = nameTier;
        matched = name;
      }
    }
    if (tier > 0) ranked.push({ thread, matched, tier, order });
  });
  return ranked
    .sort((a, b) => b.tier - a.tier || a.order - b.order)
    .slice(0, limit)
    .map(({ thread, matched }) => ({ thread, matched }));
}

/** The threads `refs` point at, in their order (by any id a thread is known by); refs to gone threads drop out. */
export function resolveThreadRefs(threads: readonly ChatThreadEntry[], refs: readonly PaletteRef[]): ChatThreadEntry[] {
  const resolved: ChatThreadEntry[] = [];
  for (const ref of refs) {
    const id = typeof ref.data?.threadId === 'string' ? ref.data.threadId : null;
    if (!id) continue;
    const thread = threads.find((t) => t.id === id) ?? threads.find((t) => t.ids.includes(id));
    if (thread && !resolved.includes(thread)) resolved.push(thread);
  }
  return resolved;
}

export const chatRef = (thread: ChatThreadEntry): PaletteRef => ({
  id: `chat:${thread.id}`,
  group: 'chat',
  title: thread.name,
  data: { threadId: thread.id },
});

function toItem({ thread, matched }: RankedThread, now: number): PaletteItem {
  const open = (ctx: PaletteRunContext, extra?: { reply?: boolean; trader?: boolean }) =>
    ctx.openPanel('chat', { threadId: thread.id, ...extra }, { focus: true });
  return {
    ref: chatRef(thread),
    badge: matched,
    icon: (
      <span className="relative inline-flex">
        <MessageSquare className={ICON} />
        {thread.unread > 0 && (
          <span
            aria-label={t('chat:palette.unread')}
            className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-popover"
          />
        )}
      </span>
    ),
    trailing: thread.latest && (
      <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <span className="max-w-56 truncate">{thread.latest.text}</span>
        <span className="shrink-0 tabular-nums">{timeAgo(thread.latest.at, now)}</span>
      </span>
    ),
    primary: { id: 'open', label: t('chat:palette.open'), run: (ctx) => open(ctx) },
    actions: [
      {
        id: 'reply',
        label: t('chat:palette.reply'),
        icon: <Reply className={ICON} />,
        run: (ctx) => open(ctx, { reply: true }),
      },
      {
        id: 'trader',
        label: t('chat:header.traderDetails'),
        icon: <UserRound className={ICON} />,
        run: (ctx) => open(ctx, { trader: true }),
      },
    ],
  };
}

/**
 * Conversations by trader name, from the threads the chat panel already built (chat-threads; nothing is fetched).
 * Scoped with nothing typed: the inbox's first threads (archived ones left out, like the inbox).
 */
export const useChatSource: PaletteSource = ({ query, scope, limit, refs }) => {
  const { authData } = usePd2Website();
  // Like the chat panel: a PD2 token
  const signedIn = !!authData?.accessToken;
  const threads = useChatThreads();

  return useMemo(() => {
    if (!signedIn) return { items: [], loading: false, signedOut: true };
    if (limit === 0) return { items: [], loading: false };
    const now = Date.now();
    const picked: RankedThread[] = query
      ? rankThreads(threads, query, limit)
      : (scope ? threads.filter((thread) => !thread.archived).slice(0, limit) : resolveThreadRefs(threads, refs)).map(
          (thread) => ({ thread }),
        );
    return { items: picked.map((r) => toItem(r, now)), loading: false };
  }, [signedIn, limit, query, scope, threads, refs]);
};
