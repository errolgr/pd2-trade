import * as React from 'react';

import { cn } from '../../lib/utils';
import { ItemCard } from '../card';
import { PriceTag, type PriceUnit } from '../price';
import { StatLine } from '../rows';
import { RuneIcon } from '../rune-icon';
import type { TooltipMod } from './item-tooltip';
import { useD2Labels } from './labels';

interface RunewordCardProps {
  name: string;
  /** Runes in socket order. */
  runes: readonly string[];
  /** Item types it can be made in ("Swords", "Body Armor"). */
  bases: readonly string[];
  /** Required level. */
  level?: number;
  mods?: readonly TooltipMod[];
  /** Market price of a finished base. */
  price?: { amount: number; unit: PriceUnit; rune?: string };
  /** Chips after the name ("Ladder only", "PD2"). */
  badges?: React.ReactNode;
  /** Footer right (search market). */
  actions?: React.ReactNode;
  className?: string;
}

/** A runeword recipe: name, its runes in order with art, allowed bases and sockets, required level, mods, price. */
function RunewordCard({ name, runes, bases, level, mods = [], price, badges, actions, className }: RunewordCardProps) {
  const l = useD2Labels();
  return (
    <ItemCard data-slot="runeword-card"
      className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-q-rune"
          style={{ fontFamily: 'DiabloFont' }}>
          {name}
        </span>
        {badges}
        {level !== undefined && (
          <span className="ml-auto text-2xs text-muted-foreground tabular-nums">{l.requiredLevel(String(level))}</span>
        )}
      </div>
      <ol aria-label={l.runes}
        className="flex flex-wrap items-center gap-1">
        {runes.map((r, i) => (
          <li key={i}
            className="inline-flex items-center gap-1 rounded-sm border border-q-rune/30 bg-q-rune/8 py-0.5 pr-1.5 pl-1 text-2xs text-q-rune">
            <RuneIcon rune={r}
              className="size-4" />
            {r.replace(/ Rune$/, '')}
          </li>
        ))}
      </ol>
      <div className="text-2xs text-muted-foreground">
        <span className="tabular-nums">{l.sockets(String(runes.length))}</span>
        {bases.length > 0 && <> · {bases.join(', ')}</>}
      </div>
      {mods.length > 0 && (
        <div className="flex flex-col gap-px text-xs">
          {mods.map((m, i) => (
            <StatLine key={i}
              range={m.range ?? undefined}
              value={m.value ?? undefined}
              corrupted={m.corrupted}>
              {m.text}
            </StatLine>
          ))}
        </div>
      )}
      {(price || actions) && (
        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
          {price ? <PriceTag {...price}
            className="text-sm font-semibold text-foreground" /> : <span />}
          {actions}
        </div>
      )}
    </ItemCard>
  );
}

export { RunewordCard };
export type { RunewordCardProps };
