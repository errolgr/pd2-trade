import { cn } from '@/lib/utils';
import type { PriceBucket } from '../lib/facets';
import { currentLocale, useTranslation } from '@/i18n';

/*
 * Facet counts beside the filter sidebar's options: how many listings each choice finds (see lib/facets.ts).
 */

/** A muted listing count after an option label; nothing while counts are unknown. */
export function FacetCount({ count, className }: { count: number | undefined; className?: string }) {
  if (count === undefined) return null;
  return (
    <span
      data-facet-count
      className={cn('ml-1.5 text-[10px] font-normal tabular-nums text-muted-foreground', className)}
    >
      {count.toLocaleString(currentLocale())}
    </span>
  );
}

/**
 * Socket counts as chips (0 = unsocketed): picking one sets min = max = n, picking the active one clears the range.
 */
export function SocketChips({
  counts,
  min,
  max,
  onPick,
}: {
  counts: Map<number, number>;
  min: number | undefined;
  max: number | undefined;
  onPick: (min: number | undefined, max: number | undefined) => void;
}) {
  const { t } = useTranslation('market');
  if (counts.size === 0) return null;
  return (
    <div role="group"
      aria-label={t('facets.sockets')}
      className="flex flex-wrap gap-1">
      {[...counts].map(([n, count]) => {
        const active = n === 0 ? max === 0 && !min : min === n && max === n;
        return (
          <button
            key={n}
            type="button"
            aria-pressed={active}
            disabled={count === 0 && !active}
            title={t('facets.socketsTitle', { count, sockets: n })}
            onClick={() => (active ? onPick(undefined, undefined) : onPick(n === 0 ? undefined : n, n))}
            className={cn(
              'inline-flex h-5 items-center rounded-full border border-input px-1.5 text-[11px] tabular-nums text-foreground outline-none transition-colors duration-(--dur-fast) hover:border-ring/40 focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-40',
              active && 'border-primary/50 bg-primary/10 text-primary',
            )}
          >
            {n}
            <FacetCount count={count}
              className="ml-1" />
          </button>
        );
      })}
    </div>
  );
}

const hrText = (n: number) => n.toLocaleString(currentLocale(), { maximumFractionDigits: 2 });

/**
 * Listings per effective HR price bucket as a small bar chart; clicking a bar sets the HR range to it (again on the
 * selected bar clears it). Bars inside the current range are highlighted.
 */
export function PriceHistogram({
  buckets,
  hrMin,
  hrMax,
  onPick,
}: {
  buckets: PriceBucket[];
  hrMin: number | undefined;
  hrMax: number | undefined;
  onPick: (hrMin: number | undefined, hrMax: number | undefined) => void;
}) {
  const { t } = useTranslation('market');
  if (buckets.length === 0) return null;
  const peak = Math.max(1, ...buckets.map((b) => b.count));
  const last = buckets[buckets.length - 1];
  return (
    <div>
      <div role="group"
        aria-label={t('facets.priceHistogram')}
        className="flex h-9 items-end gap-px">
        {buckets.map((b) => {
          const range = b.to === null ? `${hrText(b.from)}+` : `${hrText(b.from)}–${hrText(b.to)}`;
          const exact = hrMin === b.from && hrMax === (b.to ?? undefined);
          const inRange =
            (hrMin !== undefined || hrMax !== undefined) &&
            b.from >= (hrMin ?? 0) &&
            (hrMax === undefined || (b.to !== null && b.to <= hrMax));
          return (
            <button
              key={b.from}
              type="button"
              aria-pressed={exact}
              title={t('facets.priceTitle', { count: b.count, range })}
              onClick={() => (exact ? onPick(undefined, undefined) : onPick(b.from, b.to ?? undefined))}
              className="group flex h-full min-w-0 flex-1 items-end rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <span
                // Square root: one cheap bucket shouldn't flatten the rest
                style={{ height: `${b.count ? Math.max(8, Math.sqrt(b.count / peak) * 100) : 0}%` }}
                className={cn(
                  'block w-full rounded-[2px] bg-muted-foreground/35 transition-colors duration-(--dur-fast) group-hover:bg-primary/70',
                  inRange && 'bg-primary/80',
                )}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>{hrText(buckets[0].from)}</span>
        <span>{t('facets.priceAxis', { hr: hrText(last.from) })}</span>
      </div>
    </div>
  );
}
