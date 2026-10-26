import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AlertTriangle, ArrowDown, Loader2, MessageSquareDashed, RotateCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/pages/currency/components/StatePanel';
import { cn } from '@/lib/utils';
import type { ChatListingState } from '../hooks/useChatListings';
import type { ThreadState } from '../hooks/useChatStore';
import type { TimelineEntry } from '../lib/inbox';
import { buildRows, MessageBubble } from './MessageBubble';

/** Scrolling within this distance of the top of a thread loads the previous page. */
const LOAD_OLDER_THRESHOLD_PX = 120;
/** Scrolled within this distance of the bottom counts as "pinned": growing rows keep the latest message in view. */
const PINNED_THRESHOLD_PX = 80;

const SKELETON_BUBBLES = [
  ['justify-start', 'w-52 h-10'],
  ['justify-start', 'w-36 h-8'],
  ['justify-end', 'w-64 h-12'],
  ['justify-start', 'w-44 h-10'],
  ['justify-end', 'w-40 h-8'],
] as const;

/**
 * The open thread's messages (mount one per thread: `key` it by thread id). Opens at the "New" divider above
 * `unreadKey` when given, else at the bottom; follows new messages while scrolled to the bottom, and offers
 * "N new · Jump to latest" for messages that arrive while scrolled up.
 */
export function MessageList({
  threadId,
  entries,
  thread,
  readerId,
  otherName,
  onOpenTrader,
  listings,
  unreadKey,
  onRetry,
  onLoadOlder,
  onReload,
}: {
  threadId: string;
  /** Website messages and whispers in display order. */
  entries: TimelineEntry[];
  /** The website conversation's loading state; whisper-only threads pass EMPTY_THREAD. */
  thread: ThreadState;
  /** The other participant: own messages they have read show as Read. */
  readerId?: string;
  otherName: string;
  /** The other side's avatars open their Trader details. */
  onOpenTrader: () => void;
  listings: ReadonlyMap<string, ChatListingState>;
  /** The first message that was unread when the thread was opened: the "New" divider goes above it. */
  unreadKey?: string | null;
  onRetry: (conversationId: string, clientId: string) => void;
  onLoadOlder: (conversationId: string) => void;
  onReload: (conversationId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Variable-height virtual message list. anchorTo 'end' keeps the reading position when older pages are
  // prepended and keeps the latest message in view while pinned to the bottom (listing cards load and grow).
  const rows = useMemo(() => buildRows(entries), [entries]);
  // eslint-disable-next-line react-hooks/incompatible-library -- no React Compiler; the virtualizer re-renders us
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () =>
      containerRef.current?.querySelector<HTMLDivElement>('[data-slot="scroll-area-viewport"]') ?? null,
    estimateSize: (index) =>
      (rows[index].groupContinues ? 40 : 54) +
      (rows[index].startsDay ? 32 : 0) +
      (rows[index].key === unreadKey ? 32 : 0) +
      (index === 0 ? 0 : rows[index].continuesGroup ? 2 : 10),
    getItemKey: (index) => rows[index].key,
    overscan: 8,
    paddingStart: 12,
    paddingEnd: 12,
    anchorTo: 'end',
    scrollEndThreshold: PINNED_THRESHOLD_PX,
  });

  // Scrolled to the bottom (state for the jump button; the ref for effects, which must not re-run on scroll),
  // and the last row seen there: rows after it that are not our own are the "new" ones.
  const [atBottom, setAtBottom] = useState(true);
  const atBottomRef = useRef(true);
  const lastRow = rows.at(-1);
  const lastRowKey = lastRow?.key;
  const [seenKey, setSeenKey] = useState(lastRowKey);

  // Open at the "New" divider once its row is in, else at the bottom; then follow appended messages while at
  // the bottom, and always after an own message. Only an appended row moves the view: older pages prepended
  // above (which shift the divider's index) never do.
  const unreadIndex = unreadKey ? rows.findIndex((row) => row.key === unreadKey) : -1;
  const positionedRef = useRef(false);
  const followedKeyRef = useRef<string | undefined>(undefined);
  const lastRowOwn = lastRow?.entry.own;
  useEffect(() => {
    const appended = lastRowKey !== followedKeyRef.current;
    followedKeyRef.current = lastRowKey;
    if (unreadIndex >= 0 && !positionedRef.current) {
      positionedRef.current = true;
      virtualizer.scrollToIndex(unreadIndex, { align: 'start' });
    } else if (appended && lastRowKey && (atBottomRef.current || lastRowOwn)) {
      virtualizer.scrollToEnd();
    }
  }, [unreadIndex, lastRowKey, lastRowOwn, virtualizer]);

  const handleScroll = (e: React.UIEvent) => {
    const el = e.target as HTMLElement;
    if (el.dataset.slot !== 'scroll-area-viewport') return;
    if (el.scrollTop < LOAD_OLDER_THRESHOLD_PX) onLoadOlder(threadId);
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight <= PINNED_THRESHOLD_PX;
    // Everything up to now was seen while at the bottom (also when just leaving it)
    if (bottom || atBottomRef.current) setSeenKey(lastRowKey);
    atBottomRef.current = bottom;
    setAtBottom(bottom);
  };

  const seenIndex = rows.findIndex((row) => row.key === seenKey);
  const newCount = atBottom || seenIndex < 0 ? 0 : rows.slice(seenIndex + 1).filter((row) => !row.entry.own).length;
  const jumpToLatest = () => {
    atBottomRef.current = true;
    setAtBottom(true);
    setSeenKey(lastRowKey);
    virtualizer.scrollToEnd();
  };

  let placeholder: React.ReactNode = null;
  if (entries.length === 0 && thread.loading) {
    placeholder = (
      <div aria-busy
        className="space-y-2 p-4">
        <div className="flex items-center justify-center gap-2 pb-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          <span>Loading messages...</span>
        </div>
        {SKELETON_BUBBLES.map(([align, size], i) => (
          <div key={i}
            className={cn('flex', align)}>
            <Skeleton className={cn('rounded-2xl', size)} />
          </div>
        ))}
      </div>
    );
  } else if (entries.length === 0 && thread.failed) {
    placeholder = (
      <EmptyState
        className="mx-auto mt-16 max-w-sm border-destructive/30 bg-destructive/5"
        icon={<AlertTriangle />}
        title="Couldn't load messages"
        description="Check your connection and try again."
        action={
          <Button variant="outline"
            size="sm"
            onClick={() => onReload(threadId)}>
            <RotateCw className="size-3.5" />
            Try again
          </Button>
        }
      />
    );
  } else if (entries.length === 0) {
    placeholder = (
      <EmptyState
        className="mx-auto mt-16 max-w-sm"
        icon={<MessageSquareDashed />}
        title="No messages yet"
        description={`Say hi to ${otherName}.`}
      />
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-linear-to-b from-background/40 via-background/20 to-background/40">
      <ScrollArea
        className="min-h-0 flex-1 overflow-hidden [&_[data-radix-scroll-area-viewport]>div]:!block"
        ref={containerRef}
        onScrollCapture={handleScroll}
      >
        {placeholder ?? (
          // data-keep-keyboard: selecting message text keeps the keyboard in the overlay, so Ctrl+C copies it
          <div data-keep-keyboard
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index];
              return (
                <div
                  key={item.key}
                  ref={virtualizer.measureElement}
                  data-index={item.index}
                  className={cn(
                    'absolute left-0 top-0 w-full px-4',
                    item.index === 0 ? '' : row.continuesGroup && row.key !== unreadKey ? 'pt-0.5' : 'pt-2.5',
                  )}
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  <MessageBubble
                    row={row}
                    startsUnread={row.key === unreadKey}
                    readerId={readerId}
                    otherName={otherName}
                    onOpenTrader={onOpenTrader}
                    listings={listings}
                    onRetry={onRetry}
                  />
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      {thread.loadingOlder && (
        <div aria-busy
          className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
          <span className="flex items-center gap-2 rounded-full border border-border bg-popover/95 px-3 py-1 text-xs text-muted-foreground shadow-panel">
            <Loader2 className="size-3.5 animate-spin" />
            Loading older messages...
          </span>
        </div>
      )}
      {newCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <button
            type="button"
            onClick={jumpToLatest}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-primary/40 bg-popover/95 px-3 py-1 text-xs font-medium text-foreground shadow-panel outline-none transition-[background-color,scale] duration-(--dur-fast) hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-95"
          >
            <ArrowDown className="size-3.5 text-primary" />
            {newCount} new · Jump to latest
          </button>
        </div>
      )}
    </div>
  );
}
