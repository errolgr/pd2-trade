import React from 'react';
import { motion } from 'framer-motion';
import moment from 'moment';
import { AlertCircle, ClipboardCopy, Copy, Gamepad2, Globe, HandCoins, Loader2, RotateCw } from 'lucide-react';
import { writeText } from '@/lib/browser-clipboard';
import { fadeInUp, slideInRight } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { showToast } from '@/overlay';
import type { ChatListingState } from '../hooks/useChatListings';
import type { TimelineEntry } from '../lib/inbox';
import { MessageContent } from './MessageContent';
import { ChatAvatar, ReadReceipt, Tip } from './chat-parts';
import { offerStatus, STATUS_CLASS } from './ThreadDeals';

/** Messages from one side and source less than this far apart form a group (tight spacing, shared corners). */
const GROUP_GAP_MINUTES = 5;

export interface MessageRow {
  entry: TimelineEntry;
  key: string;
  startsDay: boolean;
  /** Follows a message of the same group. */
  continuesGroup: boolean;
  /** The next message belongs to the same group. */
  groupContinues: boolean;
}

const sameGroup = (previous: TimelineEntry, entry: TimelineEntry) =>
  !previous.offer &&
  !entry.offer &&
  previous.own === entry.own &&
  previous.source === entry.source &&
  moment(entry.createdAt).isSame(previous.createdAt, 'day') &&
  moment(entry.createdAt).diff(previous.createdAt, 'minutes') < GROUP_GAP_MINUTES;

export function buildRows(entries: TimelineEntry[]): MessageRow[] {
  return entries.map((entry, index) => {
    const previous = index > 0 ? entries[index - 1] : null;
    const next = entries[index + 1];
    return {
      entry,
      key: entry.key,
      startsDay: !previous || !moment(entry.createdAt).isSame(previous.createdAt, 'day'),
      continuesGroup: !!previous && sameGroup(previous, entry),
      groupContinues: !!next && sameGroup(entry, next),
    };
  });
}

function formatDayLabel(timestamp: string) {
  const day = moment(timestamp);
  if (day.isSame(moment(), 'day')) return 'Today';
  if (day.isSame(moment().subtract(1, 'day'), 'day')) return 'Yesterday';
  return day.format(day.isSame(moment(), 'year') ? 'ddd, MMM D' : 'MMM D, YYYY');
}

/** Copies a message as written (listing links as their URLs): works even when the game keeps the keyboard. */
async function copyMessage(content: string) {
  try {
    await writeText(content);
  } catch {
    showToast({ title: 'Message not copied', description: "Couldn't write to the clipboard.", variant: 'error' });
    return;
  }
  showToast({ title: 'Copied' });
}

export function MessageBubble({
  row,
  startsUnread = false,
  readerId,
  otherName,
  onOpenTrader,
  listings,
  onRetry,
}: {
  row: MessageRow;
  /** The first message that was unread when the thread was opened: a "New" divider goes above it. */
  startsUnread?: boolean;
  readerId?: string;
  /** The other side's name: their avatar starts each of their groups. */
  otherName: string;
  /** Their avatar opens the Trader details. */
  onOpenTrader: () => void;
  listings: ReadonlyMap<string, ChatListingState>;
  onRetry: (conversationId: string, clientId: string) => void;
}) {
  const { entry, startsDay, continuesGroup: followsInGroup, groupContinues } = row;
  // The divider splits a group: the bubble below it starts fresh
  const continuesGroup = followsInGroup && !startsUnread;
  const { message, own: isOwnMessage } = entry;
  const failed = message?.status === 'failed';
  const sending = message?.status === 'sending';
  const time = moment(entry.createdAt).format('h:mm A');
  const whisper = entry.source === 'whisper';
  const SourceIcon = whisper ? Gamepad2 : Globe;
  const copyButton = (
    <Tip label="Copy message">
      <button
        type="button"
        aria-label="Copy message"
        onClick={() => void copyMessage(entry.content)}
        className="shrink-0 self-center rounded-md p-1 text-muted-foreground opacity-0 transition-opacity duration-(--dur-fast) hover:bg-muted/60 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/msg:opacity-100"
      >
        <Copy aria-hidden
          className="size-3.5" />
      </button>
    </Tip>
  );
  return (
    // Only messages that arrive while open animate in (own ones from the right, theirs from below); history
    // (and rows virtualized back in) appear as-is
    <motion.div
      variants={isOwnMessage ? slideInRight : fadeInUp}
      initial={message?.live ? 'hidden' : false}
      animate="visible"
    >
      {startsDay && (
        <div className="mb-3 flex items-center justify-center gap-3 px-2">
          <span className="h-px max-w-24 flex-1 bg-linear-to-r from-transparent to-border" />
          <span className="rounded-full border border-border/70 bg-linear-to-b from-card to-card/70 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm">
            {formatDayLabel(entry.createdAt)}
          </span>
          <span className="h-px max-w-24 flex-1 bg-linear-to-l from-transparent to-border" />
        </div>
      )}
      {startsUnread && (
        <div role="separator"
          aria-label="New messages"
          className="mb-2.5 flex items-center gap-2 px-1">
          <span className="h-px flex-1 bg-linear-to-r from-transparent to-destructive/60" />
          <span className="rounded-full bg-destructive/12 px-2 py-px text-[10px] font-semibold uppercase tracking-wider text-destructive ring-1 ring-inset ring-destructive/30">
            New
          </span>
          <span className="h-px flex-1 bg-linear-to-l from-transparent to-destructive/60" />
        </div>
      )}
      {entry.offer ? (
        // One of your offers that ended: a quiet event row, centered like the day divider
        <div className="flex justify-center px-2">
          <div
            title={moment(entry.createdAt).format('ddd, MMM D YYYY · h:mm A')}
            className="flex max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground"
          >
            <HandCoins aria-hidden
              className="size-3.5 shrink-0" />
            <span className="truncate">
              Your offer <span className="font-medium text-foreground/80">{entry.offer.price ?? '?'}</span>
              {entry.offer.itemName && <> for {entry.offer.itemName}</>}
            </span>
            <span
              className={cn(
                'shrink-0 rounded px-1.5 text-[10px] font-semibold uppercase tracking-wide',
                STATUS_CLASS[offerStatus(entry.offer)],
              )}
            >
              {offerStatus(entry.offer)}
            </span>
            <span className="shrink-0 text-[10px] tabular-nums">{time}</span>
          </div>
        </div>
      ) : (
        <div className={cn('group/msg flex items-start gap-2', isOwnMessage ? 'justify-end' : 'justify-start')}>
          {!isOwnMessage &&
            (continuesGroup ? (
              <span aria-hidden
                className="w-7 shrink-0" />
            ) : (
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Trader details for ${otherName}`}
                onClick={onOpenTrader}
                className="mt-0.5 shrink-0 rounded-full outline-none transition-transform duration-(--dur-fast) hover:scale-105 active:scale-95"
              >
                <ChatAvatar name={otherName}
                  className="size-7 text-xs" />
              </button>
            ))}
          {isOwnMessage && copyButton}
          <div
            aria-busy={sending || undefined}
            title={moment(entry.createdAt).format('ddd, MMM D YYYY · h:mm A')}
            className={cn(
              'relative max-w-[72%] rounded-2xl px-3 py-1.5 text-foreground ring-1 ring-inset transition-[opacity,box-shadow] duration-(--dur-med)',
              isOwnMessage
                ? [
                    'bg-linear-to-br from-primary/28 via-primary/18 to-primary/10 shadow-sm ring-primary/30',
                    continuesGroup && 'rounded-tr-md',
                    groupContinues && 'rounded-br-md',
                  ]
                : [
                    'bg-linear-to-b from-card to-card/85 shadow-sm ring-border/70 group-hover/msg:shadow-md',
                    continuesGroup && 'rounded-tl-md',
                    groupContinues && 'rounded-bl-md',
                  ],
              sending && 'opacity-60',
              failed && 'bg-none bg-destructive/10 ring-destructive/40',
            )}
          >
            <MessageContent content={entry.content}
              listings={listings} />
            <div className="flex items-center justify-end gap-1 text-[10px] leading-4 tabular-nums text-muted-foreground">
              {failed && message.clientId ? (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="size-3" />
                  Failed to send ·
                  <button
                    type="button"
                    onClick={() => onRetry(message.conversation_id, message.clientId!)}
                    className="inline-flex items-center gap-0.5 rounded-sm font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <RotateCw className="size-2.5" />
                    Retry
                  </button>
                </span>
              ) : (
                <>
                  <SourceIcon
                    role="img"
                    aria-label={whisper ? 'In-game whisper' : 'Website message'}
                    className="size-2.5 text-muted-foreground/70"
                  />
                  <span>{time}</span>
                  {entry.copied && (
                    <span
                      title="Copied to your clipboard as /w *account … — paste it in the game chat (Enter, Ctrl+V) to send it. Marked sent once the game shows it."
                      className="ml-0.5 inline-flex cursor-help items-center gap-0.5 rounded-sm bg-warning/15 px-1 font-medium text-warning"
                    >
                      <ClipboardCopy aria-hidden
                        className="size-2.5" />
                      copied
                    </span>
                  )}
                  {sending && <Loader2 aria-hidden
                    className="size-3 animate-spin" />}
                  {isOwnMessage && message && !message.status && <ReadReceipt message={message}
                    readerId={readerId} />}
                </>
              )}
            </div>
          </div>
          {!isOwnMessage && copyButton}
        </div>
      )}
    </motion.div>
  );
}
