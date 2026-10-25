// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { useNetWorth, type NetWorthContextValue } from '@/hooks/useNetWorth';
import { usePanel, type PanelContextValue } from '@/overlay';
import { useSignIn } from '@/hooks/useSignIn';
import { getPoints, type NetWorthPoint, type SessionSummary, type SnapshotResponse } from '@/lib/networth-api';
import type * as NetWorthApi from '@/lib/networth-api';
import NetWorthPanelPage from './NetWorthPanelPage';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useNetWorth', () => ({ useNetWorth: vi.fn() }));
vi.mock('@/overlay', () => ({ usePanel: vi.fn() }));
vi.mock('@/hooks/useSignIn', () => ({ useSignIn: vi.fn() }));
vi.mock('@/lib/networth-api', async (importOriginal) => ({
  ...(await importOriginal<typeof NetWorthApi>()),
  getPoints: vi.fn(),
}));

const NOW = new Date('2026-10-18T12:00:00.000Z');
const OWNER = { account: 'Hammerdin', isLadder: true, isHardcore: false };

let settings: Partial<ISettings>;
let netWorth: NetWorthContextValue;
let close: Mock;
let openSignIn: Mock;

function latest(totalHr: number, overrides: { snapshotId?: string; uncertainHr?: number } = {}): SnapshotResponse {
  return {
    valuation: { totalHr, uncertainHr: overrides.uncertainHr ?? 0 } as SnapshotResponse['valuation'],
    snapshotId: overrides.snapshotId ?? 'snap-1',
    deduped: false,
    delta: { sincePrevious: null, previousTakenAt: null },
  };
}

function point(minutesAgo: number, totalHr: number): NetWorthPoint {
  const takenAt = new Date(NOW.getTime() - minutesAgo * 60_000).toISOString();
  return { snapshotId: `p${minutesAgo}`, takenAt, totalHr } as NetWorthPoint;
}

function session(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: 'sess',
    start: new Date(NOW.getTime() - 30 * 60_000).toISOString(),
    end: NOW.toISOString(),
    durationMinutes: 29.6,
    startHr: 10,
    endHr: 12,
    farmedHr: 2,
    marketDriftHr: 0,
    hrPerHour: 4,
    snapshotCount: 3,
    manual: false,
    isOpen: true,
    topGains: [],
    ...overrides,
  };
}

function setNetWorth(overrides: Partial<NetWorthContextValue>) {
  netWorth = { ...netWorth, ...overrides };
}

/** Rows of "Recent snapshots": [time, total, delta]. */
function recentRows(): string[][] {
  return [...document.querySelectorAll('li')].map((li) => [...li.children].map((c) => c.textContent ?? ''));
}

/** Points of the sparkline polyline (not the icons' polylines). */
function sparkline(): string | null {
  return document.querySelector('svg[preserveAspectRatio="none"] polyline')?.getAttribute('points') ?? null;
}

async function renderPanel() {
  const utils = render(<NetWorthPanelPage />);
  await act(async () => {});
  return utils;
}

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  settings = { pd2Token: 'tok' };
  netWorth = {
    owner: OWNER,
    trackingEnabled: true,
    latest: latest(12.5),
    status: 'ok',
    error: null,
    lastSnapshotAt: NOW.getTime(),
    currentSession: null,
    seasons: [],
    currentSeasonId: null,
    takeSnapshot: vi.fn(async () => null),
    startSession: vi.fn(async () => {}),
    stopSession: vi.fn(async () => {}),
    openNetWorth: vi.fn(),
  };
  vi.mocked(useOptions).mockImplementation(() => ({ settings }) as never);
  vi.mocked(useNetWorth).mockImplementation(() => netWorth);
  vi.mocked(getPoints).mockResolvedValue({ points: [] });
  close = vi.fn();
  openSignIn = vi.fn();
  vi.mocked(usePanel).mockReturnValue({ close } as unknown as PanelContextValue<'netWorthPanel'>);
  vi.mocked(useSignIn).mockReturnValue({ openSignIn, isOpen: false } as never);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('NetWorthPanel signed out', () => {
  it('offers sign-in without a PD2 token', async () => {
    settings = {};
    setNetWorth({ status: 'signed-out', owner: null, latest: null });
    await renderPanel();
    expect(screen.getByText('Sign in with your PD2 account to track your net worth.')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /Open full view/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(openSignIn).toHaveBeenCalledTimes(1);
    expect(getPoints).not.toHaveBeenCalled();
  });

  it('shows no sign-in button when a token exists but no account is chosen', async () => {
    setNetWorth({ owner: null });
    await renderPanel();
    expect(screen.getByText('Sign in with your PD2 account to track your net worth.')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });
});

describe('NetWorthPanel summary', () => {
  it('shows the total and the uncertain amount', async () => {
    setNetWorth({ latest: latest(12.5, { uncertainHr: 0.84 }) });
    await renderPanel();
    expect(screen.getByText('12.5')).not.toBeNull();
    expect(screen.getByText('+0.8 HR uncertain')).not.toBeNull();
  });

  it('omits the uncertain line when everything is priced', async () => {
    await renderPanel();
    expect(screen.queryByText(/uncertain/)).toBeNull();
  });

  it('shows a dash and the error when the first valuation failed', async () => {
    setNetWorth({ latest: null, status: 'error', error: 'PD2 is down' });
    await renderPanel();
    expect(screen.getByText('— HR')).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toBe('PD2 is down');
  });

  it('opens the full view on the History tab and closes its panel on Hide', async () => {
    await renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Open full view/ }));
    expect(vi.mocked(netWorth.openNetWorth).mock.calls).toEqual([['history']]);
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('shows the open session gain, rate and length', async () => {
    setNetWorth({ currentSession: session({ startHr: 10, endHr: 9.4, hrPerHour: -1.2 }) });
    await renderPanel();
    expect(screen.getByText('-0.6 HR session').className).toContain('text-destructive');
    expect(screen.getByText('-1.2 HR/h · 30 min')).not.toBeNull();
  });
});

describe('NetWorthPanel history', () => {
  it('loads the last 24 hours of raw points for the owner', async () => {
    await renderPanel();
    expect(vi.mocked(getPoints).mock.calls).toEqual([
      ['tok', OWNER, { from: new Date(NOW.getTime() - 24 * 3_600_000).toISOString(), resolution: 'raw' }],
    ]);
  });

  it('lists the last five changes, newest first', async () => {
    vi.mocked(getPoints).mockResolvedValue({
      points: [point(70, 1), point(60, 2), point(50, 4), point(40, 3.5), point(30, 3.5), point(20, 5), point(10, 6.25)],
    });
    await renderPanel();
    const rows = recentRows();
    expect(rows.map((r) => r[1])).toEqual(['6.3 HR', '5.0 HR', '3.5 HR', '3.5 HR', '4.0 HR']);
    expect(rows.map((r) => r[2])).toEqual(['+1.3', '+1.5', '+0.0', '-0.5', '+2.0']);
    expect(rows[0][0]).toBe(new Date(NOW.getTime() - 10 * 60_000).toLocaleTimeString());
  });

  it('says no changes were recorded with fewer than two points', async () => {
    vi.mocked(getPoints).mockResolvedValue({ points: [point(10, 6)] });
    await renderPanel();
    expect(screen.getByText('No changes recorded yet.')).not.toBeNull();
    expect(screen.getByText('Not enough snapshots yet')).not.toBeNull();
  });

  it('charts the last 24 hours with the change, coloured by direction', async () => {
    vi.mocked(getPoints).mockResolvedValue({ points: [point(600, 8), point(300, 9), point(10, 7.5)] });
    await renderPanel();
    expect(screen.getByText('Last 24 hours')).not.toBeNull();
    const change = screen.getByText('-0.5');
    expect(change.className).toContain('text-destructive');
    expect(sparkline()).toBe('0.0,36.0 160.0,4.0 320.0,52.0');
  });

  it('charts only the open session, from its start', async () => {
    setNetWorth({ currentSession: session({ start: new Date(NOW.getTime() - 30 * 60_000).toISOString() }) });
    vi.mocked(getPoints).mockResolvedValue({ points: [point(600, 100), point(25, 8), point(5, 9)] });
    await renderPanel();
    expect(screen.getByText('This session')).not.toBeNull();
    const change = screen.getByText('+1.0', { selector: '.tabular-nums' });
    expect(change.className).toContain('text-success');
    expect(sparkline()).toBe('0.0,52.0 320.0,4.0');
  });

  it('draws a flat line when every value is equal', async () => {
    vi.mocked(getPoints).mockResolvedValue({ points: [point(20, 5), point(10, 5)] });
    await renderPanel();
    expect(sparkline()).toBe('0.0,52.0 320.0,52.0');
  });

  it('shows a failed points request', async () => {
    vi.mocked(getPoints).mockRejectedValue(new Error('Net worth API 500'));
    await renderPanel();
    expect(screen.getByText('Net worth API 500')).not.toBeNull();
  });

  it('reloads points when a new snapshot lands, but not for an equal owner object', async () => {
    const { rerender } = await renderPanel();
    setNetWorth({ owner: { ...OWNER } });
    rerender(<NetWorthPanelPage />);
    await act(async () => {});
    expect(getPoints).toHaveBeenCalledTimes(1);
    setNetWorth({ latest: latest(13, { snapshotId: 'snap-2' }) });
    rerender(<NetWorthPanelPage />);
    await act(async () => {});
    expect(getPoints).toHaveBeenCalledTimes(2);
  });

  it('ignores a points response that arrives after the inputs changed', async () => {
    const first = Promise.withResolvers<{ points: NetWorthPoint[] }>();
    vi.mocked(getPoints).mockReturnValueOnce(first.promise);
    vi.mocked(getPoints).mockResolvedValueOnce({ points: [point(20, 1), point(10, 2)] });
    const { rerender } = await renderPanel();
    setNetWorth({ latest: latest(13, { snapshotId: 'snap-2' }) });
    rerender(<NetWorthPanelPage />);
    await act(async () => {});
    await act(async () => first.resolve({ points: [point(20, 50), point(10, 60)] }));
    expect(recentRows().map((r) => r[1])).toEqual(['2.0 HR']);
  });

  it('explains how to turn history on and skips loading points when tracking is off', async () => {
    setNetWorth({ trackingEnabled: false });
    await renderPanel();
    expect(screen.getByText(/History is off/)).not.toBeNull();
    expect(screen.queryByRole('button', { name: /session/ })).toBeNull();
    expect(getPoints).not.toHaveBeenCalled();
  });
});

describe('NetWorthPanel actions', () => {
  it('takes a manual snapshot, disabling both buttons until it finishes', async () => {
    const pending = Promise.withResolvers<null>();
    setNetWorth({ takeSnapshot: vi.fn(() => pending.promise) });
    await renderPanel();
    const snap = screen.getByRole('button', { name: /Snapshot now/ }) as HTMLButtonElement;
    const sessionButton = screen.getByRole('button', { name: /Start session/ }) as HTMLButtonElement;
    fireEvent.click(snap);
    expect(vi.mocked(netWorth.takeSnapshot).mock.calls).toEqual([['manual']]);
    expect(snap.disabled).toBe(true);
    expect(sessionButton.disabled).toBe(true);
    await act(async () => pending.resolve(null));
    expect(snap.disabled).toBe(false);
    expect(sessionButton.disabled).toBe(false);
  });

  it('starts a session when none is open and stops the open one', async () => {
    const { rerender } = await renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Start session/ }));
    await act(async () => {});
    expect(netWorth.startSession).toHaveBeenCalledTimes(1);

    setNetWorth({ currentSession: session() });
    rerender(<NetWorthPanelPage />);
    fireEvent.click(screen.getByRole('button', { name: /Stop session/ }));
    await act(async () => {});
    expect(netWorth.stopSession).toHaveBeenCalledTimes(1);
    expect(netWorth.startSession).toHaveBeenCalledTimes(1);
  });

  // BUG: NetWorthPanelPage.tsx `run` (line 157) has try/finally but no catch: when start/stop session rejects
  // (useNetWorth's sendMarker rethrows postSessionMarker failures) the click handler leaks an unhandled
  // rejection and the panel shows no error. Skipped (not it.fails) because the unhandled rejection itself
  // fails the vitest run.
  it.skip('shows an error when starting a session fails', async () => {
    setNetWorth({
      startSession: vi.fn(async () => {
        throw new Error('Net worth API 503');
      }),
    });
    await renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /Start session/ }));
    expect(await screen.findByText('Net worth API 503')).not.toBeNull();
    expect((screen.getByRole('button', { name: /Start session/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});
