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
};

let store: OptionsStore;

function renderForm(settings: Partial<ISettings> = HOTKEYS, isLoading = false) {
  store = createOptionsStore(settings, isLoading);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  return render(<HotkeyForm />);
}

const keyInput = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, value: string) => fireEvent.change(keyInput(label), { target: { value } });

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

  it('saves a typed key lower-cased along with the rest of the hotkeys', () => {
    renderForm();
    type('Price check', 'Q');
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

  it('lets the snapshot key be cleared to unbind it', () => {
    renderForm({ ...HOTKEYS, hotkeyKeySnapshot: 'n' });
    type('Net Worth Snapshot', '');
    expect(store.updateSettings.mock.calls.at(-1)?.[0].hotkeyKeySnapshot).toBe('');
  });

  it('warns on both rows when two actions share a combo, and clears once resolved', () => {
    renderForm();
    type('Chat Window', 'd');
    const warnings = screen.getAllByRole('status').map((el) => el.textContent);
    expect(warnings).toEqual(['Also used by Chat Window.', 'Also used by Price check.']);

    type('Chat Window', 'k');
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('does not treat the same key on different modifiers as a clash', () => {
    renderForm({ ...HOTKEYS, hotkeyModifierChat: 'alt', hotkeyKeyChat: 'd' });
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });

  it('warns that Ctrl + C is reserved', () => {
    renderForm();
    type('Currency', 'c');
    expect(screen.getByRole('status').textContent).toContain('Ctrl + C is reserved');
    expect(keyInput('Currency').getAttribute('aria-invalid')).toBe('true');
  });

  it('follows external settings changes without echoing them back as a save', () => {
    renderForm();
    act(() => store.replace({ ...HOTKEYS, hotkeyKey: 'p' }));
    expect(keyInput('Price check').value).toBe('P');
    expect(store.updateSettings).not.toHaveBeenCalled();
  });

  // BUG: the zod schema is never run — the form auto-saves from `watch` without validating, so a key the
  // schema rejects ("Must be a letter or number") is persisted and handed to the global-shortcut registrar.
  it.fails('does not persist a key the schema rejects', () => {
    renderForm();
    type('Price check', '!');
    expect(store.updateSettings).not.toHaveBeenCalled();
  });
});
