import { describe, expect, it } from 'vitest';
import type { Item, Stat } from './interfaces';
import { statText, tooltipLines } from './tooltip-lines';

const item = (over: Partial<Item>): Item => ({
  name: 'Test',
  quality: 'Rare',
  type: 'Ring',
  iLevel: 90,
  stats: [],
  ...over,
});
const texts = (stats: Stat[]) => tooltipLines(item({ stats })).stats.map((l) => l.text);

describe('statText', () => {
  it('places the value the way the stat description says (D2 descfunc/descval)', () => {
    expect(statText({ stat_id: 105, name: 'Faster Cast Rate', value: 20 })).toBe('+20% Faster Cast Rate');
    expect(statText({ stat_id: 39, name: 'Fire Resist', value: 30 })).toBe('Fire Resist +30%');
    expect(statText({ stat_id: 80, name: 'Better Chance of Getting Magic Items', value: 25 })).toBe(
      '25% Better Chance of Getting Magic Items',
    );
    expect(statText({ stat_id: 7, name: 'to Life', value: 40 })).toBe('+40 to Life');
    expect(statText({ stat_id: 216, name: 'to Life', value: 99 })).toBe('+99 to Life (Based on Character Level)');
  });

  it('builds skill lines from the skill field', () => {
    expect(statText({ stat_id: 188, name: '+%d to Javelin and Spear Skills', value: 3, skill: 'Martial Arts (Assassin)' })).toBe(
      '+3 to Martial Arts Skills (Assassin Only)',
    );
    expect(statText({ stat_id: 83, name: 'to Sorceress Skill Levels', value: 2 })).toBe('+2 to Sorceress Skill Levels');
    expect(statText({ stat_id: 107, name: 'to Teleport', value: 3, skill: 'Teleport (Sorceress)' })).toBe(
      '+3 to Teleport (Sorceress Only)',
    );
    expect(statText({ stat_id: 97, name: 'to Teleport', value: 1, skill: 'Teleport' })).toBe('+1 to Teleport');
    expect(statText({ stat_id: 204, name: '(%d/%d Charges)', value: 20, level: 7, skill: 'Venom', range: { max: 25 } })).toBe(
      'Level 7 Venom (20/25 Charges)',
    );
  });

  it('fills printf descriptions in chance, level, value order', () => {
    expect(
      statText({ stat_id: 201, name: '%d%% Chance to cast level %d %s when struck', chance: 10, level: 15, skill: 'Frost Nova' }),
    ).toBe('10% Chance to cast level 15 Frost Nova when struck');
  });

  it('keeps a literal leading % with the value', () => {
    expect(statText({ stat_id: 998, name: '% Enhanced Damage', value: 150 })).toBe('+150% Enhanced Damage');
  });
});

describe('tooltipLines', () => {
  it('merges the stat pairs PD2 shows as one line', () => {
    expect(
      texts([
        { stat_id: 17, name: 'Enhanced Maximum Damage', value: 200 },
        { stat_id: 18, name: 'Enhanced Minimum Damage', value: 200 },
        { stat_id: 48, name: 'to Minimum Fire Damage', value: 10 },
        { stat_id: 49, name: 'to Maximum Fire Damage', value: 30 },
      ]),
    ).toEqual(['+200% Enhanced Damage', 'Adds 10-30 Fire Damage']);
  });

  it('shows All Resistances only when all four resists are equal', () => {
    const res = (v: [number, number, number, number]) =>
      [39, 41, 43, 45].map((id, i) => ({ stat_id: id, name: 'Resist', value: v[i] }));
    expect(texts(res([11, 11, 11, 11]))).toEqual(['All Resistances +11%']);
    expect(texts(res([11, 11, 11, 12]))).toHaveLength(4);
  });

  it('combines attributes even when Strength comes without a stat_id', () => {
    const stats: Stat[] = [
      { name: 'to Strength', value: 2 } as Stat,
      { stat_id: 1, name: 'to Energy', value: 2 },
      { stat_id: 2, name: 'to Dexterity', value: 2 },
      { stat_id: 3, name: 'to Vitality', value: 2 },
    ];
    const { stats: lines } = tooltipLines(item({ stats }));
    expect(lines.map((l) => l.text)).toEqual(['+2 to All Attributes']);
    expect(lines[0].keys).toEqual(['id:1002']);
  });

  it('converts poison per-frame damage to the in-game total', () => {
    expect(
      texts([
        { stat_id: 57, name: 'to Minimum Poison Damage', value: 256 },
        { stat_id: 58, name: 'to Maximum Poison Damage', value: 512 },
        { stat_id: 59, name: 'Poison Length', value: 75 },
      ]),
    ).toEqual(['Adds 75-150 Poison Damage over 3 Seconds']);
  });

  it('colours corrupted stats and closes with ethereal, sockets and Corrupted', () => {
    const lines = tooltipLines(
      item({
        isEthereal: true,
        sockets: 4,
        stats: [
          { stat_id: 99, name: 'Faster Hit Recovery', value: 10, corrupted: true },
          { stat_id: 360, name: 'Corrupted', value: 2 },
        ],
      }),
    );
    expect(lines.stats).toEqual([{ text: '+10% Faster Hit Recovery', color: 'corrupted', keys: ['id:99'] }]);
    expect(lines.footer).toEqual([
      { text: 'Ethereal (Cannot be Repaired), Socketed (4)', color: 'magic' },
      { text: 'Corrupted', color: 'corrupted' },
    ]);
  });

  it('titles runewords in gold over a grey base and magic items on one line', () => {
    expect(tooltipLines(item({ isRuneword: true, runeword: 'Enigma', name: 'Mage Plate', type: 'Mage Plate', quality: 'Superior' })).title).toEqual([
      { text: 'Enigma', color: 'unique' },
      { text: 'Mage Plate', color: 'gray' },
    ]);
    expect(tooltipLines(item({ name: "Shimmering Ring of the Fox", quality: 'Magic' })).title).toEqual([
      { text: 'Shimmering Ring of the Fox', color: 'magic' },
    ]);
  });
});
