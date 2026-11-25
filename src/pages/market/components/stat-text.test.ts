import { describe, expect, it } from 'vitest';
import { choiceText, itemStatText, statName, statWithValue, templateName } from './stat-text';
import { PSEUDO_STATS } from '../lib/pseudo';

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

  it('spells the physical damage pair (damage) without raw placeholders', () => {
    expect(statName('damage{4..}')).toBe('Adds Damage');
    expect(itemStatText('damage')).toBe('Adds #-# Damage');
    expect(statWithValue('damage', 14)).toBe('Adds #-14 Damage');
  });

  it('spells elemental pairs and the elemental pseudo as Adds #-#', () => {
    expect(itemStatText('firedam|firemindam[1]')).toBe('Adds #-# Fire Damage');
    expect(statWithValue('firedam|firemindam[1]', 20)).toBe('Adds #-20 Fire Damage');
    // a price check bounding only the low end
    expect(statWithValue('firedam|firemindam', 4)).toBe('Adds 4-# Fire Damage');
    expect(choiceText(PSEUDO_STATS.find((p) => p.id === 'pseudo_elemental_max_damage')!)).toBe(
      'Adds #-# Total Elemental Damage',
    );
    expect(statWithValue('pseudo_elemental_max_damage', 134)).toBe('Adds #-134 Total Elemental Damage');
  });
});
