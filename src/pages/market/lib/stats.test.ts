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

  it('is a picker option labelled "Adds {Y}-{X} Damage" (filters the max), found as flat / adds damage', () => {
    expect(statLabel('damage{4..}')).toBe('Adds {Y}-{X} Damage');
    expect(STAT_OPTIONS.find((o) => o.key === 'damage')).toMatchObject({ group: 'Offense' });
    expect(top('flat damage', 1)).toEqual(['Adds {Y}-X Damage']);
    expect(top('adds damage', 1)).toEqual(['Adds {Y}-X Damage']);
  });

  it('a merged card line filters and sorts on the damage key, valued by its max', () => {
    const [merged] = mergeDamageLines([line('min_damage', 4), line('max_damage', 14)]);
    expect(modToStatKey(merged)).toBe('damage');
    expect(modStatValue(merged, 'damage')).toBe(14);
  });
});

describe('elemental min / max damage', () => {
  // Live listings: one "Adds X-Y" line per element (no lone firemindam / firemaxdam lines)
  const jewel: Modifier[] = [
    { name: 'firedam', values: [4, 20], label: 'Adds 4-20 Fire Damage', priority: 101 },
    { name: 'colddam', values: [1, 3, 50], label: 'Adds 1-3 Cold Damage', priority: 99 },
  ];

  it.each([
    ['fire', 'Fire'],
    ['light', 'Lightning'],
    ['magic', 'Magic'],
    ['cold', 'Cold'],
  ])('%s: the low end reads values.0 of the pair line, the high end values.1', (e, label) => {
    expect(STAT_OPTIONS.find((o) => o.key === `${e}dam|${e}mindam`)?.label).toBe(`Adds {X}-{Y} ${label} Damage`);
    expect(STAT_OPTIONS.find((o) => o.key === `${e}dam|${e}mindam[1]`)?.label).toBe(`Adds {Y}-{X} ${label} Damage`);
    expect(STAT_OPTIONS.some((o) => o.key === `${e}mindam` || o.key === `${e}maxdam`)).toBe(false);
  });

  it('poison keeps the site wording (its line reads "+X Poison Damage over N Seconds")', () => {
    expect(statLabel('poisondam|poisonmindam')).toBe('+{X} to Minimum Poison Damage');
    expect(statLabel('poisondam|poisonmindam[1]')).toBe('+{X} to Maximum Poison Damage');
  });

  it('min / max in a search find the matching end', () => {
    expect(top('min fire damage', 1)).toEqual(['Adds X-{Y} Fire Damage']);
    expect(top('max fire damage')).toContain('Adds {Y}-X Fire Damage');
    expect(top('max fire damage')).not.toContain('Adds X-{Y} Fire Damage');
    expect(top('min elemental damage', 1)).toEqual(['Adds X-{Y} Total Elemental Damage (fire + cold + lightning)']);
  });

  it('filters a jewel by either end', () => {
    expect(readStatValue(jewel, 'firedam|firemindam')).toBe(4);
    expect(readStatValue(jewel, 'firedam|firemindam[1]')).toBe(20);
    expect(readStatValue(jewel, 'colddam|coldmindam[1]')).toBe(3);
    expect(readStatValue(jewel, 'lightdam|lightmindam')).toBeNull();
  });

  it('a card line filters on its max, and a price-check pinned key is labelled Maximum', () => {
    expect(modToStatKey(jewel[0])).toBe('firedam|firemindam[1]');
    expect(modStatValue(jewel[0], 'firedam|firemindam[1]')).toBe(20);
    expect(statLabel('firedam|firemindam{4..}')).toBe('Adds {Y}-{X} Fire Damage');
    expect(statLabel('firedam|firemindam')).toBe('Adds {X}-{Y} Fire Damage');
  });
});
