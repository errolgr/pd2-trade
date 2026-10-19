import { describe, expect, it } from 'vitest';
import type { AppraisedStat } from '@/lib/rare-appraisal-api';
import type { Stat } from './interfaces';
import { keyStatMin, matchRareStats } from './rare-stat-match';

const appraised = (over: Partial<AppraisedStat>): AppraisedStat => ({
  label: 'x',
  key: null,
  value: null,
  stars: null,
  multiplier: null,
  roll: null,
  keyFrom: null,
  corrupted: false,
  ...over,
});

describe('matchRareStats', () => {
  it('matches a starred stat to the row whose property equals the key', () => {
    const fcr = appraised({ key: 'item_fastercastrate', value: 20, stars: 2 as AppraisedStat['stars'] });
    const rows: Stat[] = [
      { stat_id: 7, name: 'Life', value: 40 },
      { stat_id: 105, name: 'FCR', value: 20 },
    ];
    const m = matchRareStats([fcr], rows);
    expect([...m.keys()]).toEqual(['id:105']);
    expect(m.get('id:105')).toBe(fcr);
  });

  it('ignores stats without key, or with neither stars nor keyFrom', () => {
    const rows: Stat[] = [{ stat_id: 105, name: 'FCR', value: 20 }];
    const m = matchRareStats(
      [appraised({ key: null, stars: 1 as AppraisedStat['stars'] }), appraised({ key: 'item_fastercastrate', value: 20 })],
      rows,
    );
    expect(m.size).toBe(0);
  });

  it('includes near-key stats that only carry keyFrom', () => {
    const near = appraised({ key: 'item_fastercastrate', value: 10, keyFrom: 20 });
    expect(matchRareStats([near], [{ stat_id: 105, name: 'FCR', value: 10 }]).get('id:105')).toBe(near);
  });

  it('skips keys with no matching row', () => {
    const m = matchRareStats([appraised({ key: 'maxhp', stars: 1 as AppraisedStat['stars'] })], [
      { stat_id: 105, name: 'FCR' },
    ]);
    expect(m.size).toBe(0);
  });

  it('disambiguates same-property skill rows by the key suffix slug', () => {
    const rows: Stat[] = [
      { stat_id: 107, name: 'Teleport', skill: 'Teleport', value: 2 },
      { stat_id: 107, name: 'Fire Ball', skill: 'Fire Ball', value: 2 },
    ];
    const fb = appraised({ key: 'item_singleskill__fire_ball_sorceress_only', value: 2, stars: 1 as AppraisedStat['stars'] });
    const m = matchRareStats([fb], rows);
    expect([...m.keys()]).toEqual(['skill:fire ball']);
  });

  it('falls back to value match, then the first unused row, never reusing a row', () => {
    const rows: Stat[] = [
      { stat_id: 198, name: 'CtC Teleport', skill: 'Teleport', value: 5 },
      { stat_id: 198, name: 'CtC Fire Ball', skill: 'Fire Ball', value: 10 },
    ];
    const a = appraised({ key: 'item_skillonhit', value: 10, stars: 1 as AppraisedStat['stars'] });
    const b = appraised({ key: 'item_skillonhit', value: 99, stars: 1 as AppraisedStat['stars'] });
    const c = appraised({ key: 'item_skillonhit', value: 1, stars: 1 as AppraisedStat['stars'] });
    const m = matchRareStats([a, b, c], rows);
    expect(m.get('skill:fire ball')).toBe(a);
    expect(m.get('skill:teleport')).toBe(b);
    expect(m.size).toBe(2);
  });

  it('matches the combined enhanced damage row (998) to maxdamage_percent', () => {
    const ed = appraised({ key: 'maxdamage_percent', value: 200, stars: 1 as AppraisedStat['stars'] });
    expect(matchRareStats([ed], [{ stat_id: 998, name: 'ED', value: 200 }]).get('id:998')).toBe(ed);
  });
});

describe('keyStatMin', () => {
  it('returns null when the stat has no value', () => {
    expect(keyStatMin(appraised({ value: null, keyFrom: 20 }))).toBeNull();
  });

  it.each([
    [20, null, 20], // step 1 up to 20
    [88, null, 85], // step 5 up to 100
    [100, null, 100],
    [277, null, 270], // step 10 above 100
    [21, null, 20],
  ])('rounds value %i (keyFrom %s) down to %i', (value, keyFrom, expected) => {
    expect(keyStatMin(appraised({ value, keyFrom }))).toBe(expected);
  });

  it('never goes below keyFrom', () => {
    expect(keyStatMin(appraised({ value: 99, keyFrom: 103 }))).toBe(103);
    expect(keyStatMin(appraised({ value: 10, keyFrom: 23 }))).toBe(23);
  });

  it('uses the value when it already exceeds keyFrom', () => {
    expect(keyStatMin(appraised({ value: 47, keyFrom: 30 }))).toBe(45);
  });
});
