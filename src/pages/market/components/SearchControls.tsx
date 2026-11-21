import React from 'react';
import { RefreshCw, Search, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tooltip';
import { useTranslation } from '@/i18n';

/*
 * Auto search on / off. On (the default), every filter change searches; off, filter edits wait for Search, so
 * building a query doesn't send projectdiablo2.com a search per click. Also a switch in Settings › Market.
 */

/** The sidebar's lightning bolt beside Clear: lit while Auto search is on, a click flips it. */
export function AutoSearchToggle({ value, onChange }: { value: boolean; onChange: (on: boolean) => void }) {
  const { t } = useTranslation('market');
  return (
    // Below: above it, the tip would cover the panel's title bar
    <Tip side="bottom"
      label={value ? t('filters.autoSearch.on') : t('filters.autoSearch.off')}>
      <Button
        variant="ghost"
        size="sm"
        aria-label={t('filters.autoSearch.label')}
        aria-pressed={value}
        className={cn(
          'size-7 shrink-0 p-0 text-muted-foreground',
          value && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
        )}
        onClick={() => onChange(!value)}
      >
        <Zap className={cn('size-3.5', value && 'fill-current')} />
      </Button>
    </Tip>
  );
}

/**
 * Pinned under the filters while Auto search is off: Search (with the number of unsearched changes) and whether
 * the results still match the filters.
 */
export function SearchFooter({ unsearchedEdits, onSearch }: { unsearchedEdits: number; onSearch: () => void }) {
  const { t } = useTranslation('market');
  const pending = unsearchedEdits > 0;
  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-t border-border bg-surface-elevated px-2.5 pb-2 pt-2">
      <Button
        size="sm"
        variant={pending ? 'default' : 'outline'}
        className="w-full"
        aria-keyshortcuts="Control+Enter"
        onClick={onSearch}
      >
        <Search className="size-3.5" />
        {t('filters.searchNow')}
        {pending && (
          <span
            aria-hidden
            className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-foreground px-1 text-[10px] font-semibold tabular-nums text-primary"
          >
            {unsearchedEdits}
          </span>
        )}
      </Button>
      <p aria-live="polite"
        className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        {pending ? t('filters.outOfDate') : t('filters.upToDate')}
        {pending && (
          <span className="inline-flex items-center gap-0.5">
            ·<Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd>
          </span>
        )}
      </p>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-b-2 border-border px-1 font-sans text-[10px] text-muted-foreground">
      {children}
    </kbd>
  );
}

/** In the results' status strip while they predate the sidebar's filters (Auto search off). */
export function UnsearchedNotice({ onSearch, className }: { onSearch: () => void; className?: string }) {
  const { t } = useTranslation('market');
  return (
    <span
      role="status"
      className={cn(
        'inline-flex h-5 min-w-0 shrink items-center gap-1.5 rounded-md border border-warning/35 bg-warning/10 px-2 text-[11px] font-medium text-warning',
        className,
      )}
    >
      <RefreshCw aria-hidden
        className="size-3 shrink-0" />
      {/* A narrow window cuts the sentence short: the whole of it on hover */}
      <Tip label={t('results.unsearched')}>
        <span className="truncate">{t('results.unsearched')}</span>
      </Tip>
      <button
        type="button"
        onClick={onSearch}
        className="shrink-0 rounded-sm text-foreground underline underline-offset-2 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        {t('filters.searchNow')}
      </button>
    </span>
  );
}
