import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DUR, EASE_OUT } from '@/lib/motion';
import type { RaresSummary } from '@/lib/networth-api';
import { fetchRareHistory, type RareAppraisal, type RareHistory, type VerdictRule } from '@/lib/rare-appraisal-api';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PopoverSectionTitle } from '@/components/custom/popover-parts';
import { VerdictBadge } from '@/components/rares/RareParts';
import { RareAppraisalDetail } from '@/components/rares/RareAppraisalDetail';
import { rareArtUrl } from '@/components/rares/rare-art';
import { statChipText } from '@/components/rares/stat-chip';
import {
  compareStash,
  fmtBandHr,
  isLowValue,
  isWorthALook,
  keyStats,
  locationText,
  marketBandText,
  MODEL_SEASON,
  plural,
  stashPositionText,
  starsText,
  starTitle,
} from '@/components/rares/rares-format';
import { EmptyState } from './StatePanel';

const EST_TITLE = `Estimated from ${MODEL_SEASON} asking prices of similar rares — not part of the total`;

/**
 * Stash Value "Rares" tab: verdict summary + Keep band, Keep and worth-a-look rares as expandable rows,
 * and per stash tab folds for likely-vendor and low-value Check rares. Rares never count in the total.
 */
export function RaresTab({
  rares,
  rule,
  summary,
  hardcore = false,
}: {
  rares: RareAppraisal[];
  rule: VerdictRule;
  summary: RaresSummary;
  /** Stash owner plays hardcore: notes that verdicts are softcore-trained and where prices come from. */
  hardcore?: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const { keep, worth, folds } = useMemo(() => {
    const byRank = (a: RareAppraisal, b: RareAppraisal) => b.rank - a.rank;
    const priority = (r: RareAppraisal) => (r.checkPriority === 'high' ? 0 : 1);
    const groups = new Map<string, { kind: 'vendor' | 'low'; tab: string; items: RareAppraisal[] }>();
    for (const r of rares) {
      const kind = r.verdict === 'vendor' ? 'vendor' : isLowValue(r) ? 'low' : null;
      if (!kind) continue;
      const tab = r.tab ?? 'Stash';
      const key = `${kind}|${tab}`;
      const group = groups.get(key) ?? { kind, tab, items: [] };
      group.items.push(r);
      groups.set(key, group);
    }
    return {
      keep: rares.filter((r) => r.verdict === 'keep').sort(byRank),
      worth: rares.filter(isWorthALook).sort((a, b) => priority(a) - priority(b) || byRank(a, b)),
      folds: [...groups.values()]
        .map((g) => ({ ...g, items: g.items.sort(compareStash) }))
        .sort(
          (a, b) =>
            (a.kind === b.kind ? 0 : a.kind === 'low' ? -1 : 1) ||
            a.tab.localeCompare(b.tab, undefined, { numeric: true }),
        ),
    };
  }, [rares]);

  if (rares.length === 0) {
    return (
      <EmptyState
        icon={<Gem />}
        title="No rares in your stash"
        description="Rare rings, amulets, jewels, armor and weapons in your stash are appraised here (Keep · Check · Vendor)."
      />
    );
  }

  return (
    <div className="space-y-3">
      <RaresSummaryCard summary={summary} />

      {keep.length > 0 && (
        <RareGroup title="Keep"
          count={keep.length}>
          {keep.map((r) => (
            <RareRow
              key={r.id}
              rare={r}
              rule={rule}
              hardcore={hardcore}
              expanded={expanded.has(r.id)}
              onToggle={toggle}
            />
          ))}
        </RareGroup>
      )}

      {worth.length > 0 && (
        <RareGroup title="Worth a look"
          count={worth.length}>
          {worth.map((r) => (
            <RareRow
              key={r.id}
              rare={r}
              rule={rule}
              hardcore={hardcore}
              expanded={expanded.has(r.id)}
              onToggle={toggle}
            />
          ))}
        </RareGroup>
      )}

      {folds.length > 0 && (
        <div className="space-y-1.5">
          {folds.map((g) => (
            <RareFold
              key={`${g.kind}|${g.tab}`}
              kind={g.kind}
              tab={g.tab}
              items={g.items}
              rule={rule}
              hardcore={hardcore}
              expanded={expanded}
              onToggleItem={toggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** "Rares: N Keep · N worth a look · N likely vendor (frees N slots)" + the Keep band (never in the total). */
export function RaresSummaryCard({ summary }: { summary: RaresSummary }) {
  const { keep, checkHigh, vendor, keepLowHr, keepHighHr, keepUnpriced } = summary;
  const priced = keep - keepUnpriced;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
      <p>
        <span className="text-muted-foreground">Rares: </span>
        <span className="font-medium text-success">{keep} Keep</span>
        <span className="text-muted-foreground"> · </span>
        <span className="font-medium text-warning">{checkHigh} worth a look</span>
        <span className="text-muted-foreground"> · </span>
        <span className="font-medium">{vendor} likely vendor</span>{' '}
        <span className="text-muted-foreground">(frees {plural(vendor, 'slot')})</span>
      </p>
      {priced > 0 && (
        <p
          className="text-xs text-muted-foreground"
          title={`${EST_TITLE}${keepUnpriced ? `; ${plural(keepUnpriced, 'Keep rare')} without a market band not included` : ''}`}
        >
          <span className="font-semibold tabular-nums text-foreground">
            + ~{fmtBandHr(keepLowHr)}–{fmtBandHr(keepHighHr)} HR
          </span>{' '}
          in Keep rares (estimated, not in total)
        </p>
      )}
    </div>
  );
}

function RareGroup({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <PopoverSectionTitle className="px-1">
        {title} <span className="font-normal tabular-nums text-muted-foreground">{count}</span>
      </PopoverSectionTitle>
      <ul className="overflow-hidden rounded-lg border border-border/60 bg-card/30">{children}</ul>
    </section>
  );
}

function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: DUR.med, ease: EASE_OUT }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const MAX_ROW_CHIPS = 2;

/** Up to two short ★ chips ("FCR 20%") on one line, "+N" for the rest; full stat text on hover. Never on vendor. */
function RowChips({ rare }: { rare: RareAppraisal }) {
  const keys = rare.verdict === 'vendor' ? [] : keyStats(rare);
  if (keys.length === 0) return null;
  const rest = keys.slice(MAX_ROW_CHIPS);
  return (
    <span className="flex min-w-0 shrink items-center gap-1 overflow-hidden">
      {keys.slice(0, MAX_ROW_CHIPS).map((s, i) => (
        <Tooltip key={`${i}-${s.label}`}>
          <TooltipTrigger asChild>
            <span className="inline-flex min-w-0 shrink items-center gap-1 rounded border border-border/60 bg-muted/40 px-1.5 text-[11px] leading-[18px] text-foreground/90">
              <span className="shrink-0 tracking-tighter text-glow">{starsText(s.stars)}</span>
              <span className="truncate">{statChipText(s.label)}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {s.label} · {starTitle(s)}
          </TooltipContent>
        </Tooltip>
      ))}
      {rest.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0 cursor-help text-[11px] text-muted-foreground">+{rest.length}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {rest.map((s) => `${starsText(s.stars)} ${s.label}`).join(' · ')}
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

/** Market history per rare id, fetched once when a row is first expanded. */
const historyCache = new Map<string, Promise<RareHistory | null>>();

function useRareHistory(id: string): RareHistory | null {
  const [history, setHistory] = useState<RareHistory | null>(null);
  useEffect(() => {
    let cancelled = false;
    let pending = historyCache.get(id);
    if (!pending) {
      pending = fetchRareHistory(id).catch(() => null);
      historyCache.set(id, pending);
    }
    pending.then((h) => {
      if (!cancelled) setHistory(h);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);
  return history;
}

function RareRowDetail({ rare, rule, hardcore }: { rare: RareAppraisal; rule: VerdictRule; hardcore: boolean }) {
  const history = useRareHistory(rare.id);
  return (
    <div className="space-y-3 border-t border-border/40 bg-background/30 px-3 py-3 text-sm">
      <RareAppraisalDetail
        appraisal={rare}
        history={history}
        hardcore={hardcore}
        rule={rule}
        stashPosition={stashPositionText(rare)}
      />
    </div>
  );
}

/**
 * One rare, two lines: icon, name + verdict, then "base · slot · tab" and up to two ★ chips; the usual asking
 * band on the right. Expands to the same appraisal detail as the price-check popover.
 */
function RareRow({
  rare,
  rule,
  hardcore,
  expanded,
  onToggle,
}: {
  rare: RareAppraisal;
  rule: VerdictRule;
  hardcore: boolean;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const band = marketBandText(rare);
  return (
    <li className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => onToggle(rare.id)}
        className={cn(
          'flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-2 text-left outline-none transition-colors duration-(--dur-fast)',
          'hover:bg-accent/40 focus-visible:bg-accent/40',
          expanded && 'bg-accent/30',
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40">
          <img
            src={rareArtUrl(rare)}
            alt=""
            aria-hidden
            loading="lazy"
            className="max-h-7 max-w-7 object-contain drop-shadow-[0_1px_2px_rgb(0_0_0/0.4)]"
            onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
          />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-q-rare">{rare.name}</span>
            <VerdictBadge rare={rare}
              hardcore={hardcore} />
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">{locationText(rare)}</span>
            <RowChips rare={rare} />
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums"
          title={EST_TITLE}>
          {band ?? <span className="text-muted-foreground/70">—</span>}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-(--dur-med)',
            expanded && 'rotate-180',
          )}
        />
      </button>
      <Collapse open={expanded}>
        <RareRowDetail rare={rare}
          rule={rule}
          hardcore={hardcore} />
      </Collapse>
    </li>
  );
}

const FOLD_TEXT = {
  vendor: {
    title: (n: number, tab: string) => `${n} likely vendor · ${tab}`,
    note: (n: number) => `Frees ${plural(n, 'stash slot')}`,
  },
  low: {
    title: (n: number, tab: string) => `${n} likely low value · ${tab}`,
    note: () => 'Check items without a key stat',
  },
};

/** Folded rares of one stash tab ("N likely vendor · Shared 3"), expanding to compact rows. */
function RareFold({
  kind,
  tab,
  items,
  rule,
  hardcore,
  expanded,
  onToggleItem,
}: {
  kind: 'vendor' | 'low';
  tab: string;
  items: RareAppraisal[];
  rule: VerdictRule;
  hardcore: boolean;
  expanded: Set<string>;
  onToggleItem: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const text = FOLD_TEXT[kind];
  return (
    <div className="overflow-hidden rounded-lg border border-dashed border-border bg-card/20">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-2 text-left outline-none transition-colors hover:bg-accent/30 focus-visible:bg-accent/30"
      >
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums',
            kind === 'vendor' ? 'bg-destructive/12 text-destructive' : 'bg-warning/12 text-warning',
          )}
        >
          {items.length}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm">{text.title(items.length, tab)}</span>
          <span className="text-[11px] text-muted-foreground">{text.note(items.length)}</span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-(--dur-med)',
            open && 'rotate-180',
          )}
        />
      </button>
      <Collapse open={open}>
        <ul className="border-t border-border/40">
          {items.map((r) => (
            <RareRow
              key={r.id}
              rare={r}
              rule={rule}
              hardcore={hardcore}
              expanded={expanded.has(r.id)}
              onToggle={onToggleItem}
            />
          ))}
        </ul>
      </Collapse>
    </div>
  );
}
