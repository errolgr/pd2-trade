import { hotkeyKeyLabel, hotkeyKeyToken } from '@/lib/hotkey-keys';

/** Keycap text of a saved hotkey ('Ctrl+Space', 'Alt+M'); null when unbound or unusable. */
export function formatHotkey(modifier: unknown, key: unknown): string | null {
  if (typeof key !== 'string' || !hotkeyKeyToken(key)) return null;
  return `${modifier === 'alt' ? 'Alt' : 'Ctrl'}+${hotkeyKeyLabel(key)}`;
}
