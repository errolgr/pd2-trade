import * as React from 'react';

import { cn } from '../lib/utils';

/** "Ber", "Ber Rune" → "Ber"; null for anything that is not a rune name. */
export function runeBaseName(rune: string): string | null {
  const m = /^([A-Z][a-z]+)(?: Rune)?$/.exec(rune.trim());
  return m ? m[1] : null;
}

interface RuneIconProps extends Omit<React.ComponentProps<'img'>, 'src'> {
  /** Rune name, with or without the " Rune" suffix ("Ber", "Ber Rune"). */
  rune: string;
  /** Overrides the bundled art (`/runes/<Name>_Rune.png` in the overlay's public dir). */
  src?: string;
}

/**
 * Inventory art of a rune; collapses to the rune's initial in a tile when the art is missing.
 * Size it with `size-*` (default `size-4`).
 */
function RuneIcon({ rune, src, className, alt = '', ...props }: RuneIconProps) {
  const base = runeBaseName(rune);
  const url = src ?? (base ? `/runes/${base}_Rune.png` : undefined);
  const [broken, setBroken] = React.useState<string | undefined>(undefined);

  if (!url || broken === url) {
    return (
      <span
        data-slot="rune-icon"
        aria-hidden={alt ? undefined : true}
        aria-label={alt || undefined}
        className={cn(
          'inline-flex size-4 shrink-0 items-center justify-center rounded-xs bg-q-rune/15 text-3xs font-semibold text-q-rune',
          className,
        )}
      >
        {(base ?? rune).charAt(0)}
      </span>
    );
  }
  return (
    <img
      data-slot="rune-icon"
      src={url}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      loading="lazy"
      onError={() => setBroken(url)}
      className={cn('inline-block size-4 shrink-0 object-contain', className)}
      {...props}
    />
  );
}

export { RuneIcon };
export type { RuneIconProps };
