import React from 'react';
import { cn } from '@/lib/utils';
import type { MarketFilters } from '../lib/types';
import { wtbRequirements } from './wtb-card-model';

/**
 * What a request asks of the item itself, after its title: each flag it pins (Corrupted in its corrupted colour,
 * Uncorrupted, Not desecrated, …) and its sockets. `tag`: bordered tags (post summary); `text`: plain words (drawer).
 */
export function WtbRequirementTags({ filters, variant }: { filters: MarketFilters; variant: 'tag' | 'text' }) {
  const { flags, sockets } = wtbRequirements(filters);
  const words = [
    ...flags.map((x) => ({ key: x.flag, text: x.text, corrupted: x.flag === 'corrupted' && x.value === 'yes' })),
    ...(sockets ? [{ key: 'sockets', text: sockets, corrupted: false }] : []),
  ];
  return (
    <>
      {words.map((w) => (
        <span
          key={w.key}
          className={cn(
            'shrink-0 text-[10px]',
            variant === 'tag' && 'rounded-sm border px-1 font-semibold',
            w.corrupted
              ? cn('text-q-corrupted', variant === 'tag' && 'border-q-corrupted/50 bg-q-corrupted/10')
              : cn('text-muted-foreground', variant === 'tag' && 'border-border/70'),
          )}
        >
          {w.text}
        </span>
      ))}
    </>
  );
}
