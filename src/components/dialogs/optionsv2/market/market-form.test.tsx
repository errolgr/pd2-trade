// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { playNotificationSound } from '@/hooks/useSocketNotifications';
import { createOptionsStore, type OptionsStore } from '../test-utils';
import { MarketForm } from './market-form';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
// vi.mock factories are hoisted above static imports, so the shim must be loaded inside the factory.
vi.mock('@/components/ui/select', async () => (await import('../test-utils')).selectShim);
vi.mock('@/hooks/useSocketNotifications', () => ({ playNotificationSound: vi.fn() }));

let store: OptionsStore;

function renderForm(settings: Partial<ISettings> = {}) {
  store = createOptionsStore(settings);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  return render(<MarketForm />);
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const select = (name: string) => screen.getByLabelText(name) as HTMLSelectElement;

// The exception chips animate out
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('MarketForm', () => {
  it('saves numeric choices as numbers, and only what changed', async () => {
    renderForm({ marketPageSize: 25, marketDefaultListedWithinDays: 0 });
    expect(select('Default listing age').value).toBe('0');
    fireEvent.change(select('Results per page'), { target: { value: '100' } });
    fireEvent.change(select('Default listing age'), { target: { value: '14' } });
    await advance(300);
    expect(store.updateSettings).toHaveBeenCalledTimes(1);
    expect(store.updateSettings.mock.calls[0][0]).toEqual({ marketPageSize: 100, marketDefaultListedWithinDays: 14 });
  });

  it('keeps a listing age that is not one of the choices', () => {
    renderForm({ marketDefaultListedWithinDays: 5 });
    expect(select('Default listing age').value).toBe('5');
  });

  it('turns the market alert sound off and dims its volume', async () => {
    renderForm({ marketAlertSoundEnabled: true, marketAlertVolume: 70 });
    expect(screen.getByText(/Market Alert Volume/).textContent).toContain('70%');
    fireEvent.click(screen.getByRole('switch', { name: 'Market Alert Sound' }));
    await advance(300);
    expect(store.updateSettings.mock.calls.at(-1)?.[0]).toEqual({ marketAlertSoundEnabled: false });
    expect(screen.getByRole('slider').getAttribute('data-disabled')).not.toBeNull();
  });

  it('Test plays the alert sound at the volume on the slider, before it is saved; not while the sound is off', () => {
    renderForm({ marketAlertSoundEnabled: true, marketAlertVolume: 70 });
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'End' });
    fireEvent.click(screen.getByRole('button', { name: 'Test' }));
    expect(playNotificationSound).toHaveBeenCalledWith(100);
    expect(store.updateSettings).not.toHaveBeenCalled();

    cleanup();
    renderForm({ marketAlertSoundEnabled: false, marketAlertVolume: 70 });
    expect(screen.getByRole('button', { name: 'Test' }).hasAttribute('disabled')).toBe(true);
  });

  it('turns the buy request offer after Watch off (on by default)', async () => {
    renderForm({});
    const toggle = screen.getByRole('switch', { name: 'Offer a Buy Request After Watch' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    await advance(300);
    expect(store.updateSettings.mock.calls.at(-1)?.[0]).toEqual({ marketWtbPromptEnabled: false });
  });

  it('lists the picked items as chips (× removes one) unless "Never delist" is Nothing', async () => {
    const ber = { name: 'Ber Rune', codes: ['r30'] };
    renderForm({
      stashAutoDelist: 'ask',
      delistExceptionMode: 'stackable',
      delistExceptions: [{ name: 'Token of Absolution', codes: ['toa'] }, ber],
    });
    expect(screen.getByText(/^Stackable currency:/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Token of Absolution' }));
    fireEvent.change(select('Never delist'), { target: { value: 'selected' } });
    await advance(300);
    expect(store.updateSettings.mock.calls.at(-1)?.[0]).toEqual({
      delistExceptions: [ber],
      delistExceptionMode: 'selected',
    });
    expect(screen.getByText('Ber Rune')).toBeTruthy();
    expect(screen.queryByText(/^Stackable currency:/)).toBeNull();

    cleanup();
    renderForm({ stashAutoDelist: 'ask', delistExceptionMode: 'none', delistExceptions: [ber] });
    expect(select('Never delist').value).toBe('none');
    expect(screen.queryByText('Ber Rune')).toBeNull();

    cleanup();
    renderForm({ stashAutoDelist: 'off', delistExceptionMode: 'selected', delistExceptions: [ber] });
    expect(screen.queryByLabelText('Never delist')).toBeNull();
    expect(screen.queryByText('Ber Rune')).toBeNull();
  });
});
