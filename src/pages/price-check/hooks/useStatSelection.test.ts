// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import type { Stat } from '../lib/interfaces';
import { StatId } from '../lib/stat-mappings';
import { useStatSelection } from './useStatSelection';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));

let settings: Partial<ISettings>;

const CORRUPTED: Stat = { stat_id: StatId.Corrupted, name: 'Corrupted' };
const life = (value: number | undefined, range?: Stat['range']): Stat => ({
  stat_id: 7,
  name: 'to Life',
  value,
  range,
});

type TestItem = {
  type: string;
  stats: Stat[];
  sockets?: number;
  isEthereal?: boolean;
  name?: string;
  quality?: string;
  iLevel?: number;
};

function setup(item: TestItem) {
  return renderHook(({ item }) => useStatSelection(item), { initialProps: { item } });
}

const ids = (stats: Stat[]) => stats.map((s) => s.stat_id);
const byId = (stats: Stat[], id: number) => stats.find((s) => s.stat_id === id);

beforeEach(() => {
  settings = {
    fillStatValue: 5,
    statFillMarginUnit: 'percent',
    statFillLeaveMinEmpty: false,
    statFillLeaveMaxEmpty: false,
    statDefaultCorruptedFilter: 'both',
  };
  vi.mocked(useOptions).mockImplementation(() => ({
    isOpen: false,
    setIsOpen: vi.fn(),
    isLoading: false,
    settings: settings as ISettings,
    updateSettings: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
});

describe('useStatSelection: sortedStats', () => {
  it('injects Sockets/Ethereal/Corrupted pseudo-rows ahead of real stats for corruptable bases', () => {
    const { result } = setup({ type: 'Shako', sockets: 2, isEthereal: true, stats: [life(40)] });
    const stats = result.current.sortedStats;
    expect(ids(stats).slice(0, 3).sort()).toEqual([StatId.Corrupted, StatId.Socket, StatId.Ethereal].sort());
    expect(ids(stats)[3]).toBe(7);
    expect(byId(stats, StatId.Socket)).toMatchObject({ value: 2, range: { min: 2, max: 2 } });
    expect(byId(stats, StatId.Corrupted)).toMatchObject({ name: 'Corrupted', _injected: true });
  });

  it('injects Sockets for 0 sockets but not when sockets are absent', () => {
    expect(ids(setup({ type: 'Shako', sockets: 0, stats: [] }).result.current.sortedStats)).toContain(StatId.Socket);
    expect(ids(setup({ type: 'Shako', stats: [] }).result.current.sortedStats)).not.toContain(StatId.Socket);
  });

  it.each(['Grand Charm', 'El Rune', 'Jewel', 'Unknown Thing'])(
    'does not inject a Corrupted row for non-corruptable base %s',
    (type) => {
      const { result } = setup({ type, stats: [life(10)] });
      expect(ids(result.current.sortedStats)).not.toContain(StatId.Corrupted);
    },
  );

  it('does not inject a second Corrupted row when the item already is corrupted', () => {
    const { result } = setup({ type: 'Shako', stats: [{ stat_id: StatId.Corrupted, name: 'ÿc1Corrupted' }] });
    const corrupted = result.current.sortedStats.filter((s) => s.stat_id === StatId.Corrupted);
    expect(corrupted).toHaveLength(1);
    // Remapped name strips the color code; the real row is not marked as injected.
    expect(corrupted[0].name).toBe('Corrupted');
    expect('_injected' in corrupted[0]).toBe(false);
  });

  // BUG: isItemCorruptable compares the *type* value of the base against CORRUPTABLE_TYPE_CODES, but
  // rings/amulets/belts share a '{"$in": [...]}' type value (useStatSelection.ts:85-89), so the
  // whitelisted 'rin'/'amu'/'bels'/'belt' codes never match: no Corrupted row and no default
  // corrupted filter for rings, amulets and belts.
  it.fails('treats rings, amulets and belts as corruptable', () => {
    for (const type of ['Ring', 'Amulet', 'Sash']) {
      const { result } = setup({ type, stats: [] });
      expect(ids(result.current.sortedStats)).toContain(StatId.Corrupted);
    }
  });

  it('strips hidden stats and "an evil force" lines', () => {
    const { result } = setup({
      type: 'Grand Charm',
      stats: [life(10), { stat_id: 361, name: 'hidden' }, { stat_id: 500, name: 'Spawns An Evil Force' }],
    });
    expect(ids(result.current.sortedStats)).toEqual([7]);
  });

  it('shows skill stats under the skill name', () => {
    const { result } = setup({ type: 'Grand Charm', stats: [{ stat_id: 107, name: '+3 to x', skill: 'Frozen Orb' }] });
    expect(result.current.sortedStats[0].name).toBe('Frozen Orb');
  });

  describe('enhanced damage', () => {
    it('combines min/max ED into one row', () => {
      const { result } = setup({
        type: 'Shako',
        stats: [
          { stat_id: 18, name: 'min', value: 200 },
          { stat_id: 17, name: 'max', value: 200 },
        ],
      });
      const stats = result.current.sortedStats;
      expect(ids(stats)).not.toContain(17);
      expect(ids(stats)).not.toContain(18);
      expect(byId(stats, 998)).toEqual({ stat_id: 998, name: '% Enhanced Damage', value: 200 });
    });

    it('marks the combined row corrupted when either part is corrupted', () => {
      const { result } = setup({
        type: 'Shako',
        stats: [
          { stat_id: 18, name: 'min', value: 50 },
          { stat_id: 17, name: 'max', value: 50, corrupted: true },
        ],
      });
      expect(byId(result.current.sortedStats, 998)?.corrupted).toBe(true);
    });

    it.each([17, 18])('converts a lone stat %i into the combined row', (statId) => {
      const { result } = setup({ type: 'Shako', stats: [{ stat_id: statId, name: 'ed', value: 100 }] });
      expect(byId(result.current.sortedStats, 998)).toMatchObject({ value: 100 });
    });

    it('takes the range PD2 shows on the ED line (magic jewel ED affixes roll 5-40)', () => {
      const { result } = setup({
        type: 'Jewel',
        quality: 'Magic',
        iLevel: 90,
        stats: [
          { stat_id: 17, name: 'max', value: 30 },
          { stat_id: 18, name: 'min', value: 30 },
        ],
      });
      expect(byId(result.current.sortedStats, 998)?.range).toEqual({ min: 5, max: 40 });
    });
  });

  describe('stat ranges', () => {
    it('replaces the clipboard range with the one PD2 draws on the tooltip', () => {
      const { result } = setup({
        type: 'Shako',
        name: 'Harlequin Crest',
        quality: 'Unique',
        stats: [{ stat_id: 80, name: 'Better Chance of Getting Magic Items', value: 40, range: { min: 40, max: 41 } }],
      });
      expect(byId(result.current.sortedStats, 80)?.range).toEqual({ min: 25, max: 50 });
    });

    it('drops a range PD2 does not draw (a fixed stat)', () => {
      const { result } = setup({
        type: 'Shako',
        name: 'Harlequin Crest',
        quality: 'Unique',
        stats: [{ stat_id: 127, name: 'to All Skills', value: 2, range: { min: 1, max: 3 } }],
      });
      expect(byId(result.current.sortedStats, 127)?.range).toBeUndefined();
    });
  });

  describe('all resistances', () => {
    const res = (value: number, range?: Stat['range'], corrupted?: boolean): Stat[] =>
      [39, 41, 43, 45].map((stat_id, i) => ({
        stat_id,
        name: `res${stat_id}`,
        value,
        range,
        ...(corrupted && i === 3 ? { corrupted } : {}),
      }));

    it('combines four equal resistances into All Resistances', () => {
      const { result } = setup({ type: 'Grand Charm', stats: res(20, undefined, true) });
      expect(ids(result.current.sortedStats)).toEqual([999]);
      expect(result.current.sortedStats[0]).toEqual({
        stat_id: 999,
        name: 'All Resistances',
        value: 20,
        corrupted: true,
      });
    });

    it('keeps individual resistances when values differ', () => {
      const stats = res(20);
      stats[2] = { ...stats[2], value: 25 };
      const { result } = setup({ type: 'Grand Charm', stats });
      expect(ids(result.current.sortedStats)).toEqual([39, 41, 43, 45]);
    });

    it('keeps individual resistances when one is missing', () => {
      const { result } = setup({ type: 'Grand Charm', stats: res(20).slice(0, 3) });
      expect(ids(result.current.sortedStats)).toEqual([39, 41, 43]);
    });
  });

  describe('damage pairs', () => {
    it('shows min + max fire damage as one row with the ranges the tooltip draws', () => {
      const { result } = setup({
        type: 'Spiked Club',
        quality: 'Rare',
        iLevel: 42,
        stats: [
          { stat_id: 48, name: 'to Minimum Fire Damage', value: 4 },
          { stat_id: 49, name: 'to Maximum Fire Damage', value: 14 },
        ],
      });
      const rows = result.current.sortedStats.filter((s) => s.stat_id !== StatId.Corrupted);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ stat_id: StatId.FireDamage, name: 'Fire Damage', value: 4, maxValue: 14 });
      expect(rows[0].range && rows[0].maxRange).toBeTruthy();
    });

    it('shows poison as the in-game totals and duration', () => {
      const { result } = setup({
        type: 'Grand Charm',
        stats: [
          { stat_id: 57, name: 'min', value: 256 },
          { stat_id: 58, name: 'max', value: 512 },
          { stat_id: 59, name: 'length', value: 75 },
        ],
      });
      expect(result.current.sortedStats).toEqual([
        { stat_id: StatId.PoisonDamage, name: 'Poison Damage', value: 75, maxValue: 150, seconds: 3 },
      ]);
    });

    it('keeps physical min/max damage apart unless min < max (as the game draws them)', () => {
      const same = setup({
        type: 'Grand Charm',
        stats: [
          { stat_id: 21, name: 'min', value: 5 },
          { stat_id: 22, name: 'max', value: 5 },
        ],
      });
      expect(ids(same.result.current.sortedStats)).toEqual([21, 22]);
      const pair = setup({
        type: 'Grand Charm',
        stats: [
          { stat_id: 21, name: 'min', value: 5 },
          { stat_id: 22, name: 'max', value: 9 },
        ],
      });
      expect(ids(pair.result.current.sortedStats)).toEqual([StatId.Damage]);
    });

    it('selecting a damage row fills both the min and the max damage pair', () => {
      const { result } = setup({
        type: 'Grand Charm',
        stats: [
          { stat_id: 48, name: 'min', value: 40 },
          { stat_id: 49, name: 'max', value: 100 },
        ],
      });
      act(() => result.current.toggle(byId(result.current.sortedStats, StatId.FireDamage)!));
      expect(result.current.filters['id:1003']).toEqual({ min: '38', max: '42', maxMin: '95', maxMax: '105' });
    });
  });

  describe('all attributes', () => {
    it('combines four equal attributes (incl. name-remapped "to Strength") into All Attributes', () => {
      const { result } = setup({
        type: 'Grand Charm',
        stats: [
          { name: 'to Strength', value: 10 } as Stat,
          { stat_id: 1, name: 'energy', value: 10 },
          { stat_id: 2, name: 'dex', value: 10 },
          { stat_id: 3, name: 'vit', value: 10 },
        ],
      });
      expect(ids(result.current.sortedStats)).toEqual([StatId.AllAttributes]);
      expect(result.current.sortedStats[0]).toMatchObject({ name: 'All Attributes', value: 10 });
    });

    it('keeps individual attributes when values differ', () => {
      const { result } = setup({
        type: 'Grand Charm',
        stats: [
          { stat_id: 0, name: 'str', value: 10 },
          { stat_id: 1, name: 'energy', value: 10 },
          { stat_id: 2, name: 'dex', value: 10 },
          { stat_id: 3, name: 'vit', value: 9 },
        ],
      });
      expect(ids(result.current.sortedStats)).toEqual([0, 1, 2, 3]);
    });
  });
});

describe('useStatSelection: toggle and filters', () => {
  const charm = { type: 'Grand Charm', stats: [] };

  it('selects a stat with a margin range around its value, clamped to the stat range', () => {
    const { result } = setup(charm);
    act(() => result.current.toggle(life(40, { min: 39, max: 60 })));
    expect(result.current.selected.has('id:7')).toBe(true);
    // ceil(5% of 40) = 2 -> [38, 42], min clamped to 39.
    expect(result.current.filters['id:7']).toEqual({ min: '39', max: '42' });
  });

  it('uses value ± margin without a range, and 0..0 for valueless stats', () => {
    const { result } = setup(charm);
    act(() => result.current.toggle(life(40)));
    expect(result.current.filters['id:7']).toEqual({ min: '38', max: '42' });
    act(() => result.current.toggle({ stat_id: 8, name: 'flag' }));
    expect(result.current.filters['id:8']).toEqual({ min: '0', max: '0' });
  });

  it('deselecting removes both the selection and its filter', () => {
    const { result } = setup(charm);
    act(() => result.current.toggle(life(40)));
    act(() => result.current.toggle(life(40)));
    expect(result.current.selected.size).toBe(0);
    expect('id:7' in result.current.filters).toBe(false);
  });

  it('keys skill stats by skill name, separately from other stats with the same id', () => {
    const { result } = setup(charm);
    act(() => result.current.toggle({ stat_id: 107, name: 'x', skill: 'Frozen Orb', value: 3 }));
    act(() => result.current.toggle({ stat_id: 107, name: 'y', skill: 'Blizzard', value: 2 }));
    expect([...result.current.selected].sort()).toEqual(['skill:blizzard', 'skill:frozen orb']);
  });

  it('honours a flat margin from settings', () => {
    settings = { ...settings, statFillMarginUnit: 'flat', fillStatValue: 10 };
    const { result } = setup(charm);
    act(() => result.current.toggle(life(40, { min: 0, max: 45 })));
    expect(result.current.filters['id:7']).toEqual({ min: '30', max: '45' });
  });

  it('honours a custom percent margin from settings', () => {
    settings = { ...settings, fillStatValue: 20 };
    const { result } = setup(charm);
    act(() => result.current.toggle(life(50)));
    expect(result.current.filters['id:7']).toEqual({ min: '40', max: '60' });
  });

  it('leaves min and/or max empty when configured', () => {
    settings = { ...settings, statFillLeaveMinEmpty: true };
    const { result } = setup(charm);
    act(() => result.current.toggle(life(40)));
    expect(result.current.filters['id:7']).toEqual({ min: '', max: '42' });

    settings = { ...settings, statFillLeaveMinEmpty: false, statFillLeaveMaxEmpty: true };
    const second = setup(charm);
    act(() => second.result.current.toggle(life(40)));
    expect(second.result.current.filters['id:7']).toEqual({ min: '38', max: '' });
  });

  it('updateFilter edits one bound and keeps the other', () => {
    const { result } = setup(charm);
    act(() => result.current.toggle(life(40)));
    act(() => result.current.updateFilter('id:7', 'min', '35'));
    expect(result.current.filters['id:7']).toEqual({ min: '35', max: '42' });
  });

  it('applies the margin to combined-stat rows using their own value', () => {
    const { result } = setup({
      type: 'Shako',
      stats: [{ stat_id: 18, name: 'ed', value: 100, range: { min: 80, max: 120 } }],
    });
    const ed = byId(result.current.sortedStats, 998)!;
    act(() => result.current.toggle(ed));
    expect(result.current.filters['id:998']).toEqual({ min: '95', max: '105' });
  });
});

describe('useStatSelection: corrupted tri-state', () => {
  it('cycles both -> corrupted -> non-corrupted -> both, tracking selection', () => {
    const { result } = setup({ type: 'Shako', stats: [] });
    expect(result.current.corruptedState).toBe(0);

    act(() => result.current.toggle(CORRUPTED));
    expect(result.current.corruptedState).toBe(1);
    expect(result.current.selected.has('id:360')).toBe(true);

    act(() => result.current.toggle(CORRUPTED));
    expect(result.current.corruptedState).toBe(2);
    expect(result.current.selected.has('id:360')).toBe(true);

    act(() => result.current.toggle(CORRUPTED));
    expect(result.current.corruptedState).toBe(0);
    expect(result.current.selected.has('id:360')).toBe(false);
    expect('id:360' in result.current.filters).toBe(false);
  });

  it.each([
    ['corrupted', 1],
    ['non-corrupted', 2],
    ['both', 0],
  ] as const)('starts corruptable items at the saved default %s', (filter, state) => {
    settings = { ...settings, statDefaultCorruptedFilter: filter };
    expect(setup({ type: 'Shako', stats: [] }).result.current.corruptedState).toBe(state);
  });

  it('ignores the saved default for non-corruptable items (no UI to undo it)', () => {
    settings = { ...settings, statDefaultCorruptedFilter: 'corrupted' };
    expect(setup({ type: 'Grand Charm', stats: [] }).result.current.corruptedState).toBe(0);
  });

  it('resets to the saved default when the item changes', () => {
    settings = { ...settings, statDefaultCorruptedFilter: 'corrupted' };
    const { result, rerender } = setup({ type: 'Shako', stats: [] });
    act(() => result.current.toggle(CORRUPTED)); // 1 -> 2
    expect(result.current.corruptedState).toBe(2);

    rerender({ item: { type: 'Shako', stats: [] } });
    expect(result.current.corruptedState).toBe(1);

    rerender({ item: { type: 'Grand Charm', stats: [] } });
    expect(result.current.corruptedState).toBe(0);
  });

  it('follows a change of the saved default', () => {
    const item = { type: 'Shako', stats: [] };
    const { result, rerender } = setup(item);
    expect(result.current.corruptedState).toBe(0);
    settings = { ...settings, statDefaultCorruptedFilter: 'non-corrupted' };
    rerender({ item });
    expect(result.current.corruptedState).toBe(2);
  });
});
