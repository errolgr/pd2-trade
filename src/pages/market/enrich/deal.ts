/**
 * Deal verdicts: a listing's asking price (`hr_price`) against an estimate of what the item goes for.
 * Pure (no React), so the thresholds are testable and the web client can reuse them.
 */
import type { RareAppraisal } from '@/lib/rare-appraisal-api';

export type DealVerdict = 'steal' | 'good' | 'fair' | 'high';
export type DealSource = 'economy' | 'appraisal';

export interface Deal {
  /** Estimated value in HR; never fabricated (a listing without an estimate has no Deal at all). */
  estimateHr: number | null;
  /** hr_price / estimateHr; null for note-only listings (hr_price 0). */
  ratio: number | null;
  /** null for note-only listings: there is an estimate but no price to judge. */
  verdict: DealVerdict | null;
  source: DealSource | null;
  confidence?: 'normal' | 'low';
  /** Where the estimate comes from, for the tooltip ("7d average", "circlets at this rank · S13"). */
  detail?: string;
  /** Rare appraisals only: the p25–p75 asking-price band of similar listings. */
  band?: { lowHr: number; highHr: number };
}

/** An estimate before it meets a price. */
export interface Estimate {
  hr: number;
  source: DealSource;
  confidence: 'normal' | 'low';
  detail?: string;
  band?: { lowHr: number; highHr: number };
}

/**
 * Upper bounds (exclusive, except `fair`) of ratio = hr_price / estimate per verdict:
 * < 0.6 steal, < 0.85 good, ≤ 1.15 fair, else high.
 */
export const DEAL_THRESHOLDS = { steal: 0.6, good: 0.85, fair: 1.15 } as const;

export function dealVerdict(ratio: number): DealVerdict {
  if (ratio < DEAL_THRESHOLDS.steal) return 'steal';
  if (ratio < DEAL_THRESHOLDS.good) return 'good';
  if (ratio <= DEAL_THRESHOLDS.fair) return 'fair';
  return 'high';
}

/** Deal for an asking price and an estimate; null without a usable estimate. */
export function makeDeal(hrPrice: number, estimate: Estimate | null | undefined): Deal | null {
  if (!estimate || !Number.isFinite(estimate.hr) || estimate.hr <= 0) return null;
  const ratio = Number.isFinite(hrPrice) && hrPrice > 0 ? hrPrice / estimate.hr : null;
  return {
    estimateHr: estimate.hr,
    ratio,
    verdict: ratio === null ? null : dealVerdict(ratio),
    source: estimate.source,
    confidence: estimate.confidence,
    ...(estimate.detail ? { detail: estimate.detail } : {}),
    ...(estimate.band ? { band: estimate.band } : {}),
  };
}

/** Bands built on fewer listings than this are low confidence. */
export const MIN_BAND_SAMPLE = 10;

/**
 * Estimate from a rare/crafted appraisal: the midpoint of the asking-price band of similar listings.
 * null when the server gave no appraisal or no band (never guessed from the rank alone).
 */
export function rareEstimate(
  appraisal: RareAppraisal | null | undefined,
  reason: string | null | undefined,
  detail?: string,
): Estimate | null {
  const market = appraisal?.market;
  if (!market) return null;
  const { lowHr, highHr } = market;
  if (!Number.isFinite(lowHr) || !Number.isFinite(highHr) || lowHr < 0 || highHr <= 0 || highHr < lowHr) return null;
  const low =
    appraisal.confidence === 'low' || market.sampleSize < MIN_BAND_SAMPLE || !!reason?.startsWith('unparsed stats');
  return {
    hr: (lowHr + highHr) / 2,
    source: 'appraisal',
    confidence: low ? 'low' : 'normal',
    band: { lowHr, highHr },
    ...(detail ? { detail } : {}),
  };
}
