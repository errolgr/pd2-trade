import React from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showToast } from '@/overlay';
import type { MarketFilters } from '@/pages/market/lib/types';
import { isPendingSearch, useMarketStore } from '@/pages/market/store/useMarketStore';
import { findWatch } from './alert-logic';

/**
 * "Watch" the current market filters: a popup and a sound for every new listing that matches them (an alerting
 * saved search on pd2trader.com). Shows "Watching" while one exists for identical filters; clicking it again
 * stops watching (the saved search stays, without alerts).
 */
export function WatchButton({ filters, className }: { filters: MarketFilters | null; className?: string }) {
  const store = useMarketStore();
  const { watching, saved } = filters ? findWatch(store.savedSearches, filters) : { watching: null, saved: null };
  const signedOut = store.syncStatus === 'signedOut';
  const archive = filters?.source === 'archive';
  const busy = (watching && isPendingSearch(watching)) || store.syncStatus === 'loading';
  const disabled = !filters || signedOut || (archive && !watching) || !!busy;

  const toggle = () => {
    if (!filters) return;
    if (watching) {
      store.setSearchAlert(watching.id, false);
      showToast({ title: 'Stopped watching', description: watching.name, variant: 'info' });
      return;
    }
    if (!store.alertsEnabled) store.setAlertsEnabled(true);
    if (saved && !isPendingSearch(saved)) {
      if (!store.setSearchAlert(saved.id, true)) {
        showToast({
          title: 'Too many watches',
          description: `Up to ${store.limits.maxAlerting} searches can be watched at once. Stop one first (Saved tab).`,
          variant: 'warning',
        });
      }
      return;
    }
    if (store.saveSearch(undefined, filters, true)) {
      showToast({
        title: 'Watching',
        description: "You'll get a popup for every new listing matching this search.",
        variant: 'success',
      });
    }
  };

  const label = signedOut
    ? 'Sign in to watch this search'
    : archive && !watching
      ? 'Sold listings cannot be watched'
      : watching
        ? 'Watching: click to stop the popups for new listings matching this search'
        : 'Watch: get a popup and a sound for every new listing matching this search';

  return (
    <button
      type="button"
      aria-pressed={!!watching}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={toggle}
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-input bg-background/40 px-2 text-[11px] font-medium text-muted-foreground outline-none',
        'transition-[color,background-color,border-color] duration-(--dur-fast) hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
        'disabled:pointer-events-none disabled:opacity-50',
        watching && 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
        className,
      )}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
      {watching ? 'Watching' : 'Watch'}
    </button>
  );
}
