import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { HoverPopover } from '@/components/custom/hover-popover';
import { Skeleton } from '@/components/ui/skeleton';
import { scaleIn } from '@/lib/motion';
import { DEFAULT_VERDICT_RULE, type RareAppraisal, type RareHistory } from '@/lib/rare-appraisal-api';
import { MarketLine, RankBar, RareHistorySection, VerdictBadge } from '@/components/rares/RareParts';
import { bandRange, MODEL_SEASON, rankText, SLOT_LABELS, SLOT_PLURALS } from '@/components/rares/rares-format';

/** Header placeholder while the rare is appraised (same footprint as the uniques' price pill skeleton). */
export function RareAppraisalPillSkeleton() {
  return (
    <div
      className="inline-flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
      aria-busy="true"
    >
      <Skeleton className="h-5 w-14 rounded-full bg-muted-foreground/15" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-16 bg-muted-foreground/15" />
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Appraising rare...
        </span>
      </div>
    </div>
  );
}

/**
 * Header pill for an appraised rare, styled like the uniques' market price pill: verdict, "top X%" in its
 * slot and the usual asking band. Hover opens the appraisal popover: percentile bar, market line and the
 * item's own listing history.
 */
export function RareAppraisalPill({
  appraisal,
  history,
  title,
}: {
  appraisal: RareAppraisal;
  history: RareHistory | null;
  title: string;
}) {
  const market = appraisal.market;
  const slots = (SLOT_PLURALS[appraisal.slot] ?? 'items').toLowerCase();
  return (
    <motion.div className="inline-block"
      variants={scaleIn}
      initial="hidden"
      animate="visible">
      <HoverPopover
        content={
          <div className="w-[380px] max-w-[calc(100vw-16px)] space-y-3 rounded-lg border border-border bg-popover p-3 text-sm text-popover-foreground shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate font-semibold">{title}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {SLOT_LABELS[appraisal.slot]} · est. from {MODEL_SEASON} listings
              </span>
            </div>
            <RankBar rare={appraisal}
              rule={DEFAULT_VERDICT_RULE} />
            <MarketLine rare={appraisal} />
            {history && !history.weak && history.timesListed > 0 && (
              <div className="border-t border-border pt-2">
                <RareHistorySection history={history} />
              </div>
            )}
          </div>
        }
      >
        <div className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 transition-[background-color,border-color,box-shadow] duration-(--dur-med) ease-out hover:border-glow/50 hover:bg-accent/60 hover:shadow-glow">
          <VerdictBadge rare={appraisal}
            className="px-2.5 py-1 text-xs" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tabular-nums text-foreground">{rankText(appraisal.rank)}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">of {slots}</span>
          </div>
          {market && (
            <>
              <span aria-hidden
                className="h-7 w-px bg-border" />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {bandRange(market.lowHr, market.highHr)} HR
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">usually listed</span>
              </div>
            </>
          )}
        </div>
      </HoverPopover>
    </motion.div>
  );
}
