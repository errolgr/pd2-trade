import { describe, expect, it } from 'vitest';
import { hotkeyKeyFromEvent, hotkeyKeyLabel, hotkeyKeyToken, normalizeHotkeyKey } from './hotkey-keys';

describe('hotkeyKeyToken', () => {
  it('passes letters and digits through in either case', () => {
    expect(hotkeyKeyToken('d')).toBe('D');
    expect(hotkeyKeyToken('Q')).toBe('Q');
    expect(hotkeyKeyToken('7')).toBe('7');
  });

  it('names symbol keys, since + and a blank cannot appear in a shortcut string', () => {
    expect(hotkeyKeyToken('=')).toBe('Equal');
    expect(hotkeyKeyToken('-')).toBe('Minus');
    expect(hotkeyKeyToken('[')).toBe('BracketLeft');
    expect(hotkeyKeyToken('/')).toBe('Slash');
    expect(hotkeyKeyToken('space')).toBe('Space');
  });

  it('translates typed characters saved by older versions to the key that types them', () => {
    expect(hotkeyKeyToken('+')).toBe('Equal');
    expect(hotkeyKeyToken(' ')).toBe('Space');
    expect(hotkeyKeyToken('_')).toBe('Minus');
    expect(hotkeyKeyToken('!')).toBe('1');
  });

  it('maps Cyrillic letters to the key at the same position on a US keyboard', () => {
    expect(hotkeyKeyToken('х')).toBe('BracketLeft');
    expect(hotkeyKeyToken('Х')).toBe('BracketLeft');
    expect(hotkeyKeyToken('й')).toBe('Q');
    expect(hotkeyKeyToken('ф')).toBe('A');
    expect(hotkeyKeyToken('ю')).toBe('Period');
    expect(hotkeyKeyToken('ё')).toBe('Backquote');
    expect(hotkeyKeyToken('і')).toBe('S');
    expect(hotkeyKeyToken('ў')).toBe('O');
  });

  it('rejects keys the shortcut parser cannot take', () => {
    for (const key of ['', undefined, 'é', 'ß', '€', 'ab', 'constructor', 'toString']) {
      expect(hotkeyKeyToken(key)).toBeNull();
    }
  });
});

describe('hotkeyKeyLabel', () => {
  it('shows the key that will be registered', () => {
    expect(hotkeyKeyLabel('d')).toBe('D');
    expect(hotkeyKeyLabel('space')).toBe('Space');
    expect(hotkeyKeyLabel('х')).toBe('[');
    expect(hotkeyKeyLabel('+')).toBe('=');
  });

  it('shows an unusable key as saved, and nothing for an unbound one', () => {
    expect(hotkeyKeyLabel('é')).toBe('É');
    expect(hotkeyKeyLabel('')).toBe('');
    expect(hotkeyKeyLabel(undefined)).toBe('');
  });
});

describe('hotkeyKeyFromEvent', () => {
  it('records a letter or digit by the character typed, as on AZERTY where the A key is VK_A', () => {
    expect(hotkeyKeyFromEvent({ key: 'a', code: 'KeyQ' })).toBe('a');
    expect(hotkeyKeyFromEvent({ key: 'D', code: 'KeyD' })).toBe('d');
    expect(hotkeyKeyFromEvent({ key: '5', code: 'Numpad5' })).toBe('5');
  });

  it('records a non-Latin letter by its physical key', () => {
    expect(hotkeyKeyFromEvent({ key: 'х', code: 'BracketLeft' })).toBe('[');
    expect(hotkeyKeyFromEvent({ key: 'в', code: 'KeyD' })).toBe('d');
  });

  it('records shifted and symbol keys by the key pressed', () => {
    expect(hotkeyKeyFromEvent({ key: '+', code: 'Equal' })).toBe('=');
    expect(hotkeyKeyFromEvent({ key: '=', code: 'Equal' })).toBe('=');
    expect(hotkeyKeyFromEvent({ key: '-', code: 'Minus' })).toBe('-');
    expect(hotkeyKeyFromEvent({ key: '!', code: 'Digit1' })).toBe('1');
    expect(hotkeyKeyFromEvent({ key: 'é', code: 'Digit2' })).toBe('2');
    expect(hotkeyKeyFromEvent({ key: ' ', code: 'Space' })).toBe('space');
  });

  it('ignores modifiers and keys that cannot be a hotkey key', () => {
    for (const [key, code] of [
      ['Control', 'ControlLeft'],
      ['Alt', 'AltLeft'],
      ['Shift', 'ShiftLeft'],
      ['Enter', 'Enter'],
      ['Tab', 'Tab'],
      ['Escape', 'Escape'],
      ['F5', 'F5'],
      ['<', 'IntlBackslash'],
    ]) {
      expect(hotkeyKeyFromEvent({ key, code })).toBeNull();
    }
  });

  it('only ever records keys the parser accepts', () => {
    for (const code of ['KeyX', 'Digit0', 'Space', 'Equal', 'Minus', 'Backquote', 'Quote', 'Backslash']) {
      const key = hotkeyKeyFromEvent({ key: 'Unidentified', code });
      expect(key).not.toBeNull();
      expect(normalizeHotkeyKey(key!)).toBe(key);
      // A parser key name: no '+' separator and no blank
      expect(hotkeyKeyToken(key!)).toMatch(/^[A-Za-z0-9]+$/);
    }
  });
});
