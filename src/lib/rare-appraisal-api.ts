/**
 * Client for the pd2-price-crawler rare appraisal API (`POST /api/rare-appraisal`).
 * Wire types mirror the server's src/rare-appraisal/rare-appraisal.types.ts; keep them in sync.
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';

export type RareSlot =
  | 'ring'
  | 'amul'
  | 'circ'
  | 'jewl'
  | 'glov'
  | 'boot'
  | 'belt'
  | 'tors'
  | 'helm'
  | 'shield'
  | 'quiver'
  | 'weapon';

export type Verdict = 'keep' | 'check' | 'vendor';

/** Check items are ordered by their strongest key stat: high = any ★★+, medium = ★, low = none. */
export type CheckPriority = 'high' | 'medium' | 'low';

/** 1 = ×1.25–2, 2 = ×2–4, 3 = ×4+ (late-season multiplier of the stat's tier on this slot). */
export type Stars = 1 | 2 | 3;

export interface AppraisedStat {
  /** In-game text as PD2 reports it, e.g. "+20% Faster Cast Rate". */
  label: string;
  /** Feature key, null when the modifier is not modelled. */
  key: string | null;
  value: number | null;
  /** Set only when the stat is a current key stat on this slot at this value. */
  stars: Stars | null;
  /** Price multiplier of the stat's tier (shown on hover), null when not a key stat. */
  multiplier: number | null;
  /** Roll quality 0..1 within the modifier's range, null when the range is unknown. */
  roll: number | null;
  /** Stat is key on this slot but this value is below the threshold: the value where it becomes key. */
  keyFrom: number | null;
  /** Added by corruption. */
  corrupted: boolean;
  /** Multiplier of the tier holding `keyFrom` on this slot in the current phase; null when not key (absent on older servers). */
  keyFromMultiplier?: number | null;
  /** The key values of this stat on this slot are only reachable through corruption (absent on older servers). */
  corruptionOnly?: boolean;
}

export interface MarketReference {
  /** Asking-price band (HR) of listings at a similar rank in this slot, p25–p75. */
  lowHr: number;
  highHr: number;
  /** 'last-season' = same point of the previous season; 'current' = recent listings this season. */
  source: 'last-season' | 'current';
  sampleSize: number;
  /** Listings the band comes from: 'hardcore' only for HC requests whose slot has HC bands, else 'softcore'. */
  mode: 'softcore' | 'hardcore';
}

export interface RareAppraisal {
  /** Content fingerprint; identical items in one stash get `-2`, `-3`… suffixes. */
  id: string;
  name: string;
  baseName: string;
  slot: RareSlot;
  tab: string | null;
  position: { column: number; row: number } | null;
  verdict: Verdict;
  /** Only for verdict 'check'. */
  checkPriority: CheckPriority | null;
  /** Predicted percentile (0..1) of the item's price within its slot at the current point of the season. */
  rank: number;
  /** Typical rank error (± this, 0..1) for the bar's soft band. */
  rankError: number;
  stats: AppraisedStat[];
  market: MarketReference | null;
  /** Season phase whose key stats set stars / keyFrom / keyFromMultiplier / corruptionOnly (early = fortnights 0–3). */
  phase?: 'early' | 'late';
  /** Rank, stars and verdict always come from the softcore-trained model, also for hardcore. */
  modelMode: 'softcore';
  modelVersion: string;
}

/** Thresholds the UI draws (bar lines) and the server applies. */
export interface VerdictRule {
  keepRank: number;
  vendorRank: number;
  rankError: number;
}

/** Listing history of one item on the PD2 market (server: rare_listings). */
export interface RareHistoryListing {
  listedAt: string;
  lastSeenAt: string;
  hrPrice: number | null;
  priceText: string | null;
  /** The listing came from a different seller than the previous one. */
  sellerChanged: boolean;
}

export interface RareHistory {
  key: string;
  keyType: 'fingerprint' | 'text';
  /** Weak fingerprint (≤3 mods): too generic to identify one item; never shown. */
  weak: boolean;
  timesListed: number;
  distinctSellers: number;
  firstSeen: string;
  lastSeen: string;
  /** Newest first, max 20. */
  listings: RareHistoryListing[];
}

export interface RareAppraisalResponse {
  appraisal: RareAppraisal | null;
  history: RareHistory | null;
  /** Why `appraisal` is null, e.g. 'not a rare', 'unknown base', 'unparsed stats: 2'. */
  reason: string | null;
}

/** Shown when the server has no rule for a response (matches the server default). */
export const DEFAULT_VERDICT_RULE: VerdictRule = { keepRank: 0.8, vendorRank: 0.25, rankError: 0.18 };

/**
 * Appraise one rare from the captured clipboard item (the PD2 item JSON string, sent verbatim).
 * Resolves `null` when the feature is off on the server (404); network/server errors reject.
 */
export async function fetchRareAppraisal(
  text: string,
  opts: { isLadder: boolean; isHardcore: boolean },
  signal?: AbortSignal,
): Promise<RareAppraisalResponse | null> {
  const response = await fetch(`${BACKEND_URL}/api/rare-appraisal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, isLadder: opts.isLadder, isHardcore: opts.isHardcore }),
    signal,
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Rare appraisal API error: ${response.status}`);
  return (await response.json()) as RareAppraisalResponse;
}
