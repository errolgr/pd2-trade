import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_ID,
  DOMAIN_TOKENS,
  getTheme,
  SEMANTIC_TOKENS,
  SHAPE_TOKENS,
  THEME_TOKENS,
  THEMES,
} from './index';

const COLOR_TOKENS = THEME_TOKENS.filter((t) => !(SHAPE_TOKENS as readonly string[]).includes(t));

describe('token tiers', () => {
  it('partition THEME_TOKENS without duplicates', () => {
    expect(new Set(THEME_TOKENS).size).toBe(THEME_TOKENS.length);
    expect(THEME_TOKENS).toHaveLength(SEMANTIC_TOKENS.length + DOMAIN_TOKENS.length + SHAPE_TOKENS.length);
  });
});

describe('theme registry', () => {
  it('has 21 unique ids, both mode counts, and the default theme present', () => {
    expect(THEMES).toHaveLength(21);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(THEMES.filter((t) => t.mode === 'dark')).toHaveLength(11);
    expect(THEMES.filter((t) => t.mode === 'light')).toHaveLength(10);
    expect(getTheme(DEFAULT_THEME_ID).id).toBe(DEFAULT_THEME_ID);
  });

  it('defines every token with a non-empty value for every theme', () => {
    for (const theme of THEMES) {
      const missing = THEME_TOKENS.filter((token) => !theme.vars[token]?.trim());
      expect({ id: theme.id, missing }).toEqual({ id: theme.id, missing: [] });
    }
  });

  it('produces well-formed alpha colors (no doubled alpha or unbalanced parens)', () => {
    for (const theme of THEMES) {
      for (const token of THEME_TOKENS) {
        const value = theme.vars[token];
        const opens = (value.match(/\(/g) ?? []).length;
        const closes = (value.match(/\)/g) ?? []).length;
        expect({ id: theme.id, token, balanced: opens === closes }).toEqual({ id: theme.id, token, balanced: true });
        expect((value.match(/ \/ /g) ?? []).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('writes every color as oklch (inside color-mix/var expressions too)', () => {
    for (const theme of THEMES) {
      for (const [token, value] of [
        ...COLOR_TOKENS.map((t) => [t, theme.vars[t]] as const),
        ...theme.swatch.map((s, i) => [`swatch[${i}]`, s] as const),
      ]) {
        const literals = value.replace(/var\(--[a-z-]+\)/g, '').replace(/color-mix\(in oklab,|transparent\)?/g, '');
        const nonOklch = literals
          .replace(/oklch\(\d*\.?\d+ \d*\.?\d+ \d*\.?\d+( \/ \d*\.?\d+)?\)/g, '')
          .replace(/[\s,)]/g, '');
        expect({ id: theme.id, token, nonOklch }).toEqual({ id: theme.id, token, nonOklch: '' });
        expect(value).toContain('oklch(');
      }
    }
  });
});

describe('getTheme', () => {
  it('returns the matching theme or falls back to the default for unknown/missing ids', () => {
    const light = THEMES.find((t) => t.mode === 'light')!;
    expect(getTheme(light.id)).toBe(light);
    expect(getTheme('no-such-theme').id).toBe(DEFAULT_THEME_ID);
    expect(getTheme(undefined).id).toBe(DEFAULT_THEME_ID);
  });
});
