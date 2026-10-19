// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

afterEach(cleanup);

describe('InterfaceForm', () => {
  it('shows no switch while loading', () => {
    renderForm({}, true);
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('treats a missing setting as enabled', () => {
    renderForm({});
    expect(overlaySwitch().getAttribute('aria-checked')).toBe('true');
  });

  it('saves the toggled overlay state', () => {
    renderForm({ chatButtonOverlayEnabled: true });
    fireEvent.click(overlaySwitch());
    expect(store.updateSettings).toHaveBeenCalledWith({ chatButtonOverlayEnabled: false });
    expect(overlaySwitch().getAttribute('aria-checked')).toBe('false');
  });

  it('reflects external changes without saving them back', () => {
    renderForm({ chatButtonOverlayEnabled: true });
    act(() => store.replace({ chatButtonOverlayEnabled: false }));
    expect(overlaySwitch().getAttribute('aria-checked')).toBe('false');
    expect(store.updateSettings).not.toHaveBeenCalled();
  });
});
