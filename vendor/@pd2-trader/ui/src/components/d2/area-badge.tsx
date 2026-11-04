import * as React from 'react';
import { Map as MapIcon, Skull } from 'lucide-react';

import { cn } from '../../lib/utils';
import { useD2Labels } from './labels';

interface AreaBadgeProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Area or map name ("Chaos Sanctuary", "Ruined Cistern"). */
  name: React.ReactNode;
  /** PD2 map tier (T1–T3); marks the area as a map. */
  tier?: 1 | 2 | 3;
  /** The current corrupted zone (purple, skull). */
  corrupted?: boolean;
  /** Trailing meta ("Act 4", "in 12m", "Uber"). */
  meta?: React.ReactNode;
}

const TIER: Record<1 | 2 | 3, string> = {
  1: 'border-border text-muted-foreground',
  2: 'border-border text-foreground',
  3: 'border-ring/60 text-foreground shadow-glow',
};

/** An area chip: maps with their tier, the corrupted zone in its color, plain areas neutral. */
function AreaBadge({ name, tier, corrupted = false, meta, className, ...props }: AreaBadgeProps) {
  const labels = useD2Labels();
  return (
    <span
      data-slot="area-badge"
      data-tier={tier}
      data-corrupted={corrupted || undefined}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs whitespace-nowrap',
        corrupted ? 'border-q-corrupted-zone/50 bg-q-corrupted-zone/10 text-q-corrupted-zone' : 'border-border bg-card/40',
        className,
      )}
      {...props}
    >
      {corrupted ? (
        <Skull aria-label={labels.corruptedZone}
          className="size-3.5 shrink-0" />
      ) : (
        tier !== undefined && <MapIcon aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate font-medium">{name}</span>
      {tier !== undefined && (
        <span className={cn('rounded-sm border px-1 text-3xs font-semibold tabular-nums', TIER[tier])}>
          {labels.tier(tier)}
        </span>
      )}
      {meta && <span className="text-2xs text-muted-foreground tabular-nums">{meta}</span>}
    </span>
  );
}

export { AreaBadge };
export type { AreaBadgeProps };
