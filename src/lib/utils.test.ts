import { describe, expect, it } from 'vitest';
import { cn, formatHr, formatWithUnderscore } from './utils';

describe('cn', () => {
  it('drops falsy classes and lets later Tailwind utilities win conflicts', () => {
    expect(cn('px-2 text-sm', false, undefined, { hidden: false, block: true }, 'px-4')).toBe('text-sm block px-4');
  });
});

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
