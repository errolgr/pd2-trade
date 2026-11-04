import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../hover-card';
import type { ItemQuality } from '../item-name';
import { CorruptionBadge } from './corruption-badge';
import { ItemArt } from './item-art';
import { QUALITY_BORDER, qualityKey } from './quality-badge';

/** PD2 container sizes in cells (columns × rows). */
export const GRID_SIZES = {
  inventory: { cols: 10, rows: 4 },
  stash: { cols: 10, rows: 10 },
  cube: { cols: 3, rows: 4 },
} as const;

export interface GridItem {
  /** Stable key; default `${x}:${y}`. */
  id?: string;
  name: string;
  quality?: ItemQuality | (string & {}) | null;
  runeword?: boolean;
  src?: string | readonly string[] | null;
  /** Top-left cell, 0-based. */
  x: number;
  y: number;
  /** Footprint in cells (charms 1×1–1×3, armor 2×3). */
  w: number;
  h: number;
  corrupted?: boolean;
  /** Floated on hover (an `ItemTooltip`). */
  tooltip?: React.ReactNode;
}

interface InventoryGridProps extends Omit<React.ComponentProps<'div'>, 'children' | 'onSelect'> {
  cols: number;
  rows: number;
  items: readonly GridItem[];
  /** Cell size in px. Default 25. */
  cell?: number;
  /** Makes items buttons. */
  onSelect?: (item: GridItem) => void;
  /** Accessible name of the grid ("Stash", "Charms"). */
  'aria-label'?: string;
}

const GAP = 2;

/**
 * A cell grid (inventory, stash, cube, charm area) with items drawn over their footprints in quality-colored
 * frames, corrupted ones marked, tooltips on hover.
 */
function InventoryGrid({ cols, rows, items, cell = 25, onSelect, className, style, ...props }: InventoryGridProps) {
  return (
    <div
      data-slot="inventory-grid"
      role="group"
      className={cn('grid w-fit', className)}
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
        gridTemplateRows: `repeat(${rows}, ${cell}px)`,
        gap: GAP,
        ...style,
      }}
      {...props}
    >
      {Array.from({ length: cols * rows }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="rounded-xs border border-border/40 bg-background/20"
          style={{ gridColumn: (i % cols) + 1, gridRow: Math.floor(i / cols) + 1 }}
        />
      ))}
      {items.map((item) => {
        const width = item.w * cell + (item.w - 1) * GAP;
        const height = item.h * cell + (item.h - 1) * GAP;
        const frame = cn(
          'relative flex items-center justify-center rounded-sm border bg-background/50',
          QUALITY_BORDER[qualityKey(item.quality, { runeword: item.runeword, name: item.name })],
        );
        const art = (
          <>
            <ItemArt name={item.name}
              quality={item.quality}
              runeword={item.runeword}
              src={item.src}
              frameless
              size={width - 4}
              height={height - 4} />
            {item.corrupted && <CorruptionBadge variant="dot"
              className="absolute top-0.5 right-0.5 size-1" />}
          </>
        );
        const node = onSelect ? (
          <Button type="button"
            variant="ghost"
            size="inline"
            aria-label={item.name}
            onClick={() => onSelect(item)}
            className={cn(frame, 'size-full gap-0 hover:bg-accent/60 hover:text-current')}>
            {art}
          </Button>
        ) : (
          <span role="img"
            aria-label={item.name}
            tabIndex={item.tooltip ? 0 : undefined}
            className={cn(frame, 'size-full outline-none focus-visible:ring-2 focus-visible:ring-ring/60')}>
            {art}
          </span>
        );
        return (
          <div
            key={item.id ?? `${item.x}:${item.y}`}
            data-slot="inventory-item"
            style={{ gridColumn: `${item.x + 1} / span ${item.w}`, gridRow: `${item.y + 1} / span ${item.h}` }}
          >
            {item.tooltip ? (
              <HoverCard>
                <HoverCardTrigger asChild>{node}</HoverCardTrigger>
                <HoverCardContent variant="bare"
                  side="right">
                  {item.tooltip}
                </HoverCardContent>
              </HoverCard>
            ) : (
              node
            )}
          </div>
        );
      })}
    </div>
  );
}

export { InventoryGrid };
export type { InventoryGridProps };
