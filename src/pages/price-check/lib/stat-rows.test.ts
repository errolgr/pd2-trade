import { describe, expect, it } from 'vitest';
import type { Item, Stat } from './interfaces';
import { buildStatRows } from './stat-rows';
import { StatId } from './stat-mappings';

const ring = (stats: Stat[]): Item => ({ name: 'Ring', quality: 'Rare', type: 'Ring', iLevel: 80, stats });
const pseudoRows = (item: Item) =>
  buildStatRows(item)
    .filter((s) => s.stat_id === StatId.Pseudo)
    .map((s) => [s.pseudo, s.value]);

describe('buildStatRows resist pseudo rows', () => {
  it('totals each element, their sum and the lowest, leaving out zero totals', () => {
    const item = ring([
      { stat_id: 39, name: 'Fire Resist', value: 30 },
      { stat_id: 39, name: 'Fire Resist', value: 5, corrupted: true },
      { stat_id: 41, name: 'Lightning Resist', value: 20 },
    ]);
    expect(pseudoRows(item)).toEqual([
      ['pseudo_total_res', 55],
      ['pseudo_fire_res', 35],
      ['pseudo_light_res', 20],
    ]);
  });

  it('counts four equal resists (shown as All Resistances) in every total, right after that row', () => {
    const rows = buildStatRows(
      ring([
        { stat_id: 39, name: 'Fire Resist', value: 10 },
        { stat_id: 41, name: 'Lightning Resist', value: 10 },
        { stat_id: 43, name: 'Cold Resist', value: 10 },
        { stat_id: 45, name: 'Poison Resist', value: 10 },
        { stat_id: 7, name: 'Life', value: 40 },
      ]),
    );
    const allRes = rows.findIndex((s) => s.stat_id === StatId.AllResistances);
    expect(rows[allRes + 1]).toMatchObject({ pseudo: 'pseudo_total_res', value: 40 });
    expect(rows.find((s) => s.pseudo === 'pseudo_all_res')?.value).toBe(10);
    expect(rows.at(-1)?.stat_id).not.toBe(StatId.Pseudo);
  });

  it('adds none to an item without resists', () => {
    expect(pseudoRows(ring([{ stat_id: 7, name: 'Life', value: 40 }]))).toEqual([]);
  });
});
