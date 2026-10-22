import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { bandRange, fmtBandHr } from '@/components/rares/rares-format';
import { cn } from '@/lib/utils';
import type { Deal, DealVerdict } from './deal';

const VERDICT_LABELS: Record<DealVerdict, string> = { steal: 'Steal', good: 'Good', fair: 'Fair', high: 'High' };

/** Tinted pill classes per verdict (theme tokens, same pattern as the rare verdict badges). */
const VERDICT_CLASSES: Record<DealVerdict, string> = {
  steal: 'border-success/60 bg-success/20 text-success font-semibold',
  good: 'border-success/35 bg-success/10 text-success',
  fair: 'border-border bg-muted/40 text-muted-foreground',
  high: 'border-warning/40 bg-warning/12 text-warning',
};

const SOURCE_LABELS: Record<NonNullable<Deal['source']>, string> = {
  economy: 'Market price (pd2trader)',
  appraisal: 'Rare appraisal (similar listings)',
};

/** "-35%" / "+12%" / "±0%" of the asking price against the estimate. */
export function dealPercent(ratio: number): string {
  const percent = Math.round((ratio - 1) * 100);
  return percent === 0 ? '±0%' : `${percent > 0 ? '+' : ''}${percent}%`;
}

function DealTooltip({ deal }: { deal: Deal }) {
  return (
    <div className="space-y-0.5">
      {deal.estimateHr !== null && (
        <div className="font-semibold">
          Est. ~{fmtBandHr(deal.estimateHr)} HR
          {deal.band && (
            <span className="font-normal text-muted-foreground">
              {' '}
              (band {bandRange(deal.band.lowHr, deal.band.highHr)})
            </span>
          )}
        </div>
      )}
      {deal.ratio !== null ? (
        <div>Asking {dealPercent(deal.ratio)} vs estimate</div>
      ) : (
        <div className="text-muted-foreground">No HR price on this listing</div>
      )}
      {deal.source && <div className="text-muted-foreground">{SOURCE_LABELS[deal.source]}</div>}
      {deal.detail && <div className="text-muted-foreground">{deal.detail}</div>}
      {deal.confidence === 'low' && <div className="text-warning">Low confidence: treat as a rough guide</div>}
    </div>
  );
}

/**
 * Compact deal pill with the estimate on hover. Nothing without a deal; a muted "~X HR" for note-only
 * listings (estimate, no verdict). `compact` (list rows) drops the percentage. Host mounts a TooltipProvider.
 */
export function DealBadge({ deal, compact = false }: { deal: Deal | undefined; compact?: boolean }) {
  if (!deal || deal.estimateHr === null) return null;
  const verdict = deal.verdict;
  const text = verdict
    ? compact || deal.ratio === null
      ? VERDICT_LABELS[verdict]
      : `${VERDICT_LABELS[verdict]} ${dealPercent(deal.ratio)}`
    : `~${fmtBandHr(deal.estimateHr)} HR`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={`Deal: ${text}`}
          className={cn(
            'inline-flex shrink-0 cursor-default items-center gap-1 rounded-full border px-1.5 py-px text-[10px] leading-4 whitespace-nowrap tabular-nums',
            verdict ? VERDICT_CLASSES[verdict] : 'border-border/60 text-muted-foreground',
            deal.confidence === 'low' && 'border-dashed',
          )}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <DealTooltip deal={deal} />
      </TooltipContent>
    </Tooltip>
  );
}
