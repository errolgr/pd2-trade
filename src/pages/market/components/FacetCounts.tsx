import React from 'react';
import { cn, Tooltip, TooltipContent, TooltipTrigger } from '@pd2-trader/ui';
import { facetShare } from '../lib/facets';
import { useTranslation } from '@/i18n';

/*
 * Facet counts on the filter sidebar's options (see lib/facets.ts), without numbers at rest: a hairline (Yes / No)
 * or a faint row fill (list options) as long as the option's share, options that find nothing dimmed
 * (still pickable), and the exact count in a tooltip on hover / focus and in the option's accessible name.
 */

/** Options that find nothing: dimmed, never hidden. */
export const FACET_DIM = 'opacity-30';

/** "<label> · <count>": an option's exact count (tooltip and accessible name). */
export function useFacetText() {
  const { t } = useTranslation('market');
  return (label: string, count: number) => t('facets.count', { label, n: count });
}

/** A 2px accent hairline along the bottom of a (relative) option, `share` of its inner width long. */
export function FacetHairline({ share, inset = 3 }: { share: number; inset?: number }) {
  if (share <= 0) return null;
  return (
    <span
      aria-hidden
      data-facet-hairline
      className="pointer-events-none absolute bottom-0.5 h-0.5 rounded-full bg-primary/60"
      style={{ left: inset, width: `calc((100% - ${2 * inset}px) * ${share})` }}
    />
  );
}

/** A list row's faint background fill, `share` of the row wide. */
export function facetFill(share: number): React.CSSProperties | undefined {
  if (share <= 0) return undefined;
  const at = `${(share * 100).toFixed(1)}%`;
  return {
    backgroundImage: `linear-gradient(to right, color-mix(in oklab, var(--primary) 9%, transparent) ${at}, transparent ${at})`,
  };
}

/**
 * The exact count of an option on hover / keyboard focus. Without `text` (no facets) it never opens, but stays
 * mounted, so the option keeps its focus when counts come and go.
 */
export function FacetTip({ text, children }: { text: string | undefined; children: React.ReactElement }) {
  return (
    <Tooltip open={text ? undefined : false}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      {text && (
        <TooltipContent side="top"
          className="px-2 py-1 text-2xs tabular-nums">
          {text}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

/**
 * The tooltip of a list row (select / menu item): Radix focuses rows as the pointer or the arrow keys highlight them,
 * so it shows while the row has focus (`open`), anchored on the whole (relative) row.
 */
export function FacetRowTip({ text, open }: { text: string; open: boolean }) {
  return (
    <Tooltip open={open}>
      <TooltipTrigger asChild>
        <span aria-hidden
          className="pointer-events-none absolute inset-0" />
      </TooltipTrigger>
      <TooltipContent side="right"
        className="px-2 py-1 text-2xs tabular-nums">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
