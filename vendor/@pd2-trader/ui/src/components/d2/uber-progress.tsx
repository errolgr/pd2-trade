import * as React from 'react';
import { Flame } from 'lucide-react';

import { cn } from '../../lib/utils';
import { ItemArt } from './item-art';
import { useD2Labels } from './labels';

/** PD2 boss encounters and the materials one run consumes (one of each). */
export const UBER_ENCOUNTERS = {
  pandemonium: ['Key of Terror', 'Key of Hate', 'Key of Destruction'],
  tristram: ["Mephisto's Brain", "Diablo's Horn", "Baal's Eye"],
  ancients: ['Sigil of Madawc', 'Sigil of Talic', 'Sigil of Korlic'],
  dclone: ['Pure Demonic Essence', 'Prime Evil Soul', 'Black Soulstone'],
  rathma: ["Trang-Oul's Jawbone", 'Splinter of the Void', 'Hellfire Ashes'],
  lucion: ['Demonic Insignia', 'Talisman of Transgression', 'Flesh of Malic'],
} as const;
export type UberEncounter = keyof typeof UBER_ENCOUNTERS;

/** Overlay art of a boss material: `/ubers/Trang_Ouls_Jawbone.png` (apostrophes dropped, spaces and dashes `_`). */
export function uberArtUrl(name: string): string {
  return `/ubers/${name.replace(/'/g, '').replace(/[\s-]+/g, '_')}.png`;
}

export interface UberMaterial {
  name: string;
  /** Owned count. */
  have: number;
  /** Needed per run. Default 1. */
  need?: number;
  /** Art override; default `uberArtUrl(name)`. */
  src?: string | null;
}

/** Complete runs the materials cover: the scarcest material decides. */
export function uberSets(materials: readonly UberMaterial[]): number {
  if (materials.length === 0) return 0;
  return Math.min(...materials.map((m) => Math.floor(m.have / (m.need ?? 1))));
}

interface UberProgressProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Encounter name ("Uber Tristram", "Diablo Clone"). */
  encounter: React.ReactNode;
  materials: readonly UberMaterial[];
  /** `row` (default) every material with its count; `badge` a pill with the ready runs (torch tracker). */
  variant?: 'row' | 'badge';
}

/**
 * Boss material progress for one PD2 encounter: each material's art and count, missing ones muted, and how many
 * complete runs they cover. `badge` is the compact tracker chip.
 */
function UberProgress({ encounter, materials, variant = 'row', className, ...props }: UberProgressProps) {
  const l = useD2Labels();
  const sets = uberSets(materials);
  if (variant === 'badge') {
    return (
      <div
        data-slot="uber-progress"
        data-variant="badge"
        data-ready={sets > 0 || undefined}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs whitespace-nowrap',
          sets > 0 ? 'border-ring/60 text-foreground shadow-glow' : 'border-border text-muted-foreground',
          className,
        )}
        {...props}
      >
        <Flame aria-hidden
          className={cn('size-3', sets > 0 ? 'text-q-crafted' : 'opacity-60')} />
        <span className="font-medium">{encounter}</span>
        <span className="tabular-nums">{l.runsReady(String(sets))}</span>
      </div>
    );
  }
  return (
    <div data-slot="uber-progress"
      data-variant="row"
      className={cn('flex items-center gap-3 text-xs', className)}
      {...props}>
      <span className="w-28 shrink-0 truncate font-medium">{encounter}</span>
      <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {materials.map((m) => {
          const short = m.have < (m.need ?? 1);
          return (
            <li key={m.name}
              title={m.name}
              className={cn('inline-flex items-center gap-1', short && 'opacity-50')}>
              <ItemArt name={m.name}
                quality="Unique"
                src={m.src === undefined ? uberArtUrl(m.name) : m.src}
                size={22} />
              <span className={cn('tabular-nums', short ? 'text-destructive' : 'text-foreground')}>{`×${m.have}`}</span>
              <span className="sr-only">{m.name}</span>
            </li>
          );
        })}
      </ul>
      <span className={cn('shrink-0 font-semibold tabular-nums', sets > 0 ? 'text-foreground' : 'text-muted-foreground')}>
        {l.runsReady(String(sets))}
      </span>
    </div>
  );
}

export { UberProgress };
export type { UberProgressProps };
