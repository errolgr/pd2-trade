// @vitest-environment happy-dom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPriceHistory, type PriceHistoryPoint, type PriceHistoryResponse } from '@/pages/currency/lib/price-api';
import { PriceSparkline, type SparklineQuery } from './PriceSparkline';

vi.mock('@/pages/currency/lib/price-api', () => ({ fetchPriceHistory: vi.fn() }));

// The component caches per query key for the app lifetime, so every test uses its own baseCode.
let seq = 0;
const uniqueCode = () => `item_${++seq}`;

const point = (avgPrice: number, i = 0): PriceHistoryPoint => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
  avgPrice,
  count: 3,
  movingAverage: avgPrice,
});

const response = (prices: number[]): PriceHistoryResponse => ({
  baseCode: 'x',
  dayCount: prices.length,
  data: prices.map(point),
});

function query(overrides: Partial<SparklineQuery> = {}): SparklineQuery {
  return { baseCode: uniqueCode(), isLadder: true, isHardcore: false, ...overrides };
}

beforeEach(() => {
  vi.mocked(fetchPriceHistory).mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('PriceSparkline', () => {
  it('shows a loading line until the history resolves', async () => {
    const { promise, resolve } = Promise.withResolvers<PriceHistoryResponse>();
    vi.mocked(fetchPriceHistory).mockReturnValue(promise);
    render(<PriceSparkline query={query()} />);
    expect(screen.getByText('Loading price history...')).not.toBeNull();

    resolve(response([1, 2]));
    expect(await screen.findByRole('img')).not.toBeNull();
    expect(screen.queryByText('Loading price history...')).toBeNull();
  });

  it('shows a positive change in green with a leading plus', async () => {
    vi.mocked(fetchPriceHistory).mockResolvedValue(response([2, 3, 2.5]));
    render(<PriceSparkline query={query()} />);
    const svg = await screen.findByRole('img');
    expect(svg.getAttribute('aria-label')).toBe('Price over the last 3 days with sales: 2.00 to 2.50 HR');
    const change = screen.getByText('+25.0%');
    expect(change.className).toContain('text-success');
    expect(change.getAttribute('title')).toBe('2.00 → 2.50 HR');
  });

  it('shows a negative change in red without a plus', async () => {
    vi.mocked(fetchPriceHistory).mockResolvedValue(response([4, 3]));
    render(<PriceSparkline query={query()} />);
    const change = await screen.findByText('-25.0%');
    expect(change.className).toContain('text-destructive');
  });

  it('treats a flat price as +0.0% and still draws a line', async () => {
    vi.mocked(fetchPriceHistory).mockResolvedValue(response([5, 5, 5]));
    const { container } = render(<PriceSparkline query={query()} />);
    expect(await screen.findByText('+0.0%')).not.toBeNull();
    const pts = container.querySelector('polyline')!.getAttribute('points')!;
    // flat line (range falls back to 1) sits at the bottom edge, never NaN
    expect(pts).not.toContain('NaN');
    expect(pts.split(' ')).toHaveLength(3);
  });

  it('drops zero-price days before deciding whether there is a trend', async () => {
    vi.mocked(fetchPriceHistory).mockResolvedValue(response([0, 3, 0]));
    render(<PriceSparkline query={query()} />);
    expect(await screen.findByText('Not enough sales in the last 30 days for a trend.')).not.toBeNull();
  });

  it('computes the change from the first and last non-zero days', async () => {
    vi.mocked(fetchPriceHistory).mockResolvedValue(response([0, 2, 4, 0]));
    render(<PriceSparkline query={query()} />);
    expect(await screen.findByText('+100.0%')).not.toBeNull();
  });

  it('shows the empty message when the lookup fails', async () => {
    vi.mocked(fetchPriceHistory).mockResolvedValue(null);
    render(<PriceSparkline query={query()} />);
    expect(await screen.findByText('Not enough sales in the last 30 days for a trend.')).not.toBeNull();
  });

  it('caches a successful lookup across mounts for the same item and mode', async () => {
    vi.mocked(fetchPriceHistory).mockResolvedValue(response([1, 2]));
    const q = query();
    const first = render(<PriceSparkline query={q} />);
    await screen.findByRole('img');
    first.unmount();

    render(<PriceSparkline query={{ ...q }} />);
    // served from cache: no loading line once the cached promise settles, and no second request
    expect(await screen.findByRole('img')).not.toBeNull();
    expect(fetchPriceHistory).toHaveBeenCalledTimes(1);
  });

  it('refetches when the mode changes (cache is per mode)', async () => {
    vi.mocked(fetchPriceHistory).mockResolvedValue(response([1, 2]));
    const q = query();
    const { rerender } = render(<PriceSparkline query={q} />);
    await screen.findByRole('img');
    vi.mocked(fetchPriceHistory).mockResolvedValue(response([2, 1]));
    rerender(<PriceSparkline query={{ ...q, isHardcore: true }} />);
    expect(await screen.findByText('-50.0%')).not.toBeNull();
    expect(fetchPriceHistory).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetchPriceHistory).mock.calls[1][1]).toMatchObject({ isHardcore: true });
  });

  it('retries a failed lookup on the next open', async () => {
    vi.mocked(fetchPriceHistory).mockResolvedValueOnce(null).mockResolvedValueOnce(response([1, 3]));
    const q = query();
    const first = render(<PriceSparkline query={q} />);
    await screen.findByText('Not enough sales in the last 30 days for a trend.');
    first.unmount();

    render(<PriceSparkline query={q} />);
    expect(await screen.findByText('+200.0%')).not.toBeNull();
    expect(fetchPriceHistory).toHaveBeenCalledTimes(2);
  });

  it('asks for the last 30 days ending today in the current season', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-18T12:00:00Z'));
    vi.mocked(fetchPriceHistory).mockResolvedValue(response([1, 2]));
    const q = query({ seasonStart: '2026-04-23' });
    render(<PriceSparkline query={q} />);
    await screen.findByRole('img');
    expect(fetchPriceHistory).toHaveBeenCalledWith(q.baseCode, {
      isLadder: true,
      isHardcore: false,
      startDate: '2026-09-18',
      endDate: undefined,
      limit: 31,
    });
  });

  it('clamps the 30 days to the season start early in a season', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
    vi.mocked(fetchPriceHistory).mockResolvedValue(response([1, 2]));
    render(<PriceSparkline query={query({ seasonStart: '2026-10-23' })} />);
    await screen.findByRole('img');
    expect(vi.mocked(fetchPriceHistory).mock.calls[0][1]).toMatchObject({ startDate: '2026-10-23' });
  });

  it('uses the last 30 days of a past season', async () => {
    vi.mocked(fetchPriceHistory).mockResolvedValue(response([1, 2]));
    render(<PriceSparkline query={query({ seasonStart: '2025-10-25', seasonEnd: '2026-04-22' })} />);
    await screen.findByRole('img');
    expect(vi.mocked(fetchPriceHistory).mock.calls[0][1]).toMatchObject({
      startDate: '2026-03-23',
      endDate: '2026-04-22',
    });
  });
});
