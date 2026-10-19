// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { createOptionsStore, type OptionsStore } from '../test-utils';
import { SettingsNavContext } from '../settings-ui';
import { NetWorthForm } from './networth-form';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
// vi.mock factories are hoisted above static imports, so the shim must be loaded inside the factory.
vi.mock('@/components/ui/select', async () => (await import('../test-utils')).selectShim);
// Server-backed leaderboard group has its own tests; keep this file to local settings.
vi.mock('./public-profile', () => ({ PublicProfileGroup: () => null }));

const FULL: Partial<ISettings> = {
  netWorthTrackingEnabled: true,
  netWorthAutoSnapshotMinutes: 15,
  netWorthTickerEnabled: true,
  netWorthTickerAnchor: 'top-center',
  netWorthTickerOpacity: 90,
  netWorthToastThresholdHr: 0.5,
};

let store: OptionsStore;

function renderForm(settings: Partial<ISettings> = FULL, nav?: (s: string) => void) {
  store = createOptionsStore(settings);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  return render(
    nav ? (
      <SettingsNavContext.Provider value={nav}>
        <NetWorthForm />
      </SettingsNavContext.Provider>
    ) : (
      <NetWorthForm />
    ),
  );
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const lastSaved = () => store.updateSettings.mock.calls.at(-1)?.[0];
const threshold = () => screen.getByLabelText('Snapshot toast threshold (HR)') as HTMLInputElement;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('NetWorthForm', () => {
  it('shows a skeleton while loading', () => {
    store = createOptionsStore(FULL, true);
    vi.mocked(useOptions).mockImplementation(store.useOptions);
    render(<NetWorthForm />);
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('treats unset history tracking as off and applies ticker defaults', () => {
    renderForm({});
    expect(screen.getByRole('switch', { name: 'Save net worth history' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('switch', { name: 'Net worth ticker' }).getAttribute('aria-checked')).toBe('true');
    expect((screen.getByLabelText('Ticker position') as HTMLSelectElement).value).toBe('top-center');
    expect(screen.getByText(/Ticker opacity/).textContent).toContain('90%');
  });

  it('saves the snapshot interval as a number after the 400ms debounce', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('Automatic snapshots'), { target: { value: '0' } });
    await advance(399);
    expect(store.updateSettings).not.toHaveBeenCalled();
    await advance(1);
    expect(lastSaved()).toMatchObject({ netWorthAutoSnapshotMinutes: 0, netWorthTickerAnchor: 'top-center' });
  });

  it('holds back an empty threshold and saves once it is valid again', async () => {
    renderForm();
    fireEvent.change(threshold(), { target: { value: '' } });
    await advance(400);
    expect(store.updateSettings).not.toHaveBeenCalled();
    expect(threshold().value).toBe('');

    fireEvent.change(threshold(), { target: { value: '1.5' } });
    await advance(400);
    expect(store.updateSettings).toHaveBeenCalledTimes(1);
    expect(lastSaved()?.netWorthToastThresholdHr).toBe(1.5);
  });

  it('rejects a negative threshold', async () => {
    renderForm();
    fireEvent.change(threshold(), { target: { value: '-1' } });
    await advance(400);
    expect(store.updateSettings).not.toHaveBeenCalled();
  });

  it('saves ticker position and toggles together in one write', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('Ticker position'), { target: { value: 'above-chat' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Net worth ticker' }));
    await advance(400);
    expect(store.updateSettings).toHaveBeenCalledTimes(1);
    expect(lastSaved()).toMatchObject({ netWorthTickerAnchor: 'above-chat', netWorthTickerEnabled: false });
  });

  it('steps ticker opacity by 5 and clamps at 100', async () => {
    renderForm({ ...FULL, netWorthTickerOpacity: 95 });
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByText(/Ticker opacity/).textContent).toContain('100%');
    await advance(400);
    expect(lastSaved()?.netWorthTickerOpacity).toBe(100);
  });

  it('does not save back an external change', async () => {
    renderForm();
    act(() => store.replace({ ...FULL, netWorthTickerEnabled: false }));
    await advance(500);
    expect(screen.getByRole('switch', { name: 'Net worth ticker' }).getAttribute('aria-checked')).toBe('false');
    expect(store.updateSettings).not.toHaveBeenCalled();
  });

  it('links to other sections when rendered inside the settings window', () => {
    const nav = vi.fn();
    renderForm(FULL, nav);
    fireEvent.click(screen.getByRole('button', { name: 'Hotkeys' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chat settings' }));
    expect(nav.mock.calls).toEqual([['Hotkeys'], ['Chat']]);
  });

  it('renders section links as plain text outside the settings window', () => {
    renderForm();
    expect(screen.queryByRole('button', { name: 'Hotkeys' })).toBeNull();
    expect(screen.getByText(/configured under/).textContent).toBe('The snapshot hotkey is configured under Hotkeys.');
  });
});
