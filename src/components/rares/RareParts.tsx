import React, { useLayoutEffect, useRef, useState } from 'react';
import moment from 'moment';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type {
  CheckPriority,
  RareAppraisal,
  RareHistory,
  RareHistoryListing,
  VerdictRule,
} from '@/lib/rare-appraisal-api';
import { ChevronDown, TriangleAlert } from 'lucide-react';
import { PopoverSectionTitle } from '@/components/custom/popover-parts';
import {
  hardcoreNote,
  isCrafted,
  LOW_CONFIDENCE_TITLE,
  ordinalPercentile,
  plural,
  RANK_BLOCKS,
  RECIPE_LABELS,
  rankBlockIndex,
  rankedStats,
  SLOT_PLURALS,
  starsText,
  statNotes,
  VERDICT_BADGE_CLASS,
  VERDICT_COLORS,
  VERDICT_LABELS,
} from './rares-format';

/*
 * Building blocks shared by the price-check rare card and the Net Worth "Rares" tab.
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

/** Crafted items only: recipe chip ("Caster craft") and a "Low confidence" badge when the server flags it. */
export function CraftedBadges({ rare, className }: { rare: RareAppraisal; className?: string }) {
  if (!isCrafted(rare)) return null;
  const recipe = rare.recipe ? RECIPE_LABELS[rare.recipe] : 'Crafted';
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1', className)}>
      <span className="inline-flex shrink-0 items-center rounded-full border border-q-crafted/40 bg-q-crafted/10 px-2 py-0.5 text-[11px] font-medium leading-none text-q-crafted">
        {recipe}
      </span>
      {rare.confidence === 'low' && (
        <Hint text={LOW_CONFIDENCE_TITLE}>
          <span className="inline-flex shrink-0 cursor-help items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold leading-none text-amber-500">
            <TriangleAlert aria-hidden
              className="size-3" />
            Low confidence
          </span>
        </Hint>
      )}
    </span>
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

/**
 * Blocks rank display: six segments (bottom 25% … top 5%), the item's segment filled in the verdict colour,
 * header "RANK AMONG <SLOTS> (this season)".
 */
export function RankBlocks({ rare }: { rare: RareAppraisal }) {
  const color = VERDICT_COLORS[rare.verdict];
  const slots = SLOT_PLURALS[rare.slot] ?? 'Items';
  const at = rankBlockIndex(rare.rank);
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
