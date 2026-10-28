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
/** Content box while the schedule is open: 400 x 180. */
const OPEN_BOX = { width: 399.5, height: 179.2 };
/** Vertical layout: the narrow column is 176 x 60, and 176 x 400 while the schedule is open. */
const VERTICAL_BOX = { width: 175.6, height: 59.2 };
const VERTICAL_OPEN_BOX = { width: 175.6, height: 399.4 };
const GAME = { x: 100, y: 50, width: 1280, height: 720 };

let settings: Partial<ISettings>;
let updateSettings: Mock;
let panelRect: OverlayRect;
let setRect: Mock;
let resize: () => void;

/** The pill (the schedule's lock toggle is a button too). */
const pill = () => document.querySelector<HTMLButtonElement>('button[aria-expanded]')!;
/** Click the pill, then let the ResizeObserver report the new content box. */
const clickPill = () => {
  fireEvent.click(pill());
  act(() => resize());
};

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
  // The timer's box is OPEN_BOX while it holds the schedule list; everything else (the pill) is BOX
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return (this.querySelector('ol') ? OPEN_BOX : BOX) as DOMRect;
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  HTMLElement.prototype.setPointerCapture = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
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
    expect(pill().title).toMatch(/Click for the schedule, drag to move\.$/);
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
    expect(rows[5].lastElementChild!.textContent).toMatch(/ · in 1h 20m$/);
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

  it.each([
    ['a bottom anchor (lower half) opens upwards', 'bottom-left', 730, 730 + 28 - 180],
    ['a top anchor (upper half) opens downwards', 'top-left', 62, 62],
  ] as const)('%s, the pill staying on its anchor', (_case, anchor, pillY, openY) => {
    settings = { corruptedZoneTimerAnchor: anchor };
    const { rerender } = render(<CorruptedZoneTimerPage />);
    expect(setRect).toHaveBeenLastCalledWith({ x: 112, y: pillY, width: 301, height: 28 });
    rerender(<CorruptedZoneTimerPage />); // pick up the placed rect
    clickPill();
    expect(setRect).toHaveBeenLastCalledWith({ x: 112, y: openY, width: 400, height: 180 });
    clickPill();
    expect(setRect).toHaveBeenLastCalledWith({ x: 112, y: pillY, width: 301, height: 28 });
  });

  it.each([
    ['in the lower half opens upwards', 900, 900 + 28 - 180],
    ['in the upper half opens downwards', 100, 100],
  ])('a custom timer %s and closes back onto the pill', (_case, y, openY) => {
    settings = { corruptedZoneTimerAnchor: 'custom' };
    panelRect = { x: 40, y, width: 301, height: 28 };
    render(<CorruptedZoneTimerPage />);
    expect(setRect).not.toHaveBeenCalled();
    clickPill();
    expect(setRect).toHaveBeenLastCalledWith({ x: 40, y: openY, width: 400, height: 180 });
    clickPill();
    expect(setRect).toHaveBeenLastCalledWith({ x: 40, y, width: 301, height: 28 });
  });

  it('restores a custom timer saved with its list open upwards onto its pill', () => {
    settings = { corruptedZoneTimerAnchor: 'custom' };
    panelRect = { x: 40, y: 748, width: 400, height: 180 }; // pill at the bottom, y 900
    render(<CorruptedZoneTimerPage />);
    expect(setRect).toHaveBeenLastCalledWith({ x: 40, y: 900, width: 301, height: 28 });
  });

  it('dragging an open bottom-anchored timer to Custom keeps the list above, so closing keeps the pill put', () => {
    settings = { corruptedZoneTimerAnchor: 'bottom-left' };
    const { rerender } = render(<CorruptedZoneTimerPage />);
    clickPill();
    rerender(<CorruptedZoneTimerPage />); // pick up the open rect (y 578, pill at 730) as the drag origin
    fireEvent.pointerDown(pill(), { button: 0, pointerId: 1, clientX: 150, clientY: 740 });
    fireEvent.pointerMove(pill(), { pointerId: 1, clientX: 150, clientY: 640 });
    fireEvent.pointerUp(pill(), { pointerId: 1 });
    expect(updateSettings).toHaveBeenCalledWith({ corruptedZoneTimerAnchor: 'custom' });
    settings = { corruptedZoneTimerAnchor: 'custom' };
    rerender(<CorruptedZoneTimerPage />);
    fireEvent.click(pill()); // the click after a drag is swallowed
    clickPill();
    expect(setRect).toHaveBeenLastCalledWith({ x: 112, y: 478 + 180 - 28, width: 301, height: 28 });
  });

  describe('only followed zones', () => {
    beforeEach(() => {
      settings = { corruptedZoneTimerZones: 'followed', corruptedZoneFollowed: ['Chaos Sanctuary'] };
    });

    it('counts down to the next followed zone, then to its end once it is corrupted', () => {
      render(<CorruptedZoneTimerPage />);
      expect(pill().textContent).toBe('Chaos Sanctuaryin 1:04:18');
      expect(pill().title).toMatch(/^Next followed zone: /);
      act(() => vi.advanceTimersByTime(3_858_000)); // 21:00, Chaos Sanctuary's slot
      expect(pill().textContent).toBe('Chaos Sanctuary15:00');
    });

    it('lists only followed zones', () => {
      render(<CorruptedZoneTimerPage />);
      fireEvent.click(pill());
      const rows = within(screen.getByRole('list', { name: 'Upcoming corrupted zones' })).getAllByRole('listitem');
      expect(rows.length).toBeGreaterThan(0);
      expect(new Set(rows.map((row) => row.firstElementChild!.textContent))).toEqual(new Set(['Chaos Sanctuary']));
    });

    it('shows every zone while none is followed', () => {
      settings = { corruptedZoneTimerZones: 'followed', corruptedZoneFollowed: [] };
      render(<CorruptedZoneTimerPage />);
      expect(pill().textContent).toBe('Rocky Waste and the Stony Tomb4:18');
    });
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

  it('a locked timer does not move when dragged, and a click still opens the schedule', () => {
    settings = { corruptedZoneTimerLocked: true };
    const { rerender } = render(<CorruptedZoneTimerPage />);
    rerender(<CorruptedZoneTimerPage />);
    setRect.mockClear();
    expect(pill().title).toMatch(/Click for the schedule\.$/);
    fireEvent.pointerDown(pill(), { button: 0, pointerId: 1, clientX: 1200, clientY: 70 });
    fireEvent.pointerMove(pill(), { pointerId: 1, clientX: 1100, clientY: 170 });
    fireEvent.pointerUp(pill(), { pointerId: 1 });
    expect(setRect).not.toHaveBeenCalled();
    expect(updateSettings).not.toHaveBeenCalled();
    fireEvent.click(pill());
    expect(screen.getByRole('list', { name: 'Upcoming corrupted zones' })).toBeTruthy();
  });

  it.each([
    [false, true],
    [true, false],
  ])('the lock under the schedule (pressed: %s) toggles the setting', (locked, next) => {
    settings = { corruptedZoneTimerLocked: locked };
    render(<CorruptedZoneTimerPage />);
    fireEvent.click(pill());
    const lock = screen.getByRole('button', { name: 'Lock position' });
    expect(lock.getAttribute('aria-pressed')).toBe(String(locked));
    fireEvent.click(lock);
    expect(updateSettings).toHaveBeenCalledExactlyOnceWith({ corruptedZoneTimerLocked: next });
    expect(pill().getAttribute('aria-expanded')).toBe('true');
  });

  describe('vertical layout', () => {
    beforeEach(() => {
      vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(function (this: HTMLElement) {
        return (this.querySelector('ol') ? VERTICAL_OPEN_BOX : VERTICAL_BOX) as DOMRect;
      });
    });

    it('stacks the pill and the schedule in one narrow column, each zone over its time', () => {
      settings = { corruptedZoneTimerLayout: 'vertical' };
      render(<CorruptedZoneTimerPage />);
      fireEvent.click(pill());
      const list = screen.getByRole('list', { name: 'Upcoming corrupted zones' });
      expect(pill().className).toContain('flex-col');
      expect(pill().className).toContain('w-44');
      expect(list.parentElement!.className).toContain('w-44');
      const row = within(list).getAllByRole('listitem')[0];
      expect(row.className).toContain('flex-col');
      expect(row.firstElementChild!.textContent).toBe("Canyon of the Magi and Tal Rasha's Tomb");
      expect(row.lastElementChild!.textContent).toMatch(/ · in 5m$/);
    });

    it.each([
      ['at the left edge in the lower half opens upwards', 0, 900, 900 + 60 - 400],
      ['at the right edge in the upper half opens downwards', 1920 - 176, 100, 100],
    ])('a custom timer %s, keeping its edge and closing back onto the pill', (_case, x, y, openY) => {
      settings = { corruptedZoneTimerLayout: 'vertical', corruptedZoneTimerAnchor: 'custom' };
      panelRect = { x, y, width: 176, height: 60 };
      render(<CorruptedZoneTimerPage />);
      expect(setRect).not.toHaveBeenCalled();
      clickPill();
      expect(setRect).toHaveBeenLastCalledWith({ x, y: openY, width: 176, height: 400 });
      clickPill();
      expect(setRect).toHaveBeenLastCalledWith({ x, y, width: 176, height: 60 });
    });

    it('anchors on the game sized to the column', () => {
      settings = { corruptedZoneTimerLayout: 'vertical' };
      render(<CorruptedZoneTimerPage />);
      expect(setRect).toHaveBeenLastCalledWith({ x: 100 + 1280 - 176 - 12, y: 62, width: 176, height: 60 });
    });
  });

  it('applies the opacity setting', () => {
    settings = { corruptedZoneTimerOpacity: 40 };
    render(<CorruptedZoneTimerPage />);
    expect(pill().parentElement!.style.opacity).toBe('0.4');
  });
});
