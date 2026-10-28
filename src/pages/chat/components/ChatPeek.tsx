import React from 'react';
import { ArrowDownLeft, CheckCheck, CircleCheck, Gamepad2, type LucideIcon, MessageSquare } from 'lucide-react';
import { t, useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import type { FeedItem, FeedKind } from '../chat-feed';

/** Items the peek lists, newest first. */
export const PEEK_ITEMS = 5;

const KINDS: Record<FeedKind, { icon: LucideIcon; labelKey: string; className: string }> = {
  message: { icon: MessageSquare, labelKey: 'chat:peek.kinds.message', className: 'text-destructive' },
  offerReceived: { icon: ArrowDownLeft, labelKey: 'chat:peek.kinds.offerReceived', className: 'text-warning' },
  offerAccepted: { icon: CircleCheck, labelKey: 'chat:peek.kinds.offerAccepted', className: 'text-success' },
  trade: { icon: Gamepad2, labelKey: 'chat:peek.kinds.trade', className: 'text-warning' },
};

/** "now", "12m", "3h", "2d". */
function timeAgo(at: number, now: number) {
  const minutes = Math.floor(Math.max(0, now - at) / 60_000);
  if (minutes < 1) return t('chat:peek.time.now');
  if (minutes < 60) return t('chat:peek.time.minutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  return hours < 24
    ? t('chat:peek.time.hours', { count: hours })
    : t('chat:peek.time.days', { count: Math.floor(hours / 24) });
}

/** The second line: the item and price, a message's text (with how many are unread). */
function detail(item: FeedItem) {
  if (item.kind === 'message') {
    const text = item.text ?? '';
    return item.count && item.count > 1 ? t('chat:peek.newMessages', { count: item.count, text }) : text;
  }
  const deal = [item.itemName, item.price].filter(Boolean).join(' · ');
  return deal || item.text || t(KINDS[item.kind].labelKey);
}

const footerButton =
  'flex-1 rounded-md px-2 py-1.5 text-xs font-medium outline-none transition-colors duration-(--dur-fast) ' +
  'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent disabled:opacity-40 disabled:hover:bg-transparent';

/**
 * The chat button's peek: the newest PEEK_ITEMS new things behind its badges (unread threads, offers received or
 * accepted, trade whispers), each opening its thread or offer list; Mark all read and Open chat below.
 */
export function ChatPeek({
  items,
  canMarkAllRead,
  now,
  onPick,
  onMarkAllRead,
  onOpenChat,
}: {
  /** Newest first. */
  items: readonly FeedItem[];
  canMarkAllRead: boolean;
  /** Epoch ms, for the times. */
  now: number;
  onPick: (item: FeedItem) => void;
  onMarkAllRead: () => void;
  onOpenChat: () => void;
}) {
  const { t } = useTranslation('chat');
  const shown = items.slice(0, PEEK_ITEMS);
  return (
    <div
      role="group"
      aria-label={t('peek.whatsNew')}
      className="w-72 rounded-lg border border-border bg-surface p-1 text-sm text-surface-foreground shadow-panel backdrop-blur-md"
    >
      {shown.length === 0 ? (
        <div className="flex items-center gap-2 px-2.5 py-3 text-muted-foreground">
          <CheckCheck className="size-4 shrink-0" />
          {t('peek.allCaughtUp')}
        </div>
      ) : (
        <ul aria-label={t('peek.new')}>
          {shown.map((item) => {
            const { icon: Icon, labelKey, className } = KINDS[item.kind];
            const label = t(labelKey);
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onPick(item)}
                  className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-1.5 text-left outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent"
                >
                  <Icon aria-label={label}
                    className={cn('mt-0.5 size-4 shrink-0', className)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium">{item.name ?? label}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {timeAgo(item.at, now)}
                      </span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{detail(item)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div role="separator"
        className="my-1 h-px bg-border" />
      <div className="flex gap-1">
        <button type="button"
          disabled={!canMarkAllRead}
          onClick={onMarkAllRead}
          className={footerButton}>
          {t('peek.markAllRead')}
        </button>
        <button type="button"
          onClick={onOpenChat}
          className={footerButton}>
          {t('peek.openChat')}
        </button>
      </div>
    </div>
  );
}
