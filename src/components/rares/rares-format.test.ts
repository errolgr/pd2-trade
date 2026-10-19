import { describe, expect, it } from 'vitest';
import type { AppraisedStat, RareAppraisal } from '@/lib/rare-appraisal-api';
import {
  bandRange,
  compareStash,
  fmtBandHr,
  hardcoreNote,
  isLowValue,
  isWorthALook,
  keyStats,
  locationText,
  marketBandText,
  marketSource,
  ordinalPercentile,
  plural,
  RANK_BLOCKS,
  rankBlockIndex,
  rankedStats,
  rankText,
  starsText,
  starTitle,
  stashPositionText,
  statNotes,
} from './rares-format';

function stat(over: Partial<AppraisedStat>): AppraisedStat {
  return {
    label: 'stat',
    key: null,
    value: null,
    stars: null,
    multiplier: null,
    roll: null,
    keyFrom: null,
    corrupted: false,
    ...over,
  };
}

function rare(over: Partial<RareAppraisal> = {}): RareAppraisal {
  return {
    id: 'abc',
    name: 'Grim Loop',
    baseName: 'Ring',
    slot: 'ring',
    tab: 'Shared 1',
    position: { column: 4, row: 0 },
    verdict: 'check',
    checkPriority: null,
    rank: 0.5,
    rankError: 0.05,
    stats: [],
    market: null,
    modelMode: 'softcore',
    modelVersion: 'v1',
    ...over,
  };
}

const market = (over: Partial<NonNullable<RareAppraisal['market']>> = {}): NonNullable<RareAppraisal['market']> => ({
  lowHr: 1.5,
  highHr: 3.2,
  source: 'current',
  sampleSize: 40,
  mode: 'softcore',
  ...over,
});

describe('rankText', () => {
  it('reads high ranks as "top" and low ranks as "bottom"', () => {
    expect(rankText(0.92)).toBe('top 8%');
    expect(rankText(0.12)).toBe('bottom 12%');
    expect(rankText(0.5)).toBe('top 50%');
    expect(rankText(0.49)).toBe('bottom 49%');
  });

  it('never prints 0%', () => {
    expect(rankText(1)).toBe('top 1%');
    expect(rankText(0.999)).toBe('top 1%');
    expect(rankText(0)).toBe('bottom 1%');
  });
});

describe('rankBlockIndex', () => {
  it('lights the block that matches the rounded rankText across the whole range', () => {
    for (let i = 0; i <= 1000; i++) {
      const rank = i / 1000;
      const [, dir, pctText] = /^(top|bottom) (\d+)%$/.exec(rankText(rank))!;
      const pct = Number(pctText);
      const idx = rankBlockIndex(rank);
      const [blockDir, blockPctText] = RANK_BLOCKS[idx].label.split(' ');
      const blockPct = parseInt(blockPctText, 10);
      expect(blockDir, `rank ${rank}`).toBe(dir);
      // The block is the tightest one containing the printed percentage.
      expect(pct, `rank ${rank}`).toBeLessThanOrEqual(blockPct);
      const tighter = RANK_BLOCKS.filter((b) => b.label.startsWith(dir)).map((b) => parseInt(b.label.split(' ')[1], 10));
      expect(tighter.filter((p) => p >= pct && p < blockPct), `rank ${rank}`).toEqual([]);
    }
  });

  it('puts the rounding edge .75 into "top 25%" as the doc promises', () => {
    expect(RANK_BLOCKS[rankBlockIndex(0.75)].label).toBe('top 25%');
    expect(RANK_BLOCKS[rankBlockIndex(0.95)].label).toBe('top 5%');
    expect(RANK_BLOCKS[rankBlockIndex(0.25)].label).toBe('bottom 25%');
  });
});

describe('ordinalPercentile', () => {
  it.each([
    [0.01, '1st'],
    [0.02, '2nd'],
    [0.03, '3rd'],
    [0.04, '4th'],
    [0.11, '11th'],
    [0.12, '12th'],
    [0.13, '13th'],
    [0.21, '21st'],
    [0.72, '72nd'],
    [0.93, '93rd'],
    [0, '0th'],
    [1, '100th'],
  ])('%s → %s', (rank, text) => {
    expect(ordinalPercentile(rank)).toBe(text);
  });
});

describe('stars and key stat titles', () => {
  it('renders one star per level and none for null', () => {
    expect(starsText(3)).toBe('★★★');
    expect(starsText(null)).toBe('');
  });

  it('prefers the exact multiplier, then the star range', () => {
    expect(starTitle(stat({ stars: 2, multiplier: 2.46 }))).toBe('Key stat: ×2.5 late-season price for this tier');
    expect(starTitle(stat({ stars: 3 }))).toBe('Key stat: ×4+ late-season price for this tier');
  });
});

describe('price bands', () => {
  it('formats HR with magnitude-appropriate precision', () => {
    expect(fmtBandHr(0.04)).toBe('0.04');
    expect(fmtBandHr(0.999)).toBe('1.00');
    expect(fmtBandHr(1)).toBe('1.0');
    expect(fmtBandHr(9.94)).toBe('9.9');
    expect(fmtBandHr(10)).toBe('10');
    expect(fmtBandHr(12.6)).toBe('13');
  });

  it('collapses a band whose ends format identically', () => {
    expect(bandRange(1.5, 3.2)).toBe('1.5–3.2');
    expect(bandRange(1.01, 1.04)).toBe('1.0');
    expect(bandRange(0.5, 12)).toBe('0.50–12');
  });

  it('describes the market band and where it comes from', () => {
    expect(marketBandText(rare())).toBeNull();
    expect(marketSource(rare())).toBeNull();
    expect(marketBandText(rare({ market: market() }))).toBe('~1.5–3.2 HR');
    expect(marketSource(rare({ slot: 'circ', market: market() }))).toBe('circlets at this rank · S13');
    expect(marketSource(rare({ market: market({ source: 'last-season', mode: 'hardcore' }) }))).toBe(
      'rings at this rank · last season',
    );
    expect(marketSource(rare({ market: market({ mode: 'hardcore' }) }))).toBe('rings at this rank · hardcore listings');
  });
});

describe('statNotes', () => {
  it('tags corruption-only key stats with the short stat name', () => {
    expect(
      statNotes(stat({ stars: 2, corruptionOnly: true, key: 'item_fastercastrate__x', value: 20 }), 'ring'),
    ).toEqual({ tag: 'C', note: '20 FCR on rings only via corruption' });
  });

  it('falls back to the stat label without a short name or value', () => {
    expect(statNotes(stat({ stars: 1, corruptionOnly: true, key: 'item_unknown', label: '+1 Foo' }), 'amul')).toEqual({
      tag: 'C',
      note: '+1 Foo on amulets only via corruption',
    });
    expect(
      statNotes(stat({ stars: 1, corruptionOnly: true, key: 'item_magicbonus', value: null, label: 'MF' }), 'boot'),
    ).toEqual({ tag: 'C', note: 'MF on boots only via corruption' });
  });

  it('describes near misses with or without the tier multiplier', () => {
    expect(statNotes(stat({ keyFrom: 20, keyFromMultiplier: 2.04 }), 'amul')).toEqual({
      tag: '↑20',
      note: 'near miss: 20+ is ×2.0 on amulets',
    });
    expect(statNotes(stat({ keyFrom: 10, corruptionOnly: true }), 'glov')).toEqual({
      tag: '↑10',
      note: 'valuable from 10 on gloves (only via corruption)',
    });
  });

  it('has no note for plain stats or regular key stats', () => {
    expect(statNotes(stat({}), 'ring')).toEqual({ tag: null, note: null });
    expect(statNotes(stat({ stars: 2, keyFrom: 5 }), 'ring')).toEqual({ tag: null, note: null });
  });

  it('treats keyFrom 0 as a near miss (not as missing)', () => {
    expect(statNotes(stat({ keyFrom: 0 }), 'ring').tag).toBe('↑0');
  });
});

describe('stat ordering', () => {
  const plain1 = stat({ label: 'plain1' });
  const nearSmall = stat({ label: 'nearSmall', keyFrom: 5, keyFromMultiplier: 1.5 });
  const oneStarBig = stat({ label: 'oneStarBig', stars: 1, multiplier: 1.9 });
  const plain2 = stat({ label: 'plain2' });
  const threeStar = stat({ label: 'threeStar', stars: 3, multiplier: 5 });
  const nearBig = stat({ label: 'nearBig', keyFrom: 5, keyFromMultiplier: 3 });
  const oneStarSmall = stat({ label: 'oneStarSmall', stars: 1, multiplier: 1.3 });
  const r = rare({ stats: [plain1, nearSmall, oneStarBig, plain2, threeStar, nearBig, oneStarSmall] });

  it('ranks key stats (strongest first), then near misses, then the rest in game order', () => {
    expect(rankedStats(r).map((s) => s.label)).toEqual([
      'threeStar',
      'oneStarBig',
      'oneStarSmall',
      'nearBig',
      'nearSmall',
      'plain1',
      'plain2',
    ]);
  });

  it('keyStats keeps only starred stats, strongest first, without mutating the item', () => {
    expect(keyStats(r).map((s) => s.label)).toEqual(['threeStar', 'oneStarBig', 'oneStarSmall']);
    expect(r.stats[0]).toBe(plain1);
  });
});

describe('hardcoreNote', () => {
  it('is null on softcore', () => {
    expect(hardcoreNote(rare({ rankReference: 'hardcore' }), false)).toBeNull();
  });

  it('describes the rank reference and price listings on hardcore', () => {
    expect(hardcoreNote(rare({ rankReference: 'hardcore', market: market({ mode: 'hardcore' }) }), true)).toBe(
      'Hardcore: price model and stars from softcore data; ranked against hardcore listings; prices from hardcore listings',
    );
    expect(hardcoreNote(rare({ rankReference: 'blended', rankReferenceWeight: 0.426 }), true)).toBe(
      'Hardcore: price model and stars from softcore data; ranked against hardcore listings blended with softcore (43% hardcore)',
    );
    expect(hardcoreNote(rare({ market: market() }), true)).toBe(
      'Hardcore: price model and stars from softcore data; ranked against softcore listings; prices from softcore listings',
    );
  });

  it('treats a missing blend weight as 0%', () => {
    expect(hardcoreNote(rare({ rankReference: 'blended' }), true)).toContain('(0% hardcore)');
  });
});

describe('check classification', () => {
  it('splits check items by priority; keep/vendor are neither', () => {
    expect(isWorthALook(rare({ checkPriority: 'high' }))).toBe(true);
    expect(isWorthALook(rare({ checkPriority: 'medium' }))).toBe(true);
    expect(isWorthALook(rare({ checkPriority: 'low' }))).toBe(false);
    expect(isLowValue(rare({ checkPriority: 'low' }))).toBe(true);
    expect(isLowValue(rare({ checkPriority: null }))).toBe(true);
    for (const verdict of ['keep', 'vendor'] as const) {
      expect(isWorthALook(rare({ verdict, checkPriority: 'high' }))).toBe(false);
      expect(isLowValue(rare({ verdict }))).toBe(false);
    }
  });
});

describe('location texts', () => {
  it('skips the slot when it equals the base name and drops a missing tab', () => {
    expect(locationText(rare())).toBe('Ring · Shared 1');
    expect(locationText(rare({ baseName: 'War Belt', slot: 'belt' }))).toBe('War Belt · Belt · Shared 1');
    expect(locationText(rare({ baseName: 'Tiara', slot: 'circ', tab: null }))).toBe('Tiara · Circlet');
  });

  it('shows 0-based grid positions 1-based, and null when nothing is known', () => {
    expect(stashPositionText(rare())).toBe('Shared 1 · col 5, row 1');
    expect(stashPositionText(rare({ tab: null }))).toBe('col 5, row 1');
    expect(stashPositionText(rare({ position: null }))).toBe('Shared 1');
    expect(stashPositionText(rare({ tab: null, position: null }))).toBeNull();
  });
});

describe('compareStash', () => {
  it('orders by tab (numeric-aware), then row, then column, unpositioned last', () => {
    const items = [
      rare({ id: 'p10', tab: 'Shared 10', position: { column: 0, row: 0 } }),
      rare({ id: 'none', tab: 'Shared 2', position: null }),
      rare({ id: 'r1c0', tab: 'Shared 2', position: { column: 0, row: 1 } }),
      rare({ id: 'r0c3', tab: 'Shared 2', position: { column: 3, row: 0 } }),
      rare({ id: 'r0c1', tab: 'Shared 2', position: { column: 1, row: 0 } }),
    ];
    expect([...items].sort(compareStash).map((r) => r.id)).toEqual(['r0c1', 'r0c3', 'r1c0', 'none', 'p10']);
  });

  it('treats two unpositioned items in a tab as equal', () => {
    expect(compareStash(rare({ position: null }), rare({ position: null }))).toBe(0);
  });
});

describe('plural', () => {
  it('pluralises everything but one', () => {
    expect(plural(1, 'rare')).toBe('1 rare');
    expect(plural(0, 'rare')).toBe('0 rares');
    expect(plural(2, 'rare')).toBe('2 rares');
  });
});
