// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { RaresSummary } from '@/lib/networth-api';
import { fetchRareHistory, type AppraisedStat, type RareAppraisal, type RareHistory } from '@/lib/rare-appraisal-api';
import type * as RareApi from '@/lib/rare-appraisal-api';
import { RaresSummaryCard, RaresTab } from './RaresTab';

vi.mock('@/lib/rare-appraisal-api', async (importOriginal) => ({
  ...(await importOriginal<typeof RareApi>()),
  fetchRareHistory: vi.fn(),
}));
vi.mock('@/hooks/useOptions', () => ({
  useOptions: () => ({ settings: { rareRankDisplay: 'blocks', rareStatsExpanded: false }, updateSettings: vi.fn() }),
}));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));

const RULE = { keepRank: 0.8, vendorRank: 0.25, rankError: 0.18 };
const SUMMARY: RaresSummary = {
  keep: 2,
  check: 3,
  checkHigh: 2,
  vendor: 1,
  keepLowHr: 1.25,
  keepHighHr: 12.4,
  keepUnpriced: 0,
};

let nextId = 0;
/** Ids are unique per test: the tab caches rare history per id at module level. */
function rare(overrides: Partial<RareAppraisal> = {}): RareAppraisal {
  nextId += 1;
  return {
    id: `rare-${nextId}`,
    name: `Rare ${nextId}`,
    baseName: 'Ring',
    slot: 'ring',
    tab: 'Shared 1',
    position: { column: 0, row: 0 },
    verdict: 'keep',
    checkPriority: null,
    rank: 0.5,
    rankError: 0.1,
    stats: [],
    market: null,
    modelMode: 'softcore',
    modelVersion: 'v1',
    ...overrides,
  };
}

function star(label: string, stars: 1 | 2 | 3, multiplier: number): AppraisedStat {
  return { label, key: null, value: null, stars, multiplier, roll: null, keyFrom: null, corrupted: false };
}

function renderTab(rares: RareAppraisal[], summary: RaresSummary = SUMMARY, hardcore = false) {
  return render(
    <TooltipProvider delayDuration={0}>
      <RaresTab rares={rares}
        rule={RULE}
        summary={summary}
        hardcore={hardcore} />
    </TooltipProvider>,
  );
}

/** The group section titled `title` ("Keep 2"). */
function group(title: string): HTMLElement {
  return [...document.querySelectorAll('section')].find((s) =>
    s.firstElementChild?.textContent?.startsWith(`${title} `),
  )!;
}

/** Row names inside the group titled `title`, top to bottom. */
function groupNames(title: string): string[] {
  return [...group(title).querySelectorAll('li .text-q-rare')].map((el) => el.textContent ?? '');
}

/** Fold header titles, top to bottom. */
function foldTitles(): string[] {
  return [...document.querySelectorAll('.border-dashed > button .truncate')].map((el) => el.textContent ?? '');
}

function rowButton(name: string): HTMLElement {
  return screen.getByText(name).closest('button')!;
}

beforeEach(() => {
  vi.mocked(fetchRareHistory).mockResolvedValue(null);
});

// happy-dom's Web Animations reject on cancel; framer-motion animations add nothing to these assertions
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
afterEach(cleanup);

describe('RaresTab', () => {
  it('explains the tab when the stash has no rares', () => {
    renderTab([]);
    expect(screen.getByText('No rares in your stash')).not.toBeNull();
    expect(screen.queryByText(/^Rares:/)).toBeNull();
  });

  it('lists Keep rares by predicted rank, best first', () => {
    const low = rare({ name: 'Low Keep', rank: 0.81 });
    const high = rare({ name: 'High Keep', rank: 0.97 });
    renderTab([low, high]);
    expect(groupNames('Keep')).toEqual(['High Keep', 'Low Keep']);
    expect(group('Keep').firstElementChild?.textContent).toBe('Keep 2');
  });

  it('lists worth-a-look rares by priority, then rank, and keeps low-priority checks out of it', () => {
    renderTab([
      rare({ name: 'Medium Strong', verdict: 'check', checkPriority: 'medium', rank: 0.79 }),
      rare({ name: 'High Weak', verdict: 'check', checkPriority: 'high', rank: 0.4 }),
      rare({ name: 'High Strong', verdict: 'check', checkPriority: 'high', rank: 0.7 }),
      rare({ name: 'Low Check', verdict: 'check', checkPriority: 'low', rank: 0.79 }),
    ]);
    expect(groupNames('Worth a look')).toEqual(['High Strong', 'High Weak', 'Medium Strong']);
    expect(screen.queryByText('Low Check')).toBeNull();
    expect(group('Keep')).toBeUndefined();
  });

  it('folds low-value checks before vendor rares, per stash tab in natural tab order', () => {
    renderTab([
      rare({ verdict: 'vendor', tab: 'Shared 10' }),
      rare({ verdict: 'vendor', tab: 'Shared 2' }),
      rare({ verdict: 'vendor', tab: 'Shared 2' }),
      rare({ verdict: 'check', checkPriority: 'low', tab: null }),
      rare({ verdict: 'check', checkPriority: null, tab: 'Personal' }),
    ]);
    expect(foldTitles()).toEqual([
      '1 likely low value · Personal',
      '1 likely low value · Stash',
      '2 likely vendor · Shared 2',
      '1 likely vendor · Shared 10',
    ]);
    expect(screen.getByText('Frees 2 stash slots')).not.toBeNull();
    expect(screen.getByText('Frees 1 stash slot')).not.toBeNull();
    expect(screen.getAllByText('Check items without a key stat')).toHaveLength(2);
  });

  it('opens a fold to show its rares in stash order (row, then column, unplaced last)', () => {
    renderTab([
      rare({ name: 'Unplaced', verdict: 'vendor', position: null }),
      rare({ name: 'Row 2', verdict: 'vendor', position: { column: 0, row: 1 } }),
      rare({ name: 'Row 1 Col 3', verdict: 'vendor', position: { column: 2, row: 0 } }),
      rare({ name: 'Row 1 Col 1', verdict: 'vendor', position: { column: 0, row: 0 } }),
    ]);
    const fold = screen.getByText('4 likely vendor · Shared 1').closest('button')!;
    expect(screen.queryByText('Unplaced')).toBeNull();
    fireEvent.click(fold);
    expect(fold.getAttribute('aria-expanded')).toBe('true');
    const names = [...document.querySelectorAll('li .text-q-rare')].map((el) => el.textContent);
    expect(names).toEqual(['Row 1 Col 1', 'Row 1 Col 3', 'Row 2', 'Unplaced']);
  });

  it('shows location, market band and up to two key-stat chips per row', () => {
    renderTab([
      rare({
        name: 'Chippy',
        baseName: 'War Belt',
        slot: 'belt',
        tab: 'Shared 3',
        market: { lowHr: 1.5, highHr: 3.24, source: 'current', sampleSize: 30, mode: 'softcore' },
        stats: [
          star('+20% Faster Hit Recovery', 1, 1.3),
          star('+30% Faster Run/Walk', 3, 4.5),
          star('+40 to Life', 2, 2.1),
          star('+20% Fire Resist', 1, 1.5),
        ],
      }),
      rare({ name: 'No Band', verdict: 'keep' }),
    ]);
    const row = rowButton('Chippy');
    expect(row.textContent).toContain('War Belt · Belt · Shared 3');
    expect(row.textContent).toContain('~1.5–3.2 HR');
    expect([...row.querySelectorAll('.text-glow')].map((el) => el.textContent)).toEqual(['★★★', '★★']);
    expect(row.textContent).toContain('+2');
    expect(rowButton('No Band').textContent).toContain('—');
    expect(rowButton('No Band').textContent).toContain('Ring · Shared 1');
  });

  it('never shows key-stat chips on vendor rares', () => {
    renderTab([rare({ name: 'Vendor Me', verdict: 'vendor', stats: [star('+1 to All Skills', 2, 2)] })]);
    fireEvent.click(screen.getByText('1 likely vendor · Shared 1'));
    expect(rowButton('Vendor Me').querySelector('.text-glow')).toBeNull();
  });

  it('expands a row into the appraisal detail and loads its market history once', async () => {
    const history: RareHistory = {
      key: 'k',
      keyType: 'fingerprint',
      weak: false,
      timesListed: 2,
      distinctSellers: 2,
      firstSeen: '2026-09-27T12:00:00',
      lastSeen: '2026-10-01T12:00:00',
      listings: [
        { listedAt: '2026-10-01T12:00:00', lastSeenAt: '', hrPrice: 2, priceText: null, sellerChanged: true },
      ],
    };
    vi.mocked(fetchRareHistory).mockResolvedValue(history);
    const r = rare({ name: 'Expand Me', tab: 'Shared 4', position: { column: 4, row: 0 } });
    renderTab([r]);
    const row = rowButton('Expand Me');
    expect(row.getAttribute('aria-expanded')).toBe('false');
    expect(fetchRareHistory).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(row);
    });
    expect(row.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Shared 4 · col 5, row 1')).not.toBeNull();
    expect(screen.getByText('Item history')).not.toBeNull();

    // Collapse and re-expand: served from the cache
    await act(async () => {
      fireEvent.click(row);
    });
    expect(row.getAttribute('aria-expanded')).toBe('false');
    await act(async () => {
      fireEvent.click(row);
    });
    expect(fetchRareHistory).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchRareHistory).mock.calls[0][0]).toBe(r.id);
  });

  it('still shows the appraisal when the history request fails', async () => {
    vi.mocked(fetchRareHistory).mockRejectedValue(new Error('offline'));
    renderTab([rare({ name: 'No History' })]);
    await act(async () => {
      fireEvent.click(rowButton('No History'));
    });
    expect(screen.getByText('Usually listed')).not.toBeNull();
    expect(screen.queryByText('Item history')).toBeNull();
  });

  it('adds the hardcore note on hardcore stashes', async () => {
    renderTab([rare({ name: 'HC Rare' })], SUMMARY, true);
    await act(async () => {
      fireEvent.click(rowButton('HC Rare'));
    });
    expect(screen.getByText(/^Hardcore: price model and stars from softcore data/)).not.toBeNull();
  });
});

describe('RaresSummaryCard', () => {
  it('summarizes verdict counts and the estimated Keep band', () => {
    render(<RaresSummaryCard summary={SUMMARY} />);
    const card = screen.getByText(/^Rares:/).closest('p')!;
    expect(card.textContent).toBe('Rares: 2 Keep · 2 worth a look · 1 likely vendor (frees 1 slot)');
    const band = screen.getByText(/in Keep rares/);
    expect(band.textContent).toBe('+ ~1.3–12 HR in Keep rares (estimated, not in total)');
    expect(band.getAttribute('title')).toBe(
      'Estimated from S13 asking prices of similar rares — not part of the total',
    );
  });

  it('notes Keep rares without a market band in the hint', () => {
    render(<RaresSummaryCard summary={{ ...SUMMARY, keep: 3, keepUnpriced: 1, vendor: 2 }} />);
    expect(screen.getByText(/frees 2 slots/)).not.toBeNull();
    expect(screen.getByText(/in Keep rares/).getAttribute('title')).toMatch(
      /; 1 Keep rare without a market band not included$/,
    );
  });

  it('hides the Keep band when no Keep rare has a market band', () => {
    render(<RaresSummaryCard summary={{ ...SUMMARY, keep: 2, keepUnpriced: 2 }} />);
    expect(screen.queryByText(/in Keep rares/)).toBeNull();
  });
});
