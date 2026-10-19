import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import type { Conversation, Message, Participant } from '@/common/types/pd2-website/ChatTypes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TraderPresence } from '../hooks/useTraderProfile';

/** The other participant of a 1:1 conversation. */
export const otherParticipant = (conversation: Conversation, currentUserId: string | undefined) =>
  currentUserId ? conversation.participants.find((p) => p._id !== currentUserId) : undefined;

export const participantName = (participant: Participant | null | undefined) =>
  participant?.display_name || participant?.username || 'Unknown';

/** PD2 website pages of a user (opened with openUrl). */
export const profileUrl = (username: string) => `https://www.projectdiablo2.com/@${encodeURIComponent(username)}`;
export const marketUrl = (username: string) => `${profileUrl(username)}/market`;
export const characterUrl = (characterName: string) =>
  `https://www.projectdiablo2.com/character/${encodeURIComponent(characterName)}`;

/** Segmented control look for a ToggleGroup (list filters, reply channel) and its items. */
export const segmentedClass = 'gap-0.5 rounded-lg bg-muted/60 p-0.5 ring-1 ring-inset ring-border/60';
export const segmentItemClass = cn(
  'rounded-md text-muted-foreground transition-[background-color,color,box-shadow] duration-(--dur-fast)',
  'hover:bg-background/40 hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground',
  'data-[state=on]:shadow-sm data-[state=on]:ring-1 data-[state=on]:ring-border/70',
);

/** Soft tint (lists, bubbles) and solid gradient (profile card) per theme chart colour. */
const AVATAR_TINTS = [
  'bg-linear-to-br from-chart-1/35 to-chart-1/10 text-chart-1 ring-chart-1/30',
  'bg-linear-to-br from-chart-2/35 to-chart-2/10 text-chart-2 ring-chart-2/30',
  'bg-linear-to-br from-chart-3/35 to-chart-3/10 text-chart-3 ring-chart-3/30',
  'bg-linear-to-br from-chart-4/35 to-chart-4/10 text-chart-4 ring-chart-4/30',
  'bg-linear-to-br from-chart-5/35 to-chart-5/10 text-chart-5 ring-chart-5/30',
] as const;
const AVATAR_SOLID = [
  'bg-linear-to-br from-chart-1 to-chart-1/45 text-background ring-chart-1/40',
  'bg-linear-to-br from-chart-2 to-chart-2/45 text-background ring-chart-2/40',
  'bg-linear-to-br from-chart-3 to-chart-3/45 text-background ring-chart-3/40',
  'bg-linear-to-br from-chart-4 to-chart-4/45 text-background ring-chart-4/40',
  'bg-linear-to-br from-chart-5 to-chart-5/45 text-background ring-chart-5/40',
] as const;

/** Presence dot colours: in game now, online recently. */
const PRESENCE_DOT: Partial<Record<TraderPresence['kind'], string>> = {
  ingame: 'bg-success',
  online: 'bg-warning',
};

/**
 * Initial on a gradient of a theme chart colour picked from the name, so a person keeps their colour
 * everywhere; `solid` for the large profile avatar. `presence` adds a dot (in game / online recently).
 */
export function ChatAvatar({
  name,
  className,
  solid = false,
  presence,
}: {
  name: string;
  className?: string;
  solid?: boolean;
  presence?: TraderPresence['kind'];
}) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const index = Math.abs(hash) % AVATAR_TINTS.length;
  const dot = presence && PRESENCE_DOT[presence];
  return (
    <span aria-hidden
      className="relative inline-flex shrink-0">
      <span
        className={cn(
          'flex size-10 shrink-0 select-none items-center justify-center rounded-full text-sm font-semibold uppercase shadow-xs ring-1 ring-inset',
          solid ? AVATAR_SOLID[index] : AVATAR_TINTS[index],
          className,
        )}
      >
        {name.trim().charAt(0) || '?'}
      </span>
      {dot && (
        <span
          className={cn(
            'absolute bottom-0 right-0 size-[30%] min-h-2 min-w-2 rounded-full ring-2 ring-card',
            dot,
            presence === 'ingame' && 'shadow-[0_0_6px] shadow-success/60',
          )}
        />
      )}
    </span>
  );
}

/** A themed tooltip on a button-like child (its accessible name stays the child's own). */
export function Tip({
  label,
  side = 'top',
  children,
}: {
  label: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side}
          className="max-w-64">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold tabular-nums leading-none text-primary-foreground shadow-xs',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
