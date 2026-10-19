// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { useOptions } from '@/hooks/useOptions';
import { usePanel } from '@/overlay';
import { createOptionsStore, type OptionsStore } from './test-utils';
import SettingsLayout from './options-layout';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/overlay', () => ({ usePanel: vi.fn() }));
// Section bodies have their own tests; stand-ins expose which one is mounted. vi.mock factories are
// hoisted above static imports, so SettingsLink has to be loaded inside the factory.
vi.mock('./appearance/layout', async () => {
  const { SettingsLink } = await import('./settings-ui');
  return {
    default: () => (
      <p>
        general-body <SettingsLink to="Net Worth">go net worth</SettingsLink>
      </p>
    ),
  };
});
vi.mock('./account/layout', () => ({ default: () => <p>account-body</p> }));
vi.mock('./chat/layout', () => ({ default: () => <p>chat-body</p> }));
vi.mock('./interface/layout', () => ({ default: () => <p>interface-body</p> }));
vi.mock('./stats/layout', () => ({ default: () => <p>price-check-body</p> }));
vi.mock('./networth/layout', () => ({ default: () => <p>net-worth-body</p> }));
vi.mock('./hotkeys/layout', () => ({ default: () => <p>hotkeys-body</p> }));
vi.mock('./about/layout', () => ({ default: () => <p>about-body</p> }));

const SECTIONS = ['General', 'Account', 'Chat', 'Interface', 'Price Check', 'Net Worth', 'Hotkeys', 'About'];

let store: OptionsStore;
const close = vi.fn();

function renderLayout() {
  store = createOptionsStore({ mode: 'softcore' });
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  return render(<SettingsLayout />);
}

const tab = (name: string) => screen.getByRole('tab', { name });
const selected = () =>
  screen
    .getAllByRole('tab')
    .filter((t) => t.getAttribute('aria-selected') === 'true')
    .map((t) => t.textContent);
const panelText = () => screen.getByRole('tabpanel').textContent;
const status = () => screen.getByText(/Saved|Changes save automatically/).textContent;

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  close.mockReset();
  vi.mocked(usePanel).mockReturnValue({ close } as never);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SettingsLayout navigation', () => {
  it('opens on General with a single tab stop', () => {
    renderLayout();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(SECTIONS);
    expect(selected()).toEqual(['General']);
    expect(panelText()).toContain('general-body');
    expect(screen.getAllByRole('tab').filter((t) => t.tabIndex === 0)).toHaveLength(1);
  });

  it('switches the panel when a tab is clicked', () => {
    renderLayout();
    fireEvent.click(tab('Hotkeys'));
    expect(selected()).toEqual(['Hotkeys']);
    expect(panelText()).toBe('hotkeys-body');
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(tab('Hotkeys').id);
  });

  it('arrow keys wrap around and move focus with the selection', () => {
    renderLayout();
    fireEvent.keyDown(tab('General'), { key: 'ArrowUp' });
    expect(selected()).toEqual(['About']);
    expect(document.activeElement).toBe(tab('About'));

    fireEvent.keyDown(tab('About'), { key: 'ArrowDown' });
    expect(selected()).toEqual(['General']);
  });

  it('Home and End jump to the ends; other keys do nothing', () => {
    renderLayout();
    fireEvent.keyDown(tab('General'), { key: 'End' });
    expect(selected()).toEqual(['About']);
    fireEvent.keyDown(tab('About'), { key: 'Home' });
    expect(selected()).toEqual(['General']);
    fireEvent.keyDown(tab('General'), { key: 'ArrowRight' });
    expect(selected()).toEqual(['General']);
  });

  it('lets a section link jump to another section', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: /go net worth/ }));
    expect(selected()).toEqual(['Net Worth']);
    expect(panelText()).toBe('net-worth-body');
  });

  it('closing closes the settings panel', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe('SettingsLayout saved indicator', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-10-01T00:00:00Z') });
  });

  it('flashes "Saved" for a change made right after the user interacts, then fades back', () => {
    renderLayout();
    expect(status()).toBe('Changes save automatically');

    fireEvent.pointerDown(window);
    act(() => vi.advanceTimersByTime(500));
    act(() => store.replace({ mode: 'hardcore' }));
    expect(status()).toBe('Saved');

    act(() => vi.advanceTimersByTime(1600));
    expect(status()).toBe('Changes save automatically');
  });

  it('counts a keypress as interaction too', () => {
    renderLayout();
    fireEvent.keyDown(window, { key: 'x' });
    act(() => store.replace({ mode: 'hardcore' }));
    expect(status()).toBe('Saved');
  });

  it('ignores background changes with no recent interaction', () => {
    renderLayout();
    act(() => store.replace({ mode: 'hardcore' }));
    expect(status()).toBe('Changes save automatically');
  });

  it('ignores changes arriving more than 2.5s after the last interaction', () => {
    renderLayout();
    fireEvent.pointerDown(window);
    act(() => vi.advanceTimersByTime(2501));
    act(() => store.replace({ mode: 'hardcore' }));
    expect(status()).toBe('Changes save automatically');
  });

  it('does not flash when settings finish loading', () => {
    store = createOptionsStore({ mode: 'softcore' }, true);
    vi.mocked(useOptions).mockImplementation(store.useOptions);
    render(<SettingsLayout />);
    fireEvent.pointerDown(window);
    act(() => store.replace({ mode: 'hardcore' }, false));
    expect(status()).toBe('Changes save automatically');
  });
});
