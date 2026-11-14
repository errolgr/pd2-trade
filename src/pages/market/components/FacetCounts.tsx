import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { currentLocale, useTranslation } from '@/i18n';

/*
 * Facet counts on the filter sidebar's options (see lib/facets.ts). Dropdown options show the count as muted text on
 * the right; Yes / No get a hairline as long as their share, with the exact count in a tooltip on hover / focus.
 * Options that find nothing are dimmed (still pickable); the exact count is part of the option's accessible name.
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
      className="pointer-events-none absolute bottom-[2px] h-[2px] rounded-full bg-primary/60"
      style={{ left: inset, width: `calc((100% - ${2 * inset}px) * ${share})` }}
    />
  );
}

/** "980" / "1.2K": an option's count, compact once it gets long. */
function formatFacetCount(count: number): string {
  return count.toLocaleString(currentLocale(), { notation: 'compact', maximumFractionDigits: 1 });
}

/** A dropdown row's count, right-aligned after its (truncating) label; nothing without facets. */
export function FacetCount({ count, className }: { count: number | undefined; className?: string }) {
  if (count === undefined) return null;
  return (
    <span
      aria-hidden
      data-facet-count
      className={cn('ml-auto shrink-0 pl-2 text-[11px] text-muted-foreground tabular-nums', className)}
    >
      {formatFacetCount(count)}
    </span>
  );
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
          className="px-2 py-1 text-[11px] tabular-nums">
          {text}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
