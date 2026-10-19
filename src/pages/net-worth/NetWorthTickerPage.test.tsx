// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { availableMonitors } from '@tauri-apps/api/window';
import { LogicalPosition, LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { useNetWorth, type NetWorthContextValue } from '@/hooks/useNetWorth';
import { useWealthRank } from '@/hooks/useWealthRank';
import { emit, listen } from '@/lib/browser-events';
import type { SessionSummary, SnapshotResponse } from '@/lib/networth-api';
import NetWorthTickerPage from './NetWorthTickerPage';
import { NETWORTH_TOGGLE_PANEL_EVENT } from './overlay';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(), invoke: vi.fn() }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({ getCurrentWebviewWindow: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({ availableMonitors: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({
  OptionsProvider: ({ children }: { children: React.ReactNode }) => children,
  useOptions: vi.fn(),
}));
vi.mock('@/hooks/useItems', () => ({ ItemsProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({
  ChildPd2WebsiteProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/hooks/useNetWorth', () => ({
  ChildNetWorthProvider: ({ children }: { children: React.ReactNode }) => children,
  useNetWorth: vi.fn(),
}));
vi.mock('@/hooks/useWealthRank', () => ({ useWealthRank: vi.fn() }));
vi.mock('@/lib/browser-events', () => ({ emit: vi.fn(), listen: vi.fn() }));

const NOW = new Date('2026-10-18T12:00:00.000Z').getTime();
const PILL = { width: 180.4, height: 27.2 };

let settings: Partial<ISettings>;
let netWorth: Partial<NetWorthContextValue>;
let focusListener: ((event: { payload: boolean }) => void) | null;
let unlisten: Mock;
let win: {
  setSize: Mock;
  setPosition: Mock;
  scaleFactor: Mock;
  outerPosition: Mock;
  startDragging: Mock;
  onMoved: Mock;
  onScaleChanged: Mock;
};
let updateSettings: Mock;
let movedListener: ((event: { payload: { x: number; y: number } }) => void) | null;
let scaleListener: (() => void) | null;

function latest(totalHr: number): SnapshotResponse {
  return {
    valuation: { totalHr } as SnapshotResponse['valuation'],
    snapshotId: 's',
    deduped: false,
    delta: { sincePrevious: null, previousTakenAt: null },
  };
}

function session(overrides: Partial<SessionSummary>): SessionSummary {
  return {
    id: 'sess',
    start: '',
    end: '',
    durationMinutes: 30,
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

function pill(): HTMLButtonElement {
  return screen.getByTitle('Net worth — click for details, drag to move') as HTMLButtonElement;
}

function dot(): HTMLElement {
  return pill().lastElementChild as HTMLElement;
}

async function flush() {
  await act(async () => {});
}

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  settings = {};
  netWorth = { latest: latest(12.5), status: 'ok', lastSnapshotAt: NOW - 60_000, currentSession: null };
  updateSettings = vi.fn();
  vi.mocked(useOptions).mockImplementation(() => ({ settings, updateSettings }) as never);
  vi.mocked(useNetWorth).mockImplementation(() => netWorth as NetWorthContextValue);
  vi.mocked(useWealthRank).mockReturnValue(null);
  vi.mocked(isTauri).mockReturnValue(false);
  focusListener = null;
  unlisten = vi.fn();
  vi.mocked(listen).mockImplementation(async (_event, callback) => {
    focusListener = callback as typeof focusListener;
    return unlisten;
  });
  movedListener = null;
  scaleListener = null;
  win = {
    setSize: vi.fn(async () => {}),
    setPosition: vi.fn(async () => {}),
    scaleFactor: vi.fn(async () => 1.5),
    outerPosition: vi.fn(async () => ({ x: 300, y: 200 })),
    startDragging: vi.fn(async () => {}),
    onMoved: vi.fn(async (callback) => {
      movedListener = callback;
      return vi.fn();
    }),
    onScaleChanged: vi.fn(async (callback) => {
      scaleListener = callback;
      return vi.fn();
    }),
  };
  vi.mocked(getCurrentWebviewWindow).mockReturnValue(win as never);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(PILL as DOMRect);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('NetWorthTicker pill', () => {
  it('shows the total with one decimal, and none from 1000 HR', () => {
    render(<NetWorthTickerPage />);
    expect(pill().firstElementChild?.textContent).toBe('12.5 HR');
    cleanup();
    netWorth = { ...netWorth, latest: latest(1234.56) };
    render(<NetWorthTickerPage />);
    expect(pill().firstElementChild?.textContent).toBe('1235 HR');
  });

  it('shows "…" while the first valuation loads and "—" when there is none', () => {
    netWorth = { ...netWorth, latest: null, status: 'loading' };
    const { rerender } = render(<NetWorthTickerPage />);
    expect(pill().firstElementChild?.textContent).toBe('… HR');
    netWorth = { ...netWorth, status: 'error' };
    rerender(<NetWorthTickerPage />);
    expect(pill().firstElementChild?.textContent).toBe('— HR');
  });

  it('toggles the mini panel on click', () => {
    render(<NetWorthTickerPage />);
    fireEvent.click(pill());
    expect(vi.mocked(emit).mock.calls).toEqual([[NETWORTH_TOGGLE_PANEL_EVENT]]);
  });

  it('applies the configured opacity (90% by default)', () => {
    const { rerender } = render(<NetWorthTickerPage />);
    expect(pill().style.opacity).toBe('0.9');
    settings = { netWorthTickerOpacity: 40 };
    rerender(<NetWorthTickerPage />);
    expect(pill().style.opacity).toBe('0.4');
  });

  it('shows the open session gain and HR/hour', () => {
    netWorth = { ...netWorth, currentSession: session({ startHr: 10, endHr: 12.04, hrPerHour: 4.06 }) };
    render(<NetWorthTickerPage />);
    expect(pill().textContent).toContain('▲ +2.0 session');
    expect(pill().textContent).toContain('4.1 HR/h');
  });

  it('shows a session loss with a down arrow', () => {
    netWorth = { ...netWorth, currentSession: session({ startHr: 10, endHr: 9.5 }) };
    render(<NetWorthTickerPage />);
    expect(pill().textContent).toContain('▼ -0.5 session');
  });

  it('hides session stats once the session is closed', () => {
    netWorth = { ...netWorth, currentSession: session({ isOpen: false }) };
    render(<NetWorthTickerPage />);
    expect(pill().textContent).not.toContain('session');
    expect(pill().textContent).not.toContain('HR/h');
  });

  it('shows the wealth rank when ranked', () => {
    vi.mocked(useWealthRank).mockReturnValue('#41 Wealth · Top 7%');
    render(<NetWorthTickerPage />);
    expect(pill().textContent).toContain('#41 Wealth · Top 7%');
  });

  it('flashes green on a rise and red on a drop, then settles', () => {
    const { rerender } = render(<NetWorthTickerPage />);
    const total = () => pill().firstElementChild as HTMLElement;
    expect(total().className).not.toMatch(/text-(success|destructive)/);
    netWorth = { ...netWorth, latest: latest(13) };
    rerender(<NetWorthTickerPage />);
    expect(total().className).toContain('text-success');
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(total().className).not.toContain('text-success');
    netWorth = { ...netWorth, latest: latest(11) };
    rerender(<NetWorthTickerPage />);
    expect(total().className).toContain('text-destructive');
  });
});

describe('NetWorthTicker freshness dot', () => {
  it('is green while the last snapshot is within the auto-snapshot interval plus a minute', () => {
    render(<NetWorthTickerPage />);
    expect(dot().className).toContain('bg-success');
    expect(dot().title).toBe(`Last snapshot ${new Date(NOW - 60_000).toLocaleTimeString()}`);
  });

  it('turns amber once the snapshot is overdue, re-checked every 30 seconds', () => {
    settings = { netWorthAutoSnapshotMinutes: 5 };
    netWorth = { ...netWorth, lastSnapshotAt: NOW - 5 * 60_000 - 45_000 };
    render(<NetWorthTickerPage />);
    expect(dot().className).toContain('bg-success');
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(dot().className).toContain('bg-warning');
  });

  it('treats an auto-snapshot interval of 0 (off) as the 15 minute default', () => {
    settings = { netWorthAutoSnapshotMinutes: 0 };
    netWorth = { ...netWorth, lastSnapshotAt: NOW - 15 * 60_000 };
    render(<NetWorthTickerPage />);
    expect(dot().className).toContain('bg-success');
  });

  it('is amber before the first snapshot', () => {
    netWorth = { ...netWorth, lastSnapshotAt: null };
    render(<NetWorthTickerPage />);
    expect(dot().className).toContain('bg-warning');
    expect(dot().title).toBe('No snapshot yet');
  });

  it.each(['error', 'signed-out'] as const)('is red when the status is %s', (status) => {
    netWorth = { ...netWorth, status };
    render(<NetWorthTickerPage />);
    expect(dot().className).toContain('bg-destructive');
    expect(dot().title).toBe('Snapshot failed');
  });

  it('pulses while loading', () => {
    netWorth = { ...netWorth, status: 'loading' };
    render(<NetWorthTickerPage />);
    expect(dot().className).toContain('animate-pulse');
  });
});

describe('NetWorthTicker window placement', () => {
  const RECT = { x: 100, y: 50, width: 1920, height: 1080 };

  beforeEach(() => {
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(invoke).mockResolvedValue(RECT);
  });

  it('does nothing outside Tauri', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    render(<NetWorthTickerPage />);
    await flush();
    expect(win.setSize).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
  });

  it('sizes the window to the pill and centres it at the top of the Diablo frame', async () => {
    render(<NetWorthTickerPage />);
    await flush();
    expect(win.setSize.mock.calls[0][0]).toEqual(new LogicalSize(181, 28));
    expect(vi.mocked(invoke).mock.calls[0][0]).toBe('get_diablo_rect');
    // physical width 181 * 1.5 = 271.5 → 272; margin 12 * 1.5 = 18
    expect(win.setPosition.mock.calls[0][0]).toEqual(new PhysicalPosition(100 + (1920 - 272) / 2, 68));
  });

  it.each([
    ['top-left', 100 + 18],
    // the window is a whole number of physical pixels: 181 * 1.5 = 271.5 → 272
    ['top-right', 100 + 1920 - 272 - 18],
  ] as const)('anchors %s with a scaled edge margin', async (anchor, x) => {
    settings = { netWorthTickerAnchor: anchor };
    render(<NetWorthTickerPage />);
    await flush();
    expect(win.setPosition.mock.calls[0][0]).toEqual(new PhysicalPosition(x, 68));
  });

  it('sits right-aligned just above the chat button for "above-chat"', async () => {
    settings = { netWorthTickerAnchor: 'above-chat' };
    render(<NetWorthTickerPage />);
    await flush();
    const chatX = 100 + 1920 - 240 - 20;
    const chatY = 50 + 1080 - 240 - 10;
    expect(win.setPosition.mock.calls[0][0]).toEqual(new LogicalPosition(chatX + 240 - 181, chatY - 28 - 4));
  });

  it.each([
    ['bottom-left', 100 + 18],
    ['bottom-right', 100 + 1920 - 272 - 18],
  ] as const)('anchors %s at the bottom of the Diablo frame', async (anchor, x) => {
    settings = { netWorthTickerAnchor: anchor };
    render(<NetWorthTickerPage />);
    await flush();
    // physical height 28 * 1.5 = 42
    expect(win.setPosition.mock.calls[0][0]).toEqual(new PhysicalPosition(x, 50 + 1080 - 42 - 18));
  });

  it('re-places when the monitor scale changes', async () => {
    render(<NetWorthTickerPage />);
    await flush();
    scaleListener!();
    await flush();
    expect(win.setPosition).toHaveBeenCalledTimes(2);
  });

  it('only resizes when Diablo is not found', async () => {
    vi.mocked(invoke).mockResolvedValue(null);
    render(<NetWorthTickerPage />);
    await flush();
    expect(win.setSize).toHaveBeenCalledTimes(1);
    expect(win.setPosition).not.toHaveBeenCalled();
  });

  it('re-anchors when Diablo regains focus, not when it loses it', async () => {
    render(<NetWorthTickerPage />);
    await flush();
    expect(vi.mocked(listen).mock.calls[0][0]).toBe('diablo-focus-changed');
    focusListener!({ payload: false });
    await flush();
    expect(win.setPosition).toHaveBeenCalledTimes(1);
    focusListener!({ payload: true });
    await flush();
    expect(win.setPosition).toHaveBeenCalledTimes(2);
  });

  it('re-places on anchor change and stops listening on unmount', async () => {
    const { rerender, unmount } = render(<NetWorthTickerPage />);
    await flush();
    settings = { netWorthTickerAnchor: 'top-left' };
    rerender(<NetWorthTickerPage />);
    await flush();
    expect(unlisten).toHaveBeenCalledTimes(1);
    expect(win.setPosition.mock.calls.at(-1)![0]).toEqual(new PhysicalPosition(118, 68));
    unmount();
    expect(unlisten).toHaveBeenCalledTimes(2);
  });

  it('drops the focus listener that resolves after unmount', async () => {
    const pending = Promise.withResolvers<() => void>();
    vi.mocked(listen).mockReturnValue(pending.promise);
    const { unmount } = render(<NetWorthTickerPage />);
    unmount();
    pending.resolve(unlisten);
    await flush();
    expect(unlisten).toHaveBeenCalledTimes(1);
  });

  it('logs and survives placement failures', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(invoke).mockRejectedValue(new Error('no window'));
    render(<NetWorthTickerPage />);
    await flush();
    expect(warn).toHaveBeenCalledWith('[NetWorthTicker] Failed to place ticker window:', expect.any(Error));
    expect(pill()).not.toBeNull();
  });
});

describe('NetWorthTicker custom position and dragging', () => {
  // One 1080p monitor at 150% with a 40px taskbar; the pill is 181x28 logical = 272x42 physical
  const MONITOR = { workArea: { position: { x: 0, y: 0 }, size: { width: 1920, height: 1040 } }, scaleFactor: 1.5 };

  beforeEach(() => {
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(invoke).mockResolvedValue({ x: 100, y: 50, width: 1920, height: 1080 });
    vi.mocked(availableMonitors).mockResolvedValue([MONITOR] as never);
  });

  function drag(dx: number) {
    fireEvent.pointerDown(pill(), { button: 0, buttons: 1, screenX: 10, screenY: 10 });
    fireEvent.pointerMove(pill(), { buttons: 1, screenX: 10 + dx, screenY: 10 });
  }

  it.each([
    ['restores the saved position', { x: 700, y: 400 }, new PhysicalPosition(700, 400)],
    ['keeps a saved position on screen', { x: 1900, y: 1030 }, new PhysicalPosition(1920 - 272, 1040 - 42)],
    ['brings it back from an unplugged monitor', { x: 4000, y: 300 }, new PhysicalPosition(1920 - 272, 300)],
  ] as const)('%s', async (_, position, expected) => {
    settings = { netWorthTickerAnchor: 'custom', netWorthTickerPosition: position };
    render(<NetWorthTickerPage />);
    await flush();
    expect(win.setPosition.mock.calls[0][0]).toEqual(expected);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('stays where it is when switched to Custom before it was ever dragged', async () => {
    settings = { netWorthTickerAnchor: 'custom' };
    render(<NetWorthTickerPage />);
    await flush();
    expect(win.setPosition.mock.calls[0][0]).toEqual(new PhysicalPosition(300, 200));
  });

  it('starts a window drag once the press travels, and swallows the click that follows', async () => {
    render(<NetWorthTickerPage />);
    await flush();
    drag(6);
    expect(win.startDragging).toHaveBeenCalledTimes(1);
    fireEvent.click(pill());
    expect(emit).not.toHaveBeenCalled();
    // The next plain click toggles the panel again
    fireEvent.pointerDown(pill(), { button: 0, buttons: 1, screenX: 10, screenY: 10 });
    fireEvent.click(pill());
    expect(vi.mocked(emit).mock.calls).toEqual([[NETWORTH_TOGGLE_PANEL_EVENT]]);
  });

  it('treats a small wobble as a click', async () => {
    render(<NetWorthTickerPage />);
    await flush();
    drag(2);
    fireEvent.click(pill());
    expect(win.startDragging).not.toHaveBeenCalled();
    expect(vi.mocked(emit).mock.calls).toEqual([[NETWORTH_TOGGLE_PANEL_EVENT]]);
  });

  it('saves where the drag ended and switches to Custom', async () => {
    render(<NetWorthTickerPage />);
    await flush();
    drag(20);
    movedListener!({ payload: { x: 650, y: 380 } });
    movedListener!({ payload: { x: 700, y: 400 } });
    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(updateSettings).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(updateSettings).toHaveBeenCalledExactlyOnceWith({
      netWorthTickerAnchor: 'custom',
      netWorthTickerPosition: { x: 700, y: 400 },
    });
  });

  it('ignores moves it made itself', async () => {
    render(<NetWorthTickerPage />);
    await flush();
    movedListener!({ payload: { x: 1, y: 2 } });
    // A drag that has not moved yet, then the ticker's own placement move
    drag(20);
    const placed = win.setPosition.mock.calls[0][0] as PhysicalPosition;
    movedListener!({ payload: { x: placed.x, y: placed.y } });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('logs a drag that could not start', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    win.startDragging.mockRejectedValue(new Error('denied'));
    render(<NetWorthTickerPage />);
    await flush();
    drag(20);
    await flush();
    expect(warn).toHaveBeenCalledWith('[NetWorthTicker] Failed to start dragging:', expect.any(Error));
  });
});
