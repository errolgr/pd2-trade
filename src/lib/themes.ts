/**
 * Theme runtime. Theme definitions and token names live in `@pd2-trader/ui/tokens`.
 *
 * `applyTheme` writes the vars inline on `<html>`, sets `data-theme`, the `dark`/`light` class and
 * `color-scheme`, and caches the id in localStorage so `initTheme()` (called from main.tsx before the first
 * render) can paint the right theme immediately in every window while settings load from disk. The static
 * default in `:root` (generated `@pd2-trader/ui/tailwind.css`) is the default theme.
 */

import { useSyncExternalStore, type CSSProperties } from 'react';
import { getTheme, THEME_TOKENS, type Theme, type ThemeMode } from '@pd2-trader/ui/tokens';

export const THEME_STORAGE_KEY = 'pd2-theme-id';

/** Inline style object applying a theme's vars to a subtree (used by picker previews). */
export function themeStyle(theme: Theme): CSSProperties {
  const style: Record<string, string> = {};
  for (const token of THEME_TOKENS) style[`--${token}`] = theme.vars[token];
  return style as CSSProperties;
}

/** Themes outside the built-in list (installed theme plugins, PRD B8), keyed by theme id (`plugin:<id>`). */
let extraThemes: ReadonlyMap<string, Theme> = new Map();

export function setExtraThemes(themes: readonly Theme[]): void {
  extraThemes = new Map(themes.map((theme) => [theme.id, theme]));
}

export function getExtraThemes(): Theme[] {
  return [...extraThemes.values()];
}

/** A built-in or plugin theme by id; unknown ids fall back to the default theme. */
export function resolveTheme(id?: string): Theme {
  return (id && extraThemes.get(id)) || getTheme(id);
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  for (const token of THEME_TOKENS) root.style.setProperty(`--${token}`, theme.vars[token]);
  root.dataset.theme = theme.id;
  root.classList.toggle('dark', theme.mode === 'dark');
  root.classList.toggle('light', theme.mode === 'light');
  root.style.colorScheme = theme.mode;
  try {
    if (localStorage.getItem(THEME_STORAGE_KEY) !== theme.id) localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  } catch {
    // localStorage unavailable: first paint falls back to the :root default.
  }
}

/** Settings → Interface → Window transparency: 0% (opaque, the default) up to this many percent. */
export const WINDOW_TRANSPARENCY_MAX = 90;
const WINDOW_TRANSPARENCY_STORAGE_KEY = 'pd2-window-transparency';

/** Clamps a saved transparency (percent) to 0..WINDOW_TRANSPARENCY_MAX; anything invalid is opaque. */
export function clampWindowTransparency(percent: number | undefined): number {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return 0;
  return Math.min(WINDOW_TRANSPARENCY_MAX, Math.max(0, Math.round(percent)));
}

/**
 * Sets `--window-opacity` (panels) and `--window-opacity-elevated` (popovers, tooltips, toasts: a third of
 * the transparency) on `<html>` and caches the value for `initTheme`'s first paint.
 */
export function applyWindowTransparency(
  percent: number | undefined,
  root: HTMLElement = document.documentElement,
): void {
  const transparency = clampWindowTransparency(percent);
  root.style.setProperty('--window-opacity', `${100 - transparency}%`);
  root.style.setProperty('--window-opacity-elevated', `${Math.round(100 - transparency / 3)}%`);
  try {
    localStorage.setItem(WINDOW_TRANSPARENCY_STORAGE_KEY, String(transparency));
  } catch {
    // localStorage unavailable: first paint falls back to opaque.
  }
}

function readStoredWindowTransparency(): number {
  try {
    return clampWindowTransparency(Number(localStorage.getItem(WINDOW_TRANSPARENCY_STORAGE_KEY) ?? 0));
  } catch {
    return 0;
  }
}

function readStoredThemeId(): string | undefined {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Called once from main.tsx before the first render: applies the cached theme
 * synchronously (no flash of the default theme). Later changes are applied by
 * OptionsProvider from its settings state.
 */
export function initTheme(): void {
  applyTheme(getTheme(readStoredThemeId()));
  applyWindowTransparency(readStoredWindowTransparency());
}

const readMode = (): ThemeMode => (document.documentElement.classList.contains('light') ? 'light' : 'dark');
const subscribeMode = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
};

/** Mode ('dark' | 'light') of the theme currently applied to <html>; re-renders on theme changes. */
export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribeMode, readMode, () => 'dark');
}
