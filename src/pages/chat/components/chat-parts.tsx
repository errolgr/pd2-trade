import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import type { Conversation, Message, Participant } from '@/common/types/pd2-website/ChatTypes';
import { cn } from '@/lib/utils';

/** The other participant of a 1:1 conversation. */
export const otherParticipant = (conversation: Conversation, currentUserId: string | undefined) =>
  currentUserId ? conversation.participants.find((p) => p._id !== currentUserId) : undefined;

export const participantName = (participant: Participant | null | undefined) =>
  participant?.display_name || participant?.username || 'Unknown';

const AVATAR_TINTS = [
  'bg-chart-1/15 text-chart-1 ring-chart-1/30',
  'bg-chart-2/15 text-chart-2 ring-chart-2/30',
  'bg-chart-3/15 text-chart-3 ring-chart-3/30',
  'bg-chart-4/15 text-chart-4 ring-chart-4/30',
  'bg-chart-5/15 text-chart-5 ring-chart-5/30',
] as const;

/** Initial on a theme chart tint picked from the name, so a person keeps their colour everywhere. */
export function ChatAvatar({ name, className }: { name: string; className?: string }) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const tint = AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length];
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 shrink-0 select-none items-center justify-center rounded-full text-sm font-semibold uppercase ring-1 ring-inset',
        tint,
        className,
      )}
    >
      {name.trim().charAt(0) || '?'}
    </span>
  );
}

/** Own messages: double check once `readerId` (the other participant) has read it, else a single check. */
export function ReadReceipt({
  message,
  readerId,
  className,
}: {
  message: Message;
  readerId?: string;
  className?: string;
}) {
  return readerId && message.reader_ids?.includes(readerId) ? (
    <CheckCheck aria-label="Read"
      className={cn('size-3.5 text-info', className)} />
  ) : (
    <Check aria-label="Sent"
      className={cn('size-3.5 text-muted-foreground/80', className)} />
  );
}

/** Small round count badge (unread). */
export function CountBadge({ count, className, ...props }: { count: number } & React.ComponentProps<'span'>) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold tabular-nums leading-none text-primary-foreground',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
