import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchPriceHistory, type PriceHistoryPoint } from '@/pages/currency/lib/price-api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

const DAY_MS = 24 * 60 * 60 * 1000;
const WIDTH = 220;
const HEIGHT = 32;

export interface SparklineQuery {
  baseCode: string;
  isLadder: boolean;
  isHardcore: boolean;
  /** Season bounds (YYYY-MM-DD) from getSeasonDateConfig: the 30 days are clamped to the season. */
  seasonStart?: string;
  seasonEnd?: string;
}

/** One request per item + mode + season for the app's lifetime; failed lookups are retried on the next open. */
const historyCache = new Map<string, Promise<PriceHistoryPoint[] | null>>();

function loadHistory(key: string, { baseCode, isLadder, isHardcore, seasonStart, seasonEnd }: SparklineQuery) {
  let pending = historyCache.get(key);
  if (!pending) {
    // Last 30 days, or the last 30 days of a past season.
    const end = seasonEnd ? new Date(seasonEnd) : new Date();
    let startDate = new Date(end.getTime() - 30 * DAY_MS).toISOString().slice(0, 10);
    if (seasonStart && seasonStart > startDate) startDate = seasonStart;
    pending = fetchPriceHistory(baseCode, { isLadder, isHardcore, startDate, endDate: seasonEnd, limit: 31 }).then(
      (res) => res?.data.filter((p) => p.avgPrice > 0) ?? null,
    );
    historyCache.set(key, pending);
    pending.then((points) => {
      if (!points) historyCache.delete(key);
    });
  }
  return pending;
}

/**
 * 30-day price line with its change %, for the price-check popover. Mount it only inside the open popover:
 * it fetches on mount (cached per item and mode).
 */
export function PriceSparkline({ query }: { query: SparklineQuery }) {
  const { t } = useTranslation('priceCheck');
  const { baseCode, isLadder, isHardcore, seasonStart, seasonEnd } = query;
  const key = [baseCode, isLadder, isHardcore, seasonStart, seasonEnd].join('|');
  const [loaded, setLoaded] = useState<{ key: string; points: PriceHistoryPoint[] | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadHistory(key, { baseCode, isLadder, isHardcore, seasonStart, seasonEnd }).then((points) => {
      if (!cancelled) setLoaded({ key, points });
    });
    return () => {
      cancelled = true;
    };
  }, [key, baseCode, isLadder, isHardcore, seasonStart, seasonEnd]);

  // undefined = still loading (also right after the query changed)
  const points = loaded?.key === key ? loaded.points : undefined;

  if (points === undefined) {
    return (
      <div className="flex h-8 items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        {t('sparkline.loading')}
      </div>
    );
  }
  if (!points || points.length < 2) {
    return <div className="text-xs text-muted-foreground">{t('sparkline.notEnough')}</div>;
  }

  const prices = points.map((p) => p.avgPrice);
  const min = Math.min(...prices);
  const range = Math.max(...prices) - min || 1;
  const path = prices
    .map((price, i) => {
      const x = (i / (prices.length - 1)) * WIDTH;
      const y = HEIGHT - 2 - ((price - min) / range) * (HEIGHT - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const first = prices[0];
  const last = prices[prices.length - 1];
  const changePercent = ((last - first) / first) * 100;
  const up = changePercent >= 0;

  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className={cn('h-8 min-w-0 flex-1', up ? 'text-success' : 'text-destructive')}
        role="img"
        aria-label={t('sparkline.aria', { count: points.length, first: first.toFixed(2), last: last.toFixed(2) })}
      >
        <polyline
          points={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className={cn('shrink-0 text-xs font-semibold tabular-nums', up ? 'text-success' : 'text-destructive')}
        title={`${first.toFixed(2)} → ${last.toFixed(2)} HR`}
      >
        {up ? '+' : ''}
        {changePercent.toFixed(1)}%
      </span>
    </div>
  );
}
