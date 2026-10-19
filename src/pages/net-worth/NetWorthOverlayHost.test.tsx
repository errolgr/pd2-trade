// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { useNetWorth, type NetWorthContextValue } from '@/hooks/useNetWorth';
import { emit, listen } from '@/lib/browser-events';
import { openWindowCenteredOnDiablo } from '@/lib/window';
import type { SnapshotResponse, ValuationLine } from '@/lib/networth-api';
import type { GenericToastPayload } from '@/common/types/Events';
import NetWorthOverlayHost from './NetWorthOverlayHost';
import { NETWORTH_TOGGLE_PANEL_EVENT } from './overlay';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(), invoke: vi.fn() }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({
  WebviewWindow: vi.fn(function (this: Record<string, unknown>) {
    this.show = vi.fn(async () => {});
    this.hide = vi.fn(async () => {});
  }),
}));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useNetWorth', () => ({ useNetWorth: vi.fn() }));
vi.mock('@/lib/browser-events', () => ({ emit: vi.fn(), listen: vi.fn() }));
vi.mock('@/lib/window', () => ({ openWindowCenteredOnDiablo: vi.fn() }));

type Listener = (event: { payload: unknown }) => void;

let settings: Partial<ISettings>;
let latest: SnapshotResponse | null;
let listeners: Map<string, Listener>;
let unlistens: Mock[];

function line(key: string, qty: number, unitPrice: number | null): ValuationLine {
  return {
    key,
    name: key,
    category: 'runes',
    qty,
    unitPrice,
    value: qty * (unitPrice ?? 0),
    confidence: 'ok',
    sampleCount: 10,
    priceChange7dPercent: null,
    tab: null,
    iconPath: null,
  };
}

function snapshot(
  sincePrevious: number | null,
  lines: ValuationLine[] = [],
  overrides: Partial<SnapshotResponse> = {},
): SnapshotResponse {
  return {
    valuation: { lines } as SnapshotResponse['valuation'],
    snapshotId: 'snap',
    deduped: false,
    delta: { sincePrevious, previousTakenAt: null },
    ...overrides,
  };
}

function toasts(): GenericToastPayload[] {
  return vi
    .mocked(emit)
    .mock.calls.filter(([event]) => event === 'toast-event')
    .map(([, payload]) => payload as GenericToastPayload);
}

function renderHost() {
  const utils = render(<NetWorthOverlayHost />);
  const update = () => utils.rerender(<NetWorthOverlayHost />);
  return { ...utils, update };
}

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function fire(event: string, payload?: unknown) {
  await act(async () => {
    listeners.get(event)!({ payload });
    await vi.advanceTimersByTimeAsync(0);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  settings = { pd2Token: 'tok' };
  latest = null;
  listeners = new Map();
  unlistens = [];
  vi.mocked(useOptions).mockImplementation(() => ({ settings }) as never);
  vi.mocked(useNetWorth).mockImplementation(() => ({ latest }) as NetWorthContextValue);
  vi.mocked(isTauri).mockReturnValue(false);
  vi.mocked(invoke).mockResolvedValue(false);
  vi.mocked(listen).mockImplementation(async (event, callback) => {
    listeners.set(event, callback as Listener);
    const off = vi.fn();
    unlistens.push(off);
    return off;
  });
  vi.mocked(WebviewWindow).mockClear();
  vi.mocked(openWindowCenteredOnDiablo).mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('NetWorthOverlayHost snapshot toasts', () => {
  it('toasts a gain above the threshold', () => {
    const { update } = renderHost();
    latest = snapshot(1.24);
    update();
    expect(toasts()).toEqual([{ title: 'Net Worth', description: '+1.2 HR', variant: 'success' }]);
  });

  it('names the biggest movers in the direction of the change', () => {
    const { update } = renderHost();
    latest = snapshot(0.6, [line('Ber', 1, 6), line('Ist', 2, 0.5), line('Mal', 1, 1), line('Lem', 3, 0.01)]);
    update();
    latest = snapshot(7.7, [
      line('Ber', 2, 6),
      line('Ist', 5, 0.5),
      line('Sol', 1, 0.1),
      line('Lem', 3, 0.01),
      line('Pul', 1, 0.05),
      line('Unpriced', 4, null),
    ]);
    update();
    expect(toasts()[1]).toEqual({ title: 'Net Worth', description: '+7.7 HR · Ber, 3× Ist, Sol', variant: 'success' });
  });

  it('names removed holdings when the total dropped', () => {
    const { update } = renderHost();
    latest = snapshot(0.6, [line('Ber', 1, 6), line('Mal', 2, 1), line('Ist', 1, 0.5)]);
    update();
    latest = snapshot(-2.7, [line('Ist', 4, 0.5)]);
    update();
    expect(toasts()[1]).toEqual({ title: 'Net Worth', description: '-2.7 HR · Ber, 2× Mal', variant: 'warning' });
  });

  it('leaves out movers when none moved in the direction of the change', () => {
    const { update } = renderHost();
    latest = snapshot(0.6, [line('Ber', 1, 6)]);
    update();
    // Market drift: same holdings, higher total
    latest = snapshot(1, [line('Ber', 1, 7)]);
    update();
    expect(toasts()[1].description).toBe('+1.0 HR');
  });

  it.each([
    ['below the default 0.5 HR threshold', {}, snapshot(0.49)],
    ['below a custom threshold', { netWorthToastThresholdHr: 2 }, snapshot(-1.9)],
    ['deduped', {}, snapshot(3, [], { deduped: true })],
    ['not stored', {}, snapshot(3, [], { snapshotId: null })],
    ['without a previous snapshot', {}, snapshot(null)],
    ['with net worth toasts turned off', { toastPopupTypes: ['whispers'] }, snapshot(3)],
    ['with all toasts turned off', { toastPopupsEnabled: false }, snapshot(3)],
  ] as const)('does not toast a snapshot %s', (_, extraSettings, next) => {
    settings = { ...settings, ...(extraSettings as Partial<typeof settings>) };
    const { update } = renderHost();
    latest = next;
    update();
    expect(toasts()).toEqual([]);
  });

  it('toasts each snapshot once', () => {
    const { update } = renderHost();
    latest = snapshot(1);
    update();
    settings = { ...settings };
    update();
    expect(toasts()).toHaveLength(1);
  });

  it('toasts a change exactly at the threshold', () => {
    const { update } = renderHost();
    latest = snapshot(-0.5);
    update();
    expect(toasts()).toEqual([{ title: 'Net Worth', description: '-0.5 HR', variant: 'warning' }]);
  });
});

describe('NetWorthOverlayHost mini panel', () => {
  function panelHandle(visible: boolean) {
    let onClose: (() => void) | null = null;
    const handle = {
      isVisible: vi.fn(async () => visible),
      show: vi.fn(async () => {}),
      hide: vi.fn(async () => {}),
      setFocus: vi.fn(async () => {}),
      onCloseRequested: vi.fn((cb: () => void) => {
        onClose = cb;
      }),
      close: () => onClose?.(),
    };
    return handle;
  }

  it('opens the panel centred on Diablo the first time the ticker is clicked', async () => {
    vi.mocked(openWindowCenteredOnDiablo).mockResolvedValue(panelHandle(true) as never);
    renderHost();
    await flush();
    await fire(NETWORTH_TOGGLE_PANEL_EVENT);
    const [label, url, opts] = vi.mocked(openWindowCenteredOnDiablo).mock.calls[0];
    expect([label, url]).toEqual(['NetWorthPanel', '/net-worth-panel']);
    expect(opts).toMatchObject({ width: 360, height: 420, decorations: false, alwaysOnTop: true, focusable: true });
  });

  it('hides a visible panel and shows + focuses a hidden one', async () => {
    const handle = panelHandle(true);
    vi.mocked(openWindowCenteredOnDiablo).mockResolvedValue(handle as never);
    renderHost();
    await flush();
    await fire(NETWORTH_TOGGLE_PANEL_EVENT);
    await fire(NETWORTH_TOGGLE_PANEL_EVENT);
    expect(handle.hide).toHaveBeenCalledTimes(1);
    handle.isVisible.mockResolvedValue(false);
    await fire(NETWORTH_TOGGLE_PANEL_EVENT);
    expect(handle.show).toHaveBeenCalledTimes(1);
    expect(handle.setFocus).toHaveBeenCalledTimes(1);
    expect(openWindowCenteredOnDiablo).toHaveBeenCalledTimes(1);
  });

  it('shows browser windows (no isVisible) instead of hiding them', async () => {
    const handle = { show: vi.fn(async () => {}), setFocus: vi.fn(async () => {}), onCloseRequested: vi.fn() };
    vi.mocked(openWindowCenteredOnDiablo).mockResolvedValue(handle as never);
    renderHost();
    await flush();
    await fire(NETWORTH_TOGGLE_PANEL_EVENT);
    await fire(NETWORTH_TOGGLE_PANEL_EVENT);
    expect(handle.show).toHaveBeenCalledTimes(1);
  });

  it('creates a new panel after the old one was closed', async () => {
    const first = panelHandle(true);
    const second = panelHandle(true);
    vi.mocked(openWindowCenteredOnDiablo).mockResolvedValueOnce(first as never).mockResolvedValueOnce(second as never);
    renderHost();
    await flush();
    await fire(NETWORTH_TOGGLE_PANEL_EVENT);
    first.close();
    await fire(NETWORTH_TOGGLE_PANEL_EVENT);
    expect(openWindowCenteredOnDiablo).toHaveBeenCalledTimes(2);
    expect(first.isVisible).not.toHaveBeenCalled();
  });

  it('recreates the panel when its handle went stale', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stale = panelHandle(true);
    stale.isVisible.mockRejectedValue(new Error('window not found'));
    vi.mocked(openWindowCenteredOnDiablo).mockResolvedValueOnce(stale as never).mockResolvedValueOnce(panelHandle(true) as never);
    renderHost();
    await flush();
    await fire(NETWORTH_TOGGLE_PANEL_EVENT);
    await fire(NETWORTH_TOGGLE_PANEL_EVENT);
    expect(openWindowCenteredOnDiablo).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith('[NetWorthOverlay] Panel window handle stale, recreating:', expect.any(Error));
  });

  it('tries again on the next click when the panel could not be opened', async () => {
    vi.mocked(openWindowCenteredOnDiablo).mockResolvedValueOnce(null).mockResolvedValueOnce(panelHandle(true) as never);
    renderHost();
    await flush();
    await fire(NETWORTH_TOGGLE_PANEL_EVENT);
    await fire(NETWORTH_TOGGLE_PANEL_EVENT);
    expect(openWindowCenteredOnDiablo).toHaveBeenCalledTimes(2);
  });

  it('logs a failed toggle', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(openWindowCenteredOnDiablo).mockRejectedValue(new Error('denied'));
    renderHost();
    await flush();
    await fire(NETWORTH_TOGGLE_PANEL_EVENT);
    expect(error).toHaveBeenCalledWith('[NetWorthOverlay] Failed to toggle panel:', expect.any(Error));
  });

  it('stops listening for toggles on unmount, also when listen resolves late', async () => {
    const { unmount } = renderHost();
    await flush();
    unmount();
    expect(unlistens[0]).toHaveBeenCalledTimes(1);

    const pending = Promise.withResolvers<() => void>();
    vi.mocked(listen).mockReturnValueOnce(pending.promise);
    const late = renderHost();
    late.unmount();
    const off = vi.fn();
    pending.resolve(off);
    await flush();
    expect(off).toHaveBeenCalledTimes(1);
  });
});

describe('NetWorthOverlayHost ticker visibility', () => {
  function ticker() {
    const instance = vi.mocked(WebviewWindow).mock.instances[0] as unknown as { show: Mock; hide: Mock };
    return instance;
  }

  beforeEach(() => {
    vi.mocked(isTauri).mockReturnValue(true);
  });

  it('does not manage the ticker outside Tauri', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    renderHost();
    await flush();
    expect(invoke).not.toHaveBeenCalled();
    expect(WebviewWindow).not.toHaveBeenCalled();
  });

  it('creates the ticker window when Diablo is focused at start-up', async () => {
    vi.mocked(invoke).mockResolvedValue(true);
    renderHost();
    await flush();
    expect(vi.mocked(invoke).mock.calls[0][0]).toBe('is_diablo_focused');
    expect(WebviewWindow).toHaveBeenCalledTimes(1);
    const [label, options] = vi.mocked(WebviewWindow).mock.calls[0];
    expect(label).toBe('NetWorthTicker');
    expect(options).toMatchObject({ url: '/net-worth-ticker', focus: false, focusable: false, visible: true });
  });

  it('shows the existing ticker on refocus and hides it 500 ms after focus is lost', async () => {
    vi.mocked(invoke).mockResolvedValue(true);
    renderHost();
    await flush();
    await fire('diablo-focus-changed', false);
    await flush(499);
    expect(ticker().hide).not.toHaveBeenCalled();
    await flush(1);
    expect(ticker().hide).toHaveBeenCalledTimes(1);

    await fire('diablo-focus-changed', true);
    expect(ticker().show).toHaveBeenCalledTimes(1);
    expect(WebviewWindow).toHaveBeenCalledTimes(1);
  });

  it('does not flicker when focus comes back within 500 ms', async () => {
    vi.mocked(invoke).mockResolvedValue(true);
    renderHost();
    await flush();
    await fire('diablo-focus-changed', false);
    await flush(300);
    await fire('diablo-focus-changed', true);
    await flush(1000);
    expect(ticker().hide).not.toHaveBeenCalled();
  });

  it.each([
    ['the ticker is disabled', { pd2Token: 'tok', netWorthTickerEnabled: false }],
    ['signed out', {}],
  ])('keeps the ticker hidden when %s', async (_, s) => {
    settings = s;
    vi.mocked(invoke).mockResolvedValue(true);
    renderHost();
    await flush();
    expect(WebviewWindow).not.toHaveBeenCalled();
  });

  it('hides the ticker on focus once it gets disabled', async () => {
    vi.mocked(invoke).mockResolvedValue(true);
    const { update } = renderHost();
    await flush();
    settings = { ...settings, netWorthTickerEnabled: false };
    update();
    await flush();
    // The re-run checks focus again and applies "not wanted"
    expect(ticker().hide).toHaveBeenCalledTimes(1);
  });

  it('hides the panel with the ticker and restores it on refocus only if it was open', async () => {
    const panel = {
      isVisible: vi.fn(async () => true),
      show: vi.fn(async () => {}),
      hide: vi.fn(async () => {}),
      setFocus: vi.fn(async () => {}),
      onCloseRequested: vi.fn(),
    };
    vi.mocked(openWindowCenteredOnDiablo).mockResolvedValue(panel as never);
    vi.mocked(invoke).mockResolvedValue(true);
    renderHost();
    await flush();
    await fire(NETWORTH_TOGGLE_PANEL_EVENT);

    await fire('diablo-focus-changed', false);
    await flush(500);
    expect(panel.hide).toHaveBeenCalledTimes(1);
    await fire('diablo-focus-changed', true);
    expect(panel.show).toHaveBeenCalledTimes(1);

    // Closed by the user before the blur: stays closed on refocus
    panel.isVisible.mockResolvedValue(false);
    await fire('diablo-focus-changed', false);
    await flush(500);
    await fire('diablo-focus-changed', true);
    expect(panel.show).toHaveBeenCalledTimes(1);
  });

  it('recreates the ticker on the next focus when its window disappeared', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(invoke).mockResolvedValue(true);
    renderHost();
    await flush();
    ticker().show.mockRejectedValue(new Error('gone'));
    await fire('diablo-focus-changed', true);
    expect(warn).toHaveBeenCalledWith(
      '[NetWorthOverlay] Ticker window not found, recreating on next focus:',
      expect.any(Error),
    );
    await fire('diablo-focus-changed', true);
    expect(WebviewWindow).toHaveBeenCalledTimes(2);
  });

  it('logs a failed initial focus check', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(invoke).mockRejectedValue(new Error('no backend'));
    renderHost();
    await flush();
    expect(warn).toHaveBeenCalledWith('[NetWorthOverlay] Initial focus check failed:', expect.any(Error));
    expect(WebviewWindow).not.toHaveBeenCalled();
  });

  it('cancels a pending hide on unmount', async () => {
    vi.mocked(invoke).mockResolvedValue(true);
    const { unmount } = renderHost();
    await flush();
    await fire('diablo-focus-changed', false);
    unmount();
    await flush(1000);
    expect(ticker().hide).not.toHaveBeenCalled();
  });
});
