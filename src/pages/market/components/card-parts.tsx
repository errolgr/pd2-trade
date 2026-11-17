/**
 * The market result card's and row's shared anatomy (listings and buy requests alike): the card frame, its art
 * tile, title, pills, footer strip and realm chip, the compact row frame, and the virtualized lists both views
 * scroll in. Content stays with each kind of result.
 */
import React, { useEffect, useRef, useState } from 'react';
import moment from 'moment';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tip } from '@/components/ui/tooltip';
import { useTranslation } from '@/i18n';
import { EnterOnce, type EnterTracker } from './EnterOnce';

/** A failed next-page load (see useMarketSearch). */
export interface LoadMoreState {
  error: string | null;
  /** Rate limited: Retry stays disabled until then (epoch ms). */
  retryAt: number | null;
  onRetry: () => void;
}

/** Under the results: "Loading more…", or "Couldn't load more · Retry" after a failed page. */
export function LoadMoreFooter({ loading, error, retryAt, onRetry }: LoadMoreState & { loading: boolean }) {
  const { t } = useTranslation(['market', 'common']);
  // Rate limited: Retry unlocks when `retryAt` has passed (the timer marks it; no clock read during render)
  const [unlockedAt, setUnlockedAt] = useState<number | null>(null);
  const waiting = retryAt !== null && unlockedAt !== retryAt;
  useEffect(() => {
    if (retryAt === null) return;
    const timer = window.setTimeout(() => setUnlockedAt(retryAt), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  if (loading) {
    return (
      <div aria-busy
        className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        {t('results.loadingMore')}
      </div>
    );
  }
  if (!error) return null;
  return (
    <div role="status"
      className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
      <Tip label={error}>
        <span>{t('results.loadMoreFailed')}</span>
      </Tip>
      <span aria-hidden>·</span>
      <Tip
        label={
          waiting && retryAt !== null ? t('results.rateLimitedUntil', { time: moment(retryAt).format('LT') }) : error
        }
      >
        <button
          type="button"
          aria-disabled={waiting}
          onClick={waiting ? undefined : onRetry}
          className="rounded-sm font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60 aria-disabled:cursor-not-allowed aria-disabled:text-muted-foreground aria-disabled:no-underline"
        >
          {t('common:actions.retry')}
        </button>
      </Tip>
    </div>
  );
}

/** A card pill (quality, sockets, flags). */
export const CARD_PILL = 'inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-medium leading-none';

/**
 * A card's item pills (listing and buy request alike): quality, sockets, Corrupted, Ethereal, then `children` (the
 * kind's own pills).
 */
export function ItemPills({
  quality,
  qualityClassName,
  sockets,
  corrupted,
  ethereal,
  children,
}: {
  quality: string | null;
  qualityClassName?: string;
  /** "3os", "2+os"; none when null. */
  sockets: string | null;
  corrupted: boolean;
  ethereal: boolean;
  children?: React.ReactNode;
}) {
  return (
    <>
      {quality && <span className={cn(CARD_PILL, 'border-border/70', qualityClassName)}>{quality}</span>}
      {sockets && <span className={cn(CARD_PILL, 'border-border/70 text-muted-foreground')}>{sockets}</span>}
      {corrupted && <span className={cn(CARD_PILL, 'border-border/70 text-q-corrupted')}>Corrupted</span>}
      {ethereal && <span className={cn(CARD_PILL, 'border-q-normal bg-q-normal text-background')}>Ethereal</span>}
      {children}
    </>
  );
}

/** The selectable card frame. */
export function CardShell({
  id,
  selected,
  onSelect,
  className,
  children,
}: {
  /** `data-result-id`: what the list scrolls to. */
  id: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article
      role="option"
      aria-selected={selected}
      data-result-id={id}
      onClick={onSelect}
      className={cn(
        'cursor-default overflow-hidden rounded-lg border bg-foreground/[0.015] transition-colors duration-(--dur-fast)',
        selected ? 'border-primary' : 'border-border/60 hover:border-border',
        className,
      )}
    >
      {children}
    </article>
  );
}

/** The card header: art tile, title block (title, subtitle, pills), right column. */
export function CardHeader({
  art,
  title,
  titleClassName,
  subtitle,
  pills,
  aside,
}: {
  art: React.ReactNode;
  title: string;
  titleClassName: string;
  subtitle?: React.ReactNode;
  pills: React.ReactNode;
  aside: React.ReactNode;
}) {
  return (
    <header className="flex gap-3 p-3 pb-2">
      <div className="flex h-[76px] w-16 shrink-0 items-center justify-center rounded-md border border-border/50">
        {art}
      </div>
      <div className="min-w-0 flex-1">
        <Tip label={title}>
          <h3 className={cn('truncate text-sm font-bold uppercase tracking-[0.08em]', titleClassName)}>{title}</h3>
        </Tip>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
        <div className="mt-1.5 flex flex-wrap gap-1">{pills}</div>
      </div>
      <div className="flex max-w-[40%] shrink-0 flex-col items-end gap-1 text-right">{aside}</div>
    </header>
  );
}

/** The card's quiet bottom strip: who / when on the left, actions on the right. */
export function CardFooter({ info, actions }: { info: React.ReactNode; actions: React.ReactNode }) {
  return (
    <footer className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/60 bg-foreground/[0.045] px-3 py-1.5 text-xs">
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">{info}</span>
      <span className="flex shrink-0 items-center gap-1">{actions}</span>
    </footer>
  );
}

/** The person pill of a card footer (seller or buyer). */
export function PersonPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 min-w-0 items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 pl-2 pr-2.5">
      {children}
    </span>
  );
}

/** "3d" with a clock, its meaning on hover. */
export function AgeChip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tip label={label}>
      <span className="inline-flex items-center gap-1 tabular-nums">
        <Clock className="size-3" />
        {children}
      </span>
    </Tip>
  );
}

/** "SC · Ladder". */
export function RealmChip({ hardcore, ladder }: { hardcore: boolean; ladder: boolean }) {
  return (
    <span className="rounded border border-border/60 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide">
      {`${hardcore ? 'HC' : 'SC'} · ${ladder ? 'Ladder' : 'Non-ladder'}`}
    </span>
  );
}

/** A compact result row's frame classes (fills the virtual row; the selected one marked on the left). */
const rowShellClass = (selected: boolean) =>
  cn(
    'flex h-full w-full cursor-default items-center gap-2.5 border-b border-border/40 px-2.5 transition-colors duration-(--dur-med)',
    selected ? 'bg-accent/70 shadow-[inset_2px_0_0_var(--primary)]' : 'hover:bg-accent/30',
  );

/**
 * A compact result row (listing or buy request): art, the title line, a one-line summary (its full text on hover)
 * and anything under it, then the right column (price, its note, who and when).
 */
export function ResultRowFrame({
  id,
  selected,
  onSelect,
  art,
  title,
  summary,
  extra,
  aside,
  className,
}: {
  id: string;
  selected: boolean;
  onSelect: () => void;
  art: React.ReactNode;
  title: React.ReactNode;
  summary: string;
  extra?: React.ReactNode;
  aside: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="option"
      aria-selected={selected}
      data-result-id={id}
      onClick={onSelect}
      className={cn(rowShellClass(selected), className)}
    >
      {art}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-1.5">{title}</div>
        <Tip label={summary || undefined}>
          <div className="truncate text-[11px] leading-4 text-muted-foreground">{summary || '\u00a0'}</div>
        </Tip>
        {extra}
      </div>
      <div className="flex w-28 shrink-0 flex-col items-end gap-0.5">{aside}</div>
    </div>
  );
}

/** A row's item flags after its name, as listing rows abbreviate them: eth, anniv, sockets, corr. */
export function RowFlags({
  ethereal,
  anniversary = false,
  sockets,
  corrupted,
}: {
  ethereal: boolean;
  anniversary?: boolean;
  /** "3os", "2–4os"; none when null. */
  sockets: string | null;
  corrupted: boolean;
}) {
  return (
    <>
      {ethereal && <span className="shrink-0 text-[10px] text-info">eth</span>}
      {anniversary && <span className="shrink-0 text-[10px] text-q-unique">anniv</span>}
      {sockets && <span className="shrink-0 text-[10px] text-muted-foreground">{sockets}</span>}
      {corrupted && <span className="shrink-0 text-[10px] text-q-corrupted">corr</span>}
    </>
  );
}

/** Rows from the end at which the next server page is requested. */
const ROWS_LOAD_AHEAD = 6;
/** Cards from the end at which the next server page is requested. */
const CARDS_LOAD_AHEAD = 3;
const CARD_GAP = 8;
const CARD_PADDING = 8;
const ESTIMATED_CARD_HEIGHT = 340;

interface VirtualListProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  selectedKey: string | null;
  /** Entrance animations of this result set (each result enters once; see EnterOnce). */
  enter: EnterTracker;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  /** A failed next page: the footer offers Retry instead of loading on scroll. */
  loadMore: LoadMoreState;
  ariaLabel: string;
}

/** Shared list mechanics: virtualizer, back to the top for a fresh set, selection kept in view, infinite load. */
function useVirtualResults<T>(
  { items, getKey, selectedKey, enter, hasMore, loadingMore, onLoadMore }: VirtualListProps<T>,
  options: { estimateSize: number; overscan: number; ahead: number; padding?: number; gap?: number },
) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- no React Compiler; the virtualizer re-renders us
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () =>
      containerRef.current?.querySelector<HTMLDivElement>('[data-slot="scroll-area-viewport"]') ?? null,
    estimateSize: () => options.estimateSize,
    getItemKey: (index) => getKey(items[index]),
    overscan: options.overscan,
    paddingStart: options.padding,
    paddingEnd: options.padding,
    gap: options.gap,
  });

  // A fresh result set (new search, filter change) starts at the top; appended pages keep the position.
  // Before the selection effect, so a kept selection still scrolls into view.
  useEffect(() => {
    virtualizer.scrollToOffset(0);
  }, [enter.generation, virtualizer]);

  // Keep the keyboard selection in view
  const selectedIndex = selectedKey ? items.findIndex((item) => getKey(item) === selectedKey) : -1;
  useEffect(() => {
    if (selectedIndex >= 0) virtualizer.scrollToIndex(selectedIndex, { align: 'auto' });
  }, [selectedIndex, virtualizer]);

  // Infinite load: the last rendered result is near the end
  const lastVisible = virtualizer.getVirtualItems().at(-1)?.index ?? -1;
  useEffect(() => {
    if (hasMore && !loadingMore && items.length > 0 && lastVisible >= items.length - options.ahead) onLoadMore();
  }, [hasMore, loadingMore, lastVisible, items.length, onLoadMore, options.ahead]);

  return { containerRef, virtualizer };
}

/** Virtualized compact rows of a fixed height. */
export function VirtualRowList<T>({
  rowHeight,
  renderRow,
  footer,
  ...props
}: VirtualListProps<T> & {
  rowHeight: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { items, getKey, enter, loadingMore, loadMore, ariaLabel } = props;
  const { containerRef, virtualizer } = useVirtualResults(props, {
    estimateSize: rowHeight,
    overscan: 10,
    ahead: ROWS_LOAD_AHEAD,
  });
  return (
    <ScrollArea
      ref={containerRef}
      className="min-h-0 flex-1 overflow-hidden [&_[data-radix-scroll-area-viewport]>div]:!block"
    >
      <div
        role="listbox"
        aria-label={ariaLabel}
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((row) => {
          const item = items[row.index];
          return (
            <div
              key={`${enter.generation}:${row.key}`}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${row.start}px)`, height: rowHeight }}
            >
              <EnterOnce tracker={enter}
                id={getKey(item)}
                index={row.index}
                className="h-full">
                {renderRow(item, row.index)}
              </EnterOnce>
            </div>
          );
        })}
      </div>
      <LoadMoreFooter loading={loadingMore}
        {...loadMore} />
      {footer}
    </ScrollArea>
  );
}

/** Full-width cards, one per row, virtualized (cards vary in height, so each is measured). */
export function VirtualCardList<T>({
  renderCard,
  ...props
}: VirtualListProps<T> & { renderCard: (item: T, index: number) => React.ReactNode }) {
  const { items, getKey, enter, loadingMore, loadMore, ariaLabel } = props;
  const { containerRef, virtualizer } = useVirtualResults(props, {
    estimateSize: ESTIMATED_CARD_HEIGHT,
    overscan: 3,
    ahead: CARDS_LOAD_AHEAD,
    padding: CARD_PADDING,
    gap: CARD_GAP,
  });
  return (
    <ScrollArea
      ref={containerRef}
      className="min-h-0 flex-1 overflow-hidden [&_[data-radix-scroll-area-viewport]>div]:!block"
    >
      <div
        role="listbox"
        aria-label={ariaLabel}
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((row) => {
          const item = items[row.index];
          return (
            <div
              key={`${enter.generation}:${row.key}`}
              ref={virtualizer.measureElement}
              data-index={row.index}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${row.start}px)`, paddingInline: CARD_PADDING }}
            >
              <EnterOnce tracker={enter}
                id={getKey(item)}
                index={row.index}
                className="relative">
                {renderCard(item, row.index)}
              </EnterOnce>
            </div>
          );
        })}
      </div>
      <LoadMoreFooter loading={loadingMore}
        {...loadMore} />
    </ScrollArea>
  );
}
