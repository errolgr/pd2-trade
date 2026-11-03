import { describe, expect, it } from 'vitest';
import { TONES } from '@pd2-trader/plugin-sdk';
import { SLOT_TONES } from '@pd2-trader/ui';

describe('slot tones', () => {
  it('every SDK tone is a design-system slot tone and back', () => {
    expect([...TONES].sort()).toEqual([...SLOT_TONES].sort());
  });
});
