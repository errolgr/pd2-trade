// @vitest-environment happy-dom
import React from 'react';
import moment from 'moment';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useNetWorth, type NetWorthContextValue } from '@/hooks/useNetWorth';
import {
  deleteHistory,
  getDiff,
  getPoints,
  getSessions,
  NetWorthApiError,
  type DiffResponse,
  type NetWorthCategory,
  type NetWorthOwner,
  type NetWorthPoint,
  type Season,
  type SessionSummary,
} from '@/lib/networth-api';
import type * as NetWorthApi from '@/lib/networth-api';
import { HistoryTab } from './HistoryTab';

vi.mock('@/lib/networth-api', async (importOriginal) => ({
  ...(await importOriginal<typeof NetWorthApi>()),
  getPoints: vi.fn(),
  getSessions: vi.fn(),
  getDiff: vi.fn(),
  deleteHistory: vi.fn(),
}));
vi.mock('@/hooks/useNetWorth', () => ({ useNetWorth: vi.fn() }));

const NOW = new Date('2026-10-18T12:00:00.000Z');
const TOKEN = 'tok';
const OWNER: NetWorthOwner = { account: 'Hammerdin', isLadder: true, isHardcore: false };
const SEASONS: Season[] = [
  { id: 's11', label: 'Season 11', startDate: '2026-06-01T00:00:00.000Z', endDate: '2026-10-15T00:00:00.000Z' },
  { id: 's12', label: 'Season 12', startDate: '2026-10-15T00:00:00.000Z', endDate: null },
];
const CATEGORIES: Record<NetWorthCategory, number> = {
  runes: 0,
  currency: 0,
  ubers: 0,
  gems: 0,
  mats: 0,
  uniques: 0,
  sets: 0,
  other: 0,
};

function point(id: string, takenAt: string, totalHr: number, overrides: Partial<NetWorthPoint> = {}): NetWorthPoint {
  return {
    snapshotId: id,
    takenAt,
    lastConfirmedAt: takenAt,
    trigger: 'interval',
    priceDay: takenAt.slice(0, 10),
    totalHr,
    uncertainHr: 0,
    unpricedCount: 0,
    gold: 0,
    byCategory: { ...CATEGORIES, runes: totalHr },
    hasHoldings: true,
    ...overrides,
  };
}

function session(id: string, overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id,
    start: '2026-10-18T09:00:00.000Z',
    end: '2026-10-18T10:00:00.000Z',
    durationMinutes: 60,
    startHr: 10,
    endHr: 12,
    farmedHr: 2,
    marketDriftHr: 0,
    hrPerHour: 2,
    snapshotCount: 5,
    manual: false,
    isOpen: false,
    topGains: [],
    ...overrides,
  };
}

const P1 = point('p1', '2026-10-17T10:00:00.000Z', 10);
const P2 = point('p2', '2026-10-17T22:00:00.000Z', 11.5);
const P3 = point('p3', '2026-10-18T10:00:00.000Z', 12.5);

const fmt = (iso: string) => moment(iso).format('MMM D HH:mm');

let netWorth: { currentSession: SessionSummary | null; startSession: () => Promise<void>; stopSession: () => Promise<void> };

function renderHistory(props: Partial<React.ComponentProps<typeof HistoryTab>> = {}) {
  const onHistoryChanged = vi.fn();
  const utils = render(
    <TooltipProvider>
      <HistoryTab
        token={TOKEN}
        owner={OWNER}
        seasons={SEASONS}
        currentSeasonId="s12"
        seasonPoints={null}
        refreshKey="k1"
        onHistoryChanged={onHistoryChanged}
        {...props}
      />
    </TooltipProvider>,
  );
  return { ...utils, onHistoryChanged };
}

function sectionOf(title: string): HTMLElement {
  return screen.getByRole('heading', { name: new RegExp(`^${title}`) }).closest('section')!;
}

/** Times of the snapshot rows, top to bottom. */
function snapshotTimes(): string[] {
  return within(sectionOf('Snapshots'))
    .queryAllByRole('checkbox')
    .map((cb) => cb.getAttribute('aria-label')!.replace('Select snapshot ', ''));
}

// happy-dom's Web Animations reject on cancel; framer-motion animations add nothing to these assertions
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

const CHART_SIZE = { width: 600, height: 224 };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  // Give recharts' ResponsiveContainer a real size so the chart renders (happy-dom has no layout); its
  // pre-measure "width(-1)" warning is expected noise
  const warn = console.warn;
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    if (!String(args[0]).startsWith('The width(')) warn(...args);
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ target, contentRect: CHART_SIZE } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    ...CHART_SIZE,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: CHART_SIZE.width,
    bottom: CHART_SIZE.height,
    toJSON: () => ({}),
  } as DOMRect);
  netWorth = { currentSession: null, startSession: vi.fn(async () => {}), stopSession: vi.fn(async () => {}) };
  vi.mocked(useNetWorth).mockImplementation(() => netWorth as unknown as NetWorthContextValue);
  vi.mocked(getPoints).mockResolvedValue({ points: [P1, P2, P3] });
  vi.mocked(getSessions).mockResolvedValue({ sessions: [] });
  vi.mocked(getDiff).mockReset();
  vi.mocked(deleteHistory).mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('HistoryTab chart range', () => {
  it('loads the last 7 days of raw points for the current season by default', async () => {
    renderHistory();
    expect(await screen.findByText('+2.50 HR')).not.toBeNull();
    expect(getPoints).toHaveBeenCalledTimes(1);
    const [token, owner, opts] = vi.mocked(getPoints).mock.calls[0];
    expect([token, owner]).toEqual([TOKEN, OWNER]);
    expect(opts).toEqual({
      seasonId: 's12',
      from: new Date(NOW.getTime() - 7 * 24 * 3_600_000).toISOString(),
      resolution: 'raw',
    });
    expect(screen.getByRole('radio', { name: '7d' }).getAttribute('data-state')).toBe('on');
  });

  it('loads 24 hours when switching to 24h and shows the change over that range', async () => {
    renderHistory();
    await screen.findByText('+2.50 HR');
    vi.mocked(getPoints).mockResolvedValue({ points: [P3, point('p4', '2026-10-18T11:00:00.000Z', 12)] });
    fireEvent.click(screen.getByRole('radio', { name: '24h' }));
    expect(await screen.findByText('−0.50 HR')).not.toBeNull();
    const opts = vi.mocked(getPoints).mock.calls[1][2]!;
    expect(opts.from).toBe(new Date(NOW.getTime() - 24 * 3_600_000).toISOString());
    expect(opts.seasonId).toBe('s12');
  });

  it('omits the season filter when there is no current season', async () => {
    renderHistory({ currentSeasonId: null });
    await screen.findByText('+2.50 HR');
    expect(vi.mocked(getPoints).mock.calls[0][2]!.seasonId).toBeUndefined();
  });

  it('uses the season points from the parent for the Season range without fetching', async () => {
    renderHistory({ seasonPoints: [P1, point('s2', '2026-10-18T11:00:00.000Z', 9)] });
    await screen.findByText('+2.50 HR');
    fireEvent.click(screen.getByRole('radio', { name: 'Season' }));
    expect(screen.getByText('−1.00 HR')).not.toBeNull();
    expect(getPoints).toHaveBeenCalledTimes(1);
    expect(snapshotTimes()).toEqual([fmt('2026-10-18T11:00:00.000Z'), fmt(P1.takenAt)]);
  });

  it('shows a placeholder for the Season range until the parent has points', async () => {
    renderHistory({ seasonPoints: null });
    await screen.findByText('+2.50 HR');
    fireEvent.click(screen.getByRole('radio', { name: 'Season' }));
    expect(document.querySelector('.animate-spin')).toBeNull();
    expect(screen.queryByText('No snapshots in this range yet.')).toBeNull();
    expect(screen.getByText('No snapshots in this range.')).not.toBeNull();
  });

  it('merges daily points of every season, oldest first, for the All range', async () => {
    // The 7d load never settles, so the chart range shows nothing until All has loaded
    vi.mocked(getPoints).mockReturnValueOnce(Promise.withResolvers<{ points: NetWorthPoint[] }>().promise);
    renderHistory();
    vi.mocked(getPoints).mockImplementation(async (_t, _o, opts) => ({
      points:
        opts?.seasonId === 's11'
          ? [point('a1', '2026-06-02T00:00:00.000Z', 1), point('a2', '2026-09-01T00:00:00.000Z', 4)]
          : [point('b1', '2026-10-16T00:00:00.000Z', 5)],
    }));
    fireEvent.click(screen.getByRole('radio', { name: 'All' }));
    expect(await screen.findByText('+4.00 HR')).not.toBeNull();
    const calls = vi.mocked(getPoints).mock.calls.slice(1);
    expect(calls.map(([, , opts]) => opts)).toEqual([
      { seasonId: 's11', resolution: 'day' },
      { seasonId: 's12', resolution: 'day' },
    ]);
    expect(snapshotTimes()).toEqual([
      fmt('2026-10-16T00:00:00.000Z'),
      fmt('2026-09-01T00:00:00.000Z'),
      fmt('2026-06-02T00:00:00.000Z'),
    ]);
  });

  it('shows no change pill for a single point and an empty chart without points', async () => {
    vi.mocked(getPoints).mockResolvedValue({ points: [P1] });
    renderHistory();
    await waitFor(() => expect(snapshotTimes()).toHaveLength(1));
    expect(screen.queryByTitle('Change over the selected range')).toBeNull();

    cleanup();
    vi.mocked(getPoints).mockResolvedValue({ points: [] });
    renderHistory();
    expect(await screen.findByText('No snapshots in this range yet.')).not.toBeNull();
    expect(screen.getByText('No snapshots in this range.')).not.toBeNull();
  });

  it('shows the load error with a working Retry', async () => {
    vi.mocked(getPoints).mockRejectedValueOnce(new Error('Net worth API 500'));
    renderHistory();
    const alert = await screen.findByText('Net worth API 500');
    expect(alert.closest('[role="alert"]')).not.toBeNull();
    fireEvent.click(within(alert.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('+2.50 HR')).not.toBeNull();
    expect(screen.queryByText('Net worth API 500')).toBeNull();
  });

  it('asks to sign in again when the session expired', async () => {
    vi.mocked(getPoints).mockRejectedValue(new NetWorthApiError('Unauthorized', 401));
    renderHistory();
    expect(await screen.findByText('Your PD2 session expired. Sign in again.')).not.toBeNull();
  });

  it('keeps the previous points visible with a spinner while a refresh loads', async () => {
    const { rerender } = renderHistory();
    await screen.findByText('+2.50 HR');
    const pending = Promise.withResolvers<{ points: NetWorthPoint[] }>();
    vi.mocked(getPoints).mockReturnValue(pending.promise);
    rerender(
      <TooltipProvider>
        <HistoryTab token={TOKEN}
          owner={OWNER}
          seasons={SEASONS}
          currentSeasonId="s12"
          seasonPoints={null}
          refreshKey="k2"
          onHistoryChanged={() => {}} />
      </TooltipProvider>,
    );
    await waitFor(() => expect(document.querySelector('.animate-spin')).not.toBeNull());
    expect(screen.queryByText('+2.50 HR')).toBeNull();
    expect(snapshotTimes()).toHaveLength(3);
    await act(async () => pending.resolve({ points: [P1, P3, point('p5', '2026-10-18T11:30:00.000Z', 15)] }));
    expect(await screen.findByText('+5.00 HR')).not.toBeNull();
    expect(snapshotTimes()).toHaveLength(3);
    expect(snapshotTimes()[0]).toBe(fmt('2026-10-18T11:30:00.000Z'));
  });
});

describe('HistoryTab chart', () => {
  it('marks season starts inside the range and switches to one area per category when stacked', async () => {
    vi.mocked(getPoints).mockResolvedValue({
      points: [
        point('x1', '2026-10-13T00:00:00.000Z', 5),
        point('x2', '2026-10-16T00:00:00.000Z', 6),
        point('x3', '2026-10-18T00:00:00.000Z', 7),
      ],
    });
    renderHistory();
    await screen.findByText('+2.00 HR');
    await waitFor(() => expect(document.querySelector('.recharts-area')).not.toBeNull());
    expect(document.querySelectorAll('.recharts-area')).toHaveLength(1);
    // Season 12 starts inside the range; Season 11 started before the first point
    expect(screen.getByText('Season 12')).not.toBeNull();
    expect(screen.queryByText('Season 11')).toBeNull();

    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(document.querySelectorAll('.recharts-area')).toHaveLength(8));
  });
});

describe('HistoryTab sessions', () => {
  it('lists sessions and stars the best HR/h among sessions of 10+ minutes with gains', async () => {
    vi.mocked(getSessions).mockResolvedValue({
      sessions: [
        session('short', { durationMinutes: 5, hrPerHour: 50, farmedHr: 4 }),
        session('loss', { durationMinutes: 30, hrPerHour: 30, farmedHr: -1 }),
        session('best', { durationMinutes: 75, hrPerHour: 3.2, farmedHr: 4, marketDriftHr: -0.25, manual: true }),
        session('ok', { durationMinutes: 45, hrPerHour: 1, isOpen: true }),
      ],
    });
    renderHistory();
    const section = sectionOf('Sessions');
    await waitFor(() => expect(within(section).getAllByText(/^[+−±]\d/).length).toBeGreaterThan(0));
    expect(within(section).getByRole('heading').textContent).toBe('Sessions4');
    const stars = within(section).getAllByLabelText('Best HR/h this season');
    expect(stars).toHaveLength(1);
    const bestRow = stars[0].closest('[tabindex="0"]')!;
    expect(bestRow.textContent).toContain('1h15');
    expect(bestRow.textContent).toContain('+4.00 HR');
    expect(bestRow.textContent).toContain('−0.25 HR');
    expect(bestRow.textContent).toContain('3.20');
    expect(bestRow.textContent).toContain('manual');
    expect(within(section).getAllByLabelText('Open session')).toHaveLength(1);
    expect(vi.mocked(getSessions).mock.calls[0]).toEqual([TOKEN, OWNER, 's12']);
  });

  it('pages sessions eight at a time', async () => {
    vi.mocked(getSessions).mockResolvedValue({
      sessions: Array.from({ length: 10 }, (_, i) => session(`s${i}`)),
    });
    renderHistory();
    const more = await within(sectionOf('Sessions')).findByRole('button', { name: 'Show more (2 older)' });
    const rows = () => sectionOf('Sessions').querySelectorAll('[tabindex="0"]');
    expect(rows()).toHaveLength(8);
    fireEvent.click(more);
    expect(rows()).toHaveLength(10);
    expect(within(sectionOf('Sessions')).queryByRole('button', { name: /Show more/ })).toBeNull();
  });

  it('explains how sessions build when there are none', async () => {
    renderHistory();
    expect(await screen.findByText('No sessions yet.')).not.toBeNull();
  });

  it('shows a session load error', async () => {
    vi.mocked(getSessions).mockRejectedValue(new Error('sessions down'));
    renderHistory();
    expect((await screen.findByText('sessions down')).closest('[role="alert"]')).not.toBeNull();
  });

  it('starts a session, disabling the buttons meanwhile, then reloads the list', async () => {
    const pending = Promise.withResolvers<void>();
    netWorth.startSession = vi.fn(() => pending.promise);
    renderHistory();
    await screen.findByText('No sessions yet.');
    const start = screen.getByRole('button', { name: /Start new session/ }) as HTMLButtonElement;
    const stop = screen.getByRole('button', { name: /Stop session/ }) as HTMLButtonElement;
    expect(stop.disabled).toBe(true);

    vi.mocked(getSessions).mockResolvedValue({ sessions: [session('new', { isOpen: true })] });
    fireEvent.click(start);
    expect(start.disabled).toBe(true);
    await act(async () => pending.resolve());
    expect(start.disabled).toBe(false);
    expect(await screen.findByLabelText('Open session')).not.toBeNull();
    expect(getSessions).toHaveBeenCalledTimes(2);
  });

  // BUG: HistoryTab.tsx SessionsSection `mark` has try/finally but no catch: a failed start/stop marker
  // (network error, expired token) becomes an unhandled promise rejection and the user gets no feedback.
  // Skipped (not it.fails) because the unhandled rejection itself fails the vitest run.
  it.skip('shows an error when stopping the session fails', async () => {
    netWorth.currentSession = session('open', { isOpen: true });
    netWorth.stopSession = vi.fn(async () => {
      throw new Error('Net worth API 503');
    });
    renderHistory();
    await screen.findByText('No sessions yet.');
    fireEvent.click(screen.getByRole('button', { name: /Stop session/ }));
    expect((await screen.findByText('Net worth API 503')).closest('[role="alert"]')).not.toBeNull();
  });
});

describe('HistoryTab snapshots and comparison', () => {
  const DIFF: DiffResponse = {
    from: { snapshotId: 'p1', takenAt: P1.takenAt, totalHr: 10 },
    to: { snapshotId: 'p3', takenAt: P3.takenAt, totalHr: 12.5 },
    priceBasis: 'then',
    farmedHr: 3,
    marketDriftHr: -0.5,
    lines: [
      {
        key: 'ber',
        name: 'Ber Rune',
        category: 'runes',
        qtyFrom: 0,
        qtyTo: 1,
        qtyDelta: 1,
        unitPrice: 3,
        valueDelta: 3,
      },
      {
        key: 'ist',
        name: 'Ist Rune',
        category: 'runes',
        qtyFrom: 4,
        qtyTo: 2,
        qtyDelta: -2,
        unitPrice: 0.25,
        valueDelta: -0.5,
      },
    ],
  };

  function select(iso: string) {
    fireEvent.click(screen.getByRole('checkbox', { name: `Select snapshot ${fmt(iso)}` }));
  }

  it('lists snapshots newest first with the change from the one before', async () => {
    renderHistory();
    await screen.findByText('+2.50 HR');
    expect(snapshotTimes()).toEqual([fmt(P3.takenAt), fmt(P2.takenAt), fmt(P1.takenAt)]);
    const rows = [...sectionOf('Snapshots').querySelectorAll('.divide-y > div')];
    expect(rows.map((r) => r.children[2].textContent)).toEqual(['12.50', '11.50', '10.00']);
    expect(rows.map((r) => r.children[3].textContent)).toEqual(['+1.00 HR', '+1.50 HR', '']);
    expect(within(sectionOf('Snapshots')).getByRole('heading').textContent).toBe('Snapshots3');
    expect(screen.getByText('Pick two to compare')).not.toBeNull();
  });

  it('pages snapshots thirty at a time', async () => {
    vi.mocked(getPoints).mockResolvedValue({
      points: Array.from({ length: 35 }, (_, i) =>
        point(`n${i}`, new Date(Date.parse('2026-10-17T00:00:00.000Z') + i * 60_000).toISOString(), i),
      ),
    });
    renderHistory();
    const more = await screen.findByRole('button', { name: 'Show more (5 older)' });
    expect(snapshotTimes()).toHaveLength(30);
    fireEvent.click(more);
    expect(snapshotTimes()).toHaveLength(35);
  });

  it('compares two picked snapshots oldest → newest regardless of pick order', async () => {
    vi.mocked(getDiff).mockResolvedValue(DIFF);
    renderHistory();
    await screen.findByText('+2.50 HR');
    select(P3.takenAt);
    expect(screen.getByText('1/2 selected')).not.toBeNull();
    expect(getDiff).not.toHaveBeenCalled();
    select(P1.takenAt);
    expect(screen.getByText('2/2 selected')).not.toBeNull();

    expect(await screen.findByText('Farmed')).not.toBeNull();
    expect(vi.mocked(getDiff).mock.calls[0]).toEqual([TOKEN, OWNER, 'p1', 'p3', 'then']);
    expect(screen.getByText(`${fmt(P1.takenAt)} → ${fmt(P3.takenAt)}`)).not.toBeNull();
    expect(screen.getByText('Farmed').nextElementSibling?.textContent).toBe('+3.00 HR');
    expect(screen.getByText('Market drift').nextElementSibling?.textContent).toBe('−0.50 HR');
    expect(screen.getByText('Total').nextElementSibling?.textContent).toBe('10.00 → 12.50 HR');
    const ber = screen.getByText('Ber Rune').parentElement!;
    expect([...ber.children].map((c) => c.textContent)).toEqual(['Ber Rune', '0 → 1', '+1', '+3.00 HR']);
    const ist = screen.getByText('Ist Rune').parentElement!;
    expect([...ist.children].map((c) => c.textContent)).toEqual(['Ist Rune', '4 → 2', '-2', '−0.50 HR']);
  });

  it('re-runs the comparison at current prices', async () => {
    vi.mocked(getDiff).mockResolvedValue(DIFF);
    renderHistory();
    await screen.findByText('+2.50 HR');
    select(P1.takenAt);
    select(P2.takenAt);
    await screen.findByText('Farmed');
    vi.mocked(getDiff).mockResolvedValue({ ...DIFF, priceBasis: 'now', marketDriftHr: 0, lines: [] });
    fireEvent.click(screen.getByRole('radio', { name: 'Prices now' }));
    expect(await screen.findByText('No holdings changed.')).not.toBeNull();
    expect(vi.mocked(getDiff).mock.calls.at(-1)).toEqual([TOKEN, OWNER, 'p1', 'p2', 'now']);
  });

  it('keeps the latest pick and drops the older one when a third snapshot is picked', async () => {
    vi.mocked(getDiff).mockResolvedValue(DIFF);
    renderHistory();
    await screen.findByText('+2.50 HR');
    select(P1.takenAt);
    select(P2.takenAt);
    select(P3.takenAt);
    await screen.findByText('Farmed');
    expect(vi.mocked(getDiff).mock.calls.at(-1)!.slice(2, 4)).toEqual(['p2', 'p3']);
    expect((screen.getByRole('checkbox', { name: `Select snapshot ${fmt(P1.takenAt)}` }) as HTMLElement).dataset.state).toBe(
      'unchecked',
    );
  });

  it('unpicks a snapshot when clicked again and clears all picks', async () => {
    renderHistory();
    await screen.findByText('+2.50 HR');
    select(P1.takenAt);
    select(P1.takenAt);
    expect(screen.getByText('Pick two to compare')).not.toBeNull();
    select(P1.takenAt);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('Pick two to compare')).not.toBeNull();
  });

  it('compares a snapshot with the previous one in one click and closes the comparison', async () => {
    vi.mocked(getDiff).mockResolvedValue(DIFF);
    renderHistory();
    await screen.findByText('+2.50 HR');
    const compare = within(sectionOf('Snapshots')).getAllByRole('button', { name: 'Compare with previous' });
    // The oldest snapshot has no previous one
    expect(compare.map((b) => (b as HTMLButtonElement).disabled)).toEqual([false, false, true]);
    fireEvent.click(compare[0]);
    await screen.findByText('Farmed');
    expect(vi.mocked(getDiff).mock.calls[0].slice(2, 4)).toEqual(['p2', 'p3']);
    fireEvent.click(screen.getByRole('button', { name: 'Close comparison' }));
    await waitFor(() => expect(screen.queryByText('Farmed')).toBeNull());
    expect(screen.getByText('Pick two to compare')).not.toBeNull();
  });

  it('does not allow picking or comparing snapshots without stored holdings', async () => {
    vi.mocked(getPoints).mockResolvedValue({ points: [P1, point('empty', P2.takenAt, 11, { hasHoldings: false }), P3] });
    renderHistory();
    await screen.findByText('+2.50 HR');
    expect(
      (screen.getByRole('checkbox', { name: `Select snapshot ${fmt(P2.takenAt)}` }) as HTMLButtonElement).disabled,
    ).toBe(true);
    const compare = within(sectionOf('Snapshots')).getAllByRole('button', { name: 'Compare with previous' });
    expect(compare.map((b) => (b as HTMLButtonElement).disabled)).toEqual([true, true, true]);
  });

  it('shows a comparison error', async () => {
    vi.mocked(getDiff).mockRejectedValue(new Error('diff failed'));
    renderHistory();
    await screen.findByText('+2.50 HR');
    select(P1.takenAt);
    select(P3.takenAt);
    expect((await screen.findByText('diff failed')).closest('[role="alert"]')).not.toBeNull();
    expect(screen.queryByText('Farmed')).toBeNull();
  });
});

describe('HistoryTab delete history', () => {
  async function openDialog() {
    await screen.findByText('+2.50 HR');
    fireEvent.click(screen.getByRole('button', { name: /Delete history/ }));
    return screen.getByRole('alertdialog');
  }

  it('describes whose history is deleted', async () => {
    renderHistory();
    const dialog = await openDialog();
    expect(within(dialog).getByText(/Removes stored snapshots/).textContent).toBe(
      'Removes stored snapshots for Hammerdin (ladder, softcore). This cannot be undone.',
    );
  });

  it('deletes the current season, reports the count and reloads', async () => {
    vi.mocked(deleteHistory).mockResolvedValue({ deletedPoints: 5, deletedSnapshots: 2 });
    const { onHistoryChanged } = renderHistory();
    const dialog = await openDialog();
    vi.mocked(getPoints).mockResolvedValue({ points: [] });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Season 12' }));
    });
    expect(vi.mocked(deleteHistory).mock.calls[0]).toEqual([TOKEN, OWNER, 's12']);
    expect(screen.getByRole('status').textContent).toBe('Deleted 5 snapshots.');
    expect(onHistoryChanged).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('No snapshots in this range yet.')).not.toBeNull();
  });

  it('deletes all seasons and offers no per-season button without a current season', async () => {
    vi.mocked(deleteHistory).mockResolvedValue({ deletedPoints: 9, deletedSnapshots: 3 });
    renderHistory({ currentSeasonId: null });
    const dialog = await openDialog();
    expect(within(dialog).queryByRole('button', { name: /^Delete Season/ })).toBeNull();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete all seasons' }));
    });
    expect(vi.mocked(deleteHistory).mock.calls[0]).toEqual([TOKEN, OWNER, undefined]);
    expect(screen.getByRole('status').textContent).toBe('Deleted 9 snapshots.');
  });

  it('falls back to "this season" for an unknown season id', async () => {
    renderHistory({ currentSeasonId: 's99' });
    const dialog = await openDialog();
    expect(within(dialog).getByRole('button', { name: 'Delete this season' })).not.toBeNull();
  });

  it('reports a failed delete without notifying the parent', async () => {
    vi.mocked(deleteHistory).mockRejectedValue(new Error('forbidden'));
    const { onHistoryChanged } = renderHistory();
    const dialog = await openDialog();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete all seasons' }));
    });
    expect(screen.getByRole('status').textContent).toBe('forbidden');
    expect(onHistoryChanged).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: /Delete history/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});
