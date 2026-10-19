import { describe, expect, it } from 'vitest';
import { getStatIdForCorruptionStatKey, getStatIdsForModifierName, StatId } from './stat-mappings';

describe('getStatIdsForModifierName', () => {
  it('prefers the item_-prefixed modifier', () => {
    expect(getStatIdsForModifierName('fastercastrate')).toBe(105);
  });

  it('falls back to the unprefixed modifier name', () => {
    expect(getStatIdsForModifierName('maxhp')).toBe(7);
    expect(getStatIdsForModifierName('strength')).toBe(0);
  });

  it('resolves synthetic combined properties via statIdToProperty', () => {
    expect(getStatIdsForModifierName('all_resist')).toBe(StatId.AllResistances);
    expect(getStatIdsForModifierName('all_attributes')).toBe(StatId.AllAttributes);
  });

  it('returns null for unknown names', () => {
    expect(getStatIdsForModifierName('definitely_not_a_mod')).toBeNull();
  });
});

describe('getStatIdForCorruptionStatKey', () => {
  it.each([
    ['cast1', 105],
    ['cast2', 105],
    ['hp', 7],
    ['res-all', StatId.AllResistances],
    ['all-stats', StatId.AllAttributes],
    ['str', 0],
  ])('maps corruption key %s to stat %i', (key, id) => {
    expect(getStatIdForCorruptionStatKey(key)).toBe(id);
  });

  it('treats an unmapped key as a modifier name', () => {
    expect(getStatIdForCorruptionStatKey('fastercastrate')).toBe(105);
  });

  it('returns null when neither mapping nor modifier exists', () => {
    expect(getStatIdForCorruptionStatKey('no-such-key')).toBeNull();
  });
});
