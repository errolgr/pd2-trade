import { describe, expect, it } from 'vitest';
import { type DiffBuild, diffBuilds, isEmptyDiff } from './build-diff';

const item = (slot: string, key: string, name: string, quality = 'Unique') => ({
  slot,
  key,
  name,
  quality,
  runeword: quality === 'Runeword',
});

const base: DiffBuild = {
  level: 90,
  isDead: false,
  gearValueHr: 10,
  skills: [
    { name: 'Blessed Hammer', base: 20, total: 38 },
    { name: 'Concentration', base: 20, total: 30 },
    { name: 'Vigor', base: 5, total: 10 },
  ],
  equipped: [
    item('Helm', 'unique:harlequin_crest', 'Harlequin Crest'),
    item('Armor', 'rw:enigma', 'Enigma', 'Runeword'),
    item('Right Hand', 'rw:heart_of_the_oak', 'Heart of the Oak', 'Runeword'),
  ],
  merc: { type: 'Defensive Auras', equipped: [item('Armor', 'rw:fortitude', 'Fortitude', 'Runeword')] },
};

describe('diffBuilds', () => {
  it('reports nothing for an unchanged build', () => {
    const diff = diffBuilds(base, structuredClone(base));
    expect(isEmptyDiff(diff)).toBe(true);
    expect(diff.items).toEqual([]);
  });

  it('lists a slot swap with the removed and added item, in slot order', () => {
    const after: DiffBuild = {
      ...base,
      equipped: [
        item('Right Hand', 'rw:spirit', 'Spirit', 'Runeword'),
        item('Helm', 'unique:griffon_s_eye', "Griffon's Eye"),
        base.equipped[1],
      ],
    };
    expect(diffBuilds(base, after).items).toEqual([
      {
        slot: 'Helm',
        merc: false,
        removed: { key: 'unique:harlequin_crest', name: 'Harlequin Crest', quality: 'Unique', runeword: false },
        added: { key: 'unique:griffon_s_eye', name: "Griffon's Eye", quality: 'Unique', runeword: false },
      },
      {
        slot: 'Right Hand',
        merc: false,
        removed: { key: 'rw:heart_of_the_oak', name: 'Heart of the Oak', quality: 'Runeword', runeword: true },
        added: { key: 'rw:spirit', name: 'Spirit', quality: 'Runeword', runeword: true },
      },
    ]);
  });

  it('reports newly filled and emptied slots', () => {
    const after: DiffBuild = {
      ...base,
      equipped: [
        ...base.equipped.filter((i) => i.slot !== 'Helm'),
        item('Boots', 'unique:war_traveler', 'War Traveler'),
      ],
    };
    const changes = diffBuilds(base, after).items;
    expect(changes.map((c) => [c.slot, c.removed?.name ?? null, c.added?.name ?? null])).toEqual([
      ['Helm', 'Harlequin Crest', null],
      ['Boots', null, 'War Traveler'],
    ]);
  });

  it('tracks merc items and merc type separately from the character', () => {
    const after: DiffBuild = {
      ...base,
      merc: {
        type: 'Fire Arrow',
        equipped: [
          item('Armor', 'rw:fortitude', 'Fortitude', 'Runeword'),
          item('Helm', 'unique:andariel_s_visage', "Andariel's Visage"),
        ],
      },
    };
    const diff = diffBuilds(base, after);
    expect(diff.merc).toEqual({ from: 'Defensive Auras', to: 'Fire Arrow' });
    expect(diff.items).toEqual([
      expect.objectContaining({
        slot: 'Helm',
        merc: true,
        removed: null,
        added: expect.objectContaining({ name: "Andariel's Visage" }),
      }),
    ]);
  });

  it('reports a hired merc where there was none', () => {
    const diff = diffBuilds({ ...base, merc: null }, base);
    expect(diff.merc).toEqual({ from: null, to: 'Defensive Auras' });
    expect(diff.items).toEqual([expect.objectContaining({ slot: 'Armor', merc: true, removed: null })]);
  });

  it('reports hard-point changes (bonuses alone are not a change), biggest first; level, value and death', () => {
    const after: DiffBuild = {
      ...base,
      level: 92,
      isDead: true,
      gearValueHr: 14.5,
      skills: [
        { name: 'Blessed Hammer', base: 20, total: 41 },
        { name: 'Concentration', base: 20, total: 30 },
        { name: 'Vigor', base: 1, total: 6 },
        { name: 'Holy Shield', base: 1, total: 4 },
      ],
    };
    const diff = diffBuilds(base, after);
    expect(diff.skills).toEqual([
      { name: 'Vigor', from: 5, to: 1 },
      { name: 'Holy Shield', from: 0, to: 1 },
    ]);
    expect(diff.level).toEqual({ from: 90, to: 92 });
    expect(diff.gearValueDelta).toBe(4.5);
    expect(diff.died).toBe(true);
  });

  it('leaves the value change out when either side is unpriced', () => {
    expect(diffBuilds({ ...base, gearValueHr: null }, base).gearValueDelta).toBeNull();
  });
});
