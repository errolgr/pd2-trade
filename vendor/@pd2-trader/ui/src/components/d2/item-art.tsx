import * as React from 'react';

import { cn } from '../../lib/utils';
import { itemQualityClass, type ItemQuality } from '../item-name';
import { QUALITY_BORDER, qualityKey } from './quality-badge';

/** "Harlequin Crest" → "HC"; "Ber Rune" → "BR". */
export function itemInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

interface ItemArtProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  name: string;
  quality?: ItemQuality | (string & {}) | null;
  runeword?: boolean;
  /** Inventory art; an array is tried in order, moving on when a URL fails. Quality initials when none loads. */
  src?: string | readonly string[] | null;
  /** Width in px. Default 28. */
  size?: number;
  /** Height in px; default `size` (square). Item footprints are 1–4 cells tall. */
  height?: number;
  /** Hide the quality-colored frame (art inside a cell that already has one). */
  frameless?: boolean;
}

/**
 * Item inventory art in a quality-colored hairline frame, pixel-crisp; quality-colored initials when the art is
 * missing or fails to load.
 */
function ItemArt({ name, quality, runeword, src, size = 28, height = size, frameless = false, className, style, ...props }: ItemArtProps) {
  const candidates = React.useMemo(() => (src == null ? [] : typeof src === 'string' ? [src] : [...src]), [src]);
  const [failed, setFailed] = React.useState<readonly string[]>([]);
  const url = candidates.find((u) => !failed.includes(u));
  const key = qualityKey(quality, { runeword, name });
  return (
    <span
      data-slot="item-art"
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm',
        !frameless && ['border bg-background/50', QUALITY_BORDER[key]],
        className,
      )}
      style={{ width: size, height, ...style }}
      {...props}
    >
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          onError={() => setFailed((f) => [...f, url])}
          className="max-h-full max-w-full object-contain [image-rendering:pixelated]"
        />
      ) : (
        <span className={cn('font-semibold', itemQualityClass(quality, { runeword, name }))}
          style={{ fontSize: Math.max(10, Math.min(15, Math.round(size * 0.36))) }}>
          {itemInitials(name) || '?'}
        </span>
      )}
    </span>
  );
}

export { ItemArt };
export type { ItemArtProps };
