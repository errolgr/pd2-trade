import * as React from 'react';

import { cn } from '../lib/utils';
import { Button } from './button';
import { ItemName, type ItemQuality } from './item-name';
import { PriceTag, type PriceTrend, type PriceUnit } from './price';

interface DataRowProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Classes for the value (tone, weight). */
  valueClassName?: string;
}

/** Label on the left, tabular value on the right ("Samples 84", "Listed 2h ago"). Forwards its ref (trigger-safe). */
const DataRow = React.forwardRef<HTMLDivElement, DataRowProps>(({ label, value, valueClassName, className, ...props }, ref) => (
  <div ref={ref}
    data-slot="data-row"
    className={cn('flex items-baseline justify-between gap-3 text-xs', className)}
    {...props}>
    <span className="shrink-0 text-muted-foreground">{label}</span>
    <span className={cn('min-w-0 truncate text-right tabular-nums', valueClassName)}>{value}</span>
  </div>
));
DataRow.displayName = 'DataRow';

/**
 * `text` split right after the rolled `value` ("+165%" in "+165% Enhanced Defense") so the roll can be marked;
 * null when the value is not in the text.
 */
export function splitAtValue(text: string, value: number): { before: string; rolled: string; after: string } | null {
  const digits = String(Math.abs(value)).replace('.', '\\.');
  const m = new RegExp(`(^|[^\\d.])(-?${digits}%?)(?![\\d.])`).exec(text);
  if (!m) return null;
  const start = m.index + m[1].length;
  return { before: text.slice(0, start), rolled: m[2], after: text.slice(start + m[2].length) };
}

interface StatLineProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** The mod text as the game prints it ("+2 to All Skills"). */
  children: React.ReactNode;
  /** Roll range, rendered muted after the text ("[1 - 3]"); omitted when min equals max. */
  range?: readonly [number, number];
  /**
   * The rolled value inside a string `children`; with a `range` it is marked (semibold, dotted underline) so variable
   * stats stand out, and `data-perfect` is set when it is the top of the range.
   */
  value?: number;
  /** Corrupted mods read in the corruption colour. */
  corrupted?: boolean;
}

/**
 * One item mod line in the in-game magic colour, optional roll range with the rolled value marked. Forwards its ref
 * and DOM props, so a Tooltip / HoverCard trigger (`asChild`) can wrap it.
 */
const StatLine = React.forwardRef<HTMLDivElement, StatLineProps>(
  ({ children, range, value, corrupted = false, className, ...props }, ref) => {
    const rolls = range !== undefined && range[0] !== range[1];
    const split = rolls && value !== undefined && typeof children === 'string' ? splitAtValue(children, value) : null;
    const perfect = rolls && value !== undefined && value === Math.max(range[0], range[1]);
    return (
      <div ref={ref}
        data-slot="stat-line"
        data-perfect={perfect || undefined}
        className={cn(corrupted ? 'text-q-corrupted' : 'text-q-magic', className)}
        {...props}>
        {split ? (
          <>
            {split.before}
            <span className="font-semibold underline decoration-current/50 decoration-dotted underline-offset-2">
              {split.rolled}
            </span>
            {split.after}
          </>
        ) : (
          children
        )}
        {rolls && (
          <span className="ml-1 text-2xs text-muted-foreground tabular-nums">{`[${range[0]} - ${range[1]}]`}</span>
        )}
      </div>
    );
  },
);
StatLine.displayName = 'StatLine';

interface MarketRowProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children' | 'onClick'> {
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
  /** Makes the row a ghost row link (`<a href>`, keeps cmd-click / new tab); wins over `onClick` for the element. */
  href?: string;
  /** Makes the row a ghost row button. */
  onClick?: React.MouseEventHandler<HTMLElement>;
  /** Marks the current row (with onClick). */
  selected?: boolean;
}

/**
 * One market listing / offer: icon, quality-coloured name with a sub-line, price on the right. Forwards its ref (the
 * row link with `href`, the row button with `onClick`, else the div).
 */
const MarketRow = React.forwardRef<HTMLElement, MarketRowProps>(
  ({ name, quality, runeword, icon, subtitle, price, meta, href, onClick, selected, className, ...props }, ref) => {
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
    if (href) {
      return (
        <Button asChild
          variant="ghost"
          size="row"
          data-slot="market-row"
          aria-current={selected || undefined}
          className={className}>
          <a ref={ref as React.Ref<HTMLAnchorElement>}
            href={href}
            onClick={onClick}
            {...props}>
            {body}
          </a>
        </Button>
      );
    }
    if (onClick) {
      return (
        <Button
          ref={ref as React.Ref<HTMLButtonElement>}
          variant="ghost"
          size="row"
          data-slot="market-row"
          aria-current={selected || undefined}
          className={className}
          onClick={onClick}
          {...props}
        >
          {body}
        </Button>
      );
    }
    return (
      <div ref={ref as React.Ref<HTMLDivElement>}
        data-slot="market-row"
        className={cn('flex w-full items-center gap-2 px-2 py-1.5', className)}
        {...props}>
        {body}
      </div>
    );
  },
);
MarketRow.displayName = 'MarketRow';

export { DataRow, StatLine, MarketRow };
export type { DataRowProps, StatLineProps, MarketRowProps };
