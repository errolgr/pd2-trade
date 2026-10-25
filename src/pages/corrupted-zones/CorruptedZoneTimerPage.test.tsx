// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { usePanel, useOverlay, type OverlayApi, type OverlayRect, type PanelContextValue } from '@/overlay';
import CorruptedZoneTimerPage from './CorruptedZoneTimerPage';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/overlay', () => ({ usePanel: vi.fn(), useOverlay: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => false), invoke: vi.fn() }));

// 4m18s before the 20:00 UTC rotation: Rocky Waste now, Canyon of the Magi next (pd2.tools, 2026-10-25)
const NOW = Date.parse('2026-10-25T19:55:42Z');
/** Rendered content box; the panel is sized to its ceiling: 301 x 28. */
const BOX = { width: 300.2, height: 27.5 };
const GAME = { x: 100, y: 50, width: 1280, height: 720 };

let settings: Partial<ISettings>;
let updateSettings: Mock;
let panelRect: OverlayRect;
let setRect: Mock;

const pill = () => screen.getByRole('button');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  window.innerWidth = 1920;
  window.innerHeight = 1080;
  settings = {};
  updateSettings = vi.fn();
  panelRect = { x: 0, y: 0, width: 360, height: 32 };
  setRect = vi.fn((r: Partial<OverlayRect>) => {
    panelRect = { ...panelRect, ...r };
  });
  vi.mocked(useOptions).mockImplementation(() => ({ settings, updateSettings }) as never);
  vi.mocked(useOverlay).mockImplementation(() => ({ gameRect: GAME }) as unknown as OverlayApi);
  vi.mocked(usePanel).mockImplementation(
    () => ({ rect: panelRect, setRect }) as unknown as PanelContextValue<'corruptedZoneTimer'>,
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(BOX as DOMRect);
  HTMLElement.prototype.setPointerCapture = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CorruptedZoneTimer', () => {
  it('shows the current zone and counts down to the rotation, then shows the next zone', () => {
    render(<CorruptedZoneTimerPage />);
    expect(pill().textContent).toBe('Rocky Waste and the Stony Tomb4:18');
    act(() => vi.advanceTimersByTime(1000));
    expect(pill().textContent).toContain('4:17');
    act(() => vi.advanceTimersByTime(257_000));
    expect(pill().textContent).toBe("Canyon of the Magi and Tal Rasha's Tomb15:00");
  });

  it('names the next zone in the tooltip', () => {
    render(<CorruptedZoneTimerPage />);
    expect(pill().title).toContain("Next: Canyon of the Magi and Tal Rasha's Tomb.");
  });

  it('click lists the next six zones; a second click hides them', () => {
    render(<CorruptedZoneTimerPage />);
    fireEvent.click(pill());
    expect(pill().getAttribute('aria-expanded')).toBe('true');
    const rows = within(screen.getByRole('list', { name: 'Upcoming corrupted zones' })).getAllByRole('listitem');
    expect(rows.map((row) => row.firstElementChild!.textContent)).toEqual([
      "Canyon of the Magi and Tal Rasha's Tomb",
      'Spider Forest, Arachnid Lair, and Spider Cavern',
      'Lower Kurast and the Kurast Sewers',
      'Durance of Hate',
      'Chaos Sanctuary',
      'Glacial Trail, Drifter Cavern, and Frozen Tundra',
    ]);
    expect(rows[0].lastElementChild!.textContent).toMatch(/ · in 5m$/);
    expect(rows[5].lastElementChild!.textContent).toMatch(/ · in 80m$/);
    fireEvent.click(pill());
    expect(screen.queryByRole('list')).toBeNull();
  });

  it.each([
    [undefined, { x: 100 + 1280 - 301 - 12, y: 62 }], // default: top right
    ['top-left', { x: 112, y: 62 }],
    ['bottom-left', { x: 112, y: 50 + 720 - 28 - 12 }],
  ] as const)('anchors %s on the game, sized to its content', (anchor, position) => {
    settings = { corruptedZoneTimerAnchor: anchor };
    render(<CorruptedZoneTimerPage />);
    expect(setRect).toHaveBeenLastCalledWith({ ...position, width: 301, height: 28 });
  });

  it('keeps a custom timer where it is, inside the overlay', () => {
    settings = { corruptedZoneTimerAnchor: 'custom' };
    panelRect = { x: 5000, y: 10, width: 360, height: 32 };
    render(<CorruptedZoneTimerPage />);
    expect(setRect.mock.calls).toEqual([[{ x: 1920 - 301, y: 10, width: 301, height: 28 }]]);
  });

  it('a drag moves it, does not expand it and switches it to Custom', () => {
    const { rerender } = render(<CorruptedZoneTimerPage />);
    rerender(<CorruptedZoneTimerPage />); // pick up the placed rect (x 1067, y 62) as the drag origin
    setRect.mockClear();
    fireEvent.pointerDown(pill(), { button: 0, pointerId: 1, clientX: 1200, clientY: 70 });
    fireEvent.pointerMove(pill(), { pointerId: 1, clientX: 1100, clientY: 170 });
    expect(setRect).toHaveBeenLastCalledWith({ x: 967, y: 162 });
    fireEvent.pointerUp(pill(), { pointerId: 1 });
    fireEvent.click(pill());
    expect(screen.queryByRole('list')).toBeNull();
    expect(updateSettings).toHaveBeenCalledWith({ corruptedZoneTimerAnchor: 'custom' });
  });

  it('applies the opacity setting', () => {
    settings = { corruptedZoneTimerOpacity: 40 };
    render(<CorruptedZoneTimerPage />);
    expect(pill().parentElement!.style.opacity).toBe('0.4');
  });
});
