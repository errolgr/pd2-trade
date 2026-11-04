import * as React from 'react';

import { cn } from '../../lib/utils';
import { itemQualityClass, type ItemQuality } from '../item-name';
import { RuneIcon } from '../rune-icon';
import { runeNumber } from './data';
import { useD2Labels } from './labels';
import { QUALITY_BORDER, qualityKey } from './quality-badge';

export interface SocketFill {
  /** "Ber Rune", "Ber", "Perfect Amethyst", "Rainbow Facet"… */
  name: string;
  /** Jewels: their quality (magic, rare, unique facets). */
  quality?: ItemQuality | (string & {}) | null;
  /** Art override. */
  src?: string;
}

interface SocketRowProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Socket count (0–6). */
  sockets: number;
  /** What sits in each socket, in socket order; fewer than `sockets` leaves the rest empty. */
  filled?: readonly SocketFill[];
  /** Socket diameter in px. Default 20. */
  size?: number;
}

/** An item's sockets in order: runes with their art, gems and jewels as quality-colored stones, empty rings. */
function SocketRow({ sockets, filled = [], size = 20, className, ...props }: SocketRowProps) {
  const labels = useD2Labels();
  const count = Math.max(sockets, filled.length);
  const names = Array.from({ length: count }, (_, i) => filled[i]?.name ?? labels.emptySocket);
  return (
    <div
      data-slot="socket-row"
      role="img"
      aria-label={`${labels.socketed(String(count))}: ${names.join(', ')}`}
      className={cn('inline-flex items-center gap-1', className)}
      {...props}
    >
      {Array.from({ length: count }, (_, i) => {
        const fill = filled[i];
        const box = { width: size, height: size };
        if (!fill) {
          return (
            <span key={i}
              data-socket="empty"
              title={labels.emptySocket}
              className="shrink-0 rounded-full border border-border bg-background/60 shadow-inner"
              style={box} />
          );
        }
        const rune = runeNumber(fill.name) !== null;
        const key = qualityKey(fill.quality, { name: fill.name });
        return (
          <span
            key={i}
            data-socket={rune ? 'rune' : 'stone'}
            title={fill.name}
            className={cn(
              'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-background/60',
              rune ? 'border-q-rune/50' : QUALITY_BORDER[key],
            )}
            style={box}
          >
            {rune ? (
              <RuneIcon rune={fill.name}
                src={fill.src}
                style={{ width: size - 4, height: size - 4 }} />
            ) : fill.src ? (
              <img src={fill.src}
                alt=""
                className="size-full object-contain" />
            ) : (
              <span
                className={cn('font-semibold', itemQualityClass(fill.quality))}
                style={{ fontSize: Math.max(9, Math.round(size * 0.45)) }}
              >
                {fill.name.charAt(0)}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export { SocketRow };
export type { SocketRowProps };
