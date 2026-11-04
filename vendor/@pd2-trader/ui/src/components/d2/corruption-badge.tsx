import * as React from 'react';

import { cn } from '../../lib/utils';
import { useD2Labels } from './labels';

interface CorruptionBadgeProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** The corruption outcome ("+1 Socket", "+30% Faster Cast Rate"); omit for the bare "Corrupted" chip. */
  outcome?: React.ReactNode;
  /** Bricked (the corruption rolled a downside); drawn struck-through and quieter. */
  bricked?: boolean;
  /** `chip` (default) for rows and cards, `dot` for a bare marker on art tiles (paper doll, stash cells). */
  variant?: 'chip' | 'dot';
}

/** Corruption marker in the corruption color: "Corrupted · +1 Socket", or a dot on item art. */
function CorruptionBadge({ outcome, bricked = false, variant = 'chip', className, ...props }: CorruptionBadgeProps) {
  const labels = useD2Labels();
  if (variant === 'dot') {
    return (
      <span
        data-slot="corruption-badge"
        data-variant="dot"
        role="img"
        aria-label={labels.corrupted}
        title={labels.corrupted}
        className={cn('inline-block size-1.5 shrink-0 rounded-full bg-q-corrupted', className)}
        {...props}
      />
    );
  }
  return (
    <span
      data-slot="corruption-badge"
      data-bricked={bricked || undefined}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-sm border border-q-corrupted/40 bg-q-corrupted/10 px-1.5 py-px text-2xs whitespace-nowrap text-q-corrupted',
        bricked && 'opacity-70',
        className,
      )}
      {...props}
    >
      <span className="font-semibold">{labels.corrupted}</span>
      {outcome && (
        <>
          <span aria-hidden
            className="opacity-60">
            ·
          </span>
          <span className={cn('truncate', bricked && 'line-through')}>{outcome}</span>
        </>
      )}
    </span>
  );
}

export { CorruptionBadge };
export type { CorruptionBadgeProps };
