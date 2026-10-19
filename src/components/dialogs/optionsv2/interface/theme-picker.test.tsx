// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { DEFAULT_THEME_ID, THEMES } from '@/lib/themes';
import { createOptionsStore, type OptionsStore } from '../test-utils';
import { ThemePicker } from './theme-picker';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));

let store: OptionsStore;

function renderPicker(settings: Partial<ISettings>, isLoading = false) {
  store = createOptionsStore(settings, isLoading);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  return render(<ThemePicker />);
}

const radios = () => within(screen.getByRole('radiogroup', { name: 'Color theme' })).getAllByRole('radio');
const checked = () => radios().filter((r) => r.getAttribute('aria-checked') === 'true');
const label = (id: string) => {
  const t = THEMES.find((x) => x.id === id)!;
  return `${t.name} (${t.mode})`;
};

const darkThemes = THEMES.filter((t) => t.mode === 'dark');
const lightThemes = THEMES.filter((t) => t.mode === 'light');

afterEach(cleanup);

describe('ThemePicker', () => {
  it('renders nothing while settings load', () => {
    const { container } = renderPicker({ themeId: DEFAULT_THEME_ID }, true);
    expect(container.innerHTML).toBe('');
  });

  it('marks the saved theme as the single checked option and names it as current', () => {
    const theme = lightThemes[1];
    renderPicker({ themeId: theme.id });
    expect(checked().map((r) => r.getAttribute('aria-label'))).toEqual([label(theme.id)]);
    expect(screen.getByText('Current:').textContent).toContain(theme.name);
  });

  it('falls back to the default theme for an unknown saved id', () => {
    renderPicker({ themeId: 'no-such-theme' });
    expect(checked().map((r) => r.getAttribute('aria-label'))).toEqual([label(DEFAULT_THEME_ID)]);
  });

  it('applies a clicked theme and re-checks it', () => {
    renderPicker({ themeId: DEFAULT_THEME_ID });
    const target = darkThemes[2];
    fireEvent.click(screen.getByRole('radio', { name: label(target.id) }));
    expect(store.updateSettings).toHaveBeenCalledWith({ themeId: target.id });
    expect(checked().map((r) => r.getAttribute('aria-label'))).toEqual([label(target.id)]);
  });

  it('does not re-save when the current theme is clicked', () => {
    renderPicker({ themeId: DEFAULT_THEME_ID });
    fireEvent.click(screen.getByRole('radio', { name: label(DEFAULT_THEME_ID) }));
    expect(store.updateSettings).not.toHaveBeenCalled();
  });

  it('filters the grid by mode', () => {
    renderPicker({ themeId: DEFAULT_THEME_ID });
    expect(radios()).toHaveLength(THEMES.length);

    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(radios().map((r) => r.getAttribute('aria-label'))).toEqual(lightThemes.map((t) => label(t.id)));

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(radios()).toHaveLength(darkThemes.length);
  });

  it('keeps one tab stop when the current theme is filtered out', () => {
    renderPicker({ themeId: darkThemes[0].id });
    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    const tabStops = radios().filter((r) => r.tabIndex === 0);
    expect(tabStops.map((r) => r.getAttribute('aria-label'))).toEqual([label(lightThemes[0].id)]);
  });

  it('arrow keys move focus and apply the neighbour, wrapping at the ends', () => {
    renderPicker({ themeId: THEMES[0].id });
    fireEvent.keyDown(radios()[0], { key: 'ArrowLeft' });
    const last = THEMES[THEMES.length - 1];
    expect(store.updateSettings).toHaveBeenLastCalledWith({ themeId: last.id });
    expect(document.activeElement?.getAttribute('aria-label')).toBe(label(last.id));

    fireEvent.keyDown(radios()[THEMES.length - 1], { key: 'ArrowDown' });
    expect(store.updateSettings).toHaveBeenLastCalledWith({ themeId: THEMES[0].id });
  });

  it('Home/End jump within the filtered list; other keys are ignored', () => {
    renderPicker({ themeId: lightThemes[3].id });
    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    fireEvent.keyDown(radios()[3], { key: 'Home' });
    expect(store.updateSettings).toHaveBeenLastCalledWith({ themeId: lightThemes[0].id });
    fireEvent.keyDown(radios()[0], { key: 'End' });
    expect(store.updateSettings).toHaveBeenLastCalledWith({ themeId: lightThemes[lightThemes.length - 1].id });

    store.updateSettings.mockClear();
    fireEvent.keyDown(radios()[0], { key: 'a' });
    expect(store.updateSettings).not.toHaveBeenCalled();
  });
});
