import React from 'react';
import { motion } from 'framer-motion';
import moment from 'moment';
import { AlertCircle, Gamepad2, Globe, Loader2, RotateCw } from 'lucide-react';
import { fadeInUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { ChatListingState } from '../hooks/useChatListings';
import type { TimelineEntry } from '../lib/inbox';
import { MessageContent } from './MessageContent';
import { ReadReceipt } from './chat-parts';

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

export function MessageBubble({
  row,
  readerId,
  listings,
  onRetry,
}: {
  row: MessageRow;
  readerId?: string;
  listings: ReadonlyMap<string, ChatListingState>;
  onRetry: (conversationId: string, clientId: string) => void;
}) {
  const { entry, startsDay, continuesGroup, groupContinues } = row;
  const { message, own: isOwnMessage } = entry;
  const failed = message?.status === 'failed';
  const sending = message?.status === 'sending';
  const time = moment(entry.createdAt).format('h:mm A');
  const whisper = entry.source === 'whisper';
  const SourceIcon = whisper ? Gamepad2 : Globe;
  return (
    // Only messages that arrive while open animate in; history (and rows virtualized back in) appear as-is
    <motion.div variants={fadeInUp}
      initial={message?.live ? 'hidden' : false}
      animate="visible">
      {startsDay && (
        <div className="mb-3 flex items-center gap-3 px-2">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
          <span className="rounded-full border border-border/70 bg-card/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
            {formatDayLabel(entry.createdAt)}
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
        </div>
      )}
      <div className={cn('group/msg flex', isOwnMessage ? 'justify-end' : 'justify-start')}>
        <div
          aria-busy={sending || undefined}
          title={moment(entry.createdAt).format('ddd, MMM D YYYY · h:mm A')}
          className={cn(
            'relative max-w-[72%] rounded-2xl px-3 py-1.5 text-foreground ring-1 ring-inset transition-opacity duration-(--dur-med)',
            isOwnMessage
              ? ['bg-primary/15 ring-primary/25', continuesGroup && 'rounded-tr-md', groupContinues && 'rounded-br-md']
              : [
                  'bg-card ring-border/70 shadow-xs',
                  continuesGroup && 'rounded-tl-md',
                  groupContinues && 'rounded-bl-md',
                ],
            sending && 'opacity-60',
            failed && 'bg-destructive/10 ring-destructive/40',
          )}
        >
          <MessageContent content={entry.content}
            listings={listings} />
          <div
            className={cn(
              'flex items-center justify-end gap-1 text-[10px] leading-4 tabular-nums text-muted-foreground',
              // Inside a group only the last bubble keeps its time; the others show it on hover
              groupContinues &&
                !message?.status &&
                'h-0 overflow-hidden opacity-0 group-hover/msg:h-4 group-hover/msg:opacity-100',
            )}
          >
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
                {entry.copied && <span title="Copied to the clipboard; not seen in the game chat yet">· copied</span>}
                {sending && <Loader2 aria-hidden
                  className="size-3 animate-spin" />}
                {isOwnMessage && message && !message.status && <ReadReceipt message={message}
                  readerId={readerId} />}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
