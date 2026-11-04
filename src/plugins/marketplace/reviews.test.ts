import { describe, expect, it } from 'vitest';
import { REVIEW_BODY_MAX, histogramRows, reviewEligibility, reviewInput, validateReviewDraft } from './reviews';

const marketplaceSource = { kind: 'marketplace', sha256: 'x', signature: 'y' } as const;
const versions = [{ version: '1.2.0' }, { version: '1.1.0' }];

describe('validateReviewDraft', () => {
  it('needs a whole star rating from 1 to 5', () => {
    expect(validateReviewDraft({ rating: 0, body: '' })).toBe('rating');
    expect(validateReviewDraft({ rating: 6, body: '' })).toBe('rating');
    expect(validateReviewDraft({ rating: 3.5, body: '' })).toBe('rating');
    expect(validateReviewDraft({ rating: 1, body: '' })).toBeNull();
    expect(validateReviewDraft({ rating: 5, body: 'Great' })).toBeNull();
  });

  it('caps the trimmed body at 2000 characters', () => {
    expect(validateReviewDraft({ rating: 4, body: 'x'.repeat(REVIEW_BODY_MAX) })).toBeNull();
    expect(validateReviewDraft({ rating: 4, body: `  ${'x'.repeat(REVIEW_BODY_MAX)}  ` })).toBeNull();
    expect(validateReviewDraft({ rating: 4, body: 'x'.repeat(REVIEW_BODY_MAX + 1) })).toBe('tooLong');
  });
});

describe('reviewEligibility', () => {
  it('needs a PD2 sign-in first', () => {
    expect(reviewEligibility(false, { version: '1.2.0', source: marketplaceSource }, versions)).toEqual({
      kind: 'signedOut',
    });
  });

  it('needs a marketplace install (not an unpacked dev copy)', () => {
    expect(reviewEligibility(true, undefined, versions)).toEqual({ kind: 'notInstalled' });
    expect(
      reviewEligibility(true, { version: '1.2.0', source: { kind: 'dev', location: 'x', transport: 'url' } }, versions),
    ).toEqual({ kind: 'notInstalled' });
  });

  it('ties the review to the installed version, which must be an approved one', () => {
    expect(reviewEligibility(true, { version: '1.1.0', source: marketplaceSource }, versions)).toEqual({
      kind: 'ok',
      version: '1.1.0',
    });
    expect(reviewEligibility(true, { version: '1.0.0', source: marketplaceSource }, versions)).toEqual({
      kind: 'unlistedVersion',
      version: '1.0.0',
    });
  });
});

describe('reviewInput', () => {
  it('sends the installed version and the trimmed body', () => {
    expect(reviewInput({ rating: 4, body: '  Solid  ' }, '1.2.0')).toEqual({
      rating: 4,
      body: 'Solid',
      version: '1.2.0',
    });
  });
});

describe('histogramRows', () => {
  it('lists 5 → 1 stars with rounded shares', () => {
    expect(histogramRows({ '1': 1, '2': 0, '3': 0, '4': 1, '5': 1 })).toEqual([
      { stars: 5, count: 1, percent: 33 },
      { stars: 4, count: 1, percent: 33 },
      { stars: 3, count: 0, percent: 0 },
      { stars: 2, count: 0, percent: 0 },
      { stars: 1, count: 1, percent: 33 },
    ]);
    expect(histogramRows({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }).every((r) => r.percent === 0)).toBe(true);
  });
});
