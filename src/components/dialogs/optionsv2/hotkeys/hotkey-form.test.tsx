// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions } from '@/hooks/useOptions';
import type { ISettings } from '@/hooks/useOptions';
import { createOptionsStore, type OptionsStore } from '../test-utils';
import { HotkeyForm } from './hotkey-form';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));

const HOTKEYS: Partial<ISettings> = {
  hotkeyModifier: 'ctrl',
  hotkeyKey: 'd',
  hotkeyModifierListItem: 'ctrl',
  hotkeyKeyListItem: 'l',
  hotkeyModifierSettings: 'ctrl',
  hotkeyKeySettings: 'o',
  hotkeyModifierCurrencyValuation: 'ctrl',
  hotkeyKeyCurrencyValuation: 'x',
  hotkeyModifierChat: 'ctrl',
  hotkeyKeyChat: 't',
  hotkeyModifierOffers: 'ctrl',
  hotkeyKeyOffers: 'b',
  hotkeyModifierDelist: 'ctrl',
  hotkeyKeyDelist: 'u',
  hotkeyModifierSnapshot: 'ctrl',
  hotkeyKeySnapshot: '',
  hotkeyModifierMarket: 'ctrl',
  hotkeyKeyMarket: 'm',
};

let store: OptionsStore;

function renderForm(settings: Partial<ISettings> = HOTKEYS, isLoading = false) {
  store = createOptionsStore(settings, isLoading);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  return render(<HotkeyForm />);
}

const keyInput = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const pressKey = (label: string, key: string, code = /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key) =>
  fireEvent.keyDown(keyInput(label), { key, code });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(cleanup);

describe('HotkeyForm', () => {
  it('shows a skeleton and no inputs while settings load', () => {
    renderForm(HOTKEYS, true);
    expect(screen.queryByLabelText('Price check')).toBeNull();
  });

  it('displays the stored keys upper-cased', () => {
    renderForm();
    expect(keyInput('Price check').value).toBe('D');
    expect(keyInput('Delist Item').value).toBe('U');
  });

  it('saves a pressed key lower-cased along with the rest of the hotkeys', () => {
    renderForm();
    pressKey('Price check', 'Q');
    expect(store.updateSettings).toHaveBeenCalledTimes(1);
    const saved = store.updateSettings.mock.calls[0][0];
    expect(saved.hotkeyKey).toBe('q');
    expect(saved.hotkeyKeyListItem).toBe('l');
    expect(keyInput('Price check').value).toBe('Q');
  });

  it('saves the modifier picked for a row', () => {
    renderForm();
    const tabs = screen.getByRole('tablist', { name: 'List item modifier' });
    fireEvent.click(within(tabs).getByRole('tab', { name: 'Alt' }));
    expect(store.updateSettings).toHaveBeenCalledTimes(1);
    expect(store.updateSettings.mock.calls[0][0]).toMatchObject({
      hotkeyModifierListItem: 'alt',
      hotkeyModifier: 'ctrl',
    });
  });

  it('lets the snapshot key be cleared with Backspace to unbind it', () => {
    renderForm({ ...HOTKEYS, hotkeyKeySnapshot: 'n' });
    pressKey('Net Worth Snapshot', 'Backspace');
    expect(store.updateSettings.mock.calls.at(-1)?.[0].hotkeyKeySnapshot).toBe('');
  });

  it('lets the market key be cleared with Delete to unbind it', () => {
    renderForm(HOTKEYS);
    pressKey('Market', 'Delete');
    expect(store.updateSettings.mock.calls.at(-1)?.[0].hotkeyKeyMarket).toBe('');
  });

  it('does not clear a hotkey that must stay bound', () => {
    renderForm();
    pressKey('Price check', 'Backspace');
    expect(store.updateSettings).not.toHaveBeenCalled();
    expect(keyInput('Price check').value).toBe('D');
  });

  it('records the physical key on a non-Latin layout', () => {
    renderForm();
    // Russian layout: the [ key types х
    pressKey('Open Settings', 'х', 'BracketLeft');
    expect(store.updateSettings.mock.calls.at(-1)?.[0].hotkeyKeySettings).toBe('[');
    expect(keyInput('Open Settings').value).toBe('[');
  });

  it('records space and shifted keys as the key pressed', () => {
    renderForm();
    pressKey('Chat Window', ' ', 'Space');
    expect(store.updateSettings.mock.calls.at(-1)?.[0].hotkeyKeyChat).toBe('space');
    expect(keyInput('Chat Window').value).toBe('Space');

    pressKey('Offers', '+', 'Equal');
    expect(store.updateSettings.mock.calls.at(-1)?.[0].hotkeyKeyOffers).toBe('=');
    expect(keyInput('Offers').value).toBe('=');
  });

  it('ignores presses that cannot be a hotkey key', () => {
    renderForm();
    for (const key of ['Shift', 'Enter', 'Tab', 'Escape', 'F5']) pressKey('Price check', key, key);
    expect(store.updateSettings).not.toHaveBeenCalled();
    expect(keyInput('Price check').value).toBe('D');
  });

  it('warns on both rows when two actions share a combo, and clears once resolved', () => {
    renderForm();
    pressKey('Chat Window', 'd');
    const warnings = screen.getAllByRole('status').map((el) => el.textContent);
    expect(warnings).toEqual(['Also used by Chat Window.', 'Also used by Price check.']);

    pressKey('Chat Window', 'k');
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('does not treat the same key on different modifiers as a clash', () => {
    renderForm({ ...HOTKEYS, hotkeyModifierChat: 'alt', hotkeyKeyChat: 'd' });
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('warns that Ctrl + C is reserved', () => {
    renderForm();
    pressKey('Net Worth', 'c');
    expect(screen.getByRole('status').textContent).toContain('Ctrl + C is reserved');
    expect(keyInput('Net Worth').getAttribute('aria-invalid')).toBe('true');
  });

  it('shows a key saved by an older version as the key it registers', () => {
    renderForm({ ...HOTKEYS, hotkeyKeySettings: 'х', hotkeyKeyChat: ' ' });
    expect(keyInput('Open Settings').value).toBe('[');
    expect(keyInput('Chat Window').value).toBe('Space');
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('flags a saved key that cannot be a hotkey', () => {
    renderForm({ ...HOTKEYS, hotkeyKeyChat: 'é' });
    expect(screen.getByRole('status').textContent).toContain("É can't be used as a hotkey");
    expect(keyInput('Chat Window').getAttribute('aria-invalid')).toBe('true');
  });

  it('follows external settings changes without echoing them back as a save', () => {
    renderForm();
    act(() => store.replace({ ...HOTKEYS, hotkeyKey: 'p' }));
    expect(keyInput('Price check').value).toBe('P');
    expect(store.updateSettings).not.toHaveBeenCalled();
  });
});
