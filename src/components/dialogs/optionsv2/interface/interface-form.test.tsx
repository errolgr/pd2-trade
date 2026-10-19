// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { createOptionsStore, type OptionsStore } from '../test-utils';
import { InterfaceForm } from './interface-form';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));

let store: OptionsStore;

function renderForm(settings: Partial<ISettings>, isLoading = false) {
  store = createOptionsStore(settings, isLoading);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  return render(<InterfaceForm />);
}

const overlaySwitch = () => screen.getByRole('switch', { name: 'Chat Button Overlay' });

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const transparency = () => screen.getByRole('slider');

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.documentElement.style.removeProperty('--window-opacity');
  document.documentElement.style.removeProperty('--window-opacity-elevated');
});

describe('InterfaceForm', () => {
  it('shows no switch while loading', () => {
    renderForm({}, true);
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('treats a missing setting as enabled', () => {
    renderForm({});
    expect(overlaySwitch().getAttribute('aria-checked')).toBe('true');
  });

  it('saves the toggled overlay state', async () => {
    renderForm({ chatButtonOverlayEnabled: true });
    fireEvent.click(overlaySwitch());
    expect(overlaySwitch().getAttribute('aria-checked')).toBe('false');
    await advance(300);
    expect(store.updateSettings).toHaveBeenCalledWith({ chatButtonOverlayEnabled: false, windowTransparency: 0 });
  });

  it('starts opaque when transparency was never set', () => {
    renderForm({});
    expect(transparency().getAttribute('aria-valuenow')).toBe('0');
    expect(screen.getByText(/Window transparency/).textContent).toContain('0%');
  });

  it('previews transparency right away and saves it once after a drag, capped at 90%', async () => {
    renderForm({ chatButtonOverlayEnabled: true, windowTransparency: 80 });
    fireEvent.keyDown(transparency(), { key: 'ArrowRight' });
    fireEvent.keyDown(transparency(), { key: 'ArrowRight' });
    fireEvent.keyDown(transparency(), { key: 'ArrowRight' });
    expect(screen.getByText(/Window transparency/).textContent).toContain('90%');
    const root = document.documentElement.style;
    expect([root.getPropertyValue('--window-opacity'), root.getPropertyValue('--window-opacity-elevated')]).toEqual([
      '10%',
      '70%',
    ]);
    expect(store.updateSettings).not.toHaveBeenCalled();
    await advance(300);
    expect(store.updateSettings).toHaveBeenCalledExactlyOnceWith({
      chatButtonOverlayEnabled: true,
      windowTransparency: 90,
    });
  });

  it('reflects external changes without saving them back', async () => {
    renderForm({ chatButtonOverlayEnabled: true });
    act(() => store.replace({ chatButtonOverlayEnabled: false }));
    expect(overlaySwitch().getAttribute('aria-checked')).toBe('false');
    await advance(300);
    expect(store.updateSettings).not.toHaveBeenCalled();
  });
});
