// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { createOptionsStore, type OptionsStore } from '../test-utils';
import { InterfaceForm } from './interface-form';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
// vi.mock factories are hoisted above static imports, so the shim must be loaded inside the factory.
vi.mock('@/components/ui/select', async () => (await import('../test-utils')).selectShim);

let store: OptionsStore;

function renderForm(settings: Partial<ISettings>, isLoading = false) {
  store = createOptionsStore(settings, isLoading);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  return render(<InterfaceForm />);
}

const overlaySwitch = () => screen.getByRole('switch', { name: 'Chat Button Overlay' });
const timerSwitch = () => screen.getByRole('switch', { name: 'Corrupted zone timer' });
const timerPosition = () => screen.getByLabelText('Timer position') as HTMLSelectElement;

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const transparency = () => screen.getAllByRole('slider')[0];
const TIMER_DEFAULTS = {
  corruptedZoneTimerEnabled: false,
  corruptedZoneTimerAnchor: 'top-right',
  corruptedZoneTimerOpacity: 90,
  corruptedZoneTimerListDirection: 'auto',
  corruptedZoneTimerZones: 'all',
  corruptedZoneAlerts: 'off',
  corruptedZoneFollowed: [],
};

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
    expect(store.updateSettings).toHaveBeenCalledWith({
      chatButtonOverlayEnabled: false,
      windowTransparency: 0,
      ...TIMER_DEFAULTS,
    });
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
      ...TIMER_DEFAULTS,
    });
  });

  it('starts the corrupted zone timer off, top right', () => {
    renderForm({});
    expect(timerSwitch().getAttribute('aria-checked')).toBe('false');
    expect(timerPosition().value).toBe('top-right');
    expect(screen.getByText(/Timer opacity/).textContent).toContain('90%');
  });

  it('saves the corrupted zone timer toggle and position in one write', async () => {
    renderForm({});
    fireEvent.click(timerSwitch());
    fireEvent.change(timerPosition(), { target: { value: 'bottom-left' } });
    await advance(300);
    expect(store.updateSettings).toHaveBeenCalledExactlyOnceWith({
      chatButtonOverlayEnabled: true,
      windowTransparency: 0,
      ...TIMER_DEFAULTS,
      corruptedZoneTimerEnabled: true,
      corruptedZoneTimerAnchor: 'bottom-left',
    });
  });

  it('saves the schedule direction and the zones the timer shows', async () => {
    renderForm({});
    fireEvent.change(screen.getByLabelText('Schedule opens'), { target: { value: 'up' } });
    fireEvent.change(screen.getByLabelText('Timer shows'), { target: { value: 'followed' } });
    await advance(300);
    expect(store.updateSettings).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ corruptedZoneTimerListDirection: 'up', corruptedZoneTimerZones: 'followed' }),
    );
  });

  it('reflects external changes without saving them back', async () => {
    renderForm({ chatButtonOverlayEnabled: true });
    act(() => store.replace({ chatButtonOverlayEnabled: false }));
    expect(overlaySwitch().getAttribute('aria-checked')).toBe('false');
    await advance(300);
    expect(store.updateSettings).not.toHaveBeenCalled();
  });

  it.each(['Zone notifications', 'Timer shows'])(
    'picks followed zones from a searchable dropdown under "Only zones I follow" (%s)',
    async (setting) => {
      renderForm({});
      expect(screen.queryByRole('button', { name: 'Followed zones' })).toBeNull();
      fireEvent.change(screen.getByLabelText(setting), { target: { value: 'followed' } });
      fireEvent.click(screen.getByRole('button', { name: 'Followed zones' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Search zones' }), { target: { value: 'kurast' } });
      const options = () => within(screen.getByRole('listbox', { name: 'Zones' })).getAllByRole('option');
      expect(options().map((o) => o.textContent)).toEqual([
        'Lower Kurast and the Kurast Sewers',
        'Kurast Bazaar, Ruined Temple, and Disused Fane',
        'Upper Kurast, the Forgotten Reliquary, and Forgotten Temple',
      ]);
      fireEvent.click(options()[1]);
      expect(options()[1].getAttribute('aria-selected')).toBe('true');
      await advance(300);
      expect(store.updateSettings).toHaveBeenLastCalledWith(
        expect.objectContaining({ corruptedZoneFollowed: ['Kurast Bazaar, Ruined Temple, and Disused Fane'] }),
      );
    },
  );
});
