// @vitest-environment happy-dom
import { cleanup, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ISettings, useOptions } from '@/hooks/useOptions';
import { DEFAULT_THEME_ID, getTheme, THEMES } from '@/lib/themes';
import { createOptionsStore, type OptionsStore } from '@/components/dialogs/optionsv2/test-utils';
import type { PaletteItem, PaletteRunContext, PaletteSourceInput } from '../lib/types';
import i18n from '@/i18n';
import { settingTier, useSettingsSource } from './settings';
import { SETTINGS_REGISTRY } from './settings-registry';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));

let store: OptionsStore;

function renderSource(settings: Partial<ISettings>, over: Partial<PaletteSourceInput> = {}) {
  store = createOptionsStore({ themeId: DEFAULT_THEME_ID, ...settings });
  vi.mocked(useOptions).mockImplementation(store.useOptions as never);
  return renderHook((input: PaletteSourceInput) => useSettingsSource(input), {
    initialProps: { query: '', scope: null, limit: 8, refs: [], ...over },
  });
}

const context = () => ({ openPanel: vi.fn(), close: vi.fn(), scope: vi.fn() }) satisfies PaletteRunContext;
const ids = (items: PaletteItem[]) => items.map((item) => item.ref.id);
const text = (node: ReactNode) => render(<>{node}</>).container.textContent;

afterEach(cleanup);

describe('SETTINGS_REGISTRY', () => {
  it('names each setting once, by a label or an existing key, under existing headings', () => {
    const keys = SETTINGS_REGISTRY.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const entry of SETTINGS_REGISTRY) {
      expect(!!entry.label !== !!entry.labelKey, entry.key).toBe(true);
      for (const key of [entry.labelKey, ...(entry.groupKeys ?? [])].filter(Boolean)) {
        expect(i18n.exists(key!), `${entry.key}: ${key}`).toBe(true);
      }
    }
  });
});

describe('settingTier', () => {
  it('ranks a label prefix over a label word start over a label substring over a keyword or section match', () => {
    const extras = ['Interface', 'Overlays', 'floating'];
    const tiers = [
      settingTier('Chat Button Overlay', extras, 'chat'),
      settingTier('Chat Button Overlay', extras, 'button'),
      settingTier('Chat Button Overlay', extras, 'utton'),
      settingTier('Chat Button Overlay', extras, 'float'),
    ];
    expect(tiers).toEqual([...tiers].sort((a, b) => b - a));
    expect(new Set(tiers).size).toBe(4);
    expect(tiers[3]).toBeGreaterThan(0);
  });

  it('matches every query word across the label and the extras, and nothing else', () => {
    expect(settingTier('Timer position', ['Corrupted zone timer'], 'zone position')).toBeGreaterThan(0);
    expect(settingTier('Timer position', ['Corrupted zone timer'], 'zone volume')).toBe(0);
  });
});

describe('useSettingsSource', () => {
  it('ranks matching settings by tier and caps at the limit', () => {
    const { result } = renderSource({}, { query: 'sound', limit: 3 });
    // "Market Alert Sound": a label word; the chat sounds only by keyword
    expect(ids(result.current.items)[0]).toBe('settings:marketAlertSoundEnabled');
    expect(result.current.items).toHaveLength(3);
    expect(result.current.loading).toBe(false);
  });

  it('shows the theme with its current theme trailing and drills into the theme list', () => {
    const theme = THEMES[3];
    const { result } = renderSource({ themeId: theme.id }, { query: 'theme' });
    const item = result.current.items[0];
    expect(item.ref).toMatchObject({ id: 'settings:themeId', title: 'Theme', data: { key: 'themeId' } });
    expect(text(item.trailing)).toBe(theme.name);

    const ctx = context();
    item.primary.run(ctx);
    expect(item.primary.keepOpen).toBe(true);
    expect(ctx.scope).toHaveBeenCalledWith({ group: 'settings', param: 'setting:themeId', label: 'Theme' });
    expect(store.updateSettings).not.toHaveBeenCalled();
  });

  it('lists a select’s options while scoped to it, marks the current one and sets the picked one', () => {
    const current = getTheme(THEMES[0].id);
    const { result } = renderSource(
      { themeId: current.id },
      { scope: { group: 'settings', param: 'setting:themeId' }, limit: 100 },
    );
    const items = result.current.items;
    expect(items.map((item) => item.ref.title)).toEqual(THEMES.map((theme) => theme.name));
    expect(items.filter((item) => item.badge).map((item) => item.ref.title)).toEqual([current.name]);

    const target = items[2];
    expect(target.primary.keepOpen).toBe(true);
    target.primary.run(context());
    expect(store.updateSettings).toHaveBeenCalledWith({ themeId: THEMES[2].id });
  });

  it('filters a select’s options by the query and saves numeric selects as numbers', () => {
    const { result } = renderSource(
      { priceWindowHours: 168 },
      { scope: { group: 'settings', param: 'setting:priceWindowHours' }, query: '30' },
    );
    expect(result.current.items.map((item) => item.ref.data?.value)).toEqual(['720']);
    result.current.items[0].primary.run(context());
    expect(store.updateSettings).toHaveBeenCalledWith({ priceWindowHours: 720 });
  });

  it('flips a switch in place and keeps the palette open', () => {
    const { result } = renderSource({ chatButtonOverlayEnabled: true }, { query: 'chat button' });
    const item = result.current.items[0];
    expect(item.ref.id).toBe('settings:chatButtonOverlayEnabled');
    expect(render(<>{item.trailing}</>).container.querySelector('[data-state]')?.getAttribute('data-state')).toBe(
      'checked',
    );
    expect(item.primary.keepOpen).toBe(true);
    item.primary.run(context());
    expect(store.updateSettings).toHaveBeenCalledWith({ chatButtonOverlayEnabled: false });
    expect(item.actions?.map((action) => action.id)).toEqual(['open-settings']);
  });

  it('opens Settings on a switch the form greys out instead of flipping it', () => {
    const { result } = renderSource({ whisperNotificationTiming: 'never' }, { query: 'trade notifications' });
    const item = result.current.items[0];
    expect(item.ref.id).toBe('settings:tradeNotificationsEnabled');
    const ctx = context();
    item.primary.run(ctx);
    expect(store.updateSettings).not.toHaveBeenCalled();
    expect(ctx.openPanel).toHaveBeenCalledWith('settings', { section: 'Chat', field: 'tradeNotificationsEnabled' });
  });

  it('jumps to a slider’s row in Settings, its label without markup', () => {
    const { result } = renderSource({ windowTransparency: 20 }, { query: 'window transparency' });
    const item = result.current.items[0];
    expect(item.ref.title).toBe('Window transparency: 20%');
    expect(item.primary.keepOpen).toBeFalsy();
    const ctx = context();
    item.primary.run(ctx);
    expect(ctx.openPanel).toHaveBeenCalledWith('settings', { section: 'Interface', field: 'windowTransparency' });
  });

  it('shows a hotkey’s combo, and Off when unbound', () => {
    const { result } = renderSource({ hotkeyModifierPalette: 'alt', hotkeyKeyPalette: 'space', hotkeyKeyBuilds: '' }, {
      query: 'command palette',
    });
    expect(text(result.current.items[0].trailing)).toBe('Alt+Space');
    const builds = renderSource({ hotkeyKeyBuilds: '' }, { query: 'builds' }).result.current.items;
    expect(text(builds.find((item) => item.ref.id === 'settings:hotkeyKeyBuilds')?.trailing)).toBe('Off');
  });

  it('resolves recents and pins in order, dropping refs that no longer resolve', () => {
    const { result } = renderSource(
      { corruptedZoneAlerts: 'off' },
      {
        refs: [
          { id: 'settings:themeId=x', group: 'settings', title: 'gone', data: { key: 'themeId', value: 'no-such-theme' } },
          { id: 'settings:mode=hardcore', group: 'settings', title: 'Hardcore', data: { key: 'mode', value: 'hardcore' } },
          // Hidden while zone notifications are off, like the form's row
          { id: 'settings:corruptedZoneAlertLeadMinutes', group: 'settings', title: 'x', data: { key: 'corruptedZoneAlertLeadMinutes' } },
          { id: 'settings:debugLoggingEnabled', group: 'settings', title: 'Debug', data: { key: 'debugLoggingEnabled' } },
        ],
      },
    );
    expect(ids(result.current.items)).toEqual(['settings:mode=hardcore', 'settings:debugLoggingEnabled']);
  });

  it('answers nothing while settings load', () => {
    store = createOptionsStore({}, true);
    vi.mocked(useOptions).mockImplementation(store.useOptions as never);
    const { result } = renderHook(() => useSettingsSource({ query: 'theme', scope: null, limit: 5, refs: [] }));
    expect(result.current.items).toEqual([]);
  });
});
