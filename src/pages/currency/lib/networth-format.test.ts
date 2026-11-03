import { describe, expect, it, vi } from 'vitest';
import { NET_WORTH_CATEGORIES } from '@/lib/networth-api';
import {
  CATEGORY_COLORS,
  categoryLabel,
  deltaClass,
  deltaPillClass,
  formatDuration,
  formatSignedHr,
  formatUnitPrice,
} from './networth-format';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));

describe('formatSignedHr', () => {
  it('signs gains, losses (typographic minus) and flat values', () => {
    expect(formatSignedHr(1.2)).toBe('+1.20 HR');
    expect(formatSignedHr(-0.4)).toBe('−0.40 HR');
    expect(formatSignedHr(0)).toBe('±0.00 HR');
  });

  it('keeps the sign of tiny values that round to zero', () => {
    expect(formatSignedHr(0.001)).toBe('+0.00 HR');
    expect(formatSignedHr(-0.001)).toBe('−0.00 HR');
  });
});

describe('formatUnitPrice', () => {
  it('shows a dash for unpriced items', () => {
    expect(formatUnitPrice(null)).toBe('—');
  });

  it('keeps four decimals below 0.01 HR so low runes do not read as free', () => {
    expect(formatUnitPrice(0.0012)).toBe('0.0012');
    expect(formatUnitPrice(0.00999)).toBe('0.0100');
  });

  it('uses two decimals from 0.01 HR up and for zero', () => {
    expect(formatUnitPrice(0.01)).toBe('0.01');
    expect(formatUnitPrice(2.5)).toBe('2.50');
    expect(formatUnitPrice(0)).toBe('0.00');
  });
});

describe('formatDuration', () => {
  it('shows minutes only under an hour', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(59)).toBe('59m');
  });

  it('shows hours with zero-padded minutes from one hour', () => {
    expect(formatDuration(60)).toBe('1h00');
    expect(formatDuration(65)).toBe('1h05');
    expect(formatDuration(150)).toBe('2h30');
  });

  it('rounds fractional minutes', () => {
    expect(formatDuration(12.4)).toBe('12m');
    expect(formatDuration(61.6)).toBe('1h02');
  });
});

describe('deltaClass / deltaPillClass', () => {
  it('treats null, undefined and zero as flat', () => {
    for (const v of [null, undefined, 0]) {
      expect(deltaClass(v)).toBe('text-muted-foreground');
      expect(deltaPillClass(v)).toBe('bg-muted/60 text-muted-foreground');
    }
  });

  it('colours gains as success and losses as destructive', () => {
    expect(deltaClass(0.5)).toBe('text-success');
    expect(deltaClass(-0.5)).toBe('text-destructive');
    expect(deltaPillClass(2)).toContain('text-success');
    expect(deltaPillClass(-2)).toContain('text-destructive');
  });
});

describe('category tables', () => {
  it('label and colour every net worth category the API can return', () => {
    for (const c of NET_WORTH_CATEGORIES) {
      expect(categoryLabel(c), c).toBeTruthy();
      expect(CATEGORY_COLORS[c], c).toMatch(/^var\(--/);
    }
  });
});
