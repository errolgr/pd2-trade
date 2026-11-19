import React, { useId } from 'react';
import { RefreshCw, Search, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tip } from '@/components/ui/tooltip';
import { useTranslation } from '@/i18n';

/*
 * Auto search on / off. On (the default), every filter change searches; off, filter edits wait for Search, so
 * building a query doesn't send projectdiablo2.com a search per click.
 */

/** The sidebar row above Stats: the Auto search switch and what it does right now. */
export function AutoSearchSwitch({ value, onChange }: { value: boolean; onChange: (on: boolean) => void }) {
  const { t } = useTranslation('market');
  const id = useId();
  return (
    <Tip label={t('filters.autoSearch.title')}>
      <div className="flex items-center gap-2 border-b border-border px-2.5 py-1.5">
        <Zap aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground" />
        <label htmlFor={id}
          className="min-w-0 flex-1 cursor-pointer">
          <span className="block text-xs font-medium">{t('filters.autoSearch.label')}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {value ? t('filters.autoSearch.on') : t('filters.autoSearch.off')}
          </span>
        </label>
        <Switch id={id}
          aria-label={t('filters.autoSearch.label')}
          checked={value}
          onCheckedChange={onChange} />
      </div>
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
