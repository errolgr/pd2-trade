import * as React from 'react';

import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';

/** Value tones: damage type colors for damage and resists, status tones for cap states. */
export type StatTone = 'fire' | 'cold' | 'lightning' | 'poison' | 'physical' | 'magic' | 'good' | 'warn' | 'bad';

const TONE: Record<StatTone, string> = {
  fire: 'text-dmg-fire',
  cold: 'text-dmg-cold',
  lightning: 'text-dmg-lightning',
  poison: 'text-dmg-poison',
  physical: 'text-dmg-physical',
  magic: 'text-dmg-magic',
  good: 'text-success',
  warn: 'text-warning',
  bad: 'text-destructive',
};

const toneClass = (tone: StatTone | null | undefined) => (tone ? TONE[tone] : 'text-foreground');

export interface StatSource {
  /** "Item", "Skill", "Charm". */
  kind: string;
  name: string;
  value: string;
}

export interface StatRowData {
  id: string;
  label: React.ReactNode;
  /** "FCR". */
  abbr?: string | null;
  value?: { text: string; label?: string | null; tone?: StatTone | null } | null;
  /** Points put in, shown before the value ("25 →"). */
  from?: string | null;
  note?: React.ReactNode;
  /** Cap state ("23 over cap"). */
  state?: { text: string; tone: StatTone } | null;
  /** Sub-rows of a multi-value stat (min / max damage). */
  parts?: readonly { label: React.ReactNode; text: string; tone?: StatTone | null }[];
  /** Breakpoint chips. */
  ladder?: readonly { at: number | string; state: 'past' | 'current' | 'next' | 'future'; title?: string }[] | null;
  /** Replaces the label/value line (a ResistanceBar, a BreakpointTable); note, state, parts, ladder and sources still render. */
  visual?: React.ReactNode;
  /** Where the stat comes from; shown in a tooltip on hover or focus. */
  sources?: readonly { title: string; sources: readonly StatSource[] }[];
}

export interface StatSection {
  id: string;
  label: React.ReactNode;
  rows: readonly StatRowData[];
}

const LADDER: Record<'past' | 'current' | 'next' | 'future', string> = {
  past: 'border-border text-foreground',
  current: 'border-ring/60 bg-primary/10 font-semibold text-foreground shadow-glow',
  next: 'border-dashed border-ring/50 text-foreground',
  future: 'border-border/50 text-muted-foreground',
};

function StatRow({ row }: { row: StatRowData }) {
  const v = row.value;
  const sources = row.sources ?? [];
  const body = (
    <div
      data-slot="stat-row"
      tabIndex={sources.length ? 0 : undefined}
      className={cn(
        'flex flex-col gap-0.5 rounded-sm px-2 py-1 text-xs outline-none',
        sources.length > 0 && 'hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/60',
      )}
    >
      {row.visual ?? (
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {row.label}
          {row.abbr && <span className="ml-1.5 text-3xs uppercase tracking-caps opacity-70">{row.abbr}</span>}
        </span>
        {v && (
          <span className={cn('shrink-0 font-medium tabular-nums', toneClass(v.tone))}>
            {row.from && <span className="mr-1 text-2xs text-muted-foreground">{`${row.from} →`}</span>}
            {v.label && <span className="mr-1 text-2xs text-muted-foreground">{v.label}</span>}
            {v.text}
          </span>
        )}
      </div>
      )}
      {(row.note || row.state) && (
        <div className="flex items-baseline justify-between gap-2 text-2xs">
          {row.note ? <span className="text-muted-foreground">{row.note}</span> : <span />}
          {row.state && <span className={toneClass(row.state.tone)}>{row.state.text}</span>}
        </div>
      )}
      {row.parts && row.parts.length > 0 && (
        <div className="flex flex-col gap-px pl-2">
          {row.parts.map((p, i) => (
            <div key={i}
              className="flex items-baseline justify-between gap-2 text-2xs">
              <span className="text-muted-foreground">{p.label}</span>
              <span className={cn('tabular-nums', toneClass(p.tone))}>{p.text}</span>
            </div>
          ))}
        </div>
      )}
      {row.ladder && row.ladder.length > 0 && (
        <div aria-hidden
          className="flex flex-wrap gap-0.5 pt-0.5">
          {row.ladder.map((c) => (
            <span key={c.at}
              data-state={c.state}
              title={c.title}
              className={cn('rounded-sm border px-1 text-3xs tabular-nums', LADDER[c.state])}>
              {c.at}
            </span>
          ))}
        </div>
      )}
    </div>
  );
  if (!sources.length) return body;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{body}</TooltipTrigger>
      <TooltipContent side="left"
        align="start"
        className="max-w-sidebar">
        <div className="flex flex-col gap-1.5">
          {sources.map((list) => (
            <div key={list.title}>
              <div className="text-3xs font-medium uppercase tracking-caps opacity-80">{list.title}</div>
              <ul className="flex flex-col">
                {list.sources.map((s) => (
                  <li key={`${s.kind}-${s.name}`}
                    className="flex items-baseline gap-2 text-2xs">
                    <span className="opacity-70">{s.kind}</span>
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="tabular-nums">{s.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface StatSheetProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  sections: readonly StatSection[];
}

/**
 * A character's stat sheet, one card per section: label left, tone-colored tabular value right, note and cap
 * state, sub-rows, breakpoint chips (current and next marked), each stat's sources in a tooltip on hover or focus.
 * Single stats with their own visuals: `ResistanceBar`, `BreakpointTable`.
 */
function StatSheet({ sections, className, ...props }: StatSheetProps) {
  const uid = React.useId();
  return (
    <div data-slot="stat-sheet"
      className={cn('flex flex-col gap-2', className)}
      {...props}>
      {sections.map((s) => (
        <section key={s.id}
          aria-labelledby={`${uid}-${s.id}`}
          className="rounded-lg border border-border bg-card/60 py-1.5">
          <h3 id={`${uid}-${s.id}`}
            className="px-2 pb-1 text-3xs font-medium text-muted-foreground uppercase tracking-caps">
            {s.label}
          </h3>
          {s.rows.map((r) => (
            <StatRow key={r.id}
              row={r} />
          ))}
        </section>
      ))}
    </div>
  );
}

export { StatSheet };
export type { StatSheetProps };
