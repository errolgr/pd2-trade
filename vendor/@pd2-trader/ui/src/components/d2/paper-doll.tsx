import * as React from 'react';
import {
  CircleDot,
  Footprints,
  Gem,
  Hand,
  HardHat,
  Plus,
  Shield,
  Shirt,
  Sparkles,
  Sword,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../hover-card';
import { itemQualityClass, type ItemQuality } from '../item-name';
import { CorruptionBadge } from './corruption-badge';
import type { EquipSlot } from './data';
import { ItemArt } from './item-art';
import { useD2Labels } from './labels';
import { QUALITY_BORDER, qualityKey } from './quality-badge';

export interface EquippedItem {
  name: string;
  quality?: ItemQuality | (string & {}) | null;
  runeword?: boolean;
  /** Inventory art (an array is tried in order). */
  src?: string | readonly string[] | null;
  ethereal?: boolean;
  corrupted?: boolean;
}

const SLOT_GLYPH: Record<EquipSlot | 'charm', LucideIcon> = {
  helm: HardHat,
  amulet: Gem,
  weapon: Sword,
  armor: Shirt,
  offhand: Shield,
  'ring-right': CircleDot,
  'ring-left': CircleDot,
  belt: CircleDot,
  gloves: Hand,
  boots: Footprints,
  charm: Sparkles,
};

interface EquipmentSlotProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  slot: EquipSlot | 'charm';
  /** The worn item; null/undefined draws the empty slot (its name and glyph). */
  item?: EquippedItem | null;
  /** `tile` (default) art cell for paper dolls; `row` art + name + meta for gear lists and pickers. */
  layout?: 'tile' | 'row';
  /** Replaces the slot name ("Switch", "Merc weapon"). */
  label?: React.ReactNode;
  /** Row layout: second line under the name (base, price). */
  meta?: React.ReactNode;
  /** Row layout: trailing nodes (badges, price). Tile layout: bottom-right corner (price). */
  badges?: React.ReactNode;
  /** Floated beside the slot on hover (an `ItemTooltip`). */
  tooltip?: React.ReactNode;
  /** Tile height in px (weapons and armor are tall). Default 60. */
  height?: number;
  /** Marks the slot being edited (aria-pressed). */
  selected?: boolean;
}

/**
 * One equipment slot: the item's art in its quality frame (ethereal and corrupted marks, a corner badge), or the
 * empty slot with its glyph. A button when `onClick` is set; floats `tooltip` on hover.
 */
function EquipmentSlot({
  slot,
  item,
  layout = 'tile',
  label,
  meta,
  badges,
  tooltip,
  height = 60,
  selected,
  onClick,
  className,
  ...props
}: EquipmentSlotProps) {
  const l = useD2Labels();
  const Glyph = SLOT_GLYPH[slot];
  const slotName = label ?? (slot === 'charm' ? null : l.slot(slot));
  const key = item ? qualityKey(item.quality, { runeword: item.runeword, name: item.name }) : null;
  const interactive = Boolean(onClick);
  const frame = cn(
    'relative rounded-md border',
    key ? [QUALITY_BORDER[key], 'bg-background/40'] : 'border-dashed border-border/60 bg-background/20',
    selected && 'border-ring/70 shadow-glow',
  );

  let body: React.ReactNode;
  if (layout === 'row') {
    body = (
      <>
        {item ? (
          <ItemArt name={item.name}
            quality={item.quality}
            runeword={item.runeword}
            src={item.src}
            size={32} />
        ) : (
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm border border-dashed border-border/60 text-muted-foreground">
            <Plus aria-hidden
              className="size-3.5" />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
          <span className="text-3xs font-medium text-muted-foreground uppercase tracking-caps">{slotName}</span>
          <span
            className={cn(
              'truncate text-xs font-medium',
              item ? itemQualityClass(item.quality, { runeword: item.runeword, name: item.name }) : 'text-muted-foreground',
            )}
          >
            {item ? item.name : l.empty}
          </span>
          {meta && <span className="truncate text-2xs text-muted-foreground">{meta}</span>}
        </span>
        {(badges || item?.corrupted) && (
          <span className="flex shrink-0 items-center gap-1">
            {item?.corrupted && <CorruptionBadge variant="dot" />}
            {badges}
          </span>
        )}
      </>
    );
  } else {
    body = item ? (
      <>
        <ItemArt name={item.name}
          quality={item.quality}
          runeword={item.runeword}
          src={item.src}
          frameless
          size={Math.min(height - 12, 64)} />
        {item.ethereal && (
          <span className="absolute top-0.5 left-1 text-3xs font-semibold text-muted-foreground"
            title={l.ethereal}>
            E
          </span>
        )}
        {item.corrupted && <CorruptionBadge variant="dot"
          className="absolute top-1 right-1" />}
        {badges && (
          <span className="absolute right-0.5 bottom-0.5 rounded-sm bg-background/80 px-1 text-3xs leading-tight font-medium tabular-nums">
            {badges}
          </span>
        )}
      </>
    ) : (
      <span className="flex flex-col items-center gap-1 text-2xs text-muted-foreground/80">
        <Glyph aria-hidden
          className="size-4 opacity-60" />
        {slotName}
      </span>
    );
  }

  const shared = {
    'data-slot': 'equipment-slot',
    'data-equip-slot': slot,
    'data-empty': item ? undefined : true,
  } as const;
  const ariaLabel = item ? `${item.name} (${slotName ?? slot})` : String(slotName ?? slot);
  const tileClass = layout === 'tile' ? 'flex w-full flex-col items-center justify-center' : 'flex w-full items-center gap-2 px-2 py-1.5';

  const node = interactive ? (
    <Button
      type="button"
      variant="ghost"
      size="inline"
      {...shared}
      aria-label={layout === 'tile' ? ariaLabel : undefined}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(frame, tileClass, 'gap-0 font-normal hover:bg-accent/40 hover:text-current', className)}
      style={layout === 'tile' ? { height } : undefined}
      {...props}
    >
      {body}
    </Button>
  ) : (
    <div
      {...shared}
      tabIndex={tooltip ? 0 : undefined}
      role={layout === 'tile' && item ? 'img' : undefined}
      aria-label={layout === 'tile' && item ? ariaLabel : undefined}
      className={cn(frame, tileClass, className)}
      style={layout === 'tile' ? { height } : undefined}
    >
      {body}
    </div>
  );
  if (!tooltip || !item) return node;
  return (
    <HoverCard>
      <HoverCardTrigger asChild>{node}</HoverCardTrigger>
      <HoverCardContent variant="bare"
        side="right">
        {tooltip}
      </HoverCardContent>
    </HoverCard>
  );
}

/** Grid areas of the player doll and the mercenary doll, like the in-game inventory. */
const PLAYER_AREAS = `". helm amulet" "weapon armor offhand" "ring-right belt ring-left" "gloves . boots"`;
const MERC_AREAS = `". helm ." "weapon armor offhand" "gloves belt boots"`;
const MERC_SLOTS: readonly EquipSlot[] = ['helm', 'weapon', 'armor', 'offhand', 'gloves', 'belt', 'boots'];
const PLAYER_SLOTS: readonly EquipSlot[] = [
  'helm',
  'amulet',
  'weapon',
  'armor',
  'offhand',
  'ring-right',
  'belt',
  'ring-left',
  'gloves',
  'boots',
];

/** Tile heights per slot (px): weapons and armor tall, rings, amulet and belt short. */
const SLOT_HEIGHT: Record<EquipSlot, number> = {
  helm: 60,
  amulet: 44,
  weapon: 104,
  armor: 104,
  offhand: 104,
  'ring-right': 44,
  belt: 44,
  'ring-left': 44,
  gloves: 60,
  boots: 60,
};

interface PaperDollProps extends Omit<React.ComponentProps<'div'>, 'children' | 'onSelect'> {
  /** Worn items by slot. */
  items: Partial<Record<EquipSlot, EquippedItem | null>>;
  /** `player` (10 slots) or `merc` (7: no rings, no amulet). Default `player`. */
  variant?: 'player' | 'merc';
  /** Tooltip per worn slot (an `ItemTooltip`). */
  tooltipFor?: (slot: EquipSlot) => React.ReactNode;
  /** Corner badge per worn slot (price). */
  badgeFor?: (slot: EquipSlot) => React.ReactNode;
  /** Makes the slots buttons. */
  onSelect?: (slot: EquipSlot) => void;
  /** The slot being edited. */
  selected?: EquipSlot;
}

/** The equipment screen: every slot in the in-game layout, three 76px columns. */
function PaperDoll({
  items,
  variant = 'player',
  tooltipFor,
  badgeFor,
  onSelect,
  selected,
  className,
  style,
  ...props
}: PaperDollProps) {
  const slots = variant === 'merc' ? MERC_SLOTS : PLAYER_SLOTS;
  return (
    <div
      data-slot="paper-doll"
      data-variant={variant}
      className={cn('mx-auto grid w-fit grid-cols-3 gap-1.5', className)}
      style={{
        gridTemplateColumns: 'repeat(3, 76px)',
        gridTemplateAreas: variant === 'merc' ? MERC_AREAS : PLAYER_AREAS,
        ...style,
      }}
      {...props}
    >
      {slots.map((slot) => (
        <div key={slot}
          style={{ gridArea: slot }}>
          <EquipmentSlot
            slot={slot}
            item={items[slot]}
            height={SLOT_HEIGHT[slot]}
            tooltip={items[slot] ? tooltipFor?.(slot) : undefined}
            badges={items[slot] ? badgeFor?.(slot) : undefined}
            selected={selected === slot}
            onClick={onSelect ? () => onSelect(slot) : undefined}
          />
        </div>
      ))}
    </div>
  );
}

export { EquipmentSlot, PaperDoll };
export type { EquipmentSlotProps, PaperDollProps };
