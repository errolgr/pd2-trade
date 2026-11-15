import { HoverPopover } from '@/components/custom/hover-popover';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { formatHrPrice } from '@/pages/market/components/ResultsList';
import { type MarketPriceStats, MIN_MEDIAN_SAMPLE, spreadChart } from '@/pages/market/lib/price-stats';

const hr = (price: number) => price.toFixed(2);

/**
 * "· median 2.5 HR" after the results' match count: the median HR price of every listing the search matches (all
 * pages), with a hover popover of their spread (histogram, middle half, average). Nothing below MIN_MEDIAN_SAMPLE
 * priced matches. `archived`: the search ran over ended listings (the prices are last asks).
 */
export function MatchesMedian({ stats, archived }: { stats: MarketPriceStats; archived: boolean }) {
  const { t } = useTranslation('priceCheck');
  if (stats.count < MIN_MEDIAN_SAMPLE || stats.median === null) return null;
  const chart = spreadChart(stats);
  const peak = chart ? Math.max(...chart.bars.map((b) => b.count)) : 0;
  const band = chart && stats.p25 !== null && stats.p75 !== null ? [chart.at(stats.p25), chart.at(stats.p75)] : null;

  return (
    <HoverPopover
      side="top"
      content={
        <div className="w-[300px] max-w-[calc(100vw-16px)] space-y-2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-panel">
          <div className="text-xs font-semibold">{t('overlay.results.spread.title')}</div>
          {chart && (
            <div>
              <div className="relative h-12"
                data-testid="price-spread-chart">
                {band && (
                  <div
                    className="absolute inset-y-0 rounded-sm bg-glow/10 ring-1 ring-inset ring-glow/30"
                    style={{ left: `${band[0] * 100}%`, width: `${Math.max(band[1] - band[0], 0.01) * 100}%` }}
                  />
                )}
                <div className="absolute inset-0 flex items-end gap-px">
                  {chart.bars.map((bar, i) => {
                    const mid = chart.at(Math.sqrt(bar.from * bar.to));
                    const inBand = !!band && mid >= band[0] && mid <= band[1];
                    return (
                      <div
                        key={i}
                        className={cn('flex-1 rounded-t-[1px]', inBand ? 'bg-glow/70' : 'bg-muted-foreground/35')}
                        style={{ height: bar.count ? `${Math.max(8, (bar.count / peak) * 100)}%` : 0 }}
                      />
                    );
                  })}
                </div>
                <div
                  className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground"
                  style={{ left: `${chart.at(stats.median) * 100}%` }}
                />
              </div>
              <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-muted-foreground">
                <span>{hr(chart.min)}</span>
                <span>{hr(chart.max)} HR</span>
              </div>
            </div>
          )}
          <p className="text-xs tabular-nums">
            {[
              stats.p25 !== null &&
                stats.p75 !== null &&
                t('overlay.results.spread.middleHalf', { low: hr(stats.p25), high: hr(stats.p75) }),
              stats.avg !== null && t('overlay.results.spread.average', { price: hr(stats.avg) }),
              t('overlay.results.spread.listings', { count: stats.count }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
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
