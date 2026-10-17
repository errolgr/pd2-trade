import React from 'react';
import moment from 'moment';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type {
  AppraisedStat,
  CheckPriority,
  RareAppraisal,
  RareHistory,
  RareHistoryListing,
  VerdictRule,
} from '@/lib/rare-appraisal-api';
import {
  keyStats,
  marketText,
  ordinalPercentile,
  plural,
  rankText,
  SLOT_PLURALS,
  starsText,
  starTitle,
  VERDICT_BADGE_CLASS,
  VERDICT_COLORS,
  VERDICT_LABELS,
} from './rares-format';

/*
 * Building blocks shared by the price-check rare card and the Stash Value "Rares" tab.
 * Hosts mount a TooltipProvider above these.
 */

const PRIORITY_TITLES: Record<CheckPriority, string> = {
  high: 'Has a ★★ or better key stat',
  medium: 'Has a ★ key stat',
  low: 'No key stats',
};

/** Section caption, same as the price-check "Stats" label. */
export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground', className)}>
      {children}
    </span>
  );
}

function Hint({ text, children }: { text: string | undefined; children: React.ReactElement }) {
  if (!text) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

export function VerdictBadge({ rare, className }: { rare: RareAppraisal; className?: string }) {
  const title = rare.verdict === 'check' && rare.checkPriority ? PRIORITY_TITLES[rare.checkPriority] : undefined;
  return (
    <Hint text={title}>
      <span
        className={cn(
          'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase leading-none tracking-wider',
          VERDICT_BADGE_CLASS[rare.verdict],
          title && 'cursor-help',
          className,
        )}
      >
        {VERDICT_LABELS[rare.verdict]}
      </span>
    </Hint>
  );
}

/** "top 8%" / "bottom 12%" with the ordinal percentile on hover. */
export function RankText({ rare, className }: { rare: RareAppraisal; className?: string }) {
  const slots = (SLOT_PLURALS[rare.slot] ?? 'items').toLowerCase();
  return (
    <Hint text={`Predicted ${ordinalPercentile(rare.rank)} percentile of ${slots} prices at this point of the season`}>
      <span className={cn('cursor-help whitespace-nowrap text-xs font-medium tabular-nums', className)}>
        {rankText(rare.rank)}
      </span>
    </Hint>
  );
}

function StarsMark({ stat }: { stat: AppraisedStat }) {
  return (
    <Hint text={starTitle(stat)}>
      <span className="cursor-help whitespace-nowrap tracking-tighter text-glow">{starsText(stat.stars)}</span>
    </Hint>
  );
}

const MAX_CHIPS = 3;

/** Up to 3 ★ key-stat chips (multiplier on hover only). Vendor rares never show stars. */
export function StarChips({ rare }: { rare: RareAppraisal }) {
  const keys = rare.verdict === 'vendor' ? [] : keyStats(rare);
  if (keys.length === 0) return null;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1">
      {keys.slice(0, MAX_CHIPS).map((s, i) => (
        <Hint key={`${i}-${s.label}`}
          text={starTitle(s)}>
          <span className="inline-flex cursor-help items-center gap-1 whitespace-nowrap rounded-md border border-border/60 bg-muted/40 px-1.5 py-px text-[11px] text-foreground/90">
            <span className="tracking-tighter text-glow">{starsText(s.stars)}</span>
            {s.label}
          </span>
        </Hint>
      ))}
      {keys.length > MAX_CHIPS && (
        <span className="text-[11px] text-muted-foreground">+{keys.length - MAX_CHIPS} more</span>
      )}
    </span>
  );
}

/**
 * Stats of one rare in in-game order. Key stats carry ★/★★/★★★ (tier multiplier on hover only) and
 * a glow marker; non-key stats are dimmed. Roll bar when the range is known, grey "key from N" when
 * the stat is key on this slot but below the threshold, corrupted stats in the corrupted colour.
 * Vendor rares never show stars.
 */
export function StatList({ rare }: { rare: RareAppraisal }) {
  const showStars = rare.verdict !== 'vendor';
  return (
    <ul className="flex flex-col">
      {rare.stats.map((s, i) => {
        const isKey = showStars && s.stars !== null;
        return (
          <li
            key={`${i}-${s.label}`}
            className={cn(
              'grid min-h-7 grid-cols-[2.25rem_minmax(0,1fr)_3.25rem] items-center gap-2 rounded-md px-2 py-0.5',
              isKey && 'bg-accent/40 shadow-[inset_2px_0_0_var(--glow)]',
            )}
          >
            <span className="text-xs">{isKey ? <StarsMark stat={s} /> : null}</span>
            <span
              className={cn(
                'min-w-0 text-sm leading-snug',
                isKey ? 'font-medium text-foreground' : 'text-muted-foreground/80',
                s.corrupted && 'text-q-corrupted',
              )}
            >
              {s.label}
              {s.keyFrom !== null && (
                <Hint text={`This stat starts to add value on this slot from ${s.keyFrom}`}>
                  <span className="ml-1.5 cursor-help whitespace-nowrap text-[11px] text-muted-foreground/70">
                    key from {s.keyFrom}
                  </span>
                </Hint>
              )}
            </span>
            {s.roll !== null ? (
              <Hint text={`Roll: ${Math.round(s.roll * 100)}% of the possible range`}>
                <span className="block h-1 w-full cursor-help overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn('block h-full rounded-full', isKey ? 'bg-glow' : 'bg-muted-foreground/50')}
                    style={{ width: `${Math.round(s.roll * 100)}%` }}
                  />
                </span>
              </Hint>
            ) : (
              <span />
            )}
          </li>
        );
      })}
    </ul>
  );
}

const pct = (v: number): string => `${Math.min(100, Math.max(0, v * 100))}%`;

/**
 * Compact percentile axis (0–100): tick at the predicted rank, soft ±rankError band, dashed
 * "vendor" / "keep" lines from the verdict rule. Coloured by verdict.
 */
export function RankBar({ rare, rule }: { rare: RareAppraisal; rule: VerdictRule }) {
  const color = VERDICT_COLORS[rare.verdict];
  const lo = Math.max(0, rare.rank - rare.rankError);
  const hi = Math.min(1, rare.rank + rare.rankError);
  const slots = (SLOT_PLURALS[rare.slot] ?? 'items').toLowerCase();
  const label = ordinalPercentile(rare.rank);
  const rules = [
    ['vendor', rule.vendorRank],
    ['keep', rule.keepRank],
  ] as const;
  return (
    <div
      className="relative h-[40px] select-none"
      role="img"
      aria-label={`Predicted at the ${label} percentile of ${slots} prices, give or take ${Math.round(rare.rankError * 100)} points`}
    >
      {rules.map(([name, at]) => (
        <React.Fragment key={name}>
          <span
            className="absolute top-0 -translate-x-1/2 text-[9px] uppercase leading-none tracking-wider text-muted-foreground"
            style={{ left: pct(at) }}
          >
            {name}
          </span>
          <span
            className="absolute top-[10px] h-[18px] border-l border-dashed border-muted-foreground/60"
            style={{ left: pct(at) }}
          />
        </React.Fragment>
      ))}
      <span className="absolute inset-x-0 top-[16px] h-1.5 rounded-full bg-muted" />
      <span
        className="absolute top-[16px] h-1.5 rounded-full"
        style={{ left: pct(lo), width: pct(hi - lo), background: color, opacity: 0.3 }}
      />
      <span
        className="absolute top-[11px] h-4 w-[3px] -translate-x-1/2 rounded-sm shadow-[0_0_6px_currentColor]"
        style={{ left: pct(rare.rank), background: color, color }}
      />
      {rare.rank > 0.1 && (
        <span className="absolute left-0 top-[30px] text-[9px] leading-none text-muted-foreground/70">0</span>
      )}
      {rare.rank < 0.9 && (
        <span className="absolute right-0 top-[30px] text-[9px] leading-none text-muted-foreground/70">100</span>
      )}
      <span
        className="absolute top-[30px] -translate-x-1/2 text-[10px] font-semibold leading-none tabular-nums"
        style={{ left: pct(Math.min(0.95, Math.max(0.05, rare.rank))), color }}
      >
        {label}
      </span>
    </div>
  );
}

/** "Rings this good are usually listed around 1.5–3.2 HR", sample size on hover. */
export function MarketLine({ rare, className }: { rare: RareAppraisal; className?: string }) {
  const text = marketText(rare);
  if (!text || !rare.market) return null;
  return (
    <Hint text={`Asking prices (25th–75th percentile) of ${rare.market.sampleSize} listings at a similar rank`}>
      <p className={cn('cursor-help text-sm leading-snug text-foreground/90', className)}>{text}.</p>
    </Hint>
  );
}

/** Asking price of one listing: HR without trailing zeros ("3.5 HR", "2 HR", "0.15 HR"), else the seller's text. */
function listingPrice(listing: RareHistoryListing): string {
  if (listing.hrPrice !== null) return `${Number(listing.hrPrice.toFixed(2))} HR`;
  return listing.priceText?.trim() || 'no price';
}

/**
 * Market history of this exact item: "Listed N times by M sellers" and its listings (newest first)
 * with a "new owner" marker where the seller changed. Hidden for weak fingerprints and empty histories.
 */
export function RareHistorySection({ history }: { history: RareHistory | null }) {
  if (!history || history.weak || history.timesListed <= 0) return null;
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <SectionLabel>Item history</SectionLabel>
        <span className="text-[11px] text-muted-foreground">since {moment(history.firstSeen).format('MMM D')}</span>
      </div>
      <p className="text-sm text-foreground/90">
        Listed {plural(history.timesListed, 'time')} by {plural(history.distinctSellers, 'seller')}
      </p>
      <ul className="-mx-2 flex flex-col">
        {history.listings.map((l, i) => (
          <li
            key={`${l.listedAt}-${i}`}
            className="flex min-h-7 items-center gap-3 rounded-md px-2 py-0.5 text-xs hover:bg-accent/30"
          >
            <span className="w-14 shrink-0 tabular-nums text-muted-foreground">
              {moment(l.listedAt).format('MMM D')}
            </span>
            <span
              className={cn(
                'tabular-nums',
                l.hrPrice !== null ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {listingPrice(l)}
            </span>
            {l.sellerChanged && (
              <span className="ml-auto rounded-full border border-info/40 bg-info/10 px-1.5 py-px text-[10px] font-medium uppercase leading-none tracking-wide text-info">
                new owner
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
