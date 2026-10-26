import { describe, expect, it } from 'vitest';
import type { MetaHistoryResponse } from '@/lib/builds-api';
import { computeTrending } from './trending';

const H1 = '2026-10-20T10:00:00.000Z';
const H2 = '2026-10-23T10:00:00.000Z';
const H3 = '2026-10-26T10:00:00.000Z';
const point = (hour: string) => ({ hour, total: 100, classes: [] });
const series = (key: string, pcts: [string, number][]) => ({
  key,
  name: key,
  quality: 'Unique',
  iconUrl: null,
  series: pcts.map(([hour, pct]) => ({ hour, pct })),
});

describe('computeTrending', () => {
  it('needs at least two points', () => {
    expect(computeTrending({ points: [], items: [] })).toBeNull();
    expect(computeTrending({ points: [point(H1)], items: [series('a', [[H1, 10]])] })).toBeNull();
  });

  it('compares the earliest and latest point (whatever their order), biggest moves first', () => {
    const history: Pick<MetaHistoryResponse, 'points' | 'items'> = {
      points: [point(H3), point(H1), point(H2)],
      items: [
        series('steady', [
          [H1, 40],
          [H2, 60],
          [H3, 40.2],
        ]),
        series('up-small', [
          [H1, 10],
          [H3, 13],
        ]),
        series('up-big', [
          [H1, 5],
          [H2, 1],
          [H3, 25],
        ]),
        series('down', [
          [H1, 30],
          [H3, 18],
        ]),
      ],
    };
    const trending = computeTrending(history)!;
    expect(trending.fromHour).toBe(H1);
    expect(trending.toHour).toBe(H3);
    expect(trending.rising.map((i) => [i.key, i.delta])).toEqual([
      ['up-big', 20],
      ['up-small', 3],
    ]);
    expect(trending.falling.map((i) => [i.key, i.delta])).toEqual([['down', -12]]);
  });

  it('counts an item absent at a point as 0%', () => {
    const trending = computeTrending({
      points: [point(H1), point(H3)],
      items: [series('new', [[H3, 8]]), series('gone', [[H1, 6]])],
    })!;
    expect(trending.rising).toEqual([expect.objectContaining({ key: 'new', from: 0, to: 8, delta: 8 })]);
    expect(trending.falling).toEqual([expect.objectContaining({ key: 'gone', from: 6, to: 0, delta: -6 })]);
  });

  it('caps each list at the limit', () => {
    const items = Array.from({ length: 8 }, (_, i) =>
      series(`i${i}`, [
        [H1, 0],
        [H3, i + 1],
      ]),
    );
    expect(computeTrending({ points: [point(H1), point(H3)], items }, { limit: 3 })!.rising.map((i) => i.key)).toEqual([
      'i7',
      'i6',
      'i5',
    ]);
  });
});
