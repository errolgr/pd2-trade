import { describe, expect, it } from 'vitest';
import { modToStatKey } from './mod-keys';
import { searchStats, STAT_OPTIONS, statLabel } from './stats';

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
