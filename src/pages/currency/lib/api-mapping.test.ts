import { describe, expect, it } from 'vitest';
import { RUNE_NAME_TO_BASE_CODE } from './api-mapping';

describe('RUNE_NAME_TO_BASE_CODE', () => {
  it('maps the 33 runes to unique, contiguous codes r01..r33 in rune order', () => {
    const codes = Object.values(RUNE_NAME_TO_BASE_CODE);
    expect(codes).toEqual(Array.from({ length: 33 }, (_, i) => `r${String(i + 1).padStart(2, '0')}`));
    expect(RUNE_NAME_TO_BASE_CODE['El Rune']).toBe('r01');
    expect(RUNE_NAME_TO_BASE_CODE['Ber Rune']).toBe('r30');
    expect(RUNE_NAME_TO_BASE_CODE['Zod Rune']).toBe('r33');
  });
});
