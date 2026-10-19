import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AlertTriangle, Loader2, MessageSquareDashed, RotateCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/pages/currency/components/StatePanel';
import { cn } from '@/lib/utils';
import type { ChatListingState } from '../hooks/useChatListings';
import type { ThreadState } from '../hooks/useChatStore';
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

export function MessageList({
  conversationId,
  thread,
  currentUserId,
  readerId,
  otherName,
  listings,
  onRetry,
  onLoadOlder,
  onReload,
}: {
  conversationId: string;
  thread: ThreadState;
  currentUserId: string | undefined;
  /** The other participant: own messages they have read show as Read. */
  readerId?: string;
  otherName: string;
  listings: ReadonlyMap<string, ChatListingState>;
  onRetry: (conversationId: string, clientId: string) => void;
  onLoadOlder: (conversationId: string) => void;
  onReload: (conversationId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { messages } = thread;

  // Variable-height virtual message list. anchorTo 'end' keeps the reading position when older pages are
  // prepended and keeps the latest message in view while pinned to the bottom (listing cards load and grow).
  const rows = useMemo(() => buildRows(messages), [messages]);
  // eslint-disable-next-line react-hooks/incompatible-library -- no React Compiler; the virtualizer re-renders us
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () =>
      containerRef.current?.querySelector<HTMLDivElement>('[data-slot="scroll-area-viewport"]') ?? null,
    estimateSize: (index) =>
      (rows[index].groupContinues ? 40 : 54) +
      (rows[index].startsDay ? 32 : 0) +
      (index === 0 ? 0 : rows[index].continuesGroup ? 2 : 10),
    getItemKey: (index) => rows[index].key,
    overscan: 8,
    paddingStart: 12,
    paddingEnd: 12,
    anchorTo: 'end',
    scrollEndThreshold: PINNED_THRESHOLD_PX,
  });

  // Scroll to the bottom when a message is appended (not when older pages are prepended)
  const lastRowKey = rows.at(-1)?.key;
  useEffect(() => {
    if (lastRowKey) virtualizer.scrollToEnd();
  }, [lastRowKey, virtualizer]);

  const handleScroll = useCallback(
    (e: React.UIEvent) => {
      const el = e.target as HTMLElement;
      if (el.dataset.slot !== 'scroll-area-viewport') return;
      if (el.scrollTop < LOAD_OLDER_THRESHOLD_PX) onLoadOlder(conversationId);
    },
    [conversationId, onLoadOlder],
  );

  let placeholder: React.ReactNode = null;
  if (messages.length === 0 && thread.loading) {
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
  } else if (messages.length === 0 && thread.failed) {
    placeholder = (
      <EmptyState
        className="mx-auto mt-16 max-w-sm border-destructive/30 bg-destructive/5"
        icon={<AlertTriangle />}
        title="Couldn't load messages"
        description="Check your connection and try again."
        action={
          <Button variant="outline"
            size="sm"
            onClick={() => onReload(conversationId)}>
            <RotateCw className="size-3.5" />
            Try again
          </Button>
        }
      />
    );
  } else if (messages.length === 0) {
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
    <div className="relative flex min-h-0 flex-1 flex-col bg-background/30">
      <ScrollArea
        className="min-h-0 flex-1 overflow-hidden [&_[data-radix-scroll-area-viewport]>div]:!block"
        ref={containerRef}
        onScrollCapture={handleScroll}
      >
        {placeholder ?? (
          <div className="relative w-full"
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
                    item.index === 0 ? '' : row.continuesGroup ? 'pt-0.5' : 'pt-2.5',
                  )}
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  <MessageBubble
                    row={row}
                    isOwnMessage={row.message.sender_id === currentUserId}
                    readerId={readerId}
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
    </div>
  );
}
