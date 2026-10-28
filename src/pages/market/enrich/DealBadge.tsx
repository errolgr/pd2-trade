import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { bandRange, fmtBandHr } from '@/components/rares/rares-format';
import { cn } from '@/lib/utils';
import type { Deal, DealVerdict } from './deal';
import { useTranslation } from '@/i18n';

const VERDICT_LABEL_KEYS: Record<DealVerdict, { labelKey: string }> = {
  steal: { labelKey: 'deal.verdict.steal' },
  good: { labelKey: 'deal.verdict.good' },
  fair: { labelKey: 'deal.verdict.fair' },
  high: { labelKey: 'deal.verdict.high' },
};

/** Tinted pill classes per verdict (theme tokens, same pattern as the rare verdict badges). */
const VERDICT_CLASSES: Record<DealVerdict, string> = {
  steal: 'border-success/60 bg-success/20 text-success font-semibold',
  good: 'border-success/35 bg-success/10 text-success',
  fair: 'border-border bg-muted/40 text-muted-foreground',
  high: 'border-warning/40 bg-warning/12 text-warning',
};

const SOURCE_LABEL_KEYS: Record<NonNullable<Deal['source']>, { labelKey: string }> = {
  economy: { labelKey: 'deal.source.economy' },
  appraisal: { labelKey: 'deal.source.appraisal' },
};

/** "-35%" / "+12%" / "±0%" of the asking price against the estimate. */
export function dealPercent(ratio: number): string {
  const percent = Math.round((ratio - 1) * 100);
  return percent === 0 ? '±0%' : `${percent > 0 ? '+' : ''}${percent}%`;
}

function DealTooltip({ deal }: { deal: Deal }) {
  const { t } = useTranslation('market');
  return (
    <div className="space-y-0.5">
      {deal.estimateHr !== null && (
        <div className="font-semibold">
          {t('deal.estimate', { value: fmtBandHr(deal.estimateHr) })}
          {deal.band && (
            <span className="font-normal text-muted-foreground">
              {' '}
              {t('deal.band', { range: bandRange(deal.band.lowHr, deal.band.highHr) })}
            </span>
          )}
        </div>
      )}
      {deal.ratio !== null ? (
        <div>{t('deal.asking', { percent: dealPercent(deal.ratio) })}</div>
      ) : (
        <div className="text-muted-foreground">{t('deal.noHrPrice')}</div>
      )}
      {deal.source && <div className="text-muted-foreground">{t(SOURCE_LABEL_KEYS[deal.source].labelKey)}</div>}
      {deal.detail && <div className="text-muted-foreground">{deal.detail}</div>}
      {deal.confidence === 'low' && <div className="text-warning">{t('deal.lowConfidence')}</div>}
    </div>
  );
}

/**
 * Compact deal pill with the estimate on hover. Nothing without a deal; a muted "~X HR" for note-only
 * listings (estimate, no verdict). `compact` (list rows) drops the percentage. Host mounts a TooltipProvider.
 */
export function DealBadge({ deal, compact = false }: { deal: Deal | undefined; compact?: boolean }) {
  const { t } = useTranslation('market');
  if (!deal || deal.estimateHr === null) return null;
  const verdict = deal.verdict;
  const text = verdict
    ? compact || deal.ratio === null
      ? t(VERDICT_LABEL_KEYS[verdict].labelKey)
      : t('deal.verdictPercent', { verdict: t(VERDICT_LABEL_KEYS[verdict].labelKey), percent: dealPercent(deal.ratio) })
    : `~${fmtBandHr(deal.estimateHr)} HR`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={t('deal.ariaLabel', { text })}
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
