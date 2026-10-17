import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DUR, EASE_OUT } from '@/lib/motion';
import type { RaresSummary } from '@/lib/networth-api';
import type { RareAppraisal, VerdictRule } from '@/lib/rare-appraisal-api';
import { MarketLine, RankBar, RankText, StarChips, StatList, VerdictBadge } from '@/components/rares/RareParts';
import {
  compareStash,
  fmtBandHr,
  isLowValue,
  isWorthALook,
  locationText,
  marketBandText,
  MODEL_SEASON,
  plural,
  SLOT_LABELS,
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
}: {
  rares: RareAppraisal[];
  rule: VerdictRule;
  summary: RaresSummary;
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
            <RareRow key={r.id}
              rare={r}
              rule={rule}
              expanded={expanded.has(r.id)}
              onToggle={toggle} />
          ))}
        </RareGroup>
      )}

      {worth.length > 0 && (
        <RareGroup title="Worth a look"
          count={worth.length}>
          {worth.map((r) => (
            <RareRow key={r.id}
              rare={r}
              rule={rule}
              expanded={expanded.has(r.id)}
              onToggle={toggle} />
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
    <section className="space-y-1">
      <div className="flex items-baseline gap-2 px-1">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{title}</span>
        <span className="text-[11px] tabular-nums text-muted-foreground/70">{count}</span>
      </div>
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

/** One rare: name + location, verdict, ★ chips (never on vendor), market band, rank; expands to bar + stats. */
function RareRow({
  rare,
  rule,
  expanded,
  onToggle,
}: {
  rare: RareAppraisal;
  rule: VerdictRule;
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
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-[10px] font-semibold uppercase text-muted-foreground">
          {(SLOT_LABELS[rare.slot] ?? '?').slice(0, 2)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-q-rare">{rare.name}</span>
            <VerdictBadge rare={rare} />
          </span>
          <span className="truncate text-[11px] text-muted-foreground">{locationText(rare)}</span>
          <StarChips rare={rare} />
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-sm font-semibold tabular-nums"
            title={EST_TITLE}>
            {band ?? <span className="text-muted-foreground/70">—</span>}
          </span>
          <RankText rare={rare}
            className="text-muted-foreground" />
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-(--dur-med)',
            expanded && 'rotate-180',
          )}
        />
      </button>
      <Collapse open={expanded}>
        <div className="space-y-3 border-t border-border/40 bg-background/30 px-3 py-3">
          <RankBar rare={rare}
            rule={rule} />
          <MarketLine rare={rare} />
          <StatList rare={rare} />
        </div>
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
  expanded,
  onToggleItem,
}: {
  kind: 'vendor' | 'low';
  tab: string;
  items: RareAppraisal[];
  rule: VerdictRule;
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
            <RareRow key={r.id}
              rare={r}
              rule={rule}
              expanded={expanded.has(r.id)}
              onToggle={onToggleItem} />
          ))}
        </ul>
      </Collapse>
    </div>
  );
}
