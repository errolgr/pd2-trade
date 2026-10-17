import React, { useLayoutEffect, useRef, useState } from 'react';
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
import { ChevronDown } from 'lucide-react';
import { PopoverSectionTitle } from '@/components/custom/popover-parts';
import {
  bandRange,
  hardcoreNote,
  keyStats,
  marketSource,
  ordinalPercentile,
  plural,
  RANK_BLOCKS,
  rankedStats,
  rankText,
  SLOT_PLURALS,
  starsText,
  starTitle,
  statNotes,
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

export function VerdictBadge({
  rare,
  className,
  hardcore = false,
}: {
  rare: RareAppraisal;
  className?: string;
  hardcore?: boolean;
}) {
  const priority = rare.verdict === 'check' && rare.checkPriority ? PRIORITY_TITLES[rare.checkPriority] : null;
  const title = [priority, hardcoreNote(rare, hardcore)].filter(Boolean).join(' · ') || undefined;
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
 * a glow marker; non-key stats are dimmed. Roll bar when the range is known, grey "valuable from N" when
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
                    valuable from {s.keyFrom}
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

/** Scannable market block: "USUALLY LISTED" / "1.5–2.0 HR" / "circlets at this rank · S13"; sample size on hover. */
export function MarketBlock({ rare, className }: { rare: RareAppraisal; className?: string }) {
  const m = rare.market;
  if (!m) return null;
  return (
    <Hint text={`Asking prices (25th–75th percentile) of ${m.sampleSize} listings at a similar rank`}>
      <div className={cn('flex cursor-help flex-col leading-tight', className)}>
        <SectionLabel className="text-[10px]">Usually listed</SectionLabel>
        <span className="text-lg font-semibold tabular-nums text-foreground">{bandRange(m.lowHr, m.highHr)} HR</span>
        <span className="text-[11px] text-muted-foreground">{marketSource(rare)}</span>
      </div>
    </Hint>
  );
}

/**
 * Blocks rank display: six segments (bottom 25% … top 5%), the item's segment filled in the verdict colour,
 * header "RANK AMONG <SLOTS> (this season)".
 */
export function RankBlocks({ rare }: { rare: RareAppraisal }) {
  const color = VERDICT_COLORS[rare.verdict];
  const slots = SLOT_PLURALS[rare.slot] ?? 'Items';
  const at = RANK_BLOCKS.findIndex((b) => rare.rank >= b.from && rare.rank < b.to);
  return (
    <div
      className="flex flex-col gap-1.5"
      role="img"
      aria-label={`Rank among ${slots.toLowerCase()}: ${RANK_BLOCKS[at]?.label}`}
    >
      <SectionLabel className="text-[10px]">
        Rank among {slots} <span className="normal-case tracking-normal">(this season)</span>
      </SectionLabel>
      <div className="grid grid-cols-6 gap-1">
        {RANK_BLOCKS.map((b, i) => (
          <div key={b.label}
            className="flex flex-col items-center gap-1">
            <span
              className={cn('h-2.5 w-full rounded-sm', i !== at && 'bg-muted')}
              style={i === at ? { background: color, boxShadow: `0 0 8px -1px ${color}` } : undefined}
            />
            <span
              className={cn(
                'whitespace-nowrap text-[10px] leading-none tabular-nums',
                i === at ? 'font-semibold' : 'text-muted-foreground/80',
              )}
              style={i === at ? { color } : undefined}
            >
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Bar or Blocks, per the "Rare rank display" setting. */
export function RankDisplay({ rare, rule, mode }: { rare: RareAppraisal; rule: VerdictRule; mode: 'bar' | 'blocks' }) {
  return mode === 'blocks' ? <RankBlocks rare={rare} /> : <RankBar rare={rare}
    rule={rule} />;
}

/** One-line text that truncates with an ellipsis; when cut, a dotted underline and the full text on hover. */
function TruncatedText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setCut(el.scrollWidth > el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);
  // The tooltip wrapper is always mounted (content only when cut) so toggling it never remounts the measured span.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          ref={ref}
          className={cn(
            'block min-w-0 truncate',
            cut && 'cursor-help underline decoration-dotted underline-offset-2',
            className,
          )}
        >
          {text}
        </span>
      </TooltipTrigger>
      {cut && <TooltipContent className="max-w-xs">{text}</TooltipContent>}
    </Tooltip>
  );
}

/**
 * Collapsible "Stats on this item" popover section: stats ranked by value (key stats, near misses, then the
 * rest dimmed), one line each: ★, stat text, a "C" (corruption-only) / "↑N" (near miss) tag with the full note
 * on hover, and the roll bar + "roll 90% · ×2.4" on the right.
 */
export function ItemStatsSection({
  rare,
  open,
  onOpenChange,
}: {
  rare: RareAppraisal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const keyCount = rare.stats.filter((s) => s.stars).length;
  return (
    <section>
      <button
        type="button"
        tabIndex={-1}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={cn('block w-full cursor-pointer text-left outline-none', !open && '-mb-1.5')}
      >
        <PopoverSectionTitle
          aside={
            <>
              {keyCount > 0 ? plural(keyCount, 'key stat') : 'no key stats'}
              <ChevronDown className={cn('size-3 transition-transform duration-(--dur-med)', open && 'rotate-180')} />
            </>
          }
        >
          Stats on this item
        </PopoverSectionTitle>
      </button>
      {open && (
        <ul className="space-y-1">
          {rankedStats(rare).map((s, i) => {
            const { tag, note } = statNotes(s, rare.slot);
            const roll = s.roll !== null;
            const isKey = s.stars !== null;
            const dim = !isKey && s.keyFrom === null;
            const mult = isKey && s.multiplier !== null ? `×${s.multiplier.toFixed(1)}` : null;
            return (
              <li
                key={`${i}-${s.label}`}
                className={cn('-mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-1 text-xs', isKey && 'bg-glow/10')}
              >
                <span className="w-8 shrink-0 tracking-tighter text-glow">{starsText(s.stars)}</span>
                <TruncatedText
                  text={s.label}
                  className={cn(
                    'flex-1',
                    isKey ? 'text-foreground' : dim ? 'text-muted-foreground/70' : 'text-muted-foreground',
                    s.corrupted && 'text-q-corrupted',
                  )}
                />
                {tag && note && (
                  <Hint text={note}>
                    <span
                      className={cn(
                        'shrink-0 cursor-help rounded border px-1 text-[10px] font-semibold leading-4 tabular-nums',
                        tag === 'C'
                          ? 'border-q-corrupted/40 bg-q-corrupted/10 text-q-corrupted'
                          : 'border-border bg-muted/60 text-muted-foreground',
                      )}
                    >
                      {tag}
                    </span>
                  </Hint>
                )}
                <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap tabular-nums">
                  {roll && (
                    <>
                      <span className="block h-1 w-10 overflow-hidden rounded-full bg-muted">
                        <span
                          className={cn('block h-full rounded-full', isKey ? 'bg-glow' : 'bg-muted-foreground/50')}
                          style={{ width: `${Math.round((s.roll ?? 0) * 100)}%` }}
                        />
                      </span>
                      <span className="text-[10px] text-muted-foreground">roll {Math.round((s.roll ?? 0) * 100)}%</span>
                    </>
                  )}
                  {mult && (
                    <>
                      {roll && <span className="text-[10px] text-muted-foreground">·</span>}
                      <span className="font-semibold text-foreground">{mult}</span>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** One muted line on hardcore: softcore-trained model/stars, the rank's reference listings, and where prices come from. */
export function HardcoreNote({
  rare,
  hardcore,
  className,
}: {
  rare: RareAppraisal;
  hardcore: boolean;
  className?: string;
}) {
  const note = hardcoreNote(rare, hardcore);
  if (!note) return null;
  return <p className={cn('text-[11px] leading-snug text-muted-foreground', className)}>{note}.</p>;
}

/** Asking price of one listing: HR without trailing zeros ("3.5 HR", "2 HR", "0.15 HR"), else the seller's text. */
function listingPrice(listing: RareHistoryListing): string {
  if (listing.hrPrice !== null) return `${Number(listing.hrPrice.toFixed(2))} HR`;
  return listing.priceText?.trim() || 'no price';
}

/**
 * Market history of this exact item, as a popover section: title with "3× · 2 sellers · since Sep 27" and its
 * listings (newest first; date, "new owner" where the seller changed, price). Hidden for weak fingerprints and
 * empty histories.
 */
export function RareHistorySection({ history }: { history: RareHistory | null }) {
  if (!history || history.weak || history.timesListed <= 0) return null;
  return (
    <section>
      <PopoverSectionTitle
        aside={`${history.timesListed}× · ${plural(history.distinctSellers, 'seller')} · since ${moment(history.firstSeen).format('MMM D')}`}
      >
        Item history
      </PopoverSectionTitle>
      <ul className="space-y-0.5">
        {history.listings.map((l, i) => (
          <li
            key={`${l.listedAt}-${i}`}
            className="-mx-1.5 flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-accent/60"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="tabular-nums text-muted-foreground">{moment(l.listedAt).format('MMM D')}</span>
              {l.sellerChanged && (
                <span className="rounded-full border border-info/40 bg-info/10 px-1.5 py-px text-[10px] font-medium leading-none text-info">
                  new owner
                </span>
              )}
            </span>
            <span
              className={cn(
                'shrink-0 tabular-nums',
                l.hrPrice !== null ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {listingPrice(l)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
