import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isUserOnlineIngame, ONLINE_THRESHOLD_MS } from './user-online-status';

const NOW = new Date('2026-10-18T12:00:00.000Z').getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('isUserOnlineIngame', () => {
  it('is online when seen in game less than five minutes ago', () => {
    expect(isUserOnlineIngame(ago(0))).toBe(true);
    expect(isUserOnlineIngame(ago(ONLINE_THRESHOLD_MS - 1))).toBe(true);
  });

  it('is offline at exactly five minutes and beyond', () => {
    expect(ONLINE_THRESHOLD_MS).toBe(5 * 60 * 1000);
    expect(isUserOnlineIngame(ago(ONLINE_THRESHOLD_MS))).toBe(false);
    expect(isUserOnlineIngame(ago(60 * 60 * 1000))).toBe(false);
  });

  it.each([undefined, '', 'not a date', '1970-01-01T00:00:00.000Z', '1960-01-01T00:00:00.000Z'])(
    'is offline for missing, invalid or epoch-or-earlier timestamps (%j)',
    (value) => {
      expect(isUserOnlineIngame(value)).toBe(false);
    },
  );

  it('flips from online to offline as time passes', () => {
    const seen = ago(4 * 60 * 1000);
    expect(isUserOnlineIngame(seen)).toBe(true);

    vi.advanceTimersByTime(60 * 1000);

    expect(isUserOnlineIngame(seen)).toBe(false);
  });
});
