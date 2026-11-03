import { describe, expect, it } from 'vitest';
import { formatHr, formatWithUnderscore } from './utils';

describe('formatWithUnderscore', () => {
  it.each([
    ['Harlequin Crest', 'Harlequin_Crest'],
    ["  Tal Rasha's Guardianship  ", 'Tal_Rashas_Guardianship'],
    ['Spirit - Monarch', 'Spirit_Monarch'],
    ['Hel--Ko', 'Hel_Ko'],
  ])('%j → %j', (input, expected) => {
    expect(formatWithUnderscore(input)).toBe(expected);
  });
});

describe('formatHr', () => {
  it('formats to two decimals with the HR unit', () => {
    expect(formatHr(1)).toBe('1.00 HR');
    expect(formatHr(0.125)).toBe('0.13 HR');
    expect(formatHr(12.3456)).toBe('12.35 HR');
  });
});
