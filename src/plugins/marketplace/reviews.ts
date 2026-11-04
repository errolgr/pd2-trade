import type { InstalledPlugin } from '../host/types';
import type { ListingVersion, RatingHistogram, ReviewInput } from './api';

/** Review rules of the marketplace contract: 1-5 stars, body ≤ 2000 (may be empty), tied to an approved version. */

export const REVIEW_BODY_MAX = 2000;
export const REPORT_DETAILS_MAX = 1000;

export interface ReviewDraft {
  rating: number;
  body: string;
}

export type ReviewDraftError = 'rating' | 'tooLong';

export function validateReviewDraft(draft: ReviewDraft): ReviewDraftError | null {
  if (!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 5) return 'rating';
  if (draft.body.trim().length > REVIEW_BODY_MAX) return 'tooLong';
  return null;
}

/**
 * Who may write a review: signed in to PD2, with a marketplace install of an approved version (the review is
 * stored against that version). Unpacked dev copies and versions the server no longer lists cannot review.
 */
export type ReviewEligibility =
  | { kind: 'signedOut' }
  | { kind: 'notInstalled' }
  | { kind: 'unlistedVersion'; version: string }
  | { kind: 'ok'; version: string };

export function reviewEligibility(
  signedIn: boolean,
  installed: Pick<InstalledPlugin, 'version' | 'source'> | undefined,
  versions: readonly Pick<ListingVersion, 'version'>[],
): ReviewEligibility {
  if (!signedIn) return { kind: 'signedOut' };
  if (!installed || installed.source.kind !== 'marketplace') return { kind: 'notInstalled' };
  if (!versions.some((v) => v.version === installed.version))
    return { kind: 'unlistedVersion', version: installed.version };
  return { kind: 'ok', version: installed.version };
}

/** The PUT body: always the installed version, body trimmed. */
export function reviewInput(draft: ReviewDraft, installedVersion: string): ReviewInput {
  return { rating: draft.rating, body: draft.body.trim(), version: installedVersion };
}

/** Histogram rows 5 → 1 with their share of all ratings (0-100). */
export function histogramRows(histogram: RatingHistogram): Array<{ stars: number; count: number; percent: number }> {
  const total = Object.values(histogram).reduce((sum, n) => sum + n, 0);
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = histogram[String(stars) as keyof RatingHistogram] ?? 0;
    return { stars, count, percent: total ? Math.round((count / total) * 100) : 0 };
  });
}
