import { describe, expect, it } from 'vitest';
import { basisLabel, priceWindowNote, windowLabel } from './price-window';

describe('windowLabel', () => {
  it.each([
    [24, '24h'],
    [72, '3d'],
    [168, '7d'],
    [720, '30d'],
    [12, '12h'],
    [36, '36h'], // > 24 but not whole days
    [48, '2d'],
  ])('%i hours -> %s', (hours, label) => {
    expect(windowLabel(hours)).toBe(label);
  });
});

describe('basisLabel', () => {
  it.each([
    ['7d', '7-day avg'],
    ['30d', '30-day avg'],
    ['24h', '24-hour avg'],
    ['season', 'season avg'],
    ['', 'season avg'],
    ['7dx', 'season avg'],
  ])('%j -> %s', (window, label) => {
    expect(basisLabel(window)).toBe(label);
  });

  it('round-trips with windowLabel for every option', () => {
    expect([24, 72, 168, 720].map((h) => basisLabel(windowLabel(h)))).toEqual([
      '24-hour avg',
      '3-day avg',
      '7-day avg',
      '30-day avg',
    ]);
  });
});

describe('priceWindowNote', () => {
  // During S13 (Betrayal); previous season is S12.
  const inS13 = new Date('2026-06-01T12:00:00Z');

  it('returns null when the server did not report a window (older servers)', () => {
    expect(priceWindowNote(undefined, '7d', inS13)).toBeNull();
    expect(priceWindowNote('', '7d', inS13)).toBeNull();
  });

  it('returns null when the requested window was used', () => {
    expect(priceWindowNote('7d', '7d', inS13)).toBeNull();
  });

  it('labels the 30-day fallback, phrasing a 7d request as "this week"', () => {
    expect(priceWindowNote('30d', '7d', inS13)).toEqual({
      label: '30d',
      title: 'Not enough sales this week — based on the last 30 days',
    });
  });

  it('phrases non-7d requests with the requested window', () => {
    expect(priceWindowNote('season', '24h', inS13)).toEqual({
      label: 'season',
      title: 'Not enough sales in the last 24h — based on the whole season',
    });
  });

  it('names the previous season tag for the lastSeason fallback', () => {
    expect(priceWindowNote('lastSeason', '7d', inS13)).toEqual({
      label: 'S12',
      title: 'Not enough sales this week — based on the last 30 days of S12',
    });
  });

  it('moves the lastSeason tag forward when a new season starts', () => {
    expect(priceWindowNote('lastSeason', '7d', new Date('2026-11-01T12:00:00Z'))?.label).toBe('S13');
  });

  it('falls back to "last season" when there is no earlier season in the list', () => {
    // S12 is the oldest bundled season.
    expect(priceWindowNote('lastSeason', '7d', new Date('2026-01-15T12:00:00Z'))).toEqual({
      label: 'last season',
      title: 'Not enough sales this week — based on the last 30 days of last season',
    });
  });

  it('passes through unknown fallback windows', () => {
    expect(priceWindowNote('90d', '7d', inS13)).toEqual({
      label: '90d',
      title: 'Not enough sales this week — based on the last 90d',
    });
  });
});
