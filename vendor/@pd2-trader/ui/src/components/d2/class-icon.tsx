import * as React from 'react';

import { cn } from '../../lib/utils';
import { CLASS_RING, CLASS_TEXT, CLASS_TILE, toD2Class, type D2Class } from './data';
import { useD2Labels } from './labels';

/** Portrait art of a class: `/assets/classes/<class>.webp` under `origin` (the website serves it at its root). */
export function classPortraitUrl(cls: D2Class, origin = ''): string {
  return `${origin}/assets/classes/${cls}.webp`;
}

/** The two-letter glyph of the lettered tile ("Sorceress" → "So"). */
const glyph = (cls: D2Class | null, raw: string) => {
  const s = cls ?? raw;
  return (s.charAt(0).toUpperCase() + s.charAt(1).toLowerCase()) || '?';
};

interface ClassIconProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** Class id or any spelling the APIs send ("Sorceress", "sorc"). */
  cls: D2Class | (string & {});
  /** Height in px; the portrait is 46×41, so the width follows. Default 32. */
  size?: number;
  /** Portrait URL; default `classPortraitUrl(cls)`. `null` draws the lettered tile. */
  src?: string | null;
  /** Accessible name; decorative (hidden) when omitted. */
  alt?: string;
}

/**
 * Class portrait framed in the class color; a lettered tile in the class color when the art is missing or fails.
 * Unknown classes get a neutral tile.
 */
function ClassIcon({ cls, size = 32, src, alt, className, style, ...props }: ClassIconProps) {
  const id = toD2Class(cls);
  const url = src === null || !id ? null : (src ?? classPortraitUrl(id));
  const [broken, setBroken] = React.useState<string | null>(null);
  const width = Math.round((size * 46) / 41);
  const a11y = alt ? { role: 'img' as const, 'aria-label': alt } : { 'aria-hidden': true as const };
  const box = { width, height: size, ...style };

  if (!url || broken === url) {
    return (
      <span
        data-slot="class-icon"
        data-class={id ?? undefined}
        {...a11y}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-sm border font-semibold',
          id ? CLASS_TILE[id] : 'border-border bg-muted/40 text-muted-foreground',
          className,
        )}
        style={{ ...box, fontSize: Math.max(10, Math.round(size * 0.4)) }}
        {...props}
      >
        {glyph(id, cls)}
      </span>
    );
  }
  return (
    <span
      data-slot="class-icon"
      data-class={id}
      {...a11y}
      className={cn('inline-flex shrink-0 overflow-hidden rounded-sm ring-1', CLASS_RING[id!], className)}
      style={box}
      {...props}
    >
      <img src={url}
        alt=""
        loading="lazy"
        onError={() => setBroken(url)}
        className="size-full object-cover" />
    </span>
  );
}

interface ClassBadgeProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  cls: D2Class | (string & {});
  /** Shows "Level 92" before the class name. */
  level?: number;
  /** Portrait URL for the leading icon (see ClassIcon); `null` for the lettered tile, `false` for no icon. */
  src?: string | null | false;
}

/** Class name in the class color with its portrait ("92 Sorceress"): character rows, filters, search hits. */
function ClassBadge({ cls, level, src, className, ...props }: ClassBadgeProps) {
  const labels = useD2Labels();
  const id = toD2Class(cls);
  return (
    <span data-slot="class-badge"
      className={cn('inline-flex items-center gap-1.5 text-xs whitespace-nowrap', className)}
      {...props}>
      {src !== false && <ClassIcon cls={cls}
        src={src}
        size={16} />}
      {level !== undefined && <span className="text-foreground tabular-nums">{labels.level(String(level))}</span>}
      <span className={id ? CLASS_TEXT[id] : 'text-muted-foreground'}>{id ? labels.className(id) : cls}</span>
    </span>
  );
}

export { ClassIcon, ClassBadge };
export type { ClassIconProps, ClassBadgeProps };
