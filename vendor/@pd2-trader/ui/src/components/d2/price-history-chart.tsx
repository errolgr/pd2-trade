import * as React from 'react';
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from 'recharts';

import { cn } from '../../lib/utils';
import { ChartContainer, ChartTooltip, type ChartConfig } from '../chart';
import { formatAmount, PriceTag, type PriceUnit } from '../price';
import { sparkChange } from '../spark-chart';
import { useD2Labels } from './labels';

export interface PricePoint {
  /** Epoch ms. */
  t: number;
  /** Median price in `unit`. */
  value: number;
  /** Listings / trades behind the point; drawn as bars when any point has it. */
  volume?: number;
}

interface PriceHistoryChartProps {
  points: readonly PricePoint[];
  unit: PriceUnit;
  /** Unit `rune`: the rune the prices are counted in. */
  rune?: string;
  /** X-axis tick and tooltip time label; default a short locale date. */
  formatTime?: (t: number) => string;
  /** Line color: `trend` (default) green up / red down over the range, or the theme's first chart color. */
  tone?: 'trend' | 'chart';
  /** Accessible summary ("Ber, 30 days, 1.10 → 1.35 HR"). */
  'aria-label'?: string;
  /** Chart height in px. Default 160. */
  height?: number;
  className?: string;
}

const defaultTime = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/**
 * A price history line (area) with optional volume bars, on the theme's chart tokens: hover shows the date, the
 * price as a `PriceTag` and the volume. `SparkChart` is the inline version without axes.
 */
function PriceHistoryChart({
  points,
  unit,
  rune,
  formatTime = defaultTime,
  tone = 'trend',
  'aria-label': ariaLabel,
  height = 160,
  className,
}: PriceHistoryChartProps) {
  const l = useD2Labels();
  const change = sparkChange(points.map((p) => p.value));
  const color = tone === 'chart' ? 'var(--chart-1)' : (change ?? 0) >= 0 ? 'var(--success)' : 'var(--destructive)';
  const config = {
    value: { label: unit === 'rune' ? (rune ?? l.price) : unit.toUpperCase(), color },
    volume: { label: l.volume, color: 'var(--muted-foreground)' },
  } satisfies ChartConfig;
  const hasVolume = points.some((p) => p.volume !== undefined);
  const data = points as PricePoint[];
  const gradientId = React.useId().replace(/:/g, '');
  const Chart = hasVolume ? ComposedChart : AreaChart;

  return (
    <div data-slot="price-history-chart"
      role="img"
      aria-label={ariaLabel}
      className={cn('w-full', className)}>
      <ChartContainer config={config}
        className="aspect-auto w-full"
        style={{ height }}>
        <Chart data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1">
              <stop offset="0%"
                stopColor="var(--color-value)"
                stopOpacity={0.3} />
              <stop offset="100%"
                stopColor="var(--color-value)"
                stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatTime}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            fontSize={11} />
          <YAxis yAxisId="price"
            tickFormatter={(v: number) => formatAmount(v, unit)}
            tickLine={false}
            axisLine={false}
            width={36}
            fontSize={11}
            domain={['auto', 'auto']} />
          {hasVolume && <YAxis yAxisId="volume"
            orientation="right"
            hide
            domain={[0, (max: number) => max * 4]} />}
          {hasVolume && <Bar yAxisId="volume"
            dataKey="volume"
            fill="var(--color-volume)"
            fillOpacity={0.25}
            radius={[2, 2, 0, 0]} />}
          <Area yAxisId="price"
            dataKey="value"
            type="monotone"
            stroke="var(--color-value)"
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false} />
          <ChartTooltip
            cursor={{ stroke: 'var(--border)' }}
            content={({ active, payload }) => {
              const p = active ? (payload?.[0]?.payload as PricePoint | undefined) : undefined;
              if (!p) return null;
              return (
                <div className="rounded-md border border-border bg-popover px-2 py-1.5 text-xs shadow-panel">
                  <div className="text-2xs text-muted-foreground">{formatTime(p.t)}</div>
                  <PriceTag amount={p.value}
                    unit={unit}
                    rune={rune}
                    className="font-semibold text-foreground" />
                  {p.volume !== undefined && (
                    <div className="text-2xs text-muted-foreground tabular-nums">{`${l.volume} ${p.volume}`}</div>
                  )}
                </div>
              );
            }}
          />
        </Chart>
      </ChartContainer>
    </div>
  );
}

export { PriceHistoryChart };
export type { PriceHistoryChartProps };
