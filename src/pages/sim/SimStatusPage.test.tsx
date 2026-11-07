// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch } from '@/lib/browser-http';
import { openUrl } from '@/lib/browser-opener';
import { publishIntent, type OverlayIntent } from '@/lib/overlay-intents';
import type { SimJobStatus } from '@/lib/sim-jobs-api';
import { useSimAccess } from '@/hooks/useSimAccess';
import SimStatusPage, { ACTIVE_POLL_MS, IDLE_POLL_MS } from './SimStatusPage';

const h = vi.hoisted(() => ({ settings: {} as Record<string, unknown>, openPanel: vi.fn() }));

vi.mock('@/hooks/useOptions', () => ({ useOptions: () => ({ settings: h.settings, isLoading: false }) }));
vi.mock('@/hooks/useSimAccess', () => ({ useSimAccess: vi.fn() }));
vi.mock('@/overlay', () => ({
  usePanel: () => ({ close: vi.fn() }),
  useOverlay: () => ({ openPanel: h.openPanel }),
}));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/telemetry', () => ({ trackMeasurement: vi.fn() }));
vi.mock('@/components/custom/window-chrome', () => ({
  WindowPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  WindowChrome: ({ title }: { title: string }) => <h2>{title}</h2>,
}));
vi.mock('@/lib/pkce', () => ({ BACKEND_URL: 'https://api.test' }));

const job = (over: Partial<SimJobStatus>): SimJobStatus => ({
  id: 'j',
  goal: 'top_gear',
  character: 'HammerPal',
  status: 'succeeded',
  progress: null,
  queuePosition: null,
  etaSeconds: null,
  source: 'website',
  error: null,
  reportUrl: null,
  headline: [],
  createdAt: new Date(Date.now() - 600_000).toISOString(),
  finishedAt: null,
  ...over,
});
const answer = (jobs: SimJobStatus[]) => new Response(JSON.stringify({ jobs }), { status: 200 });
const access = (canUse: boolean, waitlistPosition: number | null = null) =>
  ({ canUse, waitlistUrl: 'https://pd2trader.com/sim/waitlist', waitlistPosition }) as ReturnType<typeof useSimAccess>;
const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

beforeEach(() => {
  vi.useFakeTimers();
  h.settings = { pd2Token: 'tok' };
  h.openPanel.mockReset();
  vi.mocked(useSimAccess).mockReturnValue(access(true));
  vi.mocked(fetch).mockReset();
  vi.mocked(openUrl).mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SimStatusPage', () => {
  it('asks a signed-out user to sign in, without loading', async () => {
    h.settings = {};
    vi.mocked(useSimAccess).mockReturnValue(null);
    render(<SimStatusPage />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(h.openPanel).toHaveBeenCalledWith('signIn');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows the waitlist outside the closed beta', async () => {
    vi.mocked(useSimAccess).mockReturnValue(access(false, 7));
    render(<SimStatusPage />);
    await settle();
    expect(screen.getByText(/#7 on the waitlist/)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows an empty state with the bearer-token request', async () => {
    vi.mocked(fetch).mockImplementation(async () => answer([]));
    render(<SimStatusPage />);
    await settle();
    expect(vi.mocked(fetch).mock.calls[0]).toEqual([
      'https://api.test/api/sim/jobs/mine',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    ]);
    expect(screen.getByText('No sims in the last 24 hours')).toBeTruthy();
    expect(screen.getByText('Horadric Sim · status')).toBeTruthy();
  });

  it('renders running and recent sims, read-only, and Open opens the report', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      answer([
        job({ id: 'r', status: 'running', progress: { done: 25, total: 100 }, etaSeconds: 90, source: 'overlay' }),
        job({ id: 'q', goal: 'quick_sim', status: 'queued', queuePosition: 3 }),
        job({
          id: 's',
          reportUrl: 'https://pd2trader.com/sim/r/s',
          headline: ['Best set +12.4% DPS', 'x'],
          finishedAt: new Date(Date.now() - 7_200_000).toISOString(),
        }),
        job({ id: 'f', status: 'failed', error: 'Character not found' }),
      ]),
    );
    render(<SimStatusPage />);
    await settle();

    expect(screen.getAllByTestId('sim-running')).toHaveLength(2);
    expect(screen.getAllByRole('progressbar')[0].getAttribute('aria-valuenow')).toBe('25');
    expect(screen.getByText('from overlay')).toBeTruthy();
    expect(screen.getByText('~2m left')).toBeTruthy();
    expect(screen.getByText('Queued · #3 in line')).toBeTruthy();
    expect(screen.getAllByTestId('sim-recent')).toHaveLength(2);
    expect(screen.getByText('Best set +12.4% DPS')).toBeTruthy();
    expect(screen.getByText('2h ago')).toBeTruthy();
    expect(screen.getByText('Character not found')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /start|stop|cancel|edit/i })).toBeNull();

    const open = screen.getAllByRole('button', { name: /open/i });
    expect(open).toHaveLength(1);
    fireEvent.click(open[0]);
    expect(openUrl).toHaveBeenCalledWith('https://pd2trader.com/sim/r/s');
  });

  it('polls every 5 s while a sim is in flight, then every minute', async () => {
    vi.mocked(fetch)
      .mockImplementationOnce(async () => answer([job({ status: 'running' })]))
      .mockImplementation(async () => answer([job({})]));
    render(<SimStatusPage />);
    await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(ACTIVE_POLL_MS));
    expect(fetch).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(ACTIVE_POLL_MS));
    expect(fetch).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(IDLE_POLL_MS));
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('refetches right away on an overlay intent', async () => {
    vi.mocked(fetch).mockImplementation(async () => answer([]));
    render(<SimStatusPage />);
    await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    act(() => publishIntent({ id: 'x', kind: 'report_ready' } as OverlayIntent));
    await settle();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
