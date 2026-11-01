// @vitest-environment happy-dom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SocketChips } from './FacetCounts';
import { TriField } from './controls';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const withTooltips = (ui: React.ReactElement) => <TooltipProvider delayDuration={0}>{ui}</TooltipProvider>;

/** Socket chips over filter state, like the sidebar: every pick applies at once. */
function Sockets({
  counts = new Map<number, number>(),
  initial = {},
  onPick,
}: {
  counts?: Map<number, number>;
  initial?: { min?: number; max?: number };
  onPick?: (min: number | undefined, max: number | undefined) => void;
}) {
  const [range, setRange] = useState(initial);
  return (
    <SocketChips
      counts={counts}
      min={range.min}
      max={range.max}
      onPick={(min, max) => {
        onPick?.(min, max);
        setRange({ min, max });
      }}
    />
  );
}

const chip = (n: number) => screen.getAllByRole('button')[n];
const pressed = () =>
  screen
    .getAllByRole('button')
    .flatMap((b, n) => (b.getAttribute('aria-pressed') === 'true' ? [n] : []))
    .join(',');
const group = () => screen.getByRole('group');

describe('SocketChips: calendar-style picking', () => {
  it('one chip is exactly that many sockets; a second spans the range, in either order', () => {
    const onPick = vi.fn();
    render(withTooltips(<Sockets onPick={onPick} />));
    expect(group().getAttribute('aria-label')).toBe('Any sockets');

    fireEvent.click(chip(3));
    expect(onPick).toHaveBeenLastCalledWith(3, 3);
    expect(pressed()).toBe('3');
    expect(group().getAttribute('aria-label')).toBe('Exactly 3 sockets');

    fireEvent.click(chip(5));
    expect(onPick).toHaveBeenLastCalledWith(3, 5);
    expect(pressed()).toBe('3,4,5');
    expect(group().getAttribute('aria-label')).toBe('3 to 5 sockets');

    // Range → start over with the chip; then a lower chip spans backwards
    fireEvent.click(chip(4));
    expect(onPick).toHaveBeenLastCalledWith(4, 4);
    fireEvent.click(chip(1));
    expect(onPick).toHaveBeenLastCalledWith(1, 4);
    expect(pressed()).toBe('1,2,3,4');
  });

  it('the picked chip again clears; 0 is exactly unsocketed', () => {
    const onPick = vi.fn();
    render(withTooltips(<Sockets onPick={onPick} />));
    fireEvent.click(chip(0));
    expect(onPick).toHaveBeenLastCalledWith(0, 0);
    expect(group().getAttribute('aria-label')).toBe('Exactly 0 sockets');
    fireEvent.click(chip(0));
    expect(onPick).toHaveBeenLastCalledWith(undefined, undefined);
    expect(pressed()).toBe('');
  });

  it('follows typed bounds: one bound lights up to 6 / from 0, and a pick then starts over', () => {
    const onPick = vi.fn();
    const { rerender } = render(
      withTooltips(<SocketChips counts={new Map()}
        min={2}
        max={undefined}
        onPick={onPick} />),
    );
    expect(pressed()).toBe('2,3,4,5,6');
    expect(group().getAttribute('aria-label')).toBe('2 to 6 sockets');
    fireEvent.click(chip(4));
    expect(onPick).toHaveBeenLastCalledWith(4, 4);

    rerender(withTooltips(<SocketChips counts={new Map()}
      min={undefined}
      max={1}
      onPick={onPick} />));
    expect(pressed()).toBe('0,1');

    // A typed exact count behaves like a picked chip: another chip spans the range
    rerender(withTooltips(<SocketChips counts={new Map()}
      min={4}
      max={4}
      onPick={onPick} />));
    fireEvent.click(chip(6));
    expect(onPick).toHaveBeenLastCalledWith(4, 6);
  });

  it('a drag across chips picks the range in one move', () => {
    const onPick = vi.fn();
    render(withTooltips(<Sockets onPick={onPick} />));
    vi.spyOn(document, 'elementFromPoint').mockImplementation((x) => chip(x));
    fireEvent.pointerDown(chip(1), { button: 0, pointerId: 1 });
    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 2 }));
      window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 4 }));
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 4 }));
    });
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenLastCalledWith(1, 4);
    expect(pressed()).toBe('1,2,3,4');
  });
});

describe('SocketChips: keyboard', () => {
  it('is one tab stop; arrows move, Enter / Space pick like a click, Escape clears', () => {
    const onPick = vi.fn();
    render(withTooltips(<Sockets onPick={onPick} />));
    const tabStops = () => screen.getAllByRole('button').filter((b) => b.tabIndex === 0);
    expect(tabStops()).toEqual([chip(0)]);

    chip(0).focus();
    fireEvent.keyDown(chip(0), { key: 'ArrowRight' });
    fireEvent.keyDown(chip(1), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(chip(2));
    expect(tabStops()).toEqual([chip(2)]);

    fireEvent.keyDown(chip(2), { key: 'Enter' });
    expect(onPick).toHaveBeenLastCalledWith(2, 2);
    fireEvent.keyDown(chip(2), { key: 'End' });
    expect(document.activeElement).toBe(chip(6));
    fireEvent.keyDown(chip(6), { key: 'ArrowLeft' });
    fireEvent.keyDown(chip(5), { key: ' ' });
    expect(onPick).toHaveBeenLastCalledWith(2, 5);

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    const outside = vi.fn();
    document.addEventListener('keydown', outside);
    act(() => {
      chip(5).dispatchEvent(escape);
    });
    document.removeEventListener('keydown', outside);
    expect(onPick).toHaveBeenLastCalledWith(undefined, undefined);
    expect(escape.defaultPrevented).toBe(true);
    // It cleared something, so it doesn't also close the market window
    expect(outside).not.toHaveBeenCalled();
    expect(pressed()).toBe('');
  });
});

describe('SocketChips: facet counts', () => {
  const counts = new Map([
    [0, 5],
    [1, 66],
    [2, 33],
    [3, 0],
    [4, 0],
    [5, 0],
    [6, 0],
  ]);

  it('dims chips that find nothing (still pickable), with hairlines as a share of the busiest', () => {
    const onPick = vi.fn();
    render(withTooltips(<Sockets counts={counts}
      onPick={onPick} />));
    expect(chip(3).className).toMatch(/opacity-30/);
    expect(chip(3).className).toMatch(/border-dashed/);
    expect(chip(1).className).not.toMatch(/opacity-30/);
    const hairline = (n: number) => chip(n).querySelector<HTMLElement>('[data-facet-hairline]');
    expect(hairline(1)?.style.width).toBe('calc((100% - 6px) * 1)');
    expect(hairline(2)?.style.width).toBe('calc((100% - 6px) * 0.5)');
    expect(hairline(3)).toBeNull();

    fireEvent.click(chip(3));
    expect(onPick).toHaveBeenLastCalledWith(3, 3);
    // Picked, it reads normally
    expect(chip(3).className).not.toMatch(/opacity-30/);
  });

  it('names each chip with its exact count', () => {
    render(withTooltips(<Sockets counts={counts} />));
    expect(chip(1).getAttribute('aria-label')).toBe('1 socket · 66');
    expect(chip(3).getAttribute('aria-label')).toBe('3 sockets · 0');
  });

  it('without facets: plain chips, nothing dimmed, no hairlines', () => {
    render(withTooltips(<Sockets />));
    expect(chip(3).className).not.toMatch(/opacity-30/);
    expect(chip(1).getAttribute('aria-label')).toBe('1 socket');
    expect(document.querySelector('[data-facet-hairline]')).toBeNull();
  });
});

describe('TriField facets', () => {
  const tri = (counts?: { yes?: number; no?: number }) =>
    render(withTooltips(<TriField label="Corrupted"
      value="any"
      counts={counts}
      onChange={() => {}} />));
  const option = (name: RegExp) => screen.getByRole('radio', { name });

  it('hairlines Yes and No as their share of both, dims one that finds nothing', () => {
    tri({ yes: 30, no: 10 });
    const yes = option(/^Yes/);
    expect(yes.getAttribute('aria-label')).toBe('Yes · 30');
    expect(yes.querySelector<HTMLElement>('[data-facet-hairline]')?.style.width).toBe('calc((100% - 12px) * 0.75)');
    cleanup();

    tri({ yes: 0, no: 12 });
    expect(option(/^Yes/).className).toMatch(/opacity-30/);
    expect(option(/^No/).className).not.toMatch(/opacity-30/);
  });

  it('without counts: no hairlines, nothing dimmed', () => {
    tri({ yes: undefined, no: undefined });
    expect(document.querySelector('[data-facet-hairline]')).toBeNull();
    expect(option(/^Yes/).className).not.toMatch(/opacity-30/);
  });
});
