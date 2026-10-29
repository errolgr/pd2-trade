// Hotkey keys are stored as one lowercase letter/digit, the US-layout character of a symbol key ('[', '='),
// or 'space'. The global-shortcut parser (global-hotkey crate) only knows US key names, so every
// registration goes through hotkeyKeyToken, which also translates values older versions saved verbatim
// from a text box ('х' typed on a Russian layout, '+', ' ').

/** Parser token per US symbol key, keyed by its unshifted character. */
const SYMBOL_TOKENS: Record<string, string> = {
  '`': 'Backquote',
  '-': 'Minus',
  '=': 'Equal',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  '\\': 'Backslash',
  ';': 'Semicolon',
  "'": 'Quote',
  ',': 'Comma',
  '.': 'Period',
  '/': 'Slash',
};

// The unshifted US character for each symbol key's KeyboardEvent.code
const SYMBOL_BY_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(SYMBOL_TOKENS).map(([char, code]) => [code, char]),
);

// Shifted US characters, saved by older versions when typed with Shift held: the key they are on
const SHIFTED_US: Record<string, string> = {
  '~': '`',
  '!': '1',
  '@': '2',
  '#': '3',
  $: '4',
  '%': '5',
  '^': '6',
  '&': '7',
  '*': '8',
  '(': '9',
  ')': '0',
  _: '-',
  '+': '=',
  '{': '[',
  '}': ']',
  '|': '\\',
  ':': ';',
  '"': "'",
  '<': ',',
  '>': '.',
  '?': '/',
};

// Cyrillic letters (standard Russian ЙЦУКЕН, plus the Ukrainian/Belarusian extras) → the US key at the same
// position. Windows gives these keys the US virtual-key codes, so the translated hotkey fires on the key
// the user pressed.
const CYRILLIC_US = Object.fromEntries(
  [...'йцукенгшщзхъфывапролджэячсмитьбюёіїєў'].map((char, i) => [char, "qwertyuiop[]asdfghjkl;'zxcvbnm,.`s]'o"[i]]),
);

const SPACE = 'space';

/** Settings form of a key: lowercase letter/digit, US symbol character or 'space'; null when not a hotkey key. */
export function normalizeHotkeyKey(stored: string | undefined): string | null {
  if (!stored) return null;
  const key = stored.toLowerCase();
  if (key === ' ' || key === SPACE) return SPACE;
  // One character only: also keeps Object.prototype names out of the table lookups
  if ([...key].length !== 1) return null;
  if (/^[a-z0-9]$/.test(key) || key in SYMBOL_TOKENS) return key;
  return SHIFTED_US[key] ?? CYRILLIC_US[key] ?? null;
}

/** The global-shortcut parser token for a stored key (e.g. 'D', '7', 'BracketLeft', 'Space'); null when unusable. */
export function hotkeyKeyToken(stored: string | undefined): string | null {
  const key = normalizeHotkeyKey(stored);
  if (!key) return null;
  if (key === SPACE) return 'Space';
  return SYMBOL_TOKENS[key] ?? key.toUpperCase();
}

/** Keycap text for a stored key: the translated key when usable, otherwise the raw value. */
export function hotkeyKeyLabel(stored: string | undefined): string {
  const key = normalizeHotkeyKey(stored);
  if (key === SPACE) return 'Space';
  return (key ?? stored ?? '').toUpperCase();
}

/**
 * The key to save for a key press in the hotkey settings, or null when the press is not a usable hotkey key.
 * Windows hotkeys match virtual-key codes, which on Latin layouts follow the printed character (AZERTY's A key
 * is VK_A, Dvorak's ' key is VK_OEM_7), so a letter/digit or unshifted US symbol in event.key is kept as typed.
 * Anything else (Cyrillic letters, shifted symbols such as Shift+= for '+', dead keys, space) is taken by
 * physical position from event.code, which is where the Cyrillic layouts put their virtual-key codes.
 */
export function hotkeyKeyFromEvent({ key, code }: Pick<KeyboardEvent, 'key' | 'code'>): string | null {
  if (/^[a-z0-9]$/i.test(key)) return key.toLowerCase();
  if (key.length === 1 && key in SYMBOL_TOKENS) return key;
  const physical = /^Key([A-Z])$/.exec(code)?.[1] ?? /^Digit(\d)$/.exec(code)?.[1];
  if (physical) return physical.toLowerCase();
  if (code === 'Space') return SPACE;
  return SYMBOL_BY_CODE[code] ?? null;
}
