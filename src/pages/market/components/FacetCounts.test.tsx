// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PriceHistogram, SocketChips } from './FacetCounts';

afterEach(cleanup);

describe('SocketChips', () => {
  const counts = new Map([
    [0, 5],
    [1, 0],
    [2, 3],
  ]);

  it('picks min = max = n (0 = unsocketed), clears on the active chip, disables empty ones', () => {
    const onPick = vi.fn();
    const { rerender } = render(<SocketChips counts={counts}
      min={undefined}
      max={undefined}
      onPick={onPick} />);
    const chips = screen.getAllByRole('button');
    fireEvent.click(chips[2]);
    expect(onPick).toHaveBeenLastCalledWith(2, 2);
    fireEvent.click(chips[0]);
    expect(onPick).toHaveBeenLastCalledWith(undefined, 0);
    expect(chips[1]).toHaveProperty('disabled', true);

    rerender(<SocketChips counts={counts}
      min={2}
      max={2}
      onPick={onPick} />);
    expect(screen.getAllByRole('button')[2].getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getAllByRole('button')[2]);
    expect(onPick).toHaveBeenLastCalledWith(undefined, undefined);
  });
});

describe('PriceHistogram', () => {
  const buckets = [
    { from: 0, to: 0.5, count: 4 },
    { from: 0.5, to: 1, count: 0 },
    { from: 1, to: null, count: 2 },
  ];

  it('sets the HR range to a bucket, open-ended for the last; the selected bucket clears it', () => {
    const onPick = vi.fn();
    const { rerender } = render(
      <PriceHistogram buckets={buckets}
        hrMin={undefined}
        hrMax={undefined}
        onPick={onPick} />,
    );
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onPick).toHaveBeenLastCalledWith(0, 0.5);
    fireEvent.click(screen.getAllByRole('button')[2]);
    expect(onPick).toHaveBeenLastCalledWith(1, undefined);

    rerender(<PriceHistogram buckets={buckets}
      hrMin={1}
      hrMax={undefined}
      onPick={onPick} />);
    fireEvent.click(screen.getAllByRole('button')[2]);
    expect(onPick).toHaveBeenLastCalledWith(undefined, undefined);
  });
});
