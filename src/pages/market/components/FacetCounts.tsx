import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { facetShare, inRange, SOCKET_COUNTS, socketRange, type IndexRange } from '../lib/facets';
import { useRangePicker } from '../hooks/useRangePicker';
import { useTranslation } from '@/i18n';

/*
 * Facet counts on the filter sidebar's options (see lib/facets.ts), without numbers at rest: a hairline (Yes / No,
 * socket chips) or a faint row fill (list options) as long as the option's share, options that find nothing dimmed
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
      className="pointer-events-none absolute bottom-[2px] h-[2px] rounded-full bg-primary/60"
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
          className="px-2 py-1 text-[11px] tabular-nums">
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
        className="px-2 py-1 text-[11px] tabular-nums">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Socket chips 0–6 (0 = unsocketed), picked like dates on a calendar (see useRangePicker): one chip is exactly that
 * many sockets, a second one the range between them. They follow a typed min / max too (one bound: up to 6 / from 0).
 * With facets (`counts` not empty) each chip's hairline is its share of the busiest chip.
 */
export function SocketChips({
  counts,
  min,
  max,
  onPick,
}: {
  counts: Map<number, number>;
  min: number | undefined;
  max: number | undefined;
  onPick: (min: number | undefined, max: number | undefined) => void;
}) {
  const { t } = useTranslation('market');
  const facetText = useFacetText();
  const selected = socketRange(min, max);
  const { preview, groupProps, optionProps } = useRangePicker({
    count: SOCKET_COUNTS.length,
    selected,
    onPick: (r) => onPick(r?.lo, r?.hi),
  });
  const faceted = counts.size > 0;
  const peak = Math.max(0, ...counts.values());
  const selection = !selected
    ? t('facets.socketsAny')
    : selected.lo === selected.hi
      ? t('facets.socketsExact', { count: selected.lo })
      : t('facets.socketsRange', { min: selected.lo, max: selected.hi });
  return (
    <div role="group"
      aria-label={selection}
      {...groupProps}
      className="grid grid-cols-7 gap-1 select-none">
      <RangeBand range={preview}
        className="bg-primary/8" />
      <RangeBand range={selected}
        className="bg-primary/12" />
      {SOCKET_COUNTS.map((n) => {
        const count = counts.get(n);
        const lit = inRange(selected, n);
        const end = lit && (n === selected!.lo || n === selected!.hi);
        const label = t('facets.socket', { count: n });
        const text = count === undefined ? undefined : facetText(label, count);
        return (
          <FacetTip key={n}
            text={text}>
            <button
              type="button"
              aria-pressed={lit}
              aria-label={text ?? label}
              {...optionProps(n)}
              style={{ gridRow: 1, gridColumn: n + 1 }}
              className={cn(
                'relative inline-flex h-6 min-w-0 items-center justify-center rounded-md border border-input text-[11px] tabular-nums text-foreground outline-none transition-[color,border-color,opacity] duration-(--dur-fast) hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/60',
                lit && 'border-transparent text-primary',
                end && 'border-primary hover:border-primary',
                // A picked chip stays readable even when it finds nothing
                faceted && count === 0 && !lit && cn(FACET_DIM, 'border-dashed'),
              )}
            >
              {n}
              {faceted && <FacetHairline share={facetShare(count, peak)} />}
            </button>
          </FacetTip>
        );
      })}
    </div>
  );
}

/** A tinted band behind grid columns `lo..hi` (row 1), continuous across the gaps between them. */
function RangeBand({ range, className }: { range: IndexRange | null; className?: string }) {
  if (!range) return null;
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none rounded-md', className)}
      style={{ gridRow: 1, gridColumn: `${range.lo + 1} / ${range.hi + 2}` }}
    />
  );
}
