// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { useOverlay, type OverlayApi } from '@/overlay';
import { SimTryOnHotkeyHint, simTryOnHotkeyText } from './SimTryOnHotkeyHint';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/overlay', () => ({ useOverlay: vi.fn() }));

const openPanel = vi.fn();
const withSettings = (settings: Partial<ISettings>) =>
  vi.mocked(useOptions).mockReturnValue({ settings } as ReturnType<typeof useOptions>);

beforeEach(() => {
  openPanel.mockReset();
  vi.mocked(useOverlay).mockReturnValue({ openPanel } as unknown as OverlayApi);
});
afterEach(cleanup);

describe('simTryOnHotkeyText', () => {
  it('shows the bound combo, or that none is set', () => {
    expect(simTryOnHotkeyText({ hotkeyModifierSimTryOn: 'alt', hotkeyKeySimTryOn: 'j' })).toBe('Try-on hotkey: Alt+J');
    expect(simTryOnHotkeyText({ hotkeyModifierSimTryOn: 'ctrl', hotkeyKeySimTryOn: '' })).toBe(
      'Try-on hotkey: not set',
    );
    expect(simTryOnHotkeyText({})).toBe('Try-on hotkey: not set');
  });
});

describe('SimTryOnHotkeyHint', () => {
  it('links to the try-on row in Settings → Hotkeys', () => {
    const onOpen = vi.fn();
    withSettings({ hotkeyModifierSimTryOn: 'ctrl', hotkeyKeySimTryOn: '' });
    render(<SimTryOnHotkeyHint onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try-on hotkey: not set' }));
    expect(openPanel).toHaveBeenCalledWith('settings', { section: 'Hotkeys', field: 'hotkeyKeySimTryOn' });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows the binding once set', () => {
    withSettings({ hotkeyModifierSimTryOn: 'ctrl', hotkeyKeySimTryOn: 'j' });
    render(<SimTryOnHotkeyHint />);
    expect(screen.getByRole('button', { name: 'Try-on hotkey: Ctrl+J' })).not.toBeNull();
  });
});
