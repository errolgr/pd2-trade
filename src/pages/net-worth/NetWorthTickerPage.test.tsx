// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { useNetWorth, type NetWorthContextValue } from '@/hooks/useNetWorth';
import { useWealthRank } from '@/hooks/useWealthRank';
import { usePanel, useOverlay, type OverlayApi, type OverlayRect, type PanelContextValue } from '@/overlay';
import { savePanelRect } from '@/overlay/layout-storage';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { SessionSummary, SnapshotResponse } from '@/lib/networth-api';
import NetWorthTickerPage from './NetWorthTickerPage';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useNetWorth', () => ({ useNetWorth: vi.fn() }));
vi.mock('@/hooks/useWealthRank', () => ({ useWealthRank: vi.fn() }));
vi.mock('@/overlay', () => ({ usePanel: vi.fn(), useOverlay: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => false), invoke: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: vi.fn(), cursorPosition: vi.fn() }));

const NOW = new Date('2026-10-18T12:00:00.000Z').getTime();
/** Rendered pill box; the panel is sized to its ceiling: 181 x 28. */
const PILL = { width: 180.4, height: 27.2 };
const GAME = { x: 100, y: 50, width: 1280, height: 720 };

let settings: Partial<ISettings>;
let netWorth: Partial<NetWorthContextValue>;
let updateSettings: Mock;
let gameRect: OverlayRect;
let panelRect: OverlayRect;
let setRect: Mock;
let togglePanel: Mock;

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

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  window.innerWidth = 1920;
  window.innerHeight = 1080;
  settings = {};
  netWorth = { latest: latest(12.5), status: 'ok', lastSnapshotAt: NOW - 60_000, currentSession: null };
  updateSettings = vi.fn();
  gameRect = GAME;
  panelRect = { x: 0, y: 0, width: 320, height: 32 };
  setRect = vi.fn((r: Partial<OverlayRect>) => {
    panelRect = { ...panelRect, ...r };
  });
  togglePanel = vi.fn();
  vi.mocked(useOptions).mockImplementation(() => ({ settings, updateSettings }) as never);
  vi.mocked(useNetWorth).mockImplementation(() => netWorth as NetWorthContextValue);
  vi.mocked(useWealthRank).mockReturnValue(null);
  vi.mocked(useOverlay).mockImplementation(() => ({ gameRect, togglePanel }) as unknown as OverlayApi);
  vi.mocked(usePanel).mockImplementation(
    () => ({ rect: panelRect, setRect }) as unknown as PanelContextValue<'netWorthTicker'>,
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(PILL as DOMRect);
  HTMLElement.prototype.setPointerCapture = vi.fn();
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

describe('NetWorthTicker placement', () => {
  it('sizes the panel to the pill and centres it at the top of the game', () => {
    render(<NetWorthTickerPage />);
    // x = 100 + (1280 - 181) / 2 = 649.5 → 650; y = 50 + 12
    expect(setRect.mock.calls).toEqual([[{ x: 650, y: 62, width: 181, height: 28 }]]);
  });

  it.each([
    ['top-left', { x: 112, y: 62 }],
    ['top-right', { x: 100 + 1280 - 181 - 12, y: 62 }],
    ['bottom-left', { x: 112, y: 50 + 720 - 28 - 12 }],
    ['bottom-right', { x: 100 + 1280 - 181 - 12, y: 50 + 720 - 28 - 12 }],
    // right-aligned 4px above the chat dock (720px tall game: 29x80 pill, 6px in from the corner)
    ['above-chat', { x: 100 + 1280 - 6 - 181, y: 50 + 720 - 6 - 80 - 28 - 4 }],
  ] as const)('anchors %s on the game', (anchor, position) => {
    settings = { netWorthTickerAnchor: anchor };
    render(<NetWorthTickerPage />);
    expect(setRect).toHaveBeenLastCalledWith({ ...position, width: 181, height: 28 });
  });

  it('follows the game rect and does not re-set an unchanged rect', () => {
    const { rerender } = render(<NetWorthTickerPage />);
    rerender(<NetWorthTickerPage />);
    expect(setRect).toHaveBeenCalledTimes(1);
    gameRect = { x: 0, y: 0, width: 800, height: 600 };
    rerender(<NetWorthTickerPage />);
    expect(setRect).toHaveBeenLastCalledWith({ x: 310, y: 12, width: 181, height: 28 });
  });

  it('keeps a custom ticker where it is, sized to the pill and inside the overlay', () => {
    settings = { netWorthTickerAnchor: 'custom' };
    panelRect = { x: 5000, y: 10, width: 320, height: 32 };
    render(<NetWorthTickerPage />);
    expect(setRect.mock.calls).toEqual([[{ x: 1920 - 181, y: 10, width: 181, height: 28 }]]);
  });

  it('ignores zero-size reads while the panel is hidden', () => {
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue({ width: 0, height: 0 } as DOMRect);
    render(<NetWorthTickerPage />);
    expect(setRect).not.toHaveBeenCalled();
  });
});

describe('NetWorthTicker legacy custom position', () => {
  const LEGACY = { x: 300, y: 400 };

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(isTauri).mockReturnValue(false);
    settings = { netWorthTickerAnchor: 'custom', netWorthTickerPosition: LEGACY };
  });

  function mainWindow(outerPosition: () => Promise<{ x: number; y: number }>, scaleFactor: number) {
    vi.mocked(isTauri).mockReturnValue(true);
    vi.mocked(getCurrentWindow).mockReturnValue({
      outerPosition,
      scaleFactor: async () => scaleFactor,
    } as never);
  }

  it('moves the saved spot into the panel layout once (browser: CSS px) and clears the setting', async () => {
    const { rerender } = render(<NetWorthTickerPage />);
    // Placement waits for the conversion instead of persisting the default spot
    expect(setRect).not.toHaveBeenCalled();
    await act(async () => {});

    expect(setRect.mock.calls).toEqual([[LEGACY], [{ ...LEGACY, width: 181, height: 28 }]]);
    expect(updateSettings.mock.calls).toEqual([[{ netWorthTickerPosition: undefined }]]);

    // Settings still carry the old value until the update lands; it is not migrated twice
    rerender(<NetWorthTickerPage />);
    await act(async () => {});
    expect(setRect).toHaveBeenCalledTimes(2);
    expect(updateSettings).toHaveBeenCalledTimes(1);
  });

  it('converts physical screen px to overlay CSS px in Tauri', async () => {
    // Main sits on a monitor left of the primary at 150%; old ticker at screen (-1320, 300) → overlay (400, 200)
    mainWindow(async () => ({ x: -1920, y: 0 }), 1.5);
    settings = { ...settings, netWorthTickerPosition: { x: -1920 + 600, y: 300 } };
    render(<NetWorthTickerPage />);
    await act(async () => {});

    expect(panelRect).toEqual({ x: 400, y: 200, width: 181, height: 28 });
    expect(updateSettings).toHaveBeenCalledWith({ netWorthTickerPosition: undefined });
  });

  it('falls back to the clamped current spot when the window position cannot be read', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mainWindow(async () => {
      throw new Error('ipc down');
    }, 1);
    panelRect = { x: 5000, y: 10, width: 320, height: 32 };
    render(<NetWorthTickerPage />);
    await act(async () => {});

    expect(setRect.mock.calls).toEqual([[{ x: 1920 - 181, y: 10, width: 181, height: 28 }]]);
    expect(updateSettings).toHaveBeenCalledWith({ netWorthTickerPosition: undefined });
    expect(warn).toHaveBeenCalled();
  });

  it('leaves an existing panel layout rect alone', async () => {
    savePanelRect('netWorthTicker', { x: 10, y: 20, width: 181, height: 28 });
    panelRect = { x: 10, y: 20, width: 320, height: 32 };
    render(<NetWorthTickerPage />);
    await act(async () => {});

    expect(setRect.mock.calls).toEqual([[{ x: 10, y: 20, width: 181, height: 28 }]]);
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('does nothing while the ticker is anchored to the game', async () => {
    settings = { ...settings, netWorthTickerAnchor: 'top-left' };
    render(<NetWorthTickerPage />);
    await act(async () => {});

    expect(setRect.mock.calls).toEqual([[{ x: 112, y: 62, width: 181, height: 28 }]]);
    expect(updateSettings).not.toHaveBeenCalled();
  });
});

describe('NetWorthTicker click and drag', () => {
  it('toggles the mini panel below the ticker, left edges aligned', () => {
    const { rerender } = render(<NetWorthTickerPage />);
    rerender(<NetWorthTickerPage />); // pick up the placed rect
    fireEvent.click(pill());
    expect(togglePanel.mock.calls).toEqual([['netWorthPanel', undefined, { placement: { x: 650, y: 62 + 28 + 6 } }]]);
  });

  it('opens the mini panel above and right-aligned when the ticker sits in the bottom-right corner', () => {
    settings = { netWorthTickerAnchor: 'custom' };
    panelRect = { x: 1920 - 181, y: 1080 - 28, width: 181, height: 28 };
    render(<NetWorthTickerPage />);
    fireEvent.click(pill());
    expect(togglePanel).toHaveBeenCalledWith('netWorthPanel', undefined, {
      placement: { x: 1920 - 360, y: 1080 - 28 - 6 - 420 },
    });
  });

  it('drags the panel past a 4px threshold, swallows the click and switches the ticker to Custom', () => {
    const { rerender } = render(<NetWorthTickerPage />);
    rerender(<NetWorthTickerPage />);
    setRect.mockClear();

    fireEvent.pointerDown(pill(), { button: 0, pointerId: 1, clientX: 700, clientY: 70 });
    fireEvent.pointerMove(pill(), { pointerId: 1, clientX: 702, clientY: 71 });
    expect(setRect).not.toHaveBeenCalled();

    fireEvent.pointerMove(pill(), { pointerId: 1, clientX: 760, clientY: 170 });
    expect(setRect).toHaveBeenLastCalledWith({ x: 710, y: 162 });
    fireEvent.pointerUp(pill(), { pointerId: 1 });
    fireEvent.click(pill());

    expect(togglePanel).not.toHaveBeenCalled();
    expect(updateSettings).toHaveBeenCalledWith({ netWorthTickerAnchor: 'custom' });
  });

  it('a press without movement is a click', () => {
    render(<NetWorthTickerPage />);
    fireEvent.pointerDown(pill(), { button: 0, pointerId: 1, clientX: 700, clientY: 70 });
    fireEvent.pointerUp(pill(), { pointerId: 1 });
    fireEvent.click(pill());
    expect(togglePanel).toHaveBeenCalledTimes(1);
    expect(updateSettings).not.toHaveBeenCalled();
  });
});
