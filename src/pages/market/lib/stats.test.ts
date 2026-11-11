import { describe, expect, it } from 'vitest';
import type { Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { mergeDamageLines } from './card-model';
import { modStatValue, modToStatKey } from './mod-keys';
import { parseStatKey, readStatValue, searchStats, STAT_OPTIONS, statLabel } from './stats';

const top = (query: string, n = 2) =>
  searchStats(query, n).map((o) => ('label' in o ? o.label : '').replace(/\{X\}/g, 'X'));

describe('searchStats ranking', () => {
  it('puts whole-name matches first, the pseudo total ahead of the plain property', () => {
    expect(top('life')).toEqual(['+X Total Life (incl. 2 per Vitality)', '+X to Life']);
    expect(top('mana')).toEqual(['+X Total Mana (incl. 2 per Energy)', '+X to Mana']);
    expect(top('cold res', 1)).toEqual(['+X% Total Cold Resistance']);
    expect(top('all res', 1)).toEqual(['+X% All Resistances (lowest of the four)']);
  });

  it('prefers shorter names among partial matches, and short words must match whole words', () => {
    expect(top('def')).toEqual(['+X Defense', '+X Defense (Based on Character Level)']);
    expect(top('life', 5).indexOf('+X% Total Life Stolen per Hit')).toBeGreaterThan(1);
  });
});

describe('skill tab options', () => {
  // Listings carry item_addskill_tab as [tabId, level] with tabId = class × 8 + tab (Paladin Combat = 24)
  const CLASSES = ['Amazon', 'Sorceress', 'Necromancer', 'Paladin', 'Barbarian', 'Druid', 'Assassin'];

  it('keys every class tab by the tab id listings carry', () => {
    const tabs = STAT_OPTIONS.filter((o) => o.key.startsWith('item_addskill_tab{'));
    expect(tabs).toHaveLength(21);
    tabs.forEach((o, i) => {
      const cls = Math.floor(i / 3);
      expect(o.key).toBe(`item_addskill_tab{${cls * 8 + (i % 3)}}`);
      expect(o.label).toMatch(new RegExp(`^\\+\\{X\\} to ${CLASSES[cls]} `));
    });
  });

  it('maps a listing tab line to the matching option', () => {
    const key = modToStatKey({ name: 'item_addskill_tab', values: [24, 4] });
    expect(key).toBe('item_addskill_tab{24}');
    expect(statLabel(key!)).toBe('+{X} to Paladin Combat Skills');
  });
});

describe('physical damage pair (damage)', () => {
  const line = (name: string, value: number): Modifier => ({ name, values: [value], label: '', priority: 0 });
  const mods = [line('min_damage', 4), line('strength', 20), line('maxdamage', 14), line('secondary_maxdamage', 12)];

  it('parses like an elemental pair: slot 0 pins the min, the roll is the max', () => {
    expect(parseStatKey('damage{4..}')).toEqual({ names: ['damage'], pins: [{ index: 0, min: 4 }], valueIndex: 1 });
    expect(parseStatKey('damage')).toEqual({ names: ['damage'], pins: [], valueIndex: 1 });
    expect(parseStatKey('damage{4..9}').pins).toEqual([{ index: 0, min: 4, max: 9 }]);
    expect(parseStatKey('damage{4}').pins).toEqual([{ index: 0, values: [4] }]);
  });

  it('reads the largest max-damage line when a min-damage line meets the pin', () => {
    expect(readStatValue(mods, 'damage')).toBe(14);
    expect(readStatValue(mods, 'damage{4..}')).toBe(14);
    expect(readStatValue(mods, 'damage{3..4}')).toBe(14);
    expect(readStatValue(mods, 'damage{5..}')).toBeNull();
    expect(readStatValue(mods, 'damage{4}')).toBe(14);
    expect(readStatValue([line('maxdamage', 14)], 'damage')).toBeNull();
    expect(readStatValue([line('min_damage', 4)], 'damage')).toBeNull();
  });

  it('is a picker option labelled "Adds {X}-{Y} Damage", found as flat / adds damage', () => {
    expect(statLabel('damage{4..}')).toBe('Adds {X}-{Y} Damage');
    expect(STAT_OPTIONS.find((o) => o.key === 'damage')).toMatchObject({ group: 'Offense' });
    expect(top('flat damage', 1)).toEqual(['Adds X-{Y} Damage']);
    expect(top('adds damage', 1)).toEqual(['Adds X-{Y} Damage']);
  });

  it('a merged card line filters and sorts on the damage key, valued by its max', () => {
    const [merged] = mergeDamageLines([line('min_damage', 4), line('max_damage', 14)]);
    expect(modToStatKey(merged)).toBe('damage');
    expect(modStatValue(merged, 'damage')).toBe(14);
  });
});
