// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastActionType } from '@/common/types/Events';
import { fetch } from '@/lib/browser-http';
import { useSimAccess } from '@/hooks/useSimAccess';
import { showToast } from '@/overlay';
import { subscribeIntents, type OverlayIntent } from '@/lib/overlay-intents';
import { useOverlayIntents } from './useOverlayIntents';

const h = vi.hoisted(() => ({ settings: {} as Record<string, unknown> }));

vi.mock('@/hooks/useOptions', () => ({ useOptions: () => ({ settings: h.settings, isLoading: false }) }));
vi.mock('@/hooks/useSimAccess', () => ({ useSimAccess: vi.fn() }));
vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/pkce', () => ({ BACKEND_URL: 'https://api.test' }));

const intent: OverlayIntent = {
  id: 'i1',
  kind: 'report_ready',
  title: 'Top Gear finished · HammerPal',
  lines: ['Best set +12.4% DPS', '3 slots changed'],
  url: 'https://pd2trader.com/sim/r/abc',
  createdAt: '2026-11-07T10:00:00Z',
};
const INTENT = `event: intent\ndata: ${JSON.stringify(intent)}\n\n`;

/** An open stream that sends `text` and stays open. */
const stream = (text: string) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode(text));
      },
    }),
  );

const access = (canUse: boolean) => ({ canUse }) as ReturnType<typeof useSimAccess>;
const settle = () => act(() => vi.advanceTimersByTimeAsync(0));

beforeEach(() => {
  vi.useFakeTimers();
  h.settings = { pd2Token: 'tok' };
  vi.mocked(useSimAccess).mockReturnValue(access(true));
  vi.mocked(fetch).mockReset();
  vi.mocked(showToast).mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useOverlayIntents', () => {
  it('opens the stream with the PD2 bearer token and shows each intent once as a toast opening its result card', async () => {
    vi.mocked(fetch).mockResolvedValue(stream(INTENT + INTENT));
    renderHook(() => useOverlayIntents());
    await settle();
    await settle();

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.test/api/overlay/intents/stream');
    expect(init?.headers).toEqual({ Authorization: 'Bearer tok', Accept: 'text/event-stream' });
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showToast).mock.calls[0][0]).toMatchObject({
      title: 'Top Gear finished · HammerPal',
      description: 'Best set +12.4% DPS · 3 slots changed',
      action: {
        label: 'Open',
        type: ToastActionType.OPEN_SIM_PANEL,
        data: { slug: 'abc', url: 'https://pd2trader.com/sim/r/abc' },
      },
    });
  });

  it('shows no toast when Horadric Sim toasts are turned off', async () => {
    h.settings = { pd2Token: 'tok', toastPopupTypes: ['whispers', '!sim'] };
    vi.mocked(fetch).mockResolvedValue(stream(INTENT));
    renderHook(() => useOverlayIntents());
    await settle();
    await settle();
    expect(fetch).toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('still toasts for a toast list saved before Horadric Sim existed', async () => {
    h.settings = { pd2Token: 'tok', toastPopupTypes: ['whispers', 'trade'] };
    vi.mocked(fetch).mockResolvedValue(stream(INTENT));
    renderHook(() => useOverlayIntents());
    await settle();
    await settle();
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['signed out', {}, true],
    ['outside the closed beta', { pd2Token: 'tok' }, false],
  ])('does not subscribe when %s', async (_, settings, canUse) => {
    h.settings = settings;
    vi.mocked(useSimAccess).mockReturnValue(access(canUse));
    renderHook(() => useOverlayIntents());
    await settle();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not subscribe while sim access is unknown or the sim is off', async () => {
    vi.mocked(useSimAccess).mockReturnValue(undefined);
    const { rerender } = renderHook(() => useOverlayIntents());
    await settle();
    vi.mocked(useSimAccess).mockReturnValue(null);
    rerender();
    await settle();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reconnects with backoff after a drop, and stops for good on 403', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(new Response('', { status: 403 }));
    renderHook(() => useOverlayIntents());
    await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(fetch).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(600_000));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  const sse = (...intents: OverlayIntent[]) =>
    intents.map((i) => `event: intent\ndata: ${JSON.stringify(i)}\n\n`).join('');
  const failed: OverlayIntent = {
    ...intent,
    id: 'f1',
    kind: 'job_failed',
    title: 'Top Gear failed',
    lines: ['Out of memory'],
  };
  const cancelled: OverlayIntent = {
    ...intent,
    id: 'c1',
    kind: 'job_cancelled',
    title: 'Quick Sim cancelled',
    lines: [],
  };

  it('shows a failed sim as an error toast with Details, and a cancelled one muted', async () => {
    vi.mocked(fetch).mockResolvedValue(stream(sse(failed, cancelled)));
    renderHook(() => useOverlayIntents());
    await settle();
    await settle();
    expect(vi.mocked(showToast).mock.calls.map((c) => c[0])).toEqual([
      expect.objectContaining({
        title: 'Top Gear failed',
        tone: 'error',
        action: { label: 'Details', type: ToastActionType.OPEN_URL, data: { url: intent.url } },
      }),
      expect.objectContaining({ title: 'Quick Sim cancelled', tone: 'muted' }),
    ]);
  });

  it('passes every intent to subscribers (the Sim panel refetches on them)', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeIntents(listener);
    vi.mocked(fetch).mockResolvedValue(stream(INTENT));
    renderHook(() => useOverlayIntents());
    await settle();
    await settle();
    unsubscribe();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ id: 'i1' }));
  });

  it('shows a single sim that finished while away as its normal toast after the connect burst', async () => {
    vi.mocked(fetch).mockResolvedValue(stream(sse({ ...intent, replay: true })));
    renderHook(() => useOverlayIntents());
    await settle();
    await settle();
    expect(showToast).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1_500));
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showToast).mock.calls[0][0]).toMatchObject({ title: intent.title, action: { label: 'Open' } });
  });

  it('combines 2+ sims that finished while away into one summary toast, each id once', async () => {
    const extra: OverlayIntent = {
      ...intent,
      id: 'i9',
      title: 'Upgrade Finder finished',
      url: 'https://pd2trader.com/sim/r/newer',
      createdAt: '2026-11-07T11:00:00Z',
    };
    const r = (i: OverlayIntent) => ({ ...i, replay: true });
    vi.mocked(fetch).mockResolvedValue(stream(sse(r(intent), r(failed), r(cancelled), r(extra), r(intent))));
    renderHook(() => useOverlayIntents());
    await settle();
    await settle();
    await act(() => vi.advanceTimersByTimeAsync(1_500));
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showToast).mock.calls[0][0]).toEqual({
      title: '4 sims finished while you were away',
      description: [intent.title, failed.title, cancelled.title].join('\n'),
      duration: 15_000,
      // Opens the Sim panel on the newest finished report
      action: {
        label: 'View status',
        type: ToastActionType.OPEN_SIM_PANEL,
        data: { slug: 'newer', url: 'https://pd2trader.com/sim/r/newer' },
      },
    });
  });

  it('shows replayed open requests right away (not part of the away summary)', async () => {
    vi.mocked(fetch).mockResolvedValue(stream(sse({ ...intent, id: 'o1', kind: 'open_report', replay: true })));
    renderHook(() => useOverlayIntents());
    await settle();
    await settle();
    expect(showToast).toHaveBeenCalledTimes(1);
    // An open request opens its link, as asked on pd2trader.com
    expect(vi.mocked(showToast).mock.calls[0][0]).toMatchObject({
      action: { type: ToastActionType.OPEN_URL, data: { url: intent.url } },
    });
  });
});
