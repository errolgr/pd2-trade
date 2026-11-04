import * as React from 'react';

import { cn } from '../../lib/utils';
import type { ItemQuality } from '../item-name';
import { useD2Labels } from './labels';

/** Normalized quality ids (lowercase); Superior and Low Quality read as normal. */
export const QUALITY_KEYS = ['normal', 'magic', 'rare', 'crafted', 'set', 'unique', 'runeword', 'rune'] as const;
export type QualityKey = (typeof QUALITY_KEYS)[number];

/**
 * Quality id of an item from any API spelling ("Unique", "unique", "Superior"); runewords and runes win over the
 * base quality, like `itemQualityClass`.
 */
export function qualityKey(
  quality: ItemQuality | (string & {}) | null | undefined,
  { runeword = false, name }: { runeword?: boolean; name?: string } = {},
): QualityKey {
  if (runeword) return 'runeword';
  if (name !== undefined && / Rune$/.test(name)) return 'rune';
  const q = String(quality ?? '').toLowerCase();
  return (QUALITY_KEYS as readonly string[]).includes(q) ? (q as QualityKey) : 'normal';
}

/** Hairline border in the quality color (item art frames, paper-doll cells, stash footprints). */
export const QUALITY_BORDER: Record<QualityKey, string> = {
  normal: 'border-border',
  magic: 'border-q-magic/50',
  rare: 'border-q-rare/50',
  crafted: 'border-q-crafted/50',
  set: 'border-q-set/50',
  unique: 'border-q-unique/50',
  runeword: 'border-q-rune/50',
  rune: 'border-q-rune/50',
};

const BADGE: Record<QualityKey, string> = {
  normal: 'border-border text-q-normal',
  magic: 'border-q-magic/40 bg-q-magic/10 text-q-magic',
  rare: 'border-q-rare/40 bg-q-rare/10 text-q-rare',
  crafted: 'border-q-crafted/40 bg-q-crafted/10 text-q-crafted',
  set: 'border-q-set/40 bg-q-set/10 text-q-set',
  unique: 'border-q-unique/40 bg-q-unique/10 text-q-unique',
  runeword: 'border-q-rune/40 bg-q-rune/10 text-q-rune',
  rune: 'border-q-rune/40 bg-q-rune/10 text-q-rune',
};

interface QualityBadgeProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  quality: ItemQuality | (string & {}) | null | undefined;
  runeword?: boolean;
  /** Replaces the quality name ("Elite", "Sacred"). */
  children?: React.ReactNode;
}

/** Quality chip ("Unique", "Runeword") in the quality color: filters, facets, listing meta. */
function QualityBadge({ quality, runeword, children, className, ...props }: QualityBadgeProps) {
  const labels = useD2Labels();
  const key = qualityKey(quality, { runeword });
  return (
    <span
      data-slot="quality-badge"
      data-quality={key}
      className={cn(
        'inline-flex shrink-0 items-center rounded-sm border px-1.5 py-px text-3xs font-medium whitespace-nowrap uppercase tracking-caps',
        BADGE[key],
        className,
      )}
      {...props}
    >
      {children ?? labels.quality(key)}
    </span>
  );
}

export { QualityBadge };
export type { QualityBadgeProps };
