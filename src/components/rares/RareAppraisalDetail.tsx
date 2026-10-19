import React from 'react';
import { CircleHelp } from 'lucide-react';
import { PopoverKeyValue, PopoverTile } from '@/components/custom/popover-parts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOptions } from '@/hooks/useOptions';
import { openUrl } from '@/lib/browser-opener';
import { DEFAULT_VERDICT_RULE, type RareAppraisal, type RareHistory, type VerdictRule } from '@/lib/rare-appraisal-api';
import { HardcoreNote, ItemStatsSection, RankDisplay, RareHistorySection } from './RareParts';
import { bandRange, hardcoreNote, marketSource, rankText, VERDICT_COLORS, VERDICT_LABELS } from './rares-format';

/**
 * Body of a rare's appraisal, shared by the price-check popover and the Stash Value "Rares" rows: verdict and
 * "usually listed" tiles, the rank (Bar / Blocks per the "Rare rank display" setting), samples, "Stats on this
 * item" (open state remembered in settings) and the item's market history.
 */
export function RareAppraisalDetail({
  appraisal,
  history,
  hardcore = false,
  rule = DEFAULT_VERDICT_RULE,
  stashPosition,
}: {
  appraisal: RareAppraisal;
  history: RareHistory | null;
  hardcore?: boolean;
  rule?: VerdictRule;
  /** Stash Value: "Shared 1 · col 5, row 1", shown as a "Stash" row. */
  stashPosition?: string | null;
}) {
  const { settings, updateSettings } = useOptions();
  const market = appraisal.market;
  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        <PopoverTile
          label={
            <span className="flex items-center gap-1">
              Verdict
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="How verdicts work"
                    className="inline-flex cursor-pointer rounded-full text-info/80 outline-none transition-colors hover:text-info focus-visible:text-info"
                    onClick={(e) => {
                      e.stopPropagation();
                      openUrl('https://pd2trader.com/rares/how-it-works');
                    }}
                  >
                    <CircleHelp className="size-[13px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>How verdicts work</TooltipContent>
              </Tooltip>
            </span>
          }
          emphasis={appraisal.verdict === 'keep'}
        >
          <span style={{ color: VERDICT_COLORS[appraisal.verdict] }}>{VERDICT_LABELS[appraisal.verdict]}</span>
          <span className="font-medium text-muted-foreground"> · </span>
          {rankText(appraisal.rank)}
        </PopoverTile>
        <PopoverTile label="Usually listed">
          {market ? `${bandRange(market.lowHr, market.highHr)} HR` : '—'}
        </PopoverTile>
      </div>
      <RankDisplay rare={appraisal}
        rule={rule}
        mode={settings.rareRankDisplay ?? 'bar'} />
      {(market || stashPosition || hardcoreNote(appraisal, hardcore)) && (
        <div className="space-y-1 border-t border-border pt-2 text-xs">
          {market && (
            <>
              <PopoverKeyValue label="Samples">{market.sampleSize}</PopoverKeyValue>
              <PopoverKeyValue label="Compared with">{marketSource(appraisal)}</PopoverKeyValue>
            </>
          )}
          {stashPosition && <PopoverKeyValue label="Stash">{stashPosition}</PopoverKeyValue>}
          <HardcoreNote rare={appraisal}
            hardcore={hardcore} />
        </div>
      )}
      <div className="border-t border-border pt-2">
        <ItemStatsSection
          rare={appraisal}
          open={settings.rareStatsExpanded ?? false}
          onOpenChange={(open) => updateSettings({ rareStatsExpanded: open })}
        />
      </div>
      {history && !history.weak && history.timesListed > 0 && (
        <div className="border-t border-border pt-2">
          <RareHistorySection history={history} />
        </div>
      )}
    </>
  );
}
