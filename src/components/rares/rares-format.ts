/**
 * Formatting + text helpers for appraised rares (price-check rare card, Stash Value "Rares" tab).
 * Same wording as the pd2trader.com Net Worth view (client/src/components/wealth/rares/raresFormat.js).
 */
import type { AppraisedStat, RareAppraisal, RareSlot, Stars, Verdict } from '@/lib/rare-appraisal-api';

/** Season the model's asking prices come from (shown on the "est." hint). */
export const MODEL_SEASON = 'S13';

export const SLOT_LABELS: Record<RareSlot, string> = {
  ring: 'Ring',
  amul: 'Amulet',
  circ: 'Circlet',
  jewl: 'Jewel',
  glov: 'Gloves',
  boot: 'Boots',
  belt: 'Belt',
  tors: 'Body armor',
  helm: 'Helm',
  shield: 'Shield',
  quiver: 'Quiver',
  weapon: 'Weapon',
};

export const SLOT_PLURALS: Record<RareSlot, string> = {
  ring: 'Rings',
  amul: 'Amulets',
  circ: 'Circlets',
  jewl: 'Jewels',
  glov: 'Gloves',
  boot: 'Boots',
  belt: 'Belts',
  tors: 'Body armors',
  helm: 'Helms',
  shield: 'Shields',
  quiver: 'Quivers',
  weapon: 'Weapons',
};

export const VERDICT_LABELS: Record<Verdict, string> = { keep: 'Keep', check: 'Check', vendor: 'Vendor' };

/** Theme tokens (CSS/SVG), so every theme gets matching verdict colours. */
export const VERDICT_COLORS: Record<Verdict, string> = {
  keep: 'var(--success)',
  check: 'var(--warning)',
  vendor: 'var(--destructive)',
};

/** Tinted badge classes per verdict (same pattern as the delta pills). */
export const VERDICT_BADGE_CLASS: Record<Verdict, string> = {
  keep: 'border-success/40 bg-success/12 text-success',
  check: 'border-warning/40 bg-warning/12 text-warning',
  vendor: 'border-destructive/40 bg-destructive/12 text-destructive',
};

export const STAR_RANGES: Record<Stars, string> = { 1: '×1.25–2', 2: '×2–4', 3: '×4+' };

export const starsText = (n: Stars | null): string => '★'.repeat(n ?? 0);

/** "top 8%" for rank 0.92, "bottom 12%" for rank 0.12 (a low rank never reads as "top 88%"). Never 0%. */
export function rankText(rank: number): string {
  return rank >= 0.5
    ? `top ${Math.max(1, Math.round((1 - rank) * 100))}%`
    : `bottom ${Math.max(1, Math.round(rank * 100))}%`;
}

/** Ordinal percentile, e.g. 0.72 → "72nd". */
export function ordinalPercentile(rank: number): string {
  const n = Math.round(rank * 100);
  const mod100 = n % 100;
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : suffixes[n % 10] || 'th';
  return `${n}${suffix}`;
}

/** Hover text for a starred stat: the multiplier stays out of the visible row. */
export function starTitle(stat: AppraisedStat): string {
  const m = stat.multiplier !== null ? `×${stat.multiplier.toFixed(1)}` : stat.stars ? STAR_RANGES[stat.stars] : '';
  return `Key stat: ${m} late-season price for this tier`;
}

/** HR with precision that suits the magnitude (0.04, 0.8, 3.5, 12). */
export function fmtBandHr(v: number): string {
  if (v >= 10) return v.toFixed(0);
  if (v >= 1) return v.toFixed(1);
  return v.toFixed(2);
}

/** "1.5–3.2" for a band; one value when both ends format the same (asking prices cluster on 1, 0.5, 0.25…). */
export function bandRange(lowHr: number, highHr: number): string {
  const lo = fmtBandHr(lowHr);
  const hi = fmtBandHr(highHr);
  return lo === hi ? lo : `${lo}–${hi}`;
}

/** "~1.5–3.2 HR" for a rare's market band, null without one. */
export function marketBandText(rare: RareAppraisal): string | null {
  return rare.market ? `~${bandRange(rare.market.lowHr, rare.market.highHr)} HR` : null;
}

/** "Rings this good are usually listed around 1.5–3.2 HR" / "… were listed around … at this point last season". */
export function marketText(rare: RareAppraisal): string | null {
  const m = rare.market;
  if (!m) return null;
  const band = `${bandRange(m.lowHr, m.highHr)} HR`;
  const what = `${SLOT_PLURALS[rare.slot] ?? 'Items'} this good`;
  return m.source === 'last-season'
    ? `${what} were listed around ${band} at this point last season`
    : `${what} are usually listed around ${band}`;
}

/** Starred stats, strongest first. */
export function keyStats(rare: RareAppraisal): AppraisedStat[] {
  return rare.stats
    .filter((s) => s.stars)
    .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0) || (b.multiplier ?? 0) - (a.multiplier ?? 0));
}

/** "Worth a look": check items with a ★ key stat. Low-priority checks are folded away. */
export const isWorthALook = (r: RareAppraisal): boolean =>
  r.verdict === 'check' && (r.checkPriority === 'high' || r.checkPriority === 'medium');

/** Check items without a key stat ("likely low value"), folded per stash tab like vendor rares. */
export const isLowValue = (r: RareAppraisal): boolean => r.verdict === 'check' && !isWorthALook(r);

/** "War Belt · Belt · Shared 1 · col 3, row 1"; the slot is skipped when it equals the base name (Ring, Jewel). */
export function locationText(rare: RareAppraisal): string {
  const slot = SLOT_LABELS[rare.slot] ?? rare.slot;
  // Positions are raw PD2 grid coordinates (0-based); shown 1-based.
  const position = rare.position ? `col ${rare.position.column + 1}, row ${rare.position.row + 1}` : null;
  return [rare.baseName, slot === rare.baseName ? null : slot, rare.tab, position].filter(Boolean).join(' · ');
}

/** Stash order: tab, then row, then column; items without a position last within their tab. */
export function compareStash(a: RareAppraisal, b: RareAppraisal): number {
  const t = (a.tab ?? '').localeCompare(b.tab ?? '', undefined, { numeric: true });
  if (t) return t;
  const pa = a.position;
  const pb = b.position;
  if (!pa || !pb) return pa ? -1 : pb ? 1 : 0;
  return pa.row - pb.row || pa.column - pb.column;
}

export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;
