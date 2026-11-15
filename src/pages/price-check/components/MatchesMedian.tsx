import { HoverPopover } from '@/components/custom/hover-popover';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { formatHrPrice } from '@/pages/market/components/ResultsList';
import {
  type MarketPriceStats,
  MIN_MEDIAN_SAMPLE,
  type SpreadChart,
  spreadChart,
} from '@/pages/market/lib/price-stats';

const hr = (price: number) => price.toFixed(2);

/** Nearest two axis labels' centres may come (share of the axis width): closer, the lower-priority one is dropped. */
const LABEL_GAP = 0.11;

interface AxisLabel {
  /** Centre on the axis, 0–1. */
  at: number;
  text: string;
  strong?: boolean;
}

/**
 * Prices under the chart where they apply: the median (always), the axis ends, then the middle half's edges, each
 * dropped when it would overlap one already placed.
 */
function axisLabels(chart: SpreadChart, stats: MarketPriceStats & { median: number }): AxisLabel[] {
  const clamp = (at: number) => Math.min(0.94, Math.max(0.06, at));
  const candidates: AxisLabel[] = [
    { at: clamp(chart.at(stats.median)), text: hr(stats.median), strong: true },
    { at: 0.06, text: hr(chart.min) },
    { at: 0.92, text: `${hr(chart.max)} HR` },
    ...[stats.p25, stats.p75].flatMap((price) =>
      price === null ? [] : [{ at: clamp(chart.at(price)), text: hr(price) }],
    ),
  ];
  const placed: AxisLabel[] = [];
  for (const label of candidates) {
    if (placed.every((other) => Math.abs(other.at - label.at) >= LABEL_GAP)) placed.push(label);
  }
  return placed;
}

/**
 * "· median 2.5 HR" after the results' match count: the median HR price of every listing the search matches (all
 * pages), with a hover popover of their spread (histogram with prices on its axis, median / middle half / average).
 * Nothing below MIN_MEDIAN_SAMPLE priced matches. `archived`: the search ran over ended listings (the prices are
 * last asks).
 */
export function MatchesMedian({ stats, archived }: { stats: MarketPriceStats; archived: boolean }) {
  const { t } = useTranslation('priceCheck');
  if (stats.count < MIN_MEDIAN_SAMPLE || stats.median === null) return null;
  const median = stats.median;
  const chart = spreadChart(stats);
  const peak = chart ? Math.max(...chart.bars.map((b) => b.count)) : 0;
  const band = chart && stats.p25 !== null && stats.p75 !== null ? [chart.at(stats.p25), chart.at(stats.p75)] : null;

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
                  style={{ left: `${chart.at(median) * 100}%` }}
                />
              </div>
              <div className="relative mt-1 h-3.5 text-[10px] tabular-nums"
                data-testid="price-spread-axis">
                {axisLabels(chart, { ...stats, median }).map((label) => (
                  <span
                    key={label.text}
                    className={cn(
                      'absolute -translate-x-1/2 whitespace-nowrap leading-none',
                      label.strong ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                    style={{ left: `${label.at * 100}%` }}
                  >
                    {label.text}
                  </span>
                ))}
              </div>
            </div>
          )}
          <dl className="grid grid-cols-3 gap-2 tabular-nums">
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t('overlay.results.spread.median')}
              </dt>
              <dd className="text-sm font-semibold">{hr(median)} HR</dd>
            </div>
            {stats.p25 !== null && stats.p75 !== null && (
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t('overlay.results.spread.middleHalf')}
                </dt>
                <dd className="text-sm">
                  {hr(stats.p25)}–{hr(stats.p75)}
                </dd>
              </div>
            )}
            {stats.avg !== null && (
              <div>
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
