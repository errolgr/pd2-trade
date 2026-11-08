import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  Download,
  FlaskConical,
  Gamepad2,
  History,
  type LucideIcon,
  MessageSquare,
  MessagesSquare,
  Store,
  Trash2,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { useTranslation } from '@/i18n';
import {
  clearNotificationLog,
  markAllNotificationsSeen,
  NOTIFICATION_GROUPS,
  type NotificationEntry,
  type NotificationGroup,
  type NotificationKind,
  useNotificationLog,
} from '@/lib/notification-log';
import { cn } from '@/lib/utils';
import { openLoggedListing, runLoggedAction, usePanel } from '@/overlay';
import { timeAgo } from '@/pages/chat/components/ChatPeek';

const KIND_ICONS: Record<NotificationKind, { icon: LucideIcon; className: string }> = {
  whisper: { icon: MessageSquare, className: 'text-primary' },
  trade: { icon: Gamepad2, className: 'text-warning' },
  join: { icon: UserPlus, className: 'text-muted-foreground' },
  chat: { icon: MessagesSquare, className: 'text-primary' },
  offer: { icon: ArrowDownLeft, className: 'text-warning' },
  market: { icon: Store, className: 'text-info' },
  sim: { icon: FlaskConical, className: 'text-info' },
  networth: { icon: TrendingUp, className: 'text-success' },
  update: { icon: Download, className: 'text-info' },
  error: { icon: AlertTriangle, className: 'text-destructive' },
};

const TONE_CLASS: Record<NonNullable<NotificationEntry['tone']>, string> = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
  muted: 'text-muted-foreground',
};

type Filter = 'all' | NotificationGroup;
const FILTERS: Filter[] = ['all', 'trade', 'chat', 'alerts', 'system'];

/** Re-renders every 30 s so "2m" stays right. */
function useNow(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/**
 * The notification log (chat dock → Notifications, or the hotkey): what happened, newest first, with what was
 * missed before it opened on top. Opening it marks everything seen; each entry keeps its toast's action.
 */
const NotificationLogPage: React.FC = () => {
  const { t } = useTranslation('app');
  const { close, visible } = usePanel<'notifications'>();
  const log = useNotificationLog();
  const now = useNow();
  const [filter, setFilter] = useState<Filter>('all');
  // What was missed when the log opened: marked as such while it stays open
  const [missedAtOpen] = useState(() => new Set(log.filter((e) => e.missed).map((e) => e.id)));

  // Shown = seen, including what arrives while it is open
  useEffect(() => {
    if (visible) markAllNotificationsSeen();
  }, [visible, log]);

  const shown = useMemo(
    () =>
      filter === 'all'
        ? log
        : log.filter((e) => (NOTIFICATION_GROUPS[filter] as readonly NotificationKind[]).includes(e.kind)),
    [log, filter],
  );
  const missed = shown.filter((e) => missedAtOpen.has(e.id));
  const earlier = shown.filter((e) => !missedAtOpen.has(e.id));

  const run = (entry: NotificationEntry) => {
    if (!entry.action) return;
    close();
    void runLoggedAction(entry.action);
  };

  return (
    <WindowPanel animate
      className="h-full w-full">
      <WindowChrome
        title={t('notificationLog.title')}
        icon={<History />}
        closeLabel={t('notificationLog.close')}
        onClose={close}
        actions={
          <Button
            size="sm"
            variant="ghost"
            disabled={log.length === 0}
            onClick={clearNotificationLog}
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-3.5" />
            {t('notificationLog.clear')}
          </Button>
        }
      />
      <div role="tablist"
        aria-label={t('notificationLog.filters')}
        className="flex gap-1 px-3 pt-2">
        {FILTERS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium outline-none transition-colors duration-(--dur-fast) focus-visible:ring-2 focus-visible:ring-ring',
              filter === id
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            {t(`notificationLog.filter.${id}`)}
          </button>
        ))}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {shown.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t('notificationLog.empty')}</p>
        ) : (
          <div className="flex flex-col gap-2 p-2">
            {missed.length > 0 && (
              <Section label={t('notificationLog.missed', { count: missed.length })}
                accent>
                {missed.map((entry) => (
                  <Row key={entry.id}
                    entry={entry}
                    now={now}
                    onRun={run}
                    onDetails={close} />
                ))}
              </Section>
            )}
            {earlier.length > 0 && (
              <Section label={missed.length > 0 ? t('notificationLog.earlier') : undefined}>
                {earlier.map((entry) => (
                  <Row key={entry.id}
                    entry={entry}
                    now={now}
                    onRun={run}
                    onDetails={close} />
                ))}
              </Section>
            )}
          </div>
        )}
      </ScrollArea>
    </WindowPanel>
  );
};

function Section({ label, accent, children }: { label?: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <section>
      {label && (
        <h3
          className={cn(
            'px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider',
            accent ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {label}
        </h3>
      )}
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

const ROW_ACTION =
  'text-xs font-medium text-primary outline-none underline-offset-2 hover:underline focus-visible:underline';

function Row({
  entry,
  now,
  onRun,
  onDetails,
}: {
  entry: NotificationEntry;
  now: number;
  onRun: (entry: NotificationEntry) => void;
  onDetails: () => void;
}) {
  const { t } = useTranslation('app');
  const { icon: Icon, className } = KIND_ICONS[entry.kind];
  const { listing, action } = entry;
  // One grid for every row: icon | text (title, description, actions) | time, so times line up on the right edge
  // whether or not a row has buttons
  return (
    <li className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-start gap-x-2.5 rounded-md px-2 py-1.5 hover:bg-accent/50">
      <Icon className={cn('mt-0.5 size-4', entry.tone ? TONE_CLASS[entry.tone] : className)} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {entry.title}
          {entry.count > 1 && (
            <span className="ml-1.5 text-xs font-normal tabular-nums text-muted-foreground">×{entry.count}</span>
          )}
        </p>
        {entry.description && (
          <p className="line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">{entry.description}</p>
        )}
        {(action || listing) && (
          <div className="mt-1 flex gap-3">
            {action && (
              <button type="button"
                onClick={() => onRun(entry)}
                className={ROW_ACTION}>
                {action.label}
              </button>
            )}
            {listing && (
              <button
                type="button"
                onClick={() => {
                  onDetails();
                  openLoggedListing(listing);
                }}
                className={cn(ROW_ACTION, 'text-muted-foreground')}
              >
                {t('toast.details')}
              </button>
            )}
          </div>
        )}
      </div>
      <span className="pt-0.5 text-[11px] tabular-nums text-muted-foreground">{timeAgo(entry.at, now)}</span>
    </li>
  );
}

export default NotificationLogPage;
