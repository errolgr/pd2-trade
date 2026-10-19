// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  DEFAULT_THEME_ID,
  getTheme,
  initTheme,
  THEME_STORAGE_KEY,
  THEME_TOKENS,
  THEMES,
  themeStyle,
  useThemeMode,
} from './themes';

const root = document.documentElement;
const darkTheme = THEMES.find((t) => t.mode === 'dark' && t.id !== DEFAULT_THEME_ID)!;
const lightTheme = THEMES.find((t) => t.mode === 'light')!;

function resetRoot() {
  root.removeAttribute('style');
  root.removeAttribute('class');
  delete root.dataset.theme;
}

beforeEach(() => {});

afterEach(() => {
  cleanup();
  resetRoot();
  localStorage.clear();
});

describe('theme registry', () => {
  it('has unique ids, both modes, and the default theme present', () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(THEMES.some((t) => t.mode === 'dark')).toBe(true);
    expect(THEMES.some((t) => t.mode === 'light')).toBe(true);
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
});

describe('getTheme', () => {
  it('returns the matching theme or falls back to the default for unknown/missing ids', () => {
    expect(getTheme(lightTheme.id)).toBe(lightTheme);
    expect(getTheme('no-such-theme').id).toBe(DEFAULT_THEME_ID);
    expect(getTheme(undefined).id).toBe(DEFAULT_THEME_ID);
  });
});

describe('themeStyle', () => {
  it('maps every token to a --token custom property', () => {
    const style = themeStyle(lightTheme) as Record<string, string>;

    expect(Object.keys(style)).toHaveLength(THEME_TOKENS.length);
    expect(style['--background']).toBe(lightTheme.vars.background);
    expect(style['--primary']).toBe(lightTheme.vars.primary);
  });
});

describe('applyTheme', () => {
  it('writes vars, data-theme, mode class, color-scheme and persists the id', () => {
    applyTheme(lightTheme);

    expect(root.style.getPropertyValue('--background')).toBe(lightTheme.vars.background);
    expect(root.dataset.theme).toBe(lightTheme.id);
    expect(root.classList.contains('light')).toBe(true);
    expect(root.classList.contains('dark')).toBe(false);
    expect(root.style.colorScheme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(lightTheme.id);
  });

  it('switching mode swaps the mode class rather than accumulating both', () => {
    applyTheme(lightTheme);
    applyTheme(darkTheme);

    expect(root.classList.contains('dark')).toBe(true);
    expect(root.classList.contains('light')).toBe(false);
    expect(root.style.getPropertyValue('--background')).toBe(darkTheme.vars.background);
  });

  it('targets a custom root without touching <html>', () => {
    const el = document.createElement('div');

    applyTheme(lightTheme, el);

    expect(el.dataset.theme).toBe(lightTheme.id);
    expect(root.dataset.theme).toBeUndefined();
  });

  it('still applies when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(() => applyTheme(lightTheme)).not.toThrow();
    expect(root.dataset.theme).toBe(lightTheme.id);
  });
});

describe('initTheme', () => {
  it('applies the cached theme before settings load', () => {
    localStorage.setItem(THEME_STORAGE_KEY, lightTheme.id);

    initTheme();

    expect(root.dataset.theme).toBe(lightTheme.id);
  });

  it('applies the default theme when nothing (or an unknown id) is cached', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'removed-theme');

    initTheme();

    expect(root.dataset.theme).toBe(DEFAULT_THEME_ID);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(DEFAULT_THEME_ID);
  });
});

describe('useThemeMode', () => {
  it('reflects the applied theme mode and re-renders on change', async () => {
    applyTheme(darkTheme);
    const { result } = renderHook(() => useThemeMode());
    expect(result.current).toBe('dark');

    await act(async () => {
      applyTheme(lightTheme);
      await Promise.resolve(); // MutationObserver records are delivered as a microtask
    });

    expect(result.current).toBe('light');
  });
});
