import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CURRENT_SEASON_SETTING,
  getCurrentSeason,
  getSeasonById,
  getSeasonDateConfig,
  getSeasonSettingOptions,
  resolveSeasonId,
  startedSeasons,
  type Season,
} from './seasons';

const LIST: Season[] = [
  { id: 'b', label: 'Beta (B)', startDate: '2026-01-10', endDate: '2026-06-30' },
  { id: 'c', label: 'Gamma (C)', startDate: '2026-07-01', endDate: null },
  { id: 'a', label: 'Alpha (A)', startDate: '2025-06-01', endDate: '2026-01-09' },
];

function at(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('startedSeasons / getCurrentSeason', () => {
  it('excludes announced seasons that have not started yet', () => {
    const now = new Date('2026-03-01T12:00:00Z');
    expect(startedSeasons(LIST, now).map((s) => s.id)).toEqual(['b', 'a']);
    expect(getCurrentSeason(LIST, now)?.id).toBe('b');
  });

  it('treats a season as started on its start date, decided in UTC', () => {
    expect(getCurrentSeason(LIST, new Date('2026-06-30T23:59:59Z'))?.id).toBe('b');
    expect(getCurrentSeason(LIST, new Date('2026-07-01T00:00:00Z'))?.id).toBe('c');
  });

  it('picks the most recently started season regardless of list order', () => {
    expect(getCurrentSeason([...LIST].reverse(), new Date('2027-01-01Z'))?.id).toBe('c');
  });

  it('falls back to the latest-starting season when none has started', () => {
    expect(getCurrentSeason(LIST, new Date('2020-01-01Z'))?.id).toBe('c');
  });

  it('returns undefined for an empty list', () => {
    expect(getCurrentSeason([], new Date('2026-01-01Z'))).toBeUndefined();
  });

  it('defaults to the bundled list and the clock: S14 only becomes current on its start day', () => {
    at('2026-10-22T23:00:00Z');
    expect(getCurrentSeason()?.id).toBe('s13');
    at('2026-10-23T00:00:00Z');
    expect(getCurrentSeason()?.id).toBe('s14');
  });
});

describe('resolveSeasonId', () => {
  it('resolves "current" and missing values to the live season', () => {
    at('2026-03-01T00:00:00Z');
    expect(resolveSeasonId(CURRENT_SEASON_SETTING, LIST)).toBe('b');
    expect(resolveSeasonId(undefined, LIST)).toBe('b');
    expect(resolveSeasonId('', LIST)).toBe('b');
  });

  it('keeps a known explicit season id, even a past one', () => {
    at('2026-03-01T00:00:00Z');
    expect(resolveSeasonId('a', LIST)).toBe('a');
  });

  it('falls back to the current season for an id the list does not know (stale setting)', () => {
    at('2026-08-01T00:00:00Z');
    expect(resolveSeasonId('s1', LIST)).toBe('c');
  });

  it('never returns the "current" sentinel', () => {
    expect(resolveSeasonId(CURRENT_SEASON_SETTING, [])).toBeUndefined();
  });
});

describe('getSeasonById', () => {
  it('returns the season for a known id and the current season for "current"', () => {
    at('2026-08-01T00:00:00Z');
    expect(getSeasonById('a', LIST)?.label).toBe('Alpha (A)');
    expect(getSeasonById(CURRENT_SEASON_SETTING, LIST)?.id).toBe('c');
  });
});

describe('getSeasonSettingOptions', () => {
  it('lists "current" first (labelled with the live season), then other started seasons, no future ones', () => {
    at('2026-03-01T00:00:00Z');
    expect(getSeasonSettingOptions(LIST)).toEqual([
      { value: CURRENT_SEASON_SETTING, label: 'Beta (B) (current)' },
      { value: 'a', label: 'Alpha (A)' },
    ]);
  });

  it('uses a generic label when there are no seasons', () => {
    expect(getSeasonSettingOptions([])).toEqual([{ value: CURRENT_SEASON_SETTING, label: 'Current season' }]);
  });
});

describe('getSeasonDateConfig (bundled seasons)', () => {
  it('constrains the current season to its start only, even when its end date is known but in the future', () => {
    at('2026-10-18T12:00:00Z');
    expect(getSeasonDateConfig()).toEqual({ startDate: '2026-04-23' });
    expect(getSeasonDateConfig('s13')).toEqual({ startDate: '2026-04-23' });
  });

  it('keeps the end date off on the last day of a season', () => {
    at('2026-10-22T20:00:00Z');
    expect(getSeasonDateConfig('s13')).toEqual({ startDate: '2026-04-23' });
  });

  it('gives a past season its full date range once it has ended', () => {
    at('2026-10-30T00:00:00Z');
    expect(getSeasonDateConfig('s13')).toEqual({ startDate: '2026-04-23', endDate: '2026-10-22' });
    expect(getSeasonDateConfig('s12')).toEqual({ startDate: '2025-10-25', endDate: '2026-04-22' });
    expect(getSeasonDateConfig(CURRENT_SEASON_SETTING)).toEqual({ startDate: '2026-10-23' });
  });

  it('treats an unknown season id as the current season', () => {
    at('2026-10-30T00:00:00Z');
    expect(getSeasonDateConfig('s2')).toEqual({ startDate: '2026-10-23' });
  });
});
