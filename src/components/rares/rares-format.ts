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

/** Sub-line under the "Usually listed" value: "circlets at this rank · S13" / "· last season" / "· hardcore listings". */
export function marketSource(rare: RareAppraisal): string | null {
  const m = rare.market;
  if (!m) return null;
  const where = m.source === 'last-season' ? 'last season' : m.mode === 'hardcore' ? 'hardcore listings' : MODEL_SEASON;
  return `${(SLOT_PLURALS[rare.slot] ?? 'Items').toLowerCase()} at this rank · ${where}`;
}

/** Rank blocks (Blocks rank display): bottom 25% … top 5%, each [from, to) on the 0..1 percentile. */
export const RANK_BLOCKS: { label: string; from: number; to: number }[] = [
  { label: 'bottom 25%', from: 0, to: 0.25 },
  { label: '25–50%', from: 0.25, to: 0.5 },
  { label: '50–75%', from: 0.5, to: 0.75 },
  { label: 'top 25%', from: 0.75, to: 0.85 },
  { label: 'top 15%', from: 0.85, to: 0.95 },
  { label: 'top 5%', from: 0.95, to: 1.0001 },
];

/** Short names for the corruption note ("20 FCR on rings only via corruption"); the stat label otherwise. */
const SHORT_STAT: Record<string, string> = {
  item_fastercastrate: 'FCR',
  item_fastermovevelocity: 'FRW',
  item_fastergethitrate: 'FHR',
  item_fasterattackrate: 'IAS',
  item_magicbonus: 'MF',
  item_allskills: 'all skills',
  item_crushingblow: 'CB',
  item_deadlystrike: 'DS',
  maxdamage_percent: 'ED',
};

/** Right-hand / note texts of one stat in the "Stats on this item" list; null parts are not shown. */
export function statNotes(stat: AppraisedStat, slot: RareSlot): { note: string | null; roll: string | null } {
  const slots = (SLOT_PLURALS[slot] ?? 'items').toLowerCase();
  const mult = (m: number) => `×${m.toFixed(1)}`;
  let note: string | null = null;
  if (stat.stars && stat.corruptionOnly) {
    const short = stat.key ? SHORT_STAT[stat.key.split('__')[0]] : undefined;
    note = `${short && stat.value !== null ? `${stat.value} ${short}` : stat.label} on ${slots} only via corruption`;
  } else if (!stat.stars && stat.keyFrom !== null) {
    note = `near miss: ${stat.keyFrom}+ is ${stat.keyFromMultiplier ? mult(stat.keyFromMultiplier) : 'key'} on ${slots}`;
  }
  const roll =
    stat.roll === null
      ? null
      : `roll ${Math.round(stat.roll * 100)}%${stat.stars && stat.multiplier !== null ? ` · ${mult(stat.multiplier)}` : ''}`;
  return { note, roll };
}

/** "Stats on this item" order: key stats strongest first, then near misses, then the rest (in-game order). */
export function rankedStats(rare: RareAppraisal): AppraisedStat[] {
  const tier = (s: AppraisedStat) => (s.stars ? 0 : s.keyFrom !== null ? 1 : 2);
  return rare.stats
    .map((s, i) => ({ s, i }))
    .sort(
      (a, b) =>
        tier(a.s) - tier(b.s) ||
        (b.s.stars ?? 0) - (a.s.stars ?? 0) ||
        (b.s.multiplier ?? b.s.keyFromMultiplier ?? 0) - (a.s.multiplier ?? a.s.keyFromMultiplier ?? 0) ||
        a.i - b.i,
    )
    .map(({ s }) => s);
}

/**
 * Note for hardcore: the model is softcore-trained; the price band comes from hardcore listings when the
 * slot has HC bands, else from softcore listings. Null on softcore.
 */
export function hardcoreNote(rare: RareAppraisal, hardcore: boolean): string | null {
  if (!hardcore) return null;
  const base = 'Hardcore: verdict and stars from softcore data';
  if (!rare.market) return base;
  return `${base}; prices from ${rare.market.mode === 'hardcore' ? 'hardcore' : 'softcore'} listings`;
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
