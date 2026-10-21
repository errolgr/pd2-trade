import { describe, expect, it } from 'vitest';
import type { Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { StatFilter } from './types';
import {
  coveringPseudos,
  fillMargin,
  isUsefulFilterLine,
  mergeStatFilter,
  modStatValue,
  modToStatKey,
  modsAsFilters,
} from './mod-keys';
import { modMatchesStatKey } from './card-model';

// Mod lines as live PD2 listings carry them (2026-10-21).
const mod = (name: string, values: number[], extra: Partial<Modifier> = {}): Modifier => ({
  name,
  values,
  label: name,
  priority: 100,
  ...extra,
});

describe('modToStatKey', () => {
  it.each([
    [mod('item_fastercastrate', [20]), 'item_fastercastrate', 20],
    [mod('fireresist', [32]), 'fireresist', 32],
    [mod('maxdamage_percent', [530, 350], { min: 275, max: 350 }), 'maxdamage_percent', 530],
    [mod('item_singleskill', [149, 3]), 'item_singleskill{149}', 3],
    [mod('item_addclassskills', [4, 2]), 'item_addclassskills{4}', 2],
    [mod('item_nonclassskill', [235, 3]), 'item_nonclassskill{235}', 3],
    [mod('item_aura', [123, 12]), 'item_aura{123}', 12],
    [mod('max_damage', [14]), 'max_damage|maxdamage|secondary_maxdamage|item_throw_maxdamage', 14],
    [mod('item_skillonlevelup', [41, 48, 100]), 'item_skillonlevelup', 41],
    [mod('item_req_percent', [-15]), 'item_req_percent', -15],
  ])('%o → %s', (m, key, value) => {
    expect(modToStatKey(m)).toBe(key);
    expect(modStatValue(m, key)).toBe(value);
    // Round trip: the key selects the line it came from
    expect(modMatchesStatKey(m, key)).toBe(true);
  });

  it('returns null for lines the site cannot filter', () => {
    expect(modToStatKey(mod('item_singleskill', [99999, 3]))).toBeNull();
    expect(modToStatKey(mod('no_such_mod', [1]))).toBeNull();
  });
});

describe('coveringPseudos', () => {
  it('finds the pseudo stats a line feeds', () => {
    const ids = coveringPseudos(mod('fireresist', [30])).map((p) => p.id);
    expect(ids).toContain('pseudo_total_res');
    expect(ids).toContain('pseudo_fire_res');
    expect(ids).not.toContain('pseudo_cold_res');
    expect(coveringPseudos(mod('item_knockback', [1]))).toEqual([]);
  });
});

describe('mergeStatFilter', () => {
  const base: StatFilter[] = [
    { id: 'a', kind: 'mod', key: 'item_fastercastrate', min: 10, enabled: true, weight: 2 },
    { id: 'b', kind: 'pseudo', key: 'pseudo_total_res', min: 80, enabled: false },
  ];

  it('updates the row filtering the same stat instead of duplicating it', () => {
    const { stats, id } = mergeStatFilter(base, { kind: 'mod', key: 'item_fastercastrate', min: 20 });
    expect(id).toBe('a');
    expect(stats).toHaveLength(2);
    expect(stats[0]).toEqual({ id: 'a', kind: 'mod', key: 'item_fastercastrate', min: 20, enabled: true, weight: 2 });
  });

  it('re-enables a disabled row and appends new keys', () => {
    expect(mergeStatFilter(base, { kind: 'pseudo', key: 'pseudo_total_res', min: 100 }).stats[1]).toMatchObject({
      enabled: true,
      min: 100,
    });
    const added = mergeStatFilter(base, { kind: 'mod', key: 'strength', min: 20 }, () => 'new');
    expect(added).toMatchObject({
      id: 'new',
      stats: [{ id: 'a' }, { id: 'b' }, { id: 'new', key: 'strength', enabled: true }],
    });
  });
});

describe('modsAsFilters', () => {
  const fill = { amount: 5, unit: 'percent' as const };
  const line = (name: string, values: number[], label: string, extra: Partial<Modifier> = {}) =>
    mod(name, values, { label, ...extra });

  it('one ≥ row per useful filterable line, min = value − margin kept in the roll range', () => {
    const rows = modsAsFilters(
      [
        line('corrupted', [0, 20], 'Corrupted'),
        line('item_skillonhit', [40, 240, 12], '12% Chance to cast level 40 Twister on striking'),
        line('item_fastercastrate', [20], '20% Faster Cast Rate'),
        line('item_maxdamage_perlevel', [16], '+16 to Maximum Damage (Based on Character Level)'),
        line('maxdamage_percent', [330, 330], '+330% Enhanced Damage', { min: 275, max: 350 }),
        line('manadrainmindam', [6], '6% Mana stolen per hit', { min: 6, max: 8 }),
        line('item_req_percent', [-15], 'Requirements -15%'),
        line('item_knockback', [1], 'Knockback'),
        line('item_cannotbefrozen', [1], 'Cannot Be Frozen'),
        line('item_fastercastrate', [10], '10% Faster Cast Rate'),
      ],
      fill,
    );
    expect(rows).toEqual([
      { kind: 'mod', key: 'item_fastercastrate', min: 19 },
      { kind: 'mod', key: 'maxdamage_percent', min: 313 },
      { kind: 'mod', key: 'manadrainmindam', min: 6 },
      { kind: 'mod', key: 'item_req_percent' },
    ]);
  });

  it('isUsefulFilterLine keeps numeric stats, drops flags, procs and per-level lines', () => {
    expect(isUsefulFilterLine(line('strength', [20], '+20 to Strength'))).toBe(true);
    expect(isUsefulFilterLine(line('item_aura', [123, 12], 'Level 12 Conviction Aura When Equipped'))).toBe(true);
    expect(isUsefulFilterLine(line('item_knockback', [1], 'Knockback'))).toBe(false);
    expect(isUsefulFilterLine(line('item_charged_skill', [27, 54, 20], 'Level 20 Teleport (27/27 Charges)'))).toBe(
      false,
    );
    expect(
      isUsefulFilterLine(
        line('item_skillongethit', [26, 444, 4], '4% Chance to cast level 26 Iron Maiden when struck'),
      ),
    ).toBe(false);
    expect(
      isUsefulFilterLine(line('item_vitality_perlevel', [0.5], '+0.5 to Vitality (Based on Character Level)')),
    ).toBe(false);
  });

  it('flat margins and "leave min empty"', () => {
    const str = line('strength', [20], '+20 to Strength');
    expect(fillMargin(20, { amount: 3, unit: 'flat' })).toBe(3);
    expect(modsAsFilters([str], { amount: 3, unit: 'flat' })).toEqual([{ kind: 'mod', key: 'strength', min: 17 }]);
    expect(modsAsFilters([str], { ...fill, leaveMinEmpty: true })).toEqual([{ kind: 'mod', key: 'strength' }]);
  });
});
