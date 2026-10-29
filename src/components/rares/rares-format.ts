/**
 * Formatting + text helpers for appraised rares (price-check rare card, Net Worth "Rares" tab).
 * Same wording as the pd2trader.com Net Worth view (client/src/components/wealth/rares/raresFormat.js).
 * UI words are translated (namespace `rares`); stat labels, bases and recipe names stay English (game data).
 */
import type { AppraisedStat, CraftRecipe, RareAppraisal, RareSlot, Stars, Verdict } from '@/lib/rare-appraisal-api';
import { t } from '@/i18n';

/**
 * Season the model's asking prices come from (the "est." hints), read off the appraisal's model version
 * (`s14-q50-2026-10-28` → "S14"); the version as is when it names no season.
 */
export function modelSeason(rare: Pick<RareAppraisal, 'modelVersion'>): string {
  const season = /^s(\d+)\b/i.exec(rare.modelVersion)?.[1];
  return season ? `S${season}` : rare.modelVersion;
}

export const RECIPE_LABELS: Record<CraftRecipe, string> = {
  blood: 'Blood craft',
  caster: 'Caster craft',
  hitpower: 'Hit Power craft',
  safety: 'Safety craft',
  vampiric: 'Vampiric craft',
  bountiful: 'Bountiful craft',
  brilliant: 'Brilliant craft',
};

export const isCrafted = (rare: Pick<RareAppraisal, 'quality'>): boolean => rare.quality === 'Crafted';

/** Item-name colour class by quality (older servers send no quality: rare). */
export const appraisalNameClass = (rare: Pick<RareAppraisal, 'quality'>): string =>
  isCrafted(rare) ? 'text-q-crafted' : 'text-q-rare';

/**
 * Text for a null appraisal's `reason`. Crafted gate-off reasons ("crafted slot unreliable: <backtest detail>")
 * become a plain sentence (detail stays in the hover title); every other reason is shown verbatim, as before.
 */
export function appraisalNote(reason: string): { text: string; title?: string } {
  if (reason.startsWith('crafted slot unreliable')) {
    return {
      text: t('rares:notes.craftedUnreliable'),
      title: reason,
    };
  }
  return { text: reason };
}

/** English slot names (compared with base names); display text goes through `slotLabel` / `slotPlural`. */
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

/** Translation keys per slot: `labelKey` singular ("Ring"), `nameKey` plural ("Rings"), `textKey` plural inside a sentence ("rings"). */
const SLOT_KEYS: Record<RareSlot, { labelKey: string; nameKey: string; textKey: string }> = {
  ring: {
    labelKey: 'rares:slots.ring.label',
    nameKey: 'rares:slots.ring.plural',
    textKey: 'rares:slots.ring.inSentence',
  },
  amul: {
    labelKey: 'rares:slots.amul.label',
    nameKey: 'rares:slots.amul.plural',
    textKey: 'rares:slots.amul.inSentence',
  },
  circ: {
    labelKey: 'rares:slots.circ.label',
    nameKey: 'rares:slots.circ.plural',
    textKey: 'rares:slots.circ.inSentence',
  },
  jewl: {
    labelKey: 'rares:slots.jewl.label',
    nameKey: 'rares:slots.jewl.plural',
    textKey: 'rares:slots.jewl.inSentence',
  },
  glov: {
    labelKey: 'rares:slots.glov.label',
    nameKey: 'rares:slots.glov.plural',
    textKey: 'rares:slots.glov.inSentence',
  },
  boot: {
    labelKey: 'rares:slots.boot.label',
    nameKey: 'rares:slots.boot.plural',
    textKey: 'rares:slots.boot.inSentence',
  },
  belt: {
    labelKey: 'rares:slots.belt.label',
    nameKey: 'rares:slots.belt.plural',
    textKey: 'rares:slots.belt.inSentence',
  },
  tors: {
    labelKey: 'rares:slots.tors.label',
    nameKey: 'rares:slots.tors.plural',
    textKey: 'rares:slots.tors.inSentence',
  },
  helm: {
    labelKey: 'rares:slots.helm.label',
    nameKey: 'rares:slots.helm.plural',
    textKey: 'rares:slots.helm.inSentence',
  },
  shield: {
    labelKey: 'rares:slots.shield.label',
    nameKey: 'rares:slots.shield.plural',
    textKey: 'rares:slots.shield.inSentence',
  },
  quiver: {
    labelKey: 'rares:slots.quiver.label',
    nameKey: 'rares:slots.quiver.plural',
    textKey: 'rares:slots.quiver.inSentence',
  },
  weapon: {
    labelKey: 'rares:slots.weapon.label',
    nameKey: 'rares:slots.weapon.plural',
    textKey: 'rares:slots.weapon.inSentence',
  },
};

/** Translated slot name, e.g. "Ring" (the raw slot id for unknown slots). */
export function slotLabel(slot: RareSlot): string {
  const keys = SLOT_KEYS[slot];
  return keys ? t(keys.labelKey) : slot;
}

/** Translated plural slot name: "Rings" as a heading, "rings" inside a sentence; "Items" / "items" for unknown slots. */
export function slotPlural(slot: RareSlot, inSentence = false): string {
  const keys = SLOT_KEYS[slot];
  if (!keys) return inSentence ? t('rares:slots.unknown.inSentence') : t('rares:slots.unknown.plural');
  return t(inSentence ? keys.textKey : keys.nameKey);
}

/** Translated verdict ("Keep" / "Check" / "Vendor"). */
export function verdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case 'keep':
      return t('rares:verdicts.keep');
    case 'check':
      return t('rares:verdicts.check');
    default:
      return t('rares:verdicts.vendor');
  }
}

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
    ? t('rares:rank.top', { percent: Math.max(1, Math.round((1 - rank) * 100)) })
    : t('rares:rank.bottom', { percent: Math.max(1, Math.round(rank * 100)) });
}

/** Ordinal percentile, e.g. 0.72 → "72nd". */
export function ordinalPercentile(rank: number): string {
  const n = Math.round(rank * 100);
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return t('rares:ordinal.th', { n });
  switch (n % 10) {
    case 1:
      return t('rares:ordinal.st', { n });
    case 2:
      return t('rares:ordinal.nd', { n });
    case 3:
      return t('rares:ordinal.rd', { n });
    default:
      return t('rares:ordinal.th', { n });
  }
}

/** Hover text for a starred stat: the multiplier stays out of the visible row. */
export function starTitle(stat: AppraisedStat): string {
  const m = stat.multiplier !== null ? `×${stat.multiplier.toFixed(1)}` : stat.stars ? STAR_RANGES[stat.stars] : '';
  return t('rares:keyStatTitle', { multiplier: m });
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
  const where =
    m.source === 'last-season'
      ? t('rares:marketSource.lastSeason')
      : m.mode === 'hardcore'
        ? t('rares:marketSource.hardcoreListings')
        : modelSeason(rare);
  return t('rares:marketSource.atThisRank', { slots: slotPlural(rare.slot, true), where });
}

/** Rank blocks (Blocks rank display): bottom 25% … top 5%, each [from, to) on the 0..1 percentile. */
export const RANK_BLOCKS: { label: string; labelKey: string; from: number; to: number }[] = [
  { label: 'bottom 25%', labelKey: 'rares:rankBlocks.bottom25', from: 0, to: 0.25 },
  { label: 'bottom 50%', labelKey: 'rares:rankBlocks.bottom50', from: 0.25, to: 0.5 },
  { label: 'top 50%', labelKey: 'rares:rankBlocks.top50', from: 0.5, to: 0.75 },
  { label: 'top 25%', labelKey: 'rares:rankBlocks.top25', from: 0.75, to: 0.85 },
  { label: 'top 15%', labelKey: 'rares:rankBlocks.top15', from: 0.85, to: 0.95 },
  { label: 'top 5%', labelKey: 'rares:rankBlocks.top5', from: 0.95, to: 1 },
];

/**
 * Index of the rank block that holds `rank`, decided on the same rounded "top X%" / "bottom X%" that
 * `rankText` prints, so the lit block never contradicts the verdict text (rank .75 → "top 25%" → top 25%).
 */
export function rankBlockIndex(rank: number): number {
  if (rank < 0.5) return Math.max(1, Math.round(rank * 100)) <= 25 ? 0 : 1;
  const top = Math.max(1, Math.round((1 - rank) * 100));
  return top <= 5 ? 5 : top <= 15 ? 4 : top <= 25 ? 3 : 2;
}

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

/**
 * Texts of one stat in the "Stats on this item" list: a compact `tag` ("C" corruption-only, "↑4" near miss)
 * whose full sentence is `note` (tooltip); both null when the stat needs no note.
 */
export function statNotes(stat: AppraisedStat, slot: RareSlot): { tag: string | null; note: string | null } {
  const slots = slotPlural(slot, true);
  const mult = (m: number) => `×${m.toFixed(1)}`;
  let tag: string | null = null;
  let note: string | null = null;
  if (stat.stars && stat.corruptionOnly) {
    const short = stat.key ? SHORT_STAT[stat.key.split('__')[0]] : undefined;
    tag = 'C';
    note = t('rares:statNotes.corruptionOnly', {
      stat: short && stat.value !== null ? `${stat.value} ${short}` : stat.label,
      slots,
    });
  } else if (!stat.stars && stat.keyFrom !== null) {
    tag = `↑${stat.keyFrom}`;
    if (stat.keyFromMultiplier) {
      const values = { from: stat.keyFrom, multiplier: mult(stat.keyFromMultiplier), slots };
      note = stat.corruptionOnly
        ? t('rares:statNotes.nearMissCorruption', values)
        : t('rares:statNotes.nearMiss', values);
    } else {
      const values = { from: stat.keyFrom, slots };
      note = stat.corruptionOnly
        ? t('rares:statNotes.valuableFromCorruption', values)
        : t('rares:statNotes.valuableFrom', values);
    }
  }
  return { tag, note };
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

/** Which listings a hardcore rank was taken against (server `rankReference`). */
function rankNote(rare: RareAppraisal): string {
  if (rare.rankReference === 'hardcore') return t('rares:hardcore.rankedHardcore');
  if (rare.rankReference === 'blended') {
    const percent = Math.round(100 * (rare.rankReferenceWeight ?? 0));
    return t('rares:hardcore.rankedBlended', { percent });
  }
  return t('rares:hardcore.rankedSoftcore');
}

/**
 * Note for hardcore: the price model and stars are softcore-trained; the rank is taken against hardcore
 * listings (blended with softcore while HC listings are few); the price band comes from hardcore listings
 * when the slot has HC bands, else from softcore listings. Null on softcore.
 */
export function hardcoreNote(rare: RareAppraisal, hardcore: boolean): string | null {
  if (!hardcore) return null;
  const parts = [t('rares:hardcore.model'), rankNote(rare)];
  if (rare.market) {
    parts.push(
      rare.market.mode === 'hardcore' ? t('rares:hardcore.pricesHardcore') : t('rares:hardcore.pricesSoftcore'),
    );
  }
  return parts.join('; ');
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

/** "War Belt · Belt · Shared 1" (row line; position is in the detail); the slot is skipped when it equals the base name (Ring, Jewel). */
export function locationText(rare: RareAppraisal): string {
  const sameAsBase = (SLOT_LABELS[rare.slot] ?? rare.slot) === rare.baseName;
  return [rare.baseName, sameAsBase ? null : slotLabel(rare.slot), rare.tab].filter(Boolean).join(' · ');
}

/** "Shared 1 · col 5, row 1" (raw 0-based PD2 grid coordinates shown 1-based); null without a tab or position. */
export function stashPositionText(rare: RareAppraisal): string | null {
  const position = rare.position
    ? t('rares:stashPosition', { column: rare.position.column + 1, row: rare.position.row + 1 })
    : null;
  return [rare.tab, position].filter(Boolean).join(' · ') || null;
}

/** Stash order: tab, then row, then column; items without a position last within their tab. */
export function compareStash(a: RareAppraisal, b: RareAppraisal): number {
  const byTab = (a.tab ?? '').localeCompare(b.tab ?? '', undefined, { numeric: true });
  if (byTab) return byTab;
  const pa = a.position;
  const pb = b.position;
  if (!pa || !pb) return pa ? -1 : pb ? 1 : 0;
  return pa.row - pb.row || pa.column - pb.column;
}
