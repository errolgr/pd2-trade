// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { createOptionsStore, type OptionsStore } from '../test-utils';
import { ChatForm } from './chat-form';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
// vi.mock factories are hoisted above static imports, so the shim must be loaded inside the factory.
vi.mock('@/components/ui/select', async () => (await import('../test-utils')).selectShim);

let store: OptionsStore;

function renderForm(settings: Partial<ISettings> = {}, isLoading = false) {
  store = createOptionsStore(settings, isLoading);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  return render(<ChatForm />);
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const lastSaved = () => store.updateSettings.mock.calls.at(-1)?.[0];
const ignoreInput = () => screen.getByPlaceholderText('Enter player name to ignore') as HTMLInputElement;
const addIgnored = (name: string) => {
  fireEvent.change(ignoreInput(), { target: { value: name } });
  fireEvent.keyDown(ignoreInput(), { key: 'Enter' });
};
const chips = () =>
  screen.queryAllByRole('button', { name: /^Remove / }).map((b) => b.getAttribute('aria-label')!.slice(7));
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

describe('ChatForm', () => {
  it('shows a skeleton while loading', () => {
    renderForm({}, true);
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('applies defaults for unset settings', () => {
    renderForm({});
    expect(screen.getByRole('switch', { name: 'General Notifications' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('switch', { name: 'Join Notifications' }).getAttribute('aria-checked')).toBe('false');
    expect((screen.getByLabelText('Notify when:') as HTMLSelectElement).value).toBe('both');
    expect(screen.getByText(/Notification Volume/).textContent).toContain('70%');
  });

  it('debounces a toggle into a single save', async () => {
    renderForm({});
    fireEvent.click(screen.getByRole('switch', { name: 'Trade Notifications' }));
    await advance(499);
    expect(store.updateSettings).not.toHaveBeenCalled();
    await advance(1);
    expect(store.updateSettings).toHaveBeenCalledTimes(1);
    expect(lastSaved()).toMatchObject({ tradeNotificationsEnabled: false, whisperNotificationsEnabled: true });
  });

  it('"Never" disables every notification control and explains why', async () => {
    renderForm({});
    fireEvent.change(screen.getByLabelText('Notify when:'), { target: { value: 'never' } });
    expect(screen.queryByText(/Notifications are off/)).not.toBeNull();
    for (const name of ['General Notifications', 'Toast Popups', 'Trade Notifications', 'Join Notifications']) {
      expect((screen.getByRole('switch', { name }) as HTMLButtonElement).disabled).toBe(true);
    }
    expect(ignoreInput().disabled).toBe(true);
    await advance(500);
    // Toast type chips are hidden while muted (after the exit transition)
    expect(screen.queryByRole('group', { name: 'Toast popup types' })).toBeNull();
    expect(lastSaved()?.whisperNotificationTiming).toBe('never');
  });

  it('adds ignored players trimmed and lower-cased, skipping duplicates', async () => {
    renderForm({ whisperIgnoreList: ['bob'] });
    addIgnored('  Alice ');
    expect(chips()).toEqual(['bob', 'alice']);
    expect(ignoreInput().value).toBe('');

    addIgnored('BOB');
    expect(chips()).toEqual(['bob', 'alice']);
    // A rejected duplicate stays in the box so the user can see what happened
    expect(ignoreInput().value).toBe('BOB');

    await advance(500);
    expect(lastSaved()?.whisperIgnoreList).toEqual(['bob', 'alice']);
  });

  it('only enables Add when there is a non-blank name', () => {
    renderForm({});
    const add = screen.getByRole('button', { name: /Add/ }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.change(ignoreInput(), { target: { value: '   ' } });
    expect(add.disabled).toBe(true);
    fireEvent.change(ignoreInput(), { target: { value: 'Zed' } });
    expect(add.disabled).toBe(false);
    fireEvent.click(add);
    expect(chips()).toEqual(['zed']);
  });

  it('removes an ignored player', async () => {
    renderForm({ whisperIgnoreList: ['bob', 'carl'] });
    fireEvent.click(screen.getByRole('button', { name: 'Remove bob' }));
    await advance(500);
    expect(lastSaved()?.whisperIgnoreList).toEqual(['carl']);
  });

  it('toggles toast popup types, and hides them when toast popups are off', async () => {
    renderForm({ toastPopupTypes: ['whispers', 'trade'] });
    const group = screen.getByRole('group', { name: 'Toast popup types' });
    const pressed = () =>
      within(group)
        .getAllByRole('button')
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => b.textContent);
    expect(pressed()).toEqual(['Whispers', 'Trade']);

    fireEvent.click(within(group).getByRole('button', { name: 'Whispers' }));
    fireEvent.click(within(group).getByRole('button', { name: 'Offers' }));
    expect(pressed()).toEqual(['Trade', 'Offers']);
    await advance(500);
    expect(lastSaved()?.toastPopupTypes).toEqual(['trade', 'offers']);

    fireEvent.click(screen.getByRole('switch', { name: 'Toast Popups' }));
    await advance(100);
    expect(screen.queryByRole('group', { name: 'Toast popup types' })).toBeNull();
  });

  it('inserts a placeholder token at the end of the template', async () => {
    renderForm({ rejectOfferMessageTemplate: 'No thanks ' });
    const input = screen.getByLabelText('Reject Offer Message Template') as HTMLInputElement;
    const row = input.closest('[data-slot="form-item"]') ?? input.parentElement!.parentElement!;
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: '{accountName}' }));
    expect(input.value).toBe('No thanks {accountName}');
    await advance(500);
    expect(lastSaved()?.rejectOfferMessageTemplate).toBe('No thanks {accountName}');
  });

  it('steps the volume with the keyboard', async () => {
    renderForm({ whisperNotificationVolume: 0 });
    expect(screen.getByText(/Notification Volume/).textContent).toContain('0%');
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    expect(screen.getByText(/Notification Volume/).textContent).toContain('1%');
    await advance(500);
    expect(lastSaved()?.whisperNotificationVolume).toBe(1);
  });

  it('does not save when settings change externally', async () => {
    // Real settings are always merged with defaults, so every chat field is present.
    const full: Partial<ISettings> = {
      whisperNotificationsEnabled: true,
      toastPopupsEnabled: true,
      toastPopupTypes: ['whispers'],
      tradeNotificationsEnabled: true,
      whisperIgnoreList: [],
      whisperAnnouncementsEnabled: false,
      whisperJoinNotificationsEnabled: false,
      whisperNotificationTiming: 'both',
      whisperNotificationVolume: 70,
      acceptOfferMessageTemplate: 'a',
      rejectOfferMessageTemplate: 'r',
      soldOfferMessageTemplate: 's',
    };
    renderForm(full);
    act(() => store.replace({ ...full, tradeNotificationsEnabled: false, whisperIgnoreList: ['x'] }));
    await advance(600);
    expect(screen.getByRole('switch', { name: 'Trade Notifications' }).getAttribute('aria-checked')).toBe('false');
    expect(chips()).toEqual(['x']);
    expect(store.updateSettings).not.toHaveBeenCalled();
  });
});
