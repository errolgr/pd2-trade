import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import moment from 'moment';
import {
  AlertTriangle,
  Archive,
  BellOff,
  Gamepad2,
  MessagesSquare,
  Pin,
  RotateCw,
  Search,
  SearchX,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EmptyState } from '@/pages/currency/components/StatePanel';
import { listItem, listStagger, popIn } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { InboxFilter, InboxThread } from '../lib/inbox';
import { ChatAvatar, CountBadge, ReadReceipt } from './chat-parts';

const FILTERS: { value: Exclude<InboxFilter, 'archived'>; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'selling', label: 'Selling' },
  { value: 'buying', label: 'Buying' },
];

const EMPTY_TEXT: Record<InboxFilter, { title: string; description?: string }> = {
  all: { title: 'No conversations' },
  selling: {
    title: 'Nothing you are selling right now',
    description: 'Offers on your listings and trade whispers from buyers show up here.',
  },
  buying: {
    title: 'Nothing you are buying right now',
    description: 'Your offers and the trade whispers you send show up here.',
  },
  archived: {
    title: 'No archived chats',
    description: 'Archive a chat from its ⋯ menu; a new message brings it back.',
  },
};

/** Compact relative time for the list: "now", "12m", "3:45 PM", "Yesterday", "Tue", "Mar 4". */
function formatConversationTime(timestamp: number) {
  const now = moment();
  const time = moment(timestamp);
  const minutes = now.diff(time, 'minutes');
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (time.isSame(now, 'day')) return time.format('h:mm A');
  if (time.isSame(now.clone().subtract(1, 'day'), 'day')) return 'Yesterday';
  if (now.diff(time, 'days') < 7) return time.format('ddd');
  return time.format(time.isSame(now, 'year') ? 'MMM D' : 'MMM D, YY');
}

/**
 * The inbox sidebar (the whole panel in compact mode): one row per person, pinned first, with
 * All/Selling/Buying/Archived filters and search. `threads` are the rows to show (filtered and searched).
 */
export function ConversationList({
  threads,
  total,
  unreadTotal,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  loading,
  failed,
  signedIn,
  onReload,
  className,
}: {
  threads: InboxThread[];
  /** Every thread, whatever the filter. */
  total: number;
  /** Unread messages outside muted and archived threads. */
  unreadTotal: number;
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  search: string;
  onSearchChange: (search: string) => void;
  selectedId: string | null;
  onSelect: (threadId: string) => void;
  loading: boolean;
  failed: boolean;
  signedIn: boolean;
  onReload: () => void;
  className?: string;
}) {
  const query = search.trim();
  const empty = EMPTY_TEXT[filter];

  let body: React.ReactNode;
  if (loading && total === 0) {
    body = (
      <div aria-busy
        className="space-y-0.5 p-2">
        <span className="sr-only">Loading conversations...</span>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i}
            className="flex items-center gap-3 rounded-lg px-2.5 py-2">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between gap-4">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (failed && total === 0) {
    body = (
      <EmptyState
        compact
        className="px-4 pt-10"
        icon={<AlertTriangle />}
        title="Couldn't load conversations"
        description="Check your connection and try again."
        action={
          <Button variant="outline"
            size="sm"
            onClick={onReload}>
            <RotateCw className="size-3.5" />
            Try again
          </Button>
        }
      />
    );
  } else if (threads.length === 0) {
    body = (
      <EmptyState
        compact
        className="px-4 pt-10"
        icon={query ? <SearchX /> : filter === 'archived' ? <Archive /> : <MessagesSquare />}
        title={query ? 'No conversations match your search' : empty.title}
        description={
          query
            ? undefined
            : (empty.description ??
              (signedIn
                ? 'Website chats and in-game whispers show up here.'
                : 'Sign in to Project Diablo 2 in Settings → Account to chat.'))
        }
        action={
          query ? (
            <Button variant="ghost"
              size="sm"
              onClick={() => onSearchChange('')}>
              Clear search
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <motion.div className="space-y-0.5 p-2"
        variants={listStagger}
        initial="hidden"
        animate="visible">
        {threads.map((thread) => {
          const { name, latest } = thread;
          const selected = selectedId === thread.id;
          const unread = thread.unread > 0;
          const own = latest?.own;
          return (
            <motion.button
              key={thread.id}
              layout="position"
              variants={listItem}
              type="button"
              aria-current={selected ? 'true' : undefined}
              onClick={() => onSelect(thread.id)}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left outline-none',
                'transition-colors duration-(--dur-fast) ease-out focus-visible:ring-2 focus-visible:ring-ring/60',
                selected ? 'bg-primary/12 ring-1 ring-inset ring-primary/25' : 'hover:bg-muted/60 active:bg-muted',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'absolute inset-y-2.5 -left-px w-[3px] rounded-full bg-primary transition-opacity duration-(--dur-med)',
                  selected ? 'opacity-100' : 'opacity-0',
                )}
              />
              <ChatAvatar name={name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-sm',
                      unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/90',
                    )}
                  >
                    {name}
                  </span>
                  {thread.muted && (
                    <BellOff
                      role="img"
                      aria-label="Muted"
                      className="size-3 shrink-0 self-center text-muted-foreground/80"
                    />
                  )}
                  {thread.pinned && (
                    <Pin role="img"
                      aria-label="Pinned"
                      className="size-3 shrink-0 self-center text-primary/80" />
                  )}
                  {latest && (
                    <span
                      className={cn(
                        'shrink-0 text-[11px] tabular-nums',
                        unread && !thread.muted ? 'font-semibold text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {formatConversationTime(latest.at)}
                    </span>
                  )}
                </div>
                {latest && (
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {latest.source === 'whisper' && (
                      <Gamepad2
                        role="img"
                        aria-label="In-game whisper"
                        className="size-3 shrink-0 text-muted-foreground/70"
                      />
                    )}
                    {own && latest.message && (
                      <ReadReceipt message={latest.message}
                        readerId={thread.participant?._id}
                        className="shrink-0" />
                    )}
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-xs',
                        unread ? 'text-foreground/85' : 'text-muted-foreground',
                      )}
                    >
                      {own && <span className="text-muted-foreground">You: </span>}
                      {latest.text}
                    </span>
                    {unread && (
                      <CountBadge
                        count={thread.unread}
                        className={thread.muted ? 'bg-muted-foreground/60' : undefined}
                      />
                    )}
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    );
  }

  return (
    <aside
      className={cn('flex min-h-0 w-72 shrink-0 flex-col overflow-hidden border-r border-border bg-card/40', className)}
    >
      <div className="shrink-0 space-y-2.5 px-3 pb-3 pt-3">
        <div className="flex items-center gap-2 px-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Messages</h2>
          <AnimatePresence>
            {unreadTotal > 0 && (
              <motion.span key="unread"
                variants={popIn}
                initial="hidden"
                animate="visible"
                exit="exit">
                <CountBadge count={unreadTotal}
                  title={`${unreadTotal} unread`} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          aria-label="Show"
          value={filter}
          // Radix reports '' when the pressed item is clicked again: keep the current filter
          onValueChange={(value) => value && onFilterChange(value as InboxFilter)}
          className="w-full"
        >
          {FILTERS.map(({ value, label }) => (
            <ToggleGroupItem key={value}
              value={value}
              className="h-7 text-xs">
              {label}
            </ToggleGroupItem>
          ))}
          <ToggleGroupItem
            value="archived"
            aria-label="Archived"
            title="Archived chats"
            className="h-7 max-w-9 text-xs"
          >
            <Archive className="size-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="group relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors duration-(--dur-fast) group-focus-within:text-foreground" />
          <Input
            placeholder="Search chats..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && search) {
                e.preventDefault();
                onSearchChange('');
              }
            }}
            className="h-8 rounded-lg bg-background/60 pl-8 pr-8 text-sm"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors duration-(--dur-fast) hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="mx-3 h-px shrink-0 bg-border/70" />
      <ScrollArea className="min-h-0 flex-1 overflow-hidden [&_[data-radix-scroll-area-viewport]>div]:!block">
        {body}
      </ScrollArea>
    </aside>
  );
}
