import * as React from 'react';

import { cn } from '../../lib/utils';
import { useD2Labels } from './labels';

export type BreakpointKind = 'FCR' | 'FHR' | 'FBR' | 'IAS';

export interface Breakpoint {
  /** Stat value that reaches the step (FCR %, FHR %…). */
  value: number;
  /** Animation frames at that step. */
  frames: number;
}

/** Index of the step `current` reaches (breakpoints sorted by value); -1 below the first. */
export function breakpointIndex(breakpoints: readonly Breakpoint[], current: number): number {
  let hit = -1;
  breakpoints.forEach((b, i) => {
    if (current >= b.value) hit = i;
  });
  return hit;
}

interface BreakpointTableProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  kind: BreakpointKind;
  /** The class's (or form's) steps, ascending by value. */
  breakpoints: readonly Breakpoint[];
  /** The character's current stat value. */
  current: number;
  /** Shown after the stat name ("Sorceress", "Werewolf"). */
  context?: React.ReactNode;
}

/**
 * One speed stat's breakpoints for a class: value and frames per step, the reached step highlighted, steps below
 * it plain, steps above muted, and how much is missing for the next one.
 */
function BreakpointTable({ kind, breakpoints, current, context, className, ...props }: BreakpointTableProps) {
  const l = useD2Labels();
  const hit = breakpointIndex(breakpoints, current);
  const next = breakpoints[hit + 1];
  return (
    <div data-slot="breakpoint-table"
      data-kind={kind}
      className={cn('flex flex-col gap-1.5 text-xs', className)}
      {...props}>
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-foreground">{kind}</span>
        <span className="min-w-0 truncate text-2xs text-muted-foreground">
          {l.breakpointKind(kind)}
          {context && <> · {context}</>}
        </span>
        <span className="ml-auto shrink-0 font-semibold tabular-nums">{`${current}%`}</span>
      </div>
      <ol aria-label={l.breakpointKind(kind)}
        className="flex flex-wrap gap-0.5 text-center tabular-nums">
        {breakpoints.map((b, i) => (
          <li
            key={b.value}
            data-state={i === hit ? 'current' : i < hit ? 'reached' : 'locked'}
            aria-current={i === hit || undefined}
            className={cn(
              'min-w-10 rounded-sm border px-1 py-0.5',
              i === hit
                ? 'border-ring/60 bg-primary/10 font-semibold text-foreground shadow-glow'
                : i < hit
                  ? 'border-border text-foreground'
                  : 'border-border/50 text-muted-foreground',
            )}
          >
            <div className="text-xs">{`${b.value}%`}</div>
            <div className="text-3xs text-muted-foreground"
              title={l.frames(String(b.frames))}>
              {l.framesShort(String(b.frames))}
            </div>
          </li>
        ))}
      </ol>
      <div className="text-2xs text-muted-foreground">
        {next ? l.toNext(String(next.value - current)) : l.maxed}
      </div>
    </div>
  );
}

export { BreakpointTable };
export type { BreakpointTableProps };
