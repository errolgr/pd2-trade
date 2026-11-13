import { describe, expect, it } from 'vitest';
import { itemStatText, statName, statWithValue, templateName } from './stat-text';

describe('stat text', () => {
  it('names templates without their placeholder', () => {
    expect(templateName('+{X}% Total Fire Resistance')).toBe('Total Fire Resistance');
    expect(templateName('+{X} Faster Cast Rate')).toBe('Faster Cast Rate');
    expect(templateName('-{X}% to Enemy Resistance (best element)')).toBe('Enemy Resistance (best element)');
    expect(templateName('+{X} to Strength')).toBe('Strength');
    expect(templateName('Regenerate Mana +{X}')).toBe('Regenerate Mana');
    expect(statName('pseudo_fire_res')).toBe('Total Fire Resistance');
    expect(statName('unknown_key')).toBe('unknown_key');
  });

  it('fills the value in, shortened for chips', () => {
    expect(statWithValue('pseudo_fire_res', 29)).toBe('+29% Total Fire Resistance');
    expect(statWithValue('pseudo_fire_res', 29, { short: true })).toBe('+29% Total Fire Res');
    expect(statWithValue('pseudo_total_res', 120.5, { short: true })).toBe('+120.5% Total Res');
    expect(statWithValue('pseudo_fire_res', -5)).toBe('-5% Total Fire Resistance');
    expect(statWithValue('unknown_key', 3)).toBe('unknown_key 3');
  });

  it('spells damage pairs like the item line: the filtered end, the other as … in names and # in chips', () => {
    expect(statName('damage{4..}')).toBe('Adds …-# Damage');
    expect(itemStatText('damage')).toBe('Adds …-# Damage');
    expect(statWithValue('damage', 14)).toBe('Adds #-14 Damage');
    expect(itemStatText('firedam|firemindam')).toBe('Adds #-… Fire Damage');
    expect(statWithValue('firedam|firemindam', 4)).toBe('Adds 4-# Fire Damage');
    expect(statWithValue('firedam|firemindam[1]', 20)).toBe('Adds #-20 Fire Damage');
    expect(statWithValue('pseudo_elemental_min_damage', 5, { short: true })).toBe('Adds 5-# Total Elemental Damage');
  });
});
