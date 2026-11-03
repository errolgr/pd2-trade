import { describe, expect, it } from 'vitest';
import { formatWithUnderscore } from './utils';

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
