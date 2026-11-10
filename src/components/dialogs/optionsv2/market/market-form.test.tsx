// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { createOptionsStore, type OptionsStore } from '../test-utils';
import { MarketForm } from './market-form';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
// vi.mock factories are hoisted above static imports, so the shim must be loaded inside the factory.
vi.mock('@/components/ui/select', async () => (await import('../test-utils')).selectShim);

let store: OptionsStore;

function renderForm(settings: Partial<ISettings> = {}) {
  store = createOptionsStore(settings);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  return render(<MarketForm />);
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const select = (name: string) => screen.getByLabelText(name) as HTMLSelectElement;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('MarketForm', () => {
  it('saves numeric choices as numbers, and only what changed', async () => {
    renderForm({ marketPageSize: 25, marketDefaultMaxAgeDays: 3 });
    fireEvent.change(select('Results per page'), { target: { value: '100' } });
    fireEvent.change(select('Default listing age'), { target: { value: '14' } });
    await advance(300);
    expect(store.updateSettings).toHaveBeenCalledTimes(1);
    expect(store.updateSettings.mock.calls[0][0]).toEqual({ marketPageSize: 100, marketDefaultMaxAgeDays: 14 });
  });

  it('keeps a listing age that is not one of the choices', () => {
    renderForm({ marketDefaultMaxAgeDays: 5 });
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
});
