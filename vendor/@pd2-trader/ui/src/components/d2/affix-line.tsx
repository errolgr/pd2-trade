import * as React from 'react';

import { cn } from '../../lib/utils';
import { StatLine, type StatLineProps } from '../rows';
import { useD2Labels } from './labels';

export type AffixKind = 'prefix' | 'suffix' | 'implicit' | 'crafted' | 'corrupted' | 'enchant';

const TAG: Record<AffixKind, string> = {
  prefix: 'border-border text-muted-foreground',
  suffix: 'border-border text-muted-foreground',
  implicit: 'border-border/60 text-muted-foreground',
  crafted: 'border-q-crafted/40 text-q-crafted',
  corrupted: 'border-q-corrupted/40 text-q-corrupted',
  enchant: 'border-q-magic/40 text-q-magic',
};

interface AffixLineProps extends Omit<StatLineProps, 'corrupted'> {
  /** Where the mod comes from; drawn as a fixed-width tag before the line. */
  kind: AffixKind;
  /** Affix name ("Cruel", "of Vita"), shown after the tag. */
  affix?: React.ReactNode;
}

/**
 * A mod line with its affix source (prefix / suffix / implicit / crafted / corrupt / enchant) as a leading tag:
 * rare and magic breakdowns, crafting and corruption outcomes. Plain tooltips use `StatLine`.
 */
function AffixLine({ kind, affix, className, ...line }: AffixLineProps) {
  const labels = useD2Labels();
  return (
    <div data-slot="affix-line"
      data-kind={kind}
      className={cn('flex items-baseline gap-2 text-xs', className)}>
      <span
        className={cn(
          'w-16 shrink-0 rounded-sm border px-1 py-px text-center text-3xs font-medium uppercase tracking-caps',
          TAG[kind],
        )}
      >
        {labels.affix(kind)}
      </span>
      <StatLine {...line}
        corrupted={kind === 'corrupted'}
        className="min-w-0 flex-1" />
      {affix && <span className="shrink-0 text-2xs text-muted-foreground italic">{affix}</span>}
    </div>
  );
}

export { AffixLine };
export type { AffixLineProps };
