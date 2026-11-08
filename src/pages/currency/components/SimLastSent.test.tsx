// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openUrl } from '@/lib/browser-opener';
import type { SimLastExport } from '@/lib/sim-preferences';
import { SimLastSent } from './SimLastSent';

vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn(async () => {}) }));

const NOW = Date.parse('2026-11-07T12:00:00Z');
const HOUR = 3_600_000;
const last = (sentAgoMs: number): SimLastExport => ({
  character: 'HammerPal',
  goal: 'top_gear',
  items: 3,
  url: 'https://pd2trader.com/sim/plan?export=x',
  sentAt: new Date(NOW - sentAgoMs).toISOString(),
});

afterEach(cleanup);

describe('SimLastSent', () => {
  it('shows goal, character, item count and age, and reopens the planner', () => {
    render(<SimLastSent last={last(2 * HOUR)}
      now={NOW} />);
    expect(screen.getByRole('status', { name: 'Last sent' }).textContent).toMatch(
      /^Last sent: Top Gear · HammerPal · 3 items · .+/,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reopen planner' }));
    expect(openUrl).toHaveBeenCalledWith('https://pd2trader.com/sim/plan?export=x');
  });

  it('hides Reopen planner once the 24 h link has expired', () => {
    render(<SimLastSent last={last(25 * HOUR)}
      now={NOW} />);
    expect(screen.getByRole('status', { name: 'Last sent' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Reopen planner' })).toBeNull();
  });

  it('renders nothing before the first export', () => {
    const { container } = render(<SimLastSent last={undefined} />);
    expect(container.innerHTML).toBe('');
  });
});
