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
    const add = screen.getByRole('button', { name: 'Add' }) as HTMLButtonElement;
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
    fireEvent.keyDown(screen.getAllByRole('slider')[0], { key: 'ArrowRight' });
    expect(screen.getByText(/Notification Volume/).textContent).toContain('1%');
    await advance(500);
    expect(lastSaved()?.whisperNotificationVolume).toBe(1);
  });

  it('turns the market alert sound off and dims its volume', async () => {
    renderForm({ marketAlertSoundEnabled: true, marketAlertVolume: 70 });
    expect(screen.getByText(/Market Alert Volume/).textContent).toContain('70%');
    fireEvent.click(screen.getByRole('switch', { name: 'Market Alert Sound' }));
    await advance(500);
    expect(lastSaved()?.marketAlertSoundEnabled).toBe(false);
    expect(screen.getAllByRole('slider')[1].getAttribute('data-disabled')).not.toBeNull();
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
      marketAlertSoundEnabled: true,
      marketAlertVolume: 70,
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

describe('ChatForm message templates', () => {
  const MINE = [
    { id: 'a', name: 'Still available?', text: 'Is your {itemName} still available?' },
    { id: 'b', name: 'Price check', text: 'Would you take {price}?' },
    { id: 'c', name: 'Inv me', text: 'Sure, inv me.' },
  ];
  const listed = () =>
    within(screen.getByRole('list', { name: 'Your templates' }))
      .queryAllByRole('listitem')
      .map((li) => li.querySelector('.font-medium')?.textContent);
  const savedTemplates = () => lastSaved()?.chatTemplates;
  const nameInput = () => screen.getByLabelText('Name') as HTMLInputElement;
  const textInput = () => screen.getByLabelText('Message') as HTMLTextAreaElement;

  it('explains how templates are used and lists the custom ones before the offer templates', () => {
    renderForm({ chatTemplates: MINE });
    expect(
      screen.queryByText(
        /in a chat message to use these\. Tokens fill in from the conversation; any other \{name\} is asked for/,
      ),
    ).not.toBeNull();
    expect(listed()).toEqual(['Still available?', 'Price check', 'Inv me']);
    expect(screen.getByLabelText('Accept Offer Message Template')).toBeTruthy();
  });

  it('adds a template, saved at the end of the list right away', async () => {
    renderForm({ chatTemplates: MINE });
    fireEvent.click(screen.getByRole('button', { name: 'Add template' }));
    fireEvent.change(nameInput(), { target: { value: '  Haggle ' } });
    fireEvent.change(textInput(), { target: { value: 'Would you take {price}, {accountName}?\nty' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add template' }));

    expect(store.updateSettings).toHaveBeenCalledTimes(1);
    expect(savedTemplates()).toEqual([
      ...MINE,
      { id: expect.any(String), name: 'Haggle', text: 'Would you take {price}, {accountName}?\nty' },
    ]);
    expect(new Set(savedTemplates()!.map((t) => t.id)).size).toBe(4);
    expect(listed()).toEqual(['Still available?', 'Price check', 'Inv me', 'Haggle']);
    // The add form closed
    expect(screen.queryByLabelText('Name')).toBeNull();
  });

  it('requires a name and a message, within the length limits', () => {
    renderForm({ chatTemplates: [] });
    expect(screen.queryByText('No templates of your own yet.')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add template' }));
    fireEvent.change(nameInput(), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add template' }));
    expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual([
      'Give the template a name',
      'Write the message',
    ]);
    expect(nameInput().getAttribute('aria-invalid')).toBe('true');

    fireEvent.change(nameInput(), { target: { value: 'x'.repeat(41) } });
    fireEvent.change(textInput(), { target: { value: 'y'.repeat(501) } });
    fireEvent.click(screen.getByRole('button', { name: 'Add template' }));
    expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual([
      'Name: at most 40 characters',
      'Message: at most 500 characters',
    ]);
    expect(store.updateSettings).not.toHaveBeenCalled();
  });

  it('edits a template in place, keeping its id and position; Cancel keeps it as it was', () => {
    renderForm({ chatTemplates: MINE });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Price check' }));
    expect(nameInput().value).toBe('Price check');
    expect(textInput().value).toBe('Would you take {price}?');
    fireEvent.change(nameInput(), { target: { value: 'Offer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(store.updateSettings).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Price check' }));
    fireEvent.change(nameInput(), { target: { value: 'Offer' } });
    fireEvent.change(textInput(), { target: { value: 'I can do {price} for the {itemName}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(savedTemplates()).toEqual([
      MINE[0],
      { id: 'b', name: 'Offer', text: 'I can do {price} for the {itemName}' },
      MINE[2],
    ]);
    expect(listed()).toEqual(['Still available?', 'Offer', 'Inv me']);
  });

  it('deletes a template', () => {
    renderForm({ chatTemplates: MINE });
    fireEvent.click(screen.getByRole('button', { name: 'Delete Price check' }));
    expect(savedTemplates()).toEqual([MINE[0], MINE[2]]);
  });

  it('reorders templates with the up/down buttons', () => {
    renderForm({ chatTemplates: MINE });
    expect((screen.getByRole('button', { name: 'Move Still available? up' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Move Inv me down' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Move Inv me up' }));
    expect(savedTemplates()?.map((t) => t.id)).toEqual(['a', 'c', 'b']);
    fireEvent.click(screen.getByRole('button', { name: 'Move Still available? down' }));
    expect(savedTemplates()?.map((t) => t.id)).toEqual(['c', 'a', 'b']);
    expect(listed()).toEqual(['Inv me', 'Still available?', 'Price check']);
  });

  it('inserts a token chip at the caret, replacing a selection', () => {
    renderForm({ chatTemplates: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Add template' }));
    const chip = (token: string) =>
      within(screen.getByRole('form', { name: 'New template' })).getByRole('button', { name: token });
    fireEvent.change(textInput(), { target: { value: 'Hi  there' } });
    textInput().setSelectionRange(3, 3);
    fireEvent.click(chip('{accountName}'));
    expect(textInput().value).toBe('Hi {accountName} there');
    expect(textInput().selectionStart).toBe(16);

    textInput().setSelectionRange(17, 22);
    fireEvent.click(chip('{itemName}'));
    expect(textInput().value).toBe('Hi {accountName} {itemName}');
  });

  it('shows which placeholders a template will ask for when used, for custom and offer templates', () => {
    renderForm({ chatTemplates: [], rejectOfferMessageTemplate: 'No, {reason}' });
    expect(screen.getByText(/Asks when used in chat:/).textContent).toBe('Asks when used in chat: {reason}');

    fireEvent.click(screen.getByRole('button', { name: 'Add template' }));
    fireEvent.change(textInput(), { target: { value: 'join {game} / {pw} as {accountName}' } });
    expect(screen.getByText(/Asks when used:/).textContent).toBe('Asks when used: {game} {pw}');
  });

  it('stars and unstars a template (its chip above the chat message box)', () => {
    renderForm({ chatTemplates: [MINE[0], { ...MINE[1], favorite: true }] });
    const star = screen.getByRole('button', { name: 'Star Still available?' });
    expect(star.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(star);
    expect(savedTemplates()?.[0]).toEqual({ ...MINE[0], favorite: true });
    expect(screen.getByRole('button', { name: 'Unstar Still available?' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Unstar Price check' }));
    expect(savedTemplates()?.[1]).toEqual({ ...MINE[1], favorite: false });
  });
});
