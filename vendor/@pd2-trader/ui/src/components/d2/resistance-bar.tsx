import * as React from 'react';

import { cn } from '../../lib/utils';
import { ELEMENT_FILL, ELEMENT_TEXT, type Element } from './data';
import { useD2Labels } from './labels';

/** Effective resistance: `total` (after the difficulty penalty) clamped to the cap and the -100 floor. */
export function effectiveResist(total: number, max = 75): number {
  return Math.max(-100, Math.min(total, max));
}

interface ResistanceBarProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  element: Element;
  /** Resistance after the difficulty penalty, uncapped (sheet value; 98 fire with a 75 cap is 23 over). */
  total: number;
  /** Max resistance (75 base, up to 95 with +max res). Default 75. */
  max?: number;
  /** `row` (default) label, value and bar on one line; `compact` value over a bar, for four side by side. */
  layout?: 'row' | 'compact';
}

/**
 * One elemental resistance: the effective value in its element color, a bar to 100 with the cap marked, the
 * over-cap headroom, negative values in the destructive color.
 */
function ResistanceBar({ element, total, max = 75, layout = 'row', className, ...props }: ResistanceBarProps) {
  const l = useD2Labels();
  const value = effectiveResist(total, max);
  const over = total - max;
  const capped = value >= max;
  const name = l.element(element);
  const bar = (
    <span aria-hidden
      className={cn(
        'relative block h-1.5 overflow-hidden rounded-full bg-muted/60',
        layout === 'row' ? 'min-w-0 flex-1' : 'w-full',
      )}>
      <span
        className={cn('absolute inset-y-0 left-0 rounded-full', ELEMENT_FILL[element], !capped && 'opacity-60')}
        style={{ width: `${Math.max(0, value)}%` }}
      />
      <span className="absolute inset-y-0 w-px bg-foreground/70"
        style={{ left: `${Math.min(max, 100)}%` }} />
    </span>
  );
  const number = (
    <span
      className={cn(
        'font-semibold tabular-nums',
        value < 0 ? 'text-destructive' : capped ? ELEMENT_TEXT[element] : 'text-foreground',
      )}
    >
      {`${value}%`}
    </span>
  );
  return (
    <div
      data-slot="resistance-bar"
      data-element={element}
      data-capped={capped || undefined}
      role="meter"
      aria-label={name}
      aria-valuemin={-100}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value}% / ${max}%`}
      title={over > 0 ? l.overCap(String(over)) : l.maxRes(String(max))}
      className={cn(
        layout === 'row' ? 'flex items-center gap-2 text-xs' : 'flex flex-col gap-1 text-2xs',
        className,
      )}
      {...props}
    >
      {layout === 'row' ? (
        <>
          <span className={cn('w-16 shrink-0', ELEMENT_TEXT[element])}>{name}</span>
          {bar}
          <span className="flex w-20 shrink-0 items-baseline justify-end gap-1">
            {number}
            <span className="text-2xs text-muted-foreground tabular-nums">{over > 0 ? `+${over}` : `/${max}`}</span>
          </span>
        </>
      ) : (
        <>
          <span className="flex items-baseline justify-between gap-1">
            <span className={ELEMENT_TEXT[element]}>{name}</span>
            {number}
          </span>
          {bar}
        </>
      )}
    </div>
  );
}

export { ResistanceBar };
export type { ResistanceBarProps };
