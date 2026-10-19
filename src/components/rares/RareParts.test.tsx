// @vitest-environment happy-dom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { AppraisedStat, RareAppraisal, RareHistory, VerdictRule } from '@/lib/rare-appraisal-api';
import {
  HardcoreNote,
  ItemStatsSection,
  RankBar,
  RankBlocks,
  RankDisplay,
  RareHistorySection,
  VerdictBadge,
} from './RareParts';

afterEach(cleanup);

const RULE: VerdictRule = { keepRank: 0.8, vendorRank: 0.25, rankError: 0.18 };

function stat(overrides: Partial<AppraisedStat> = {}): AppraisedStat {
  return {
    label: '+10% Faster Run/Walk',
    key: null,
    value: null,
    stars: null,
    multiplier: null,
    roll: null,
    keyFrom: null,
    corrupted: false,
    ...overrides,
  };
}

function rare(overrides: Partial<RareAppraisal> = {}): RareAppraisal {
  return {
    id: 'a'.repeat(32),
    name: 'Dread Loop',
    baseName: 'Ring',
    slot: 'ring',
    tab: 'Shared 1',
    position: { column: 0, row: 0 },
    verdict: 'keep',
    checkPriority: null,
    rank: 0.72,
    rankError: 0.08,
    stats: [],
    market: { lowHr: 1, highHr: 2, source: 'current', sampleSize: 40, mode: 'softcore' },
    modelMode: 'softcore',
    modelVersion: 'v1',
    ...overrides,
  };
}

function withTooltips(ui: React.ReactElement) {
  return render(<TooltipProvider delayDuration={0}>{ui}</TooltipProvider>);
}

/** Tooltip text shown when the trigger gets keyboard focus. */
function tooltipOf(trigger: HTMLElement): string | null {
  act(() => {
    fireEvent.focus(trigger);
  });
  return screen.queryByRole('tooltip')?.textContent ?? null;
}

describe('VerdictBadge', () => {
  it('labels the verdict without a hint on softcore keep', () => {
    withTooltips(<VerdictBadge rare={rare()} />);
    const badge = screen.getByText('Keep');
    expect(badge.className).not.toContain('cursor-help');
    expect(tooltipOf(badge)).toBeNull();
  });

  it('explains the check priority on hover', () => {
    withTooltips(<VerdictBadge rare={rare({ verdict: 'check', checkPriority: 'high' })} />);
    const badge = screen.getByText('Check');
    expect(badge.className).toContain('cursor-help');
    expect(tooltipOf(badge)).toBe('Has a ★★ or better key stat');
  });

  it('ignores a stray priority on non-check verdicts and adds the hardcore note', () => {
    withTooltips(<VerdictBadge rare={rare({ verdict: 'vendor', checkPriority: 'high', rankReference: 'hardcore' })}
      hardcore />);
    expect(tooltipOf(screen.getByText('Vendor'))).toBe(
      'Hardcore: price model and stars from softcore data; ranked against hardcore listings; prices from softcore listings',
    );
  });
});

describe('RankBar', () => {
  it('describes the predicted percentile and error for screen readers', () => {
    withTooltips(<RankBar rare={rare({ rank: 0.72, rankError: 0.08 })}
      rule={RULE} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
      'Predicted at the 72nd percentile of rings prices, give or take 8 points',
    );
  });

  it('draws the vendor and keep thresholds from the rule', () => {
    withTooltips(<RankBar rare={rare()}
      rule={RULE} />);
    expect(screen.getByText('vendor').style.left).toBe('25%');
    expect(screen.getByText('keep').style.left).toBe('80%');
  });

  it('clamps the error band to 0–100 and keeps the label inside the bar', () => {
    withTooltips(<RankBar rare={rare({ rank: 0.98, rankError: 0.1 })}
      rule={RULE} />);
    const bar = screen.getByRole('img');
    const band = [...bar.querySelectorAll('span')].find((s) => s.style.opacity === '0.3')!;
    expect(band.style.left).toBe('88%');
    expect(Number.parseFloat(band.style.width)).toBeCloseTo(12);
    const label = screen.getByText('98th');
    expect(label.style.left).toBe('95%');
    // Near the top end the "100" axis label would collide with the tick
    expect(screen.queryByText('100')).toBeNull();
    expect(screen.getByText('0')).not.toBeNull();
  });

  it('hides the "0" axis label near the bottom end', () => {
    withTooltips(<RankBar rare={rare({ verdict: 'vendor', rank: 0.05, rankError: 0.1 })}
      rule={RULE} />);
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.getByText('100')).not.toBeNull();
    expect(screen.getByText('5th').style.left).toBe('5%');
  });
});

describe('RankBlocks', () => {
  it.each([
    [0.1, 'bottom 25%'],
    [0.4, 'bottom 50%'],
    [0.75, 'top 25%'],
    [0.96, 'top 5%'],
  ])('lights the block for rank %s (%s)', (rank, label) => {
    withTooltips(<RankBlocks rare={rare({ slot: 'amul', rank })} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(`Rank among amulets: ${label}`);
    const lit = [...screen.getByRole('img').querySelectorAll('span.font-semibold')].map((s) => s.textContent);
    expect(lit).toEqual([label]);
  });
});

describe('RankDisplay', () => {
  it('switches between the bar and the blocks', () => {
    withTooltips(<RankDisplay rare={rare()}
      rule={RULE}
      mode="blocks" />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^Rank among rings/);
    cleanup();
    withTooltips(<RankDisplay rare={rare()}
      rule={RULE}
      mode="bar" />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^Predicted at the/);
  });
});

describe('ItemStatsSection', () => {
  const stats = [
    stat({ label: '+15 to Strength' }),
    stat({ label: '+5% Faster Cast Rate', keyFrom: 10, keyFromMultiplier: 1.5 }),
    stat({ label: '+1 to All Skills', key: 'item_allskills', value: 1, stars: 1, multiplier: 1.6, roll: 1 }),
    stat({
      label: '+20% Faster Cast Rate',
      key: 'item_fastercastrate__ring',
      value: 20,
      stars: 3,
      multiplier: 4.2,
      roll: 0.9,
      corruptionOnly: true,
      corrupted: true,
    }),
  ];

  function Harness({ initialOpen = false, rareStats = stats }: { initialOpen?: boolean; rareStats?: AppraisedStat[] }) {
    const [open, setOpen] = useState(initialOpen);
    return <ItemStatsSection rare={rare({ stats: rareStats })}
      open={open}
      onOpenChange={setOpen} />;
  }

  it('summarizes key stats while collapsed and expands on click', () => {
    withTooltips(<Harness />);
    const toggle = screen.getByRole('button');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toContain('2 key stats');
    expect(screen.queryByRole('listitem')).toBeNull();

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    fireEvent.click(toggle);
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('says "no key stats" and singular wording', () => {
    withTooltips(<Harness rareStats={[stat()]} />);
    expect(screen.getByRole('button').textContent).toContain('no key stats');
    cleanup();
    withTooltips(<Harness rareStats={[stat({ stars: 2 })]} />);
    expect(screen.getByRole('button').textContent).toContain('1 key stat');
  });

  it('orders stats strongest first, then near misses, then the rest', () => {
    withTooltips(<Harness initialOpen />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.querySelector('.truncate')?.textContent)).toEqual([
      '+20% Faster Cast Rate',
      '+1 to All Skills',
      '+5% Faster Cast Rate',
      '+15 to Strength',
    ]);
  });

  it('shows stars, roll and multiplier for key stats and a tag for corruption-only / near-miss stats', () => {
    withTooltips(<Harness initialOpen />);
    const [fcr, skills, nearMiss, plain] = screen.getAllByRole('listitem');
    expect(fcr.textContent).toBe('★★★+20% Faster Cast RateCroll 90%·×4.2');
    expect(skills.textContent).toBe('★+1 to All Skillsroll 100%·×1.6');
    expect(nearMiss.textContent).toBe('+5% Faster Cast Rate↑10');
    expect(plain.textContent).toBe('+15 to Strength');
    expect(tooltipOf(screen.getByText('C'))).toBe('20 FCR on rings only via corruption');
  });

  it('marks a stat label as truncated when it overflows', () => {
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(200);
    const client = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
    withTooltips(<Harness initialOpen
      rareStats={[stat({ label: 'A very long stat label' })]} />);
    const label = screen.getByText('A very long stat label');
    expect(label.className).toContain('underline');
    expect(tooltipOf(label)).toBe('A very long stat label');
    scroll.mockRestore();
    client.mockRestore();
  });

  it('does not underline labels that fit', () => {
    withTooltips(<Harness initialOpen
      rareStats={[stat({ label: 'Short' })]} />);
    const label = screen.getByText('Short');
    expect(label.className).not.toContain('underline');
    expect(tooltipOf(label)).toBeNull();
  });
});

describe('HardcoreNote', () => {
  it('renders nothing on softcore', () => {
    const { container } = withTooltips(<HardcoreNote rare={rare()}
      hardcore={false} />);
    expect(container.textContent).toBe('');
  });

  it('explains blended ranks and hardcore prices on hardcore', () => {
    withTooltips(
      <HardcoreNote
        rare={rare({
          rankReference: 'blended',
          rankReferenceWeight: 0.426,
          market: { lowHr: 1, highHr: 2, source: 'current', sampleSize: 5, mode: 'hardcore' },
        })}
        hardcore
      />,
    );
    expect(screen.getByText(/^Hardcore/).textContent).toBe(
      'Hardcore: price model and stars from softcore data; ranked against hardcore listings blended with softcore (43% hardcore); prices from hardcore listings.',
    );
  });
});

describe('RareHistorySection', () => {
  const history: RareHistory = {
    key: 'k',
    keyType: 'fingerprint',
    weak: false,
    timesListed: 3,
    distinctSellers: 1,
    firstSeen: '2026-09-27T12:00:00',
    lastSeen: '2026-10-10T12:00:00',
    listings: [
      { listedAt: '2026-10-10T12:00:00', lastSeenAt: '', hrPrice: 3.5, priceText: null, sellerChanged: true },
      { listedAt: '2026-10-01T12:00:00', lastSeenAt: '', hrPrice: null, priceText: '  2 ist  ', sellerChanged: false },
      { listedAt: '2026-09-27T12:00:00', lastSeenAt: '', hrPrice: null, priceText: '   ', sellerChanged: false },
    ],
  };

  it.each([
    ['missing', null],
    ['weak fingerprint', { ...history, weak: true }],
    ['never listed', { ...history, timesListed: 0 }],
  ])('renders nothing when the history is %s', (_, h) => {
    const { container } = withTooltips(<RareHistorySection history={h} />);
    expect(container.textContent).toBe('');
  });

  it('summarizes listings and prints each asking price', () => {
    withTooltips(<RareHistorySection history={history} />);
    expect(screen.getByText(/3× · 1 seller · since Sep 27/)).not.toBeNull();
    const rows = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(rows).toEqual(['Oct 10new owner3.5 HR', 'Oct 12 ist', 'Sep 27no price']);
  });

  it('trims HR prices to two decimals without trailing zeros', () => {
    withTooltips(
      <RareHistorySection
        history={{
          ...history,
          distinctSellers: 2,
          listings: [{ ...history.listings[0], hrPrice: 2.004, sellerChanged: false }],
        }}
      />,
    );
    expect(screen.getByText(/2 sellers/)).not.toBeNull();
    expect(screen.getByRole('listitem').textContent).toBe('Oct 102 HR');
  });
});
