// @vitest-environment happy-dom
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { HrRange, PriceBucket } from '../lib/facets';
import { PriceControl } from './PriceControl';

afterEach(cleanup);

const buckets: PriceBucket[] = [
  { from: 0, to: 0.5, count: 4 },
  { from: 0.5, to: 1, count: 812 },
  { from: 1, to: 2, count: 0 },
  { from: 2, to: null, count: 2 },
];

/** The price control over filter state, like the sidebar. */
function Price({
  initial = {},
  onChange,
  facet = buckets,
}: {
  initial?: HrRange;
  onChange?: (r: HrRange) => void;
  facet?: PriceBucket[];
}) {
  const [value, setValue] = useState(initial);
  return (
    <TooltipProvider delayDuration={0}>
      <PriceControl
        label="HR price"
        buckets={facet}
        value={value}
        onChange={(r) => {
          onChange?.(r);
          setValue(r);
        }}
      />
    </TooltipProvider>
  );
}

const bars = () => screen.getByRole('group').querySelectorAll<HTMLElement>('[data-pick-index]');
const bar = (i: number) => bars()[i];
const lit = () => [...bars()].flatMap((b, i) => (b.getAttribute('aria-pressed') === 'true' ? [i] : [])).join(',');
const input = (which: 'min' | 'max') =>
  screen.getByRole('spinbutton', { name: `HR price ${which}` }) as HTMLInputElement;

describe('PriceControl bars', () => {
  it('a bar sets the HR range to its bucket, max exclusive; a second spans the range; the first again clears', () => {
    const onChange = vi.fn();
    render(<Price onChange={onChange} />);
    fireEvent.click(bar(1));
    expect(onChange).toHaveBeenLastCalledWith({ hrMin: 0.5, hrMax: 1, hrMaxExclusive: true });
    expect(input('min').value).toBe('0.5');
    expect(input('max').value).toBe('1');
    expect(lit()).toBe('1');

    fireEvent.click(bar(1));
    expect(onChange).toHaveBeenLastCalledWith({ hrMin: undefined, hrMax: undefined, hrMaxExclusive: undefined });
    expect(lit()).toBe('');

    // Second bar in either order: the outer edges
    fireEvent.click(bar(2));
    fireEvent.click(bar(0));
    expect(onChange).toHaveBeenLastCalledWith({ hrMin: 0, hrMax: 2, hrMaxExclusive: true });
    expect(lit()).toBe('0,1,2');

    // Range → start over with the bar
    fireEvent.click(bar(1));
    expect(onChange).toHaveBeenLastCalledWith({ hrMin: 0.5, hrMax: 1, hrMaxExclusive: true });
  });

  it('the open last bucket sets a min and no max', () => {
    const onChange = vi.fn();
    render(<Price onChange={onChange} />);
    fireEvent.click(bar(3));
    expect(onChange).toHaveBeenLastCalledWith({ hrMin: 2, hrMax: undefined, hrMaxExclusive: undefined });
    fireEvent.click(bar(1));
    expect(onChange).toHaveBeenLastCalledWith({ hrMin: 0.5, hrMax: undefined, hrMaxExclusive: undefined });
  });

  it('names each bar with its range and exact count, and the group with the selection', () => {
    render(<Price />);
    expect(bar(1).getAttribute('aria-label')).toBe('0.5–1 HR · 812');
    expect(bar(3).getAttribute('aria-label')).toBe('2+ HR · 2');
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe('Listings by HR price: any price');
    fireEvent.click(bar(0));
    fireEvent.click(bar(1));
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe('Listings by HR price: 0–1 HR');
  });

  it('dims buckets with no listings, still pickable', () => {
    const onChange = vi.fn();
    render(<Price onChange={onChange} />);
    expect(bar(2).querySelector('[data-bar]')?.className).toMatch(/opacity-30/);
    expect(bar(1).querySelector('[data-bar]')?.className).not.toMatch(/opacity-30/);
    fireEvent.click(bar(2));
    expect(onChange).toHaveBeenLastCalledWith({ hrMin: 1, hrMax: 2, hrMaxExclusive: true });
  });

  it('keyboard: arrows move between bars, Enter picks, Escape clears', () => {
    const onChange = vi.fn();
    render(<Price onChange={onChange} />);
    act(() => bar(0).focus());
    fireEvent.keyDown(bar(0), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(bar(1));
    fireEvent.keyDown(bar(1), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith({ hrMin: 0.5, hrMax: 1, hrMaxExclusive: true });
    fireEvent.keyDown(bar(1), { key: 'Escape' });
    expect(onChange).toHaveBeenLastCalledWith({ hrMin: undefined, hrMax: undefined, hrMaxExclusive: undefined });
  });
});

describe('PriceControl inputs', () => {
  it('a typed max is inclusive, even over a picked bucket; typing a min keeps a bucket max exclusive', () => {
    const onChange = vi.fn();
    render(<Price onChange={onChange} />);
    fireEvent.click(bar(1));
    fireEvent.change(input('min'), { target: { value: '0.6' } });
    expect(onChange).toHaveBeenLastCalledWith({ hrMin: 0.6, hrMax: 1, hrMaxExclusive: true });
    fireEvent.change(input('max'), { target: { value: '0.8' } });
    expect(onChange).toHaveBeenLastCalledWith({ hrMin: 0.6, hrMax: 0.8, hrMaxExclusive: undefined });
  });

  it('a typed value inside a bucket lights that bar up to it, with a marker there', () => {
    render(<Price initial={{ hrMax: 0.7 }} />);
    expect(lit()).toBe('0,1');
    expect(bar(0).querySelector<HTMLElement>('[data-bar-light]')?.style.width).toBe('100%');
    const partial = bar(1).querySelector<HTMLElement>('[data-bar-light]')!;
    expect(parseFloat(partial.style.width)).toBeCloseTo(40);
    const marker = bar(1).querySelector<HTMLElement>('[data-bar-marker]')!.style.left;
    expect(Number(marker.match(/\* ([\d.]+)\)$/)?.[1])).toBeCloseTo(0.4);
    expect(bar(0).querySelector('[data-bar-marker]')).toBeNull();
  });

  it('a typed range inside one bar acts as that bar picked: another bar spans from its edge, it again clears', () => {
    const onChange = vi.fn();
    const { unmount } = render(<Price initial={{ hrMin: 0.6, hrMax: 0.8 }}
      onChange={onChange} />);
    fireEvent.click(bar(3));
    expect(onChange).toHaveBeenLastCalledWith({ hrMin: 0.5, hrMax: undefined, hrMaxExclusive: undefined });
    unmount();

    render(<Price initial={{ hrMin: 0.6, hrMax: 0.8 }}
      onChange={onChange} />);
    fireEvent.click(bar(1));
    expect(onChange).toHaveBeenLastCalledWith({ hrMin: undefined, hrMax: undefined, hrMaxExclusive: undefined });
  });

  it('✕ shows only with a range set and clears it', () => {
    const onChange = vi.fn();
    render(<Price onChange={onChange} />);
    expect(screen.queryByRole('button', { name: 'Clear HR price' })).toBeNull();
    fireEvent.change(input('min'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear HR price' }));
    expect(onChange).toHaveBeenLastCalledWith({ hrMin: undefined, hrMax: undefined, hrMaxExclusive: undefined });
    expect(input('min').value).toBe('');
  });

  it('without price facets (or with no listings in them) only the inputs show', () => {
    render(<Price facet={buckets.map((b) => ({ ...b, count: 0 }))} />);
    expect(screen.queryByRole('group')).toBeNull();
    expect(input('max')).toBeTruthy();
  });
});
