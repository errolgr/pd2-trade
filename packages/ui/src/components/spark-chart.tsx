import { cn } from '../lib/utils';

const WIDTH = 220;
const HEIGHT = 32;

/** Percent change from the first to the last point; null without two points or from a zero start. */
export function sparkChange(points: readonly number[]): number | null {
  if (points.length < 2 || points[0] === 0) return null;
  return ((points[points.length - 1] - points[0]) / points[0]) * 100;
}

/** SVG polyline points for `values` scaled into a WIDTH×HEIGHT box (2px vertical inset). */
export function sparkPath(values: readonly number[]): string {
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * WIDTH;
      const y = HEIGHT - 2 - ((v - min) / range) * (HEIGHT - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

interface SparkChartProps {
  /** Values in time order (oldest first). Renders nothing with fewer than two. */
  points: readonly number[];
  /** Line colour: `trend` (default) green when up / red when down, or a fixed tone. */
  tone?: 'trend' | 'muted' | 'primary';
  /** Shows the first→last change % after the line. Default true. */
  showChange?: boolean;
  /** Screen-reader description of the series. */
  'aria-label'?: string;
  /** Tooltip on the change % (e.g. "0.42 → 0.51 HR"). */
  changeTitle?: string;
  className?: string;
}

/** Compact price line (30-day history) with its change %. Stretches to its container width, h-8. */
function SparkChart({
  points,
  tone = 'trend',
  showChange = true,
  'aria-label': ariaLabel,
  changeTitle,
  className,
}: SparkChartProps) {
  if (points.length < 2) return null;
  const change = sparkChange(points);
  const up = (change ?? 0) >= 0;
  const color =
    tone === 'muted'
      ? 'text-muted-foreground'
      : tone === 'primary'
        ? 'text-primary'
        : up
          ? 'text-success'
          : 'text-destructive';
  return (
    <div data-slot="spark-chart"
      className={cn('flex items-center gap-3', className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className={cn('h-8 min-w-0 flex-1', color)}
        role="img"
        aria-label={ariaLabel}
      >
        <polyline
          points={sparkPath(points)}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {showChange && change !== null && (
        <span
          className={cn('shrink-0 text-xs font-semibold tabular-nums', up ? 'text-success' : 'text-destructive')}
          title={changeTitle}
        >
          {up ? '+' : ''}
          {change.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

export { SparkChart };
export type { SparkChartProps };
