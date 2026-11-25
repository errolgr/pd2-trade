// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@/overlay';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { createOptionsStore, type OptionsStore } from '../test-utils';
import { GeneralForm } from './general-form';

vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(), invoke: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
// vi.mock factories are hoisted above static imports, so the shim must be loaded inside the factory.
vi.mock('@/components/ui/select', async () => (await import('../test-utils')).selectShim);

const BASE: Partial<ISettings> = { mode: 'softcore', ladder: 'ladder', diablo2Directory: '' };

let store: OptionsStore;
let detected: string | null;
let picked: string | null;
let checks: Record<string, { status: string; resolved: string | null }>;

async function renderForm(settings: Partial<ISettings> = BASE, isLoading = false) {
  store = createOptionsStore(settings, isLoading);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  const view = render(<GeneralForm />);
  await act(async () => {}); // settle the mount-time auto-detect
  return view;
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement;
const dirInput = () => screen.getByPlaceholderText('C:\\Diablo II') as HTMLInputElement;

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-05-01T12:00:00Z') });
  detected = null;
  picked = null;
  checks = {};
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(invoke).mockImplementation(async (cmd: string, args?: unknown) => {
    if (cmd === 'auto_detect_diablo2_directory') return detected;
    if (cmd === 'pick_diablo2_directory') return picked;
    if (cmd === 'check_diablo2_directory') {
      const { path } = args as { path: string };
      return checks[path] ?? { status: 'valid', resolved: null };
    }
    throw new Error(`unexpected ${cmd}`);
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('GeneralForm', () => {
  it('shows a skeleton while loading', async () => {
    await renderForm(BASE, true);
    expect(screen.queryByLabelText('Ladder')).toBeNull();
  });

  it('saves a changed field only after the 500ms debounce', async () => {
    await renderForm();
    fireEvent.change(select('Mode'), { target: { value: 'hardcore' } });
    await advance(499);
    expect(store.updateSettings).not.toHaveBeenCalled();
    await advance(1);
    expect(store.updateSettings).toHaveBeenCalledTimes(1);
    expect(store.updateSettings.mock.calls[0][0]).toMatchObject({ mode: 'hardcore', ladder: 'ladder' });
  });

  it('coalesces rapid typing into one save with the final text', async () => {
    await renderForm();
    for (const value of ['C', 'C:', 'C:\\D2']) {
      fireEvent.change(dirInput(), { target: { value } });
      await advance(200);
    }
    await advance(500);
    expect(store.updateSettings).toHaveBeenCalledTimes(1);
    expect(store.updateSettings.mock.calls[0][0].diablo2Directory).toBe('C:\\D2');
  });

  it('does not save when an edit is reverted before the debounce fires', async () => {
    await renderForm();
    fireEvent.change(select('Ladder'), { target: { value: 'non-ladder' } });
    fireEvent.change(select('Ladder'), { target: { value: 'ladder' } });
    await advance(600);
    expect(store.updateSettings).not.toHaveBeenCalled();
  });

  it('saves the season and debug logging immediately', async () => {
    await renderForm();
    expect(select('Season').value).toBe('current');
    fireEvent.change(select('Season'), { target: { value: 's12' } });
    expect(store.updateSettings).toHaveBeenLastCalledWith({ selectedSeasonId: 's12' });

    fireEvent.click(screen.getByRole('switch', { name: 'Debug Logging' }));
    expect(store.updateSettings).toHaveBeenLastCalledWith({ debugLoggingEnabled: true });
  });

  it('shows the auto-detected directory as a hint only while the field is empty', async () => {
    detected = 'D:\\Games\\Diablo II';
    await renderForm();
    expect(screen.queryByText('Detected: D:\\Games\\Diablo II')).not.toBeNull();

    fireEvent.change(dirInput(), { target: { value: 'E:\\D2' } });
    expect(screen.queryByText(/Detected:/)).toBeNull();
  });

  it('Auto-Detect fills the field and the debounced save persists it', async () => {
    await renderForm();
    detected = 'D:\\D2';
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Auto-Detect/ })));
    expect(dirInput().value).toBe('D:\\D2');
    await advance(500);
    expect(store.updateSettings.mock.calls[0][0].diablo2Directory).toBe('D:\\D2');
  });

  it('Auto-Detect warns when nothing is found and leaves the field alone', async () => {
    await renderForm({ ...BASE, diablo2Directory: 'C:\\Old' });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Auto-Detect/ })));
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'warning' }));
    expect(dirInput().value).toBe('C:\\Old');
  });

  it('Browse fills the field with the picked folder, starting from the current one', async () => {
    await renderForm({ ...BASE, diablo2Directory: 'C:\\Old' });
    picked = 'D:\\Picked';
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Browse/ })));
    expect(invoke).toHaveBeenCalledWith('pick_diablo2_directory', { current: 'C:\\Old' });
    expect(dirInput().value).toBe('D:\\Picked');
    await advance(500);
    expect(store.updateSettings.mock.calls[0][0].diablo2Directory).toBe('D:\\Picked');
  });

  it('a cancelled Browse leaves the field alone', async () => {
    await renderForm({ ...BASE, diablo2Directory: 'C:\\Old' });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Browse/ })));
    expect(dirInput().value).toBe('C:\\Old');
  });

  it('Clear empties the field so the directory is auto-detected again', async () => {
    await renderForm({ ...BASE, diablo2Directory: '/home/u/Games/project-diablo-2' });
    fireEvent.click(screen.getByRole('button', { name: /Clear/ }));
    expect(dirInput().value).toBe('');
    expect(screen.queryByRole('button', { name: /Clear/ })).toBeNull();
    await advance(500);
    expect(store.updateSettings.mock.calls[0][0].diablo2Directory).toBe('');
  });

  it('offers the install inside a Wine prefix and applies it', async () => {
    const prefix = '/home/u/Games/project-diablo-2';
    const install = `${prefix}/drive_c/Program Files (x86)/Diablo II`;
    checks[prefix] = { status: 'winePrefix', resolved: install };
    await renderForm({ ...BASE, diablo2Directory: prefix });
    await advance(300);
    expect(screen.getByRole('alert').textContent).toContain(`Wine prefix. Diablo II is installed in ${install}`);

    fireEvent.click(screen.getByRole('button', { name: 'Use this folder' }));
    expect(dirInput().value).toBe(install);
    expect(screen.queryByRole('alert')).toBeNull();
    await advance(300);
    expect(screen.queryByText('Diablo II installation found.')).not.toBeNull();
  });

  it('checks typed paths once typing pauses and flags folders without Diablo II', async () => {
    checks['C:\\Nope'] = { status: 'missing', resolved: null };
    checks['C:\\Games'] = { status: 'notInstall', resolved: null };
    await renderForm();
    fireEvent.change(dirInput(), { target: { value: 'C:\\Nope' } });
    await advance(299);
    expect(invoke).not.toHaveBeenCalledWith('check_diablo2_directory', expect.anything());
    await advance(1);
    expect(screen.getByRole('alert').textContent).toContain('This folder does not exist.');

    fireEvent.change(dirInput(), { target: { value: 'C:\\Games' } });
    expect(screen.queryByRole('alert')).toBeNull();
    await advance(300);
    expect(screen.getByRole('alert').textContent).toContain('No Diablo II installation here');
  });

  it('does not attempt detection outside Tauri', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    await renderForm();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Auto-Detect/ })));
    expect(vi.mocked(invoke)).not.toHaveBeenCalled();
    expect(vi.mocked(showToast)).not.toHaveBeenCalled();
  });
});
