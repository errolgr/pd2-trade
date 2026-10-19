// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { isTauri } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { getVersion } from '@/lib/browser-app';
import { useUpdater } from '@/hooks/useUpdater';
import { openCenteredWindow } from '@/lib/window';
import { createOptionsStore, type OptionsStore } from '../test-utils';
import { AboutForm } from './about-form';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn() }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({ WebviewWindow: { getByLabel: vi.fn() } }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/lib/browser-app', () => ({ getVersion: vi.fn() }));
vi.mock('@/hooks/useUpdater', () => ({ useUpdater: vi.fn() }));
vi.mock('@/lib/window', () => ({ openCenteredWindow: vi.fn() }));

let store: OptionsStore;
const checkForUpdates = vi.fn();
const downloadUpdate = vi.fn();

async function renderForm(settings: Partial<ISettings> = { autoUpdateEnabled: true }, isLoading = false) {
  store = createOptionsStore(settings, isLoading);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  render(<AboutForm />);
  await act(async () => {});
}

const click = (name: RegExp | string) => act(async () => fireEvent.click(screen.getByRole('button', { name })));

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(getVersion).mockResolvedValue('1.4.0');
  vi.mocked(WebviewWindow.getByLabel).mockResolvedValue(null);
  checkForUpdates.mockReset();
  downloadUpdate.mockReset();
  vi.mocked(useUpdater).mockReturnValue({ checkForUpdates, downloadUpdate } as never);
});

afterEach(cleanup);

describe('AboutForm', () => {
  it('shows a skeleton while settings load', async () => {
    await renderForm({}, true);
    expect(screen.queryByText('PD2 Trader')).toBeNull();
  });

  it('shows the running version', async () => {
    await renderForm();
    expect(screen.queryByText('Version: 1.4.0')).not.toBeNull();
  });

  it('offers the update returned by a manual check and installs that update', async () => {
    const update = { available: true, version: '1.5.0' };
    checkForUpdates.mockResolvedValue(update);
    await renderForm();
    expect(screen.queryByText('You have the latest version')).not.toBeNull();

    await click(/Check for Updates/);
    expect(screen.queryByText(/Update Available \(v1\.5\.0\)/)).not.toBeNull();
    expect(screen.queryByText(/Last checked: \d+ seconds ago/)).not.toBeNull();

    await click(/Update Now \(v1\.5\.0\)/);
    expect(downloadUpdate).toHaveBeenCalledWith(update);
  });

  it('stays on "latest" when the check finds nothing', async () => {
    checkForUpdates.mockResolvedValue({ available: false });
    await renderForm();
    await click(/Check for Updates/);
    expect(screen.queryByText('You have the latest version')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /Update Now/ })).toBeNull();
  });

  it('disables the check button while checking and re-enables it after a failure', async () => {
    const { promise, reject } = Promise.withResolvers<unknown>();
    checkForUpdates.mockReturnValue(promise);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await renderForm();

    await click(/Check for Updates/);
    expect((screen.getByRole('button', { name: /Checking/ }) as HTMLButtonElement).disabled).toBe(true);

    await act(async () => reject(new Error('offline')));
    expect((screen.getByRole('button', { name: /Check for Updates/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(/Last checked/)).toBeNull();
  });

  it('toggles automatic updates', async () => {
    await renderForm({ autoUpdateEnabled: true });
    fireEvent.click(screen.getByRole('switch', { name: 'Automatic Updates' }));
    expect(store.updateSettings).toHaveBeenCalledWith({ autoUpdateEnabled: false });
    expect(screen.getByRole('switch', { name: 'Automatic Updates' }).getAttribute('aria-checked')).toBe('false');
  });

  it('treats an unset auto-update preference as on', async () => {
    await renderForm({});
    expect(screen.getByRole('switch', { name: 'Automatic Updates' }).getAttribute('aria-checked')).toBe('true');
  });

  it('re-shows an existing changelog window instead of opening another', async () => {
    const existing = { show: vi.fn(), setFocus: vi.fn() };
    vi.mocked(WebviewWindow.getByLabel).mockResolvedValue(existing as never);
    await renderForm();
    await click(/View Changelog/);
    expect(existing.show).toHaveBeenCalled();
    expect(existing.setFocus).toHaveBeenCalled();
    expect(openCenteredWindow).not.toHaveBeenCalled();
  });

  it('opens a new changelog window when none exists', async () => {
    await renderForm();
    await click(/View Changelog/);
    expect(vi.mocked(openCenteredWindow).mock.calls[0].slice(0, 2)).toEqual(['ChangeLog', '/change-log']);
  });

  it('in the browser hides update controls and opens the changelog directly', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    await renderForm();
    expect(screen.queryByRole('button', { name: /Check for Updates/ })).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Automatic Updates' })).toBeNull();
    await click(/View Changelog/);
    expect(WebviewWindow.getByLabel).not.toHaveBeenCalled();
    expect(openCenteredWindow).toHaveBeenCalledTimes(1);
  });
});
