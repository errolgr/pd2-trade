// @vitest-environment happy-dom
import * as React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@/overlay';
import { startDebugLogging, stopDebugLogging } from '@/lib/debug-logger';
import { applyTheme, getTheme } from '@/lib/themes';
import type * as Themes from '@/lib/themes';
import { mkdir, writeTextFile } from '@/lib/browser-fs';
import { OptionsProvider, useOptions } from './useOptions';

const state = vi.hoisted(() => ({
  files: new Map<string, string>(),
  dirExists: true,
  tauri: true,
  failWrite: false,
}));

vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => state.tauri, invoke: vi.fn() }));
vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(async (path: string) => (path === '' ? state.dirExists : state.files.has(path))),
  mkdir: vi.fn(async () => {
    state.dirExists = true;
  }),
  readTextFile: vi.fn(async (path: string) => {
    const content = state.files.get(path);
    if (content === undefined) throw new Error(`not found: ${path}`);
    return content;
  }),
  writeTextFile: vi.fn(async (path: string, content: string) => {
    if (state.failWrite) throw new Error('disk full');
    state.files.set(path, content);
  }),
}));
vi.mock('@/lib/debug-logger', () => ({ startDebugLogging: vi.fn(), stopDebugLogging: vi.fn() }));
vi.mock('@/lib/themes', async (importOriginal) => ({
  ...(await importOriginal<typeof Themes>()),
  applyTheme: vi.fn(),
}));
vi.mock('@/components/dialogs/optionsv2/options-layout', () => ({ default: () => null }));

const wrapper = ({ children }: { children: React.ReactNode }) => <OptionsProvider>{children}</OptionsProvider>;

function savedSettings() {
  return JSON.parse(state.files.get('settings.json') ?? 'null');
}

async function renderLoaded() {
  const view = renderHook(() => useOptions(), { wrapper });
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
}

beforeEach(() => {
  state.files.clear();
  state.dirExists = true;
  state.tauri = true;
  state.failWrite = false;
  // Serialize like the Web Locks API: each request runs after the previous one settles
  let chain: Promise<unknown> = Promise.resolve();
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: (_name: string, cb: () => Promise<unknown>) => {
        const run = chain.then(cb);
        chain = run.catch(() => {});
        return run;
      },
    },
  });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('OptionsProvider loading', () => {
  it('creates the config dir and a defaults file on first run', async () => {
    state.dirExists = false;
    const { result } = await renderLoaded();

    expect(mkdir).toHaveBeenCalledTimes(1);
    expect(savedSettings()).toEqual(result.current.settings);
    expect(result.current.settings.hotkeyKey).toBe('d');
    expect(result.current.settings.mode).toBe('softcore');
  });

  it('reports loading until the file has been read', async () => {
    state.files.set('settings.json', JSON.stringify({ hotkeyKey: 'q' }));
    const { result } = renderHook(() => useOptions(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.settings.hotkeyKey).toBe('q');
  });

  it('keeps saved values and fills missing keys from defaults, writing the result back', async () => {
    state.files.set('settings.json', JSON.stringify({ hotkeyKey: 'q', mode: 'hardcore', pd2Token: 'tok' }));
    const { result } = await renderLoaded();

    expect(result.current.settings).toMatchObject({
      hotkeyKey: 'q',
      mode: 'hardcore',
      pd2Token: 'tok',
      ladder: 'ladder',
      hotkeyKeyListItem: 'l',
      whisperNotificationVolume: 70,
    });
    expect(savedSettings()).toEqual(result.current.settings);
  });

  it('does not rewrite a file that already has every default key', async () => {
    state.dirExists = false;
    await renderLoaded();
    cleanup();
    vi.mocked(writeTextFile).mockClear();

    await renderLoaded();
    expect(writeTextFile).not.toHaveBeenCalled();
  });

  it('falls back to defaults on a corrupt file without overwriting it', async () => {
    state.files.set('settings.json', '{not json');
    const { result } = await renderLoaded();

    expect(result.current.settings.hotkeyKey).toBe('d');
    expect(state.files.get('settings.json')).toBe('{not json');
  });

  it('preserves a shortened toastPopupTypes list across reloads', async () => {
    state.files.set('settings.json', JSON.stringify({ toastPopupTypes: ['whispers', 'trade'] }));
    const { result } = await renderLoaded();
    expect(result.current.settings.toastPopupTypes).toEqual(['whispers', 'trade']);
  });

  it('gives settings from before custom chat templates the default templates, and saves them', async () => {
    state.files.set('settings.json', JSON.stringify({ hotkeyKey: 'q' }));
    const { result } = await renderLoaded();
    expect(result.current.settings.chatTemplates?.map((t) => [t.name, !!t.favorite])).toEqual([
      ['Still available?', true],
      ['Sold, sorry', true],
      ['Inv me', true],
      ['ty gl', true],
      ['Price check', false],
    ]);
    expect(savedSettings().chatTemplates).toEqual(result.current.settings.chatTemplates);
  });

  it("keeps the user's own chat templates as saved (none starred for them), edited, deleted or none", async () => {
    const mine = [{ id: 'a', name: 'Hi', text: 'Hi {accountName}' }];
    state.files.set('settings.json', JSON.stringify({ chatTemplates: mine }));
    const { result } = await renderLoaded();
    expect(result.current.settings.chatTemplates).toEqual(mine);
    cleanup();

    state.files.set('settings.json', JSON.stringify({ chatTemplates: [] }));
    const reloaded = await renderLoaded();
    expect(reloaded.result.current.settings.chatTemplates).toEqual([]);
  });
});

describe('updateSettings', () => {
  it('persists the change and updates state', async () => {
    state.dirExists = false;
    const { result } = await renderLoaded();

    await act(() => result.current.updateSettings({ hotkeyKey: 'k' }));

    expect(result.current.settings.hotkeyKey).toBe('k');
    expect(savedSettings().hotkeyKey).toBe('k');
    expect(savedSettings().hotkeyKeyListItem).toBe('l');
    expect(savedSettings().mode).toBe('softcore');
  });

  it('merges onto the on-disk file so another window’s change is not lost', async () => {
    state.dirExists = false;
    const { result } = await renderLoaded();

    // Another window wrote a token after this one loaded
    state.files.set('settings.json', JSON.stringify({ ...savedSettings(), pd2Token: 'from-other-window' }));
    await act(() => result.current.updateSettings({ mode: 'hardcore' }));

    expect(savedSettings()).toMatchObject({ mode: 'hardcore', pd2Token: 'from-other-window' });
    expect(result.current.settings.pd2Token).toBe('from-other-window');
  });

  it('skips the write when nothing changed', async () => {
    state.dirExists = false;
    const { result } = await renderLoaded();
    vi.mocked(writeTextFile).mockClear();

    await act(() => result.current.updateSettings({ hotkeyKey: 'd' }));

    expect(writeTextFile).not.toHaveBeenCalled();
  });

  it('leaves state untouched when the write fails', async () => {
    state.dirExists = false;
    const { result } = await renderLoaded();
    state.failWrite = true;

    await act(() => result.current.updateSettings({ hotkeyKey: 'k' }));

    expect(result.current.settings.hotkeyKey).toBe('d');
  });

  it('writes onto defaults when the file vanished', async () => {
    state.files.set('settings.json', JSON.stringify({ hotkeyKey: 'q' }));
    const { result } = await renderLoaded();
    state.files.delete('settings.json');

    await act(() => result.current.updateSettings({ mode: 'hardcore' }));

    expect(savedSettings()).toMatchObject({ mode: 'hardcore', hotkeyKey: 'd' });
  });
});

describe('theme', () => {
  it('applies the saved theme only after settings load', async () => {
    state.files.set('settings.json', JSON.stringify({ themeId: 'no-such-theme' }));
    const view = renderHook(() => useOptions(), { wrapper });
    expect(applyTheme).not.toHaveBeenCalled();
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));

    // Unknown ids resolve to the default theme
    expect(vi.mocked(applyTheme).mock.calls.at(-1)?.[0].id).toBe(getTheme().id);
  });
});

describe('debug logging', () => {
  it('follows debugLoggingEnabled once settings load and when it is toggled', async () => {
    state.files.set('settings.json', JSON.stringify({ debugLoggingEnabled: true }));
    const view = renderHook(() => useOptions(), { wrapper });
    expect(startDebugLogging).not.toHaveBeenCalled();
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));
    expect(startDebugLogging).toHaveBeenCalledTimes(1);

    await act(() => view.result.current.updateSettings({ debugLoggingEnabled: false }));
    expect(stopDebugLogging).toHaveBeenCalledTimes(1);
  });
});

describe('browser token handoff', () => {
  beforeEach(() => {
    state.tauri = false;
    state.dirExists = false;
  });

  it('stores ?token=, strips it from the URL and keeps other params', async () => {
    window.history.replaceState({}, '', '/app?token=abc&tab=chat');
    const { result } = await renderLoaded();

    await waitFor(() => expect(result.current.settings.pd2Token).toBe('abc'));
    expect(savedSettings().pd2Token).toBe('abc');
    expect(window.location.search).toBe('?tab=chat');
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'PD2 Trader' }));
  });

  it('ignores a token that matches the stored one', async () => {
    state.dirExists = true;
    state.files.set('settings.json', JSON.stringify({ pd2Token: 'abc' }));
    window.history.replaceState({}, '', '/app?token=abc');
    await renderLoaded();

    expect(window.location.search).toBe('?token=abc');
    expect(showToast).not.toHaveBeenCalledWith(expect.anything());
  });

  it('is disabled inside Tauri', async () => {
    state.tauri = true;
    window.history.replaceState({}, '', '/app?token=abc');
    const { result } = await renderLoaded();

    expect(result.current.settings.pd2Token).toBeUndefined();
    expect(window.location.search).toBe('?token=abc');
  });
});

it('useOptions throws outside the provider', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => renderHook(() => useOptions())).toThrow('useOptions must be used within an OptionsProvider');
});
