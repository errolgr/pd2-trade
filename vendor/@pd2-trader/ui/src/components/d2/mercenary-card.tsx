import * as React from 'react';
import { Users } from 'lucide-react';

import { cn } from '../../lib/utils';
import { ItemCard } from '../card';
import type { EquipSlot } from './data';
import { useD2Labels } from './labels';
import { PaperDoll, type EquippedItem } from './paper-doll';

interface MercenaryCardProps {
  /** Hireling type as the game names it ("Desert Mercenary", "Iron Wolf"). */
  type: React.ReactNode;
  /** Hireling name ("Fiona"). */
  name?: React.ReactNode;
  /** Omitted when the source doesn't know it (builds API mercs). */
  level?: number;
  /** Act the hireling comes from (1, 2, 3, 5). */
  act?: 1 | 2 | 3 | 5;
  /** Aura or main skill ("Holy Freeze", "Might"). */
  skill?: React.ReactNode;
  /** Worn gear; omit to show the header only. */
  items?: Partial<Record<EquipSlot, EquippedItem | null>>;
  tooltipFor?: (slot: EquipSlot) => React.ReactNode;
  /** Passed to the PaperDoll: wraps each slot in your own trigger. */
  wrapSlot?: (slot: EquipSlot, node: React.ReactElement) => React.ReactNode;
  badgeFor?: (slot: EquipSlot) => React.ReactNode;
  /** Header right (gear value, actions). */
  aside?: React.ReactNode;
  className?: string;
}

/** A character's hireling: type, act, level and aura, and its seven-slot paper doll. */
function MercenaryCard({ type, name, level, act, skill, items, tooltipFor, wrapSlot, badgeFor, aside, className }: MercenaryCardProps) {
  const l = useD2Labels();
  return (
    <ItemCard data-slot="mercenary-card"
      className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-start gap-2">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
          <Users aria-hidden
            className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-3xs font-medium text-muted-foreground uppercase tracking-caps">{l.mercenary}</span>
          <span className="truncate text-sm font-semibold">
            {type}
            {name && <span className="font-normal text-muted-foreground"> · {name}</span>}
          </span>
          <span className="flex flex-wrap items-center gap-x-1.5 text-2xs text-muted-foreground">
            {level !== undefined && <span className="text-foreground tabular-nums">{l.level(String(level))}</span>}
            {act !== undefined && <span>{level !== undefined && '· '}{l.act(String(act))}</span>}
            {skill && <span className="text-q-magic">{(level !== undefined || act !== undefined) && '· '}{skill}</span>}
          </span>
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      {items && <PaperDoll variant="merc"
        items={items}
        tooltipFor={tooltipFor}
        wrapSlot={wrapSlot}
        badgeFor={badgeFor} />}
    </ItemCard>
  );
}

export { MercenaryCard };
export type { MercenaryCardProps };
