import { describe, expect, it } from 'vitest';
import type { RareAppraisal } from '@/lib/rare-appraisal-api';
import { DEAL_THRESHOLDS, dealVerdict, makeDeal, MIN_BAND_SAMPLE, rareEstimate, type Estimate } from './deal';

const economy = (hr: number): Estimate => ({
  hr,
  source: 'economy',
  confidence: 'normal',
  detail: '7d market average',
});

function appraisal(market: RareAppraisal['market'], extra: Partial<RareAppraisal> = {}): RareAppraisal {
  return {
    id: 'f'.repeat(32),
    name: 'Doom Coil',
    baseName: 'Circlet',
    slot: 'circ',
    tab: null,
    position: null,
    verdict: 'keep',
    checkPriority: null,
    rank: 0.9,
    rankError: 0.1,
    stats: [],
    market,
    modelMode: 'softcore',
    modelVersion: 'test',
    ...extra,
  };
}

const band = (lowHr: number, highHr: number, sampleSize = 40): RareAppraisal['market'] => ({
  lowHr,
  highHr,
  source: 'current',
  sampleSize,
  mode: 'softcore',
});

describe('dealVerdict', () => {
  it.each([
    [0.1, 'steal'],
    [DEAL_THRESHOLDS.steal - 0.001, 'steal'],
    [DEAL_THRESHOLDS.steal, 'good'],
    [DEAL_THRESHOLDS.good - 0.001, 'good'],
    [DEAL_THRESHOLDS.good, 'fair'],
    [1, 'fair'],
    [DEAL_THRESHOLDS.fair, 'fair'],
    [DEAL_THRESHOLDS.fair + 0.001, 'high'],
    [5, 'high'],
  ] as const)('ratio %d → %s', (ratio, verdict) => {
    expect(dealVerdict(ratio)).toBe(verdict);
  });
});

describe('makeDeal', () => {
  it('judges the asking price against the estimate', () => {
    expect(makeDeal(1, economy(2))).toEqual({
      estimateHr: 2,
      ratio: 0.5,
      verdict: 'steal',
      source: 'economy',
      confidence: 'normal',
      detail: '7d market average',
    });
    expect(makeDeal(2.2, economy(2))?.verdict).toBe('fair');
    expect(makeDeal(3, economy(2))?.verdict).toBe('high');
  });

  it('keeps the estimate but gives no verdict for note-only listings (hr_price 0)', () => {
    const deal = makeDeal(0, economy(2));
    expect(deal).toMatchObject({ estimateHr: 2, ratio: null, verdict: null });
  });

  it('never fabricates a deal without a usable estimate', () => {
    expect(makeDeal(1, null)).toBeNull();
    expect(makeDeal(1, undefined)).toBeNull();
    expect(makeDeal(1, economy(0))).toBeNull();
    expect(makeDeal(1, economy(NaN))).toBeNull();
  });
});

describe('rareEstimate', () => {
  it('uses the midpoint of the asking band and keeps the band', () => {
    expect(rareEstimate(appraisal(band(1, 3)), null, 'detail')).toEqual({
      hr: 2,
      source: 'appraisal',
      confidence: 'normal',
      band: { lowHr: 1, highHr: 3 },
      detail: 'detail',
    });
  });

  it('is null without an appraisal or band', () => {
    expect(rareEstimate(null, 'not a rare')).toBeNull();
    expect(rareEstimate(appraisal(null), null)).toBeNull();
    expect(rareEstimate(appraisal(band(0, 0)), null)).toBeNull();
    expect(rareEstimate(appraisal(band(3, 1)), null)).toBeNull();
  });

  it('is low confidence for thin bands, low-confidence crafted slots and partially parsed items', () => {
    expect(rareEstimate(appraisal(band(1, 3, MIN_BAND_SAMPLE - 1)), null)?.confidence).toBe('low');
    expect(rareEstimate(appraisal(band(1, 3), { quality: 'Crafted', confidence: 'low' }), null)?.confidence).toBe(
      'low',
    );
    expect(rareEstimate(appraisal(band(1, 3)), 'unparsed stats: 2')?.confidence).toBe('low');
  });
});
