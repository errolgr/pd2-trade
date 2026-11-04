import * as React from 'react';

import { cn } from '../lib/utils';
import { Button } from './button';
import { ItemName, type ItemQuality } from './item-name';
import { PriceTag, type PriceTrend, type PriceUnit } from './price';

interface DataRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Classes for the value (tone, weight). */
  valueClassName?: string;
  className?: string;
}

/** Label on the left, tabular value on the right ("Samples 84", "Listed 2h ago"). */
function DataRow({ label, value, valueClassName, className }: DataRowProps) {
  return (
    <div data-slot="data-row"
      className={cn('flex items-baseline justify-between gap-3 text-xs', className)}>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={cn('min-w-0 truncate text-right tabular-nums', valueClassName)}>{value}</span>
    </div>
  );
}

interface StatLineProps {
  /** The mod text as the game prints it ("+2 to All Skills"). */
  children: React.ReactNode;
  /** Roll range, rendered muted after the text ("[1 - 3]"); omitted when min equals max. */
  range?: readonly [number, number];
  /** Corrupted mods read in the corruption colour. */
  corrupted?: boolean;
  className?: string;
}

/** One item mod line in the in-game magic colour, optional roll range. */
function StatLine({ children, range, corrupted = false, className }: StatLineProps) {
  return (
    <div data-slot="stat-line"
      className={cn(corrupted ? 'text-q-corrupted' : 'text-q-magic', className)}>
      {children}
      {range && range[0] !== range[1] && (
        <span className="ml-1 text-2xs text-muted-foreground tabular-nums">{`[${range[0]} - ${range[1]}]`}</span>
      )}
    </div>
  );
}

interface MarketRowProps {
  name: React.ReactNode;
  quality?: ItemQuality | (string & {}) | null;
  runeword?: boolean;
  /** Art or RuneIcon on the left. */
  icon?: React.ReactNode;
  /** Second line under the name (base, seller, mods summary). */
  subtitle?: React.ReactNode;
  /** Asking / estimated price on the right; omit for unpriced listings and pass `meta` instead. */
  price?: { amount: number; unit: PriceUnit; rune?: string; trend?: PriceTrend };
  /** Muted text under the price (age, "offer"). */
  meta?: React.ReactNode;
  /** Makes the row a ghost row button. */
  onClick?: () => void;
  /** Marks the current row (with onClick). */
  selected?: boolean;
  className?: string;
}

/** One market listing / offer: icon, quality-coloured name with a sub-line, price on the right. */
function MarketRow({
  name,
  quality,
  runeword,
  icon,
  subtitle,
  price,
  meta,
  onClick,
  selected,
  className,
}: MarketRowProps) {
  const body = (
    <>
      {icon && <span className="flex size-8 shrink-0 items-center justify-center [&_img]:max-h-full">{icon}</span>}
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <ItemName name={name}
          quality={quality}
          runeword={runeword}
          className="truncate text-sm font-medium" />
        {subtitle && <span className="truncate text-2xs text-muted-foreground">{subtitle}</span>}
      </span>
      {(price || meta) && (
        <span className="flex shrink-0 flex-col items-end leading-tight">
          {price && <PriceTag {...price}
            className="text-sm font-semibold text-foreground" />}
          {meta && <span className="text-2xs text-muted-foreground">{meta}</span>}
        </span>
      )}
    </>
  );
  if (onClick) {
    return (
      <Button
        variant="ghost"
        size="row"
        data-slot="market-row"
        aria-current={selected || undefined}
        className={className}
        onClick={onClick}
      >
        {body}
      </Button>
    );
  }
  return (
    <div data-slot="market-row"
      className={cn('flex w-full items-center gap-2 px-2 py-1.5', className)}>
      {body}
    </div>
  );
}

export { DataRow, StatLine, MarketRow };
export type { DataRowProps, StatLineProps, MarketRowProps };
