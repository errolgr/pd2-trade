import { Fragment } from 'react';
import { HoverPopover } from '@/components/custom/hover-popover';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { formatHrPrice } from '@/pages/market/components/ResultsList';
import { type MarketPriceStats, MIN_MEDIAN_SAMPLE, priceLadder, roundHr } from '@/pages/market/lib/price-stats';

const hr = (price: number) => price.toFixed(2);

/**
 * A row's price level, order-book style: where it starts, rounded as HR prices are shown ("2.5 HR" holds 2.5 up to
 * the next level); "<0.01 HR" for the bucket from 0, "1000+ HR" for the open-ended last one.
 */
function levelLabel({ price, from, to }: { price: number; from: number; to: number | null }): string {
  if (to === null) return `${price}+ HR`;
  if (from === 0) return `<${roundHr(to)} HR`;
  return `${price} HR`;
}

/**
 * "· median 2.5 HR" after the results' match count: the median HR price of every listing the search matches (all
 * pages), with a hover popover of their spread as an ask ladder (listings per price bucket, cheapest first; the
 * median's bucket marked, the middle half's highlighted) and median / middle half / average. Nothing below
 * MIN_MEDIAN_SAMPLE priced matches. `archived`: the search ran over ended listings (the prices are last asks).
 */
export function MatchesMedian({ stats, archived }: { stats: MarketPriceStats; archived: boolean }) {
  const { t } = useTranslation('priceCheck');
  if (stats.count < MIN_MEDIAN_SAMPLE || stats.median === null) return null;
  const median = stats.median;
  const ladder = priceLadder(stats);

  return (
    <HoverPopover
      side="top"
      content={
        <div className="w-[300px] max-w-[calc(100vw-16px)] space-y-2.5 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-panel">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold">{t('overlay.results.spread.title')}</span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {t('overlay.results.spread.listings', { count: stats.count })}
            </span>
          </div>
          {ladder && (
            <div
              className="grid grid-cols-[0.5rem_auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 text-[11px] tabular-nums"
              data-testid="price-ladder"
            >
              {ladder.rows.map((row) => (
                <Fragment key={row.from}>
                  <span className="text-[9px] leading-none text-foreground">{row.median ? '▸' : ''}</span>
                  <span
                    className={cn(
                      'whitespace-nowrap text-right',
                      row.median ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {levelLabel(row)}
                  </span>
                  <div className="h-2.5 overflow-hidden rounded-[3px] bg-muted/40">
                    <div
                      className={cn('h-full rounded-[3px]', row.middleHalf ? 'bg-glow/70' : 'bg-muted-foreground/35')}
                      style={{ width: `${Math.max(6, (row.count / ladder.peak) * 100)}%` }}
                    />
                  </div>
                  <span
                    className={cn('text-right', row.median ? 'font-semibold text-foreground' : 'text-muted-foreground')}
                  >
                    {row.count}
                  </span>
                </Fragment>
              ))}
              {ladder.more && (
                <span className="col-span-3 col-start-2 text-muted-foreground">
                  {t('overlay.results.spread.more', { n: ladder.more.count, price: ladder.more.price })}
                </span>
              )}
            </div>
          )}
          <dl className="grid grid-cols-3 gap-2 tabular-nums">
            <div className="text-left">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t('overlay.results.spread.median')}
              </dt>
              <dd className="text-sm font-semibold">{hr(median)} HR</dd>
            </div>
            {stats.p25 !== null && stats.p75 !== null && (
              <div className="col-start-2 text-center">
                <dt className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span aria-hidden
                    className="size-2 rounded-[2px] bg-glow/70" />
                  {t('overlay.results.spread.middleHalf')}
                </dt>
                <dd className="text-sm">
                  {hr(stats.p25)}–{hr(stats.p75)}
                </dd>
              </div>
            )}
            {stats.avg !== null && (
              <div className="col-start-3 text-right">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t('overlay.results.spread.average')}
                </dt>
                <dd className="text-sm">{hr(stats.avg)}</dd>
              </div>
            )}
          </dl>
          <p className="text-[11px] text-muted-foreground">
            {t(archived ? 'overlay.results.spread.basisExpired' : 'overlay.results.spread.basisLive')}
          </p>
        </div>
      }
    >
      <span className="cursor-default tabular-nums">
        {t('overlay.results.median')}{' '}
        <span className="font-semibold text-foreground underline decoration-dotted decoration-muted-foreground/60 underline-offset-2">
          {formatHrPrice(stats.median)}
        </span>
      </span>
    </HoverPopover>
  );
}
