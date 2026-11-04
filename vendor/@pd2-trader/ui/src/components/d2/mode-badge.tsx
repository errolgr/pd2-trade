import * as React from 'react';
import { Skull } from 'lucide-react';

import { cn } from '../../lib/utils';
import { useD2Labels } from './labels';

const CHIP =
  'inline-flex items-center gap-1 rounded-sm border px-1.5 py-px text-3xs font-medium whitespace-nowrap uppercase tracking-caps [&>svg]:size-3';

interface ModeBadgeProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Ladder or non-ladder; omit to leave the realm out. */
  ladder?: boolean;
  /** Hardcore (red) or softcore; omit to leave it out. */
  hardcore?: boolean;
  /** Classic (non-expansion) character. */
  classic?: boolean;
  /** Ladder season number. */
  season?: number | string;
  /** Dead hardcore character. */
  dead?: boolean;
  /** `short` "L · HC" chips for dense rows; `long` "Ladder · Hardcore". Default `long`. */
  size?: 'short' | 'long';
}

/** Game mode chips: ladder / non-ladder, softcore / hardcore, classic, season, dead. */
function ModeBadge({ ladder, hardcore, classic, season, dead, size = 'long', className, ...props }: ModeBadgeProps) {
  const l = useD2Labels();
  const short = size === 'short';
  return (
    <span data-slot="mode-badge"
      className={cn('inline-flex flex-wrap items-center gap-1', className)}
      {...props}>
      {ladder !== undefined && (
        <span data-mode={ladder ? 'ladder' : 'non-ladder'}
          className={cn(CHIP, 'border-border text-muted-foreground')}>
          {ladder ? (short ? l.ladderShort : l.ladder) : short ? l.nonLadderShort : l.nonLadder}
        </span>
      )}
      {hardcore !== undefined && (
        <span
          data-mode={hardcore ? 'hardcore' : 'softcore'}
          className={cn(CHIP, hardcore ? 'border-destructive/40 text-destructive' : 'border-border text-muted-foreground')}
        >
          {hardcore ? (short ? l.hardcoreShort : l.hardcore) : short ? l.softcoreShort : l.softcore}
        </span>
      )}
      {classic && <span className={cn(CHIP, 'border-border text-muted-foreground')}>{l.classic}</span>}
      {season !== undefined && (
        <span className={cn(CHIP, 'border-border text-muted-foreground tabular-nums')}>
          {short ? l.seasonShort(String(season)) : l.season(String(season))}
        </span>
      )}
      {dead && (
        <span data-mode="dead"
          className={cn(CHIP, 'border-transparent bg-destructive/15 text-destructive')}>
          <Skull aria-hidden />
          {l.dead}
        </span>
      )}
    </span>
  );
}

export { ModeBadge };
export type { ModeBadgeProps };
