import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import type { Conversation, Message, Participant } from '@/common/types/pd2-website/ChatTypes';
import { TombGlyph } from '@/components/glyph/TombGlyph';
import { t } from '@/i18n';
import { glyphCodeForName } from '@/lib/glyph-code';
import { cn } from '@/lib/utils';
import type { TraderPresence } from '../hooks/useTraderProfile';
import type { InboxThread } from '../lib/inbox';

/** The other participant of a 1:1 conversation. */
export const otherParticipant = (conversation: Conversation, currentUserId: string | undefined) =>
  currentUserId ? conversation.participants.find((p) => p._id !== currentUserId) : undefined;

export const participantName = (participant: Participant | null | undefined) =>
  participant?.display_name || participant?.username || t('chat:parts.unknownUser');

/**
 * The name a trader's tomb glyph is drawn from. A website user: their in-game account, else their username, as
 * pd2trader.com picks it, so a trader draws the same glyph there and here. Otherwise an account known from their
 * offers, else the thread's name (a whisper sender's account when the log showed it).
 */
export function traderGlyphName(thread: Pick<InboxThread, 'participant' | 'accounts' | 'name'>): string {
  const p = thread.participant;
  if (p) {
    const account = p.in_game_account || p.game?.preferences?.account || p.game?.accounts?.[0];
    const name = account || p.username || p.display_name;
    if (name) return name;
  }
  return thread.accounts[0] || thread.name;
}

/** PD2 website pages of a user (opened with openUrl). */
export const profileUrl = (username: string) => `https://www.projectdiablo2.com/@${encodeURIComponent(username)}`;
export const marketUrl = (username: string) => `${profileUrl(username)}/market`;
export const characterUrl = (characterName: string) =>
  `https://www.projectdiablo2.com/character/${encodeURIComponent(characterName)}`;

/** Segmented control look for a ToggleGroup (list filters, reply channel) and its items. */
export const segmentedClass = 'gap-0.5 rounded-lg bg-muted/60 p-0.5 ring-1 ring-inset ring-border/60';
export const segmentItemClass = cn(
  'rounded-md text-muted-foreground transition-[background-color,color,box-shadow] duration-(--dur-fast)',
  // aria-checked, not data-state: a tooltip trigger wrapping the item overwrites data-state with its own
  'hover:bg-background/40 hover:text-foreground aria-checked:bg-primary/15 aria-checked:text-foreground',
  'aria-checked:shadow-sm aria-checked:ring-1 aria-checked:ring-primary/30',
);

/** Presence dot colours: in game now, online recently. */
const PRESENCE_DOT: Partial<Record<TraderPresence['kind'], string>> = {
  ingame: 'bg-success',
  online: 'bg-warning',
};

/**
 * A trader's account tomb glyph (as pd2trader.com shows them) drawn from `name` (traderGlyphName), `size` px
 * square. `presence` adds a dot (in game / online recently).
 */
export function ChatAvatar({
  name,
  size = 40,
  presence,
}: {
  name: string;
  size?: number;
  presence?: TraderPresence['kind'];
}) {
  const dot = presence && PRESENCE_DOT[presence];
  return (
    <span aria-hidden
      className="relative inline-flex shrink-0">
      <TombGlyph code={glyphCodeForName(name)}
        size={size} />
      {dot && (
        <span
          className={cn(
            'absolute -bottom-px -right-px size-[28%] min-h-2 min-w-2 rounded-full ring-2 ring-card',
            dot,
            presence === 'ingame' && 'shadow-[0_0_6px] shadow-success/60',
          )}
        />
      )}
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
    <CheckCheck aria-label={t('chat:parts.read')}
      className={cn('size-3.5 text-info', className)} />
  ) : (
    <Check aria-label={t('chat:parts.sent')}
      className={cn('size-3.5 text-muted-foreground/80', className)} />
  );
}

/** Small round count badge (unread). */
export const CountBadge = React.forwardRef<HTMLSpanElement, { count: number } & React.ComponentPropsWithoutRef<'span'>>(
  function CountBadge({ count, className, ...props }, ref) {
    return (
      <span
        ref={ref}
        {...props}
        className={cn(
          'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold tabular-nums leading-none text-primary-foreground shadow-xs',
          className,
        )}
      >
        {count > 99 ? '99+' : count}
      </span>
    );
  },
);
