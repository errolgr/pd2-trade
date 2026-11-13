import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tip } from '@/components/ui/tooltip';
import { EASE_OUT, springSnappy } from '@/lib/motion';
import { showToast } from '@/overlay';
import type { MarketFilters } from '@/pages/market/lib/types';
import { type MarketStore, MAX_WATCHED_SEARCHES, useMarketStore } from '@/pages/market/store/useMarketStore';
import { findWatch } from './alert-logic';
import { t as translate, useTranslation } from '@/i18n';

/** What Watch would do for `filters`, and whether it can (not on sold listings). */
export function watchState(store: MarketStore, filters: MarketFilters | null) {
  const { watching, saved } = filters ? findWatch(store.savedSearches, filters) : { watching: null, saved: null };
  const archive = filters?.source === 'archive';
  const disabled = !filters || (archive && !watching);
  return { watching, saved, archive, disabled };
}

/** Starts watching `filters` (reusing a saved search with them), or stops the watch on them; toasts the outcome. */
export function toggleWatch(store: MarketStore, filters: MarketFilters): void {
  const { watching, saved } = findWatch(store.savedSearches, filters);
  if (watching) {
    store.setSearchWatching(watching.id, false);
    showToast({ title: translate('market:watch.stoppedToast'), description: watching.name, variant: 'info' });
    return;
  }
  if (!store.alertsEnabled) store.setAlertsEnabled(true);
  const started = saved ? store.setSearchWatching(saved.id, true) : !!store.saveSearch(undefined, filters, true);
  if (started) {
    showToast({
      title: translate('market:watch.watching'),
      description: translate('market:watch.startedDescription'),
      variant: 'success',
    });
  } else if (saved) {
    showToast({
      title: translate('market:watch.tooManyTitle'),
      description: translate('market:watch.tooManyDescription', { count: MAX_WATCHED_SEARCHES }),
      variant: 'warning',
    });
  }
}

/**
 * "Watch" the current market filters: a popup and a sound for every new listing that matches them (a watched
 * saved search, streamed live from pd2trader.com). Shows "Watching" while one exists for identical filters;
 * clicking it again stops watching (the saved search stays, without alerts).
 */
export function WatchButton({ filters, className }: { filters: MarketFilters | null; className?: string }) {
  const { t } = useTranslation('market');
  const store = useMarketStore();
  const { watching, archive, disabled } = watchState(store, filters);
  // One soft pulse when watching starts (not when the panel opens on a watched search)
  const [pulses, setPulses] = useState(0);
  const [wasWatching, setWasWatching] = useState(!!watching);
  if (!!watching !== wasWatching) {
    setWasWatching(!!watching);
    if (watching) setPulses((n) => n + 1);
  }

  const toggle = () => {
    if (filters) toggleWatch(store, filters);
  };

  const label =
    archive && !watching
      ? t('watch.labels.archive')
      : watching
        ? t('watch.labels.watching')
        : t('watch.labels.watch');

  return (
    // The span takes hover/focus while the button is disabled, so the tooltip still says why
    <Tip label={label}>
      <span
        tabIndex={disabled ? 0 : undefined}
        className="inline-flex shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <button
          type="button"
          aria-pressed={!!watching}
          aria-label={label}
          disabled={disabled}
          onClick={toggle}
          className={cn(
            'relative inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-input bg-background/40 px-2 text-[11px] font-medium text-muted-foreground outline-none',
            'transition-[color,background-color,border-color] duration-(--dur-fast) hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
            'disabled:cursor-not-allowed disabled:opacity-50',
            watching && 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
            className,
          )}
        >
          {pulses > 0 && (
            <motion.span
              key={pulses}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-primary/60"
              initial={{ opacity: 0.9, scale: 1 }}
              animate={{ opacity: 0, scale: 1.25 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            />
          )}
          <span className="relative inline-flex size-3.5 items-center justify-center">
            <AnimatePresence initial={false}
              mode="popLayout">
              <motion.span
                key={watching ? 'bell' : 'eye'}
                className="inline-flex"
                initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                transition={springSnappy}
              >
                {watching ? <Bell className="size-3.5" /> : <Eye className="size-3.5" />}
              </motion.span>
            </AnimatePresence>
          </span>
          {watching ? t('watch.watching') : t('watch.watch')}
        </button>
      </span>
    </Tip>
  );
}
