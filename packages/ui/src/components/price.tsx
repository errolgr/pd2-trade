import * as React from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { cn } from '../lib/utils';
import { useUiLabels } from '../lib/labels';
import { RuneIcon } from './rune-icon';

export type PriceUnit = 'hr' | 'rune' | 'gold';
export type PriceTrend = 'up' | 'down' | 'flat';

/**
 * HR with precision that suits the size: 0.04, 1.30, 27.5, 340, 1.2k. Sub-cent amounts (low runes) keep two
 * significant digits (0.0042) so they never read as 0.00.
 */
export function formatHrAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  if (abs > 0 && abs < 0.01) return String(Number(value.toPrecision(2)));
  return value.toFixed(2);
}

/** The number part of a price in `unit`: HR via formatHrAmount, rune counts up to 2 decimals, gold grouped. */
export function formatAmount(value: number, unit: PriceUnit, locale?: string): string {
  if (!Number.isFinite(value)) return '—';
  switch (unit) {
    case 'hr':
      return formatHrAmount(value);
    case 'rune':
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
    case 'gold':
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  }
}

/** Display string for a price, units included: "1.30 HR", "2 Ber", "2,500,000 gold". */
export function usePriceText(amount: number, unit: PriceUnit, rune?: string): string {
  const labels = useUiLabels();
  const n = formatAmount(amount, unit, labels.locale);
  if (n === '—') return n;
  if (unit === 'hr') return `${n} HR`;
  if (unit === 'gold') return labels.gold(n);
  return rune ? `${n} ${rune.replace(/ Rune$/, '')}` : n;
}

const TREND = {
  up: { icon: TrendingUp, className: 'text-success' },
  down: { icon: TrendingDown, className: 'text-destructive' },
  flat: { icon: Minus, className: 'text-muted-foreground' },
} as const;

interface PriceTagProps {
  amount: number;
  unit: PriceUnit;
  /** Unit `rune`: the rune the amount is counted in ("Ber"); shows its icon. */
  rune?: string;
  /** Price movement marker after the amount. */
  trend?: PriceTrend;
  className?: string;
}

/** An inline price: tabular amount + unit, optional trend arrow. Inherits font size. */
function PriceTag({ amount, unit, rune, trend, className }: PriceTagProps) {
  const text = usePriceText(amount, unit, rune);
  const t = trend ? TREND[trend] : null;
  return (
    <span
      data-slot="price-tag"
      data-unit={unit}
      className={cn('inline-flex items-center gap-1 whitespace-nowrap tabular-nums', className)}
    >
      {unit === 'rune' && rune && <RuneIcon rune={rune}
        className="size-3.5" />}
      {text}
      {t && <t.icon aria-hidden
        data-trend={trend}
        className={cn('size-3 shrink-0', t.className)} />}
    </span>
  );
}

interface CurrencyAmountProps {
  amount: number;
  unit: PriceUnit;
  rune?: string;
  /** Uppercase eyebrow above the value ("Total", "Stash value"). */
  label?: React.ReactNode;
  /** Signed change shown as a tinted pill next to the value, in the same unit. */
  delta?: number;
  /** `base` panel value, `2xl` headline, `display` the one hero total of a surface. */
  size?: 'sm' | 'base' | '2xl' | 'display';
  className?: string;
}

const AMOUNT_SIZE = {
  sm: 'text-sm',
  base: 'text-base',
  '2xl': 'text-2xl',
  display: 'text-display',
} as const;

function DeltaPill({ delta, unit, rune }: { delta: number; unit: PriceUnit; rune?: string }) {
  const text = usePriceText(Math.abs(delta), unit, rune);
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  return (
    <span
      data-slot="currency-delta"
      className={cn(
        'rounded-sm px-1 py-px text-2xs font-medium tabular-nums',
        delta > 0
          ? 'bg-success/12 text-success'
          : delta < 0
            ? 'bg-destructive/12 text-destructive'
            : 'bg-muted/60 text-muted-foreground',
      )}
    >
      {sign}
      {text}
    </span>
  );
}

/** A headline value: optional eyebrow label, the amount at a hero size, optional signed change. */
function CurrencyAmount({ amount, unit, rune, label, delta, size = 'base', className }: CurrencyAmountProps) {
  return (
    <div data-slot="currency-amount"
      className={cn('flex flex-col gap-0.5', className)}>
      {label && <span className="text-3xs font-medium uppercase tracking-caps text-muted-foreground">{label}</span>}
      <span className="flex items-baseline gap-2">
        <PriceTag
          amount={amount}
          unit={unit}
          rune={rune}
          className={cn('font-semibold text-foreground', AMOUNT_SIZE[size])}
        />
        {delta !== undefined && <DeltaPill delta={delta}
          unit={unit}
          rune={rune} />}
      </span>
    </div>
  );
}

export { PriceTag, CurrencyAmount };
export type { PriceTagProps, CurrencyAmountProps };
