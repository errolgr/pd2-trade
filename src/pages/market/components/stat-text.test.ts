import { describe, expect, it } from 'vitest';
import { statName, statWithValue, templateName } from './stat-text';

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
});
