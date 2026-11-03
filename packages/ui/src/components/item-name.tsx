import * as React from 'react';

import { cn } from '../lib/utils';

/** PD2 item quality names as the game and the trade API spell them. */
export type ItemQuality = 'Normal' | 'Superior' | 'Magic' | 'Rare' | 'Crafted' | 'Set' | 'Unique' | 'Runeword' | 'Rune';

const QUALITY_CLASS: Record<string, string> = {
  Unique: 'text-q-unique',
  Set: 'text-q-set',
  Rare: 'text-q-rare',
  Crafted: 'text-q-crafted',
  Magic: 'text-q-magic',
  Runeword: 'text-q-rune',
  Rune: 'text-q-rune',
};

/**
 * Text colour class for an item: runes and runewords in the rune colour, else the quality colour, else normal.
 * `quality` is a free string because the APIs send quality names the app does not model (Superior, Normal…).
 */
export function itemQualityClass(
  quality: ItemQuality | (string & {}) | null | undefined,
  { runeword = false, name }: { runeword?: boolean; name?: string } = {},
): string {
  if (runeword || (name !== undefined && / Rune$/.test(name))) return 'text-q-rune';
  return (quality && QUALITY_CLASS[quality]) || 'text-q-normal';
}

interface ItemNameProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  name: React.ReactNode;
  quality?: ItemQuality | (string & {}) | null;
  /** Runewords show in the rune colour whatever their base quality. */
  runeword?: boolean;
}

/** An item's name in its D2 quality colour (unique gold, set green, rune orange…). */
function ItemName({ name, quality, runeword, className, ...props }: ItemNameProps) {
  return (
    <span
      data-slot="item-name"
      className={cn(
        itemQualityClass(quality, { runeword, name: typeof name === 'string' ? name : undefined }),
        className,
      )}
      {...props}
    >
      {name}
    </span>
  );
}

export { ItemName };
export type { ItemNameProps };
