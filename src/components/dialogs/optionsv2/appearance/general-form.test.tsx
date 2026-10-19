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
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(invoke).mockImplementation(async (cmd: string) => {
    if (cmd === 'auto_detect_diablo2_directory') return detected;
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

  it('does not attempt detection outside Tauri', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    await renderForm();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Auto-Detect/ })));
    expect(vi.mocked(invoke)).not.toHaveBeenCalled();
    expect(vi.mocked(showToast)).not.toHaveBeenCalled();
  });
});
