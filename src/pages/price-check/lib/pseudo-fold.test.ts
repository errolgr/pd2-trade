import { describe, expect, it } from 'vitest';
import type { Stat } from './interfaces';
import { foldRows, pseudoOptions } from './pseudo-fold';
import { StatId } from './stat-mappings';

const fire: Stat = { stat_id: 39, name: 'Fire Resist', value: 22 };
const poison: Stat = { stat_id: 45, name: 'Poison Resist', value: 33 };
const allRes: Stat = { stat_id: StatId.AllResistances, name: 'All Resistances', value: 10 };
const life: Stat = { stat_id: 7, name: 'Life', value: 40 };

const byId = (rows: Stat[]) => Object.fromEntries(pseudoOptions(rows).map((o) => [o.id, o]));

describe('pseudoOptions', () => {
  it('totals each present element (all-resist counted in), their sum and the lowest', () => {
    const o = byId([fire, poison, life]);
    expect(Object.keys(o)).toEqual(['pseudo_total_res', 'pseudo_all_res', 'pseudo_fire_res', 'pseudo_poison_res']);
    expect(o.pseudo_total_res).toMatchObject({ value: 55, covers: ['id:39', 'id:45'] });
    expect(o.pseudo_all_res.value).toBe(0);
    expect(o.pseudo_fire_res).toMatchObject({ value: 22, covers: ['id:39'] });
  });

  it('counts an All Resistances row into every element without element totals covering it', () => {
    const o = byId([allRes, fire]);
    expect(o.pseudo_fire_res).toMatchObject({ value: 32, covers: ['id:39'] });
    expect(o.pseudo_total_res).toMatchObject({ value: 62, covers: ['id:999', 'id:39'] });
    expect(o.pseudo_all_res.value).toBe(10);
    expect(o.pseudo_cold_res).toBeUndefined();
  });

  it('offers nothing without resists', () => {
    expect(pseudoOptions([life])).toEqual([]);
  });
});

describe('foldRows', () => {
  const rows = [fire, life, poison];
  const options = pseudoOptions(rows);

  it('puts the active total where its first covered row was and drops the rest', () => {
    const folded = foldRows(rows, options, ['pseudo_total_res']);
    expect(folded.map((s) => s.pseudo ?? s.name)).toEqual(['pseudo_total_res', 'Life']);
    expect(folded[0]).toMatchObject({ stat_id: StatId.Pseudo, value: 55, folded: [fire, poison] });
  });

  it('folds element totals independently', () => {
    const folded = foldRows(rows, options, ['pseudo_poison_res']);
    expect(folded.map((s) => s.pseudo ?? s.name)).toEqual(['Fire Resist', 'Life', 'pseudo_poison_res']);
  });

  it('leaves the rows as they are with nothing active', () => {
    expect(foldRows(rows, options, [])).toEqual(rows);
  });
});

describe('elemental damage Σ', () => {
  const fireDmg: Stat = { stat_id: StatId.FireDamage, name: 'Fire Damage', value: 4, maxValue: 20 };
  const ltngDmg: Stat = { stat_id: StatId.LightningDamage, name: 'Lightning Damage', value: 1, maxValue: 114 };
  const poisonDmg: Stat = { stat_id: StatId.PoisonDamage, name: 'Poison Damage', value: 11, maxValue: 11 };

  it('sums fire, cold and lightning Adds X-Y rows per end and folds them into a two-range Σ row', () => {
    const rows = [fireDmg, life, ltngDmg, poisonDmg];
    const options = pseudoOptions(rows);
    expect(options).toEqual([
      {
        id: 'pseudo_elemental_max_damage',
        name: 'Total Elemental Damage',
        value: 5,
        maxValue: 134,
        covers: ['id:1003', 'id:1004'],
      },
    ]);
    const folded = foldRows(rows, options, ['pseudo_elemental_max_damage']);
    expect(folded.map((s) => s.pseudo ?? s.name)).toEqual(['pseudo_elemental_max_damage', 'Life', 'Poison Damage']);
    expect(folded[0]).toMatchObject({ value: 5, maxValue: 134, folded: [fireDmg, ltngDmg] });
  });
});
