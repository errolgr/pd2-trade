import { hotkeyKeyToken } from '@/lib/hotkey-keys';

/** One bound (or unbound) hotkey: a core Hotkeys row or a plugin command. */
export interface HotkeyBinding {
  /** Unique across core rows and plugin commands (core: the key field; plugin: `plugin:<pluginId>:<commandId>`). */
  id: string;
  /** Shown in "Also used by …". */
  label: string;
  modifier: string | undefined;
  key: string | undefined;
}

/**
 * `ctrl+D`-style combo compared by parser token, so a key saved by an older version ('х') clashes with its
 * translation ('['); null when unbound or unusable.
 */
export function hotkeyCombo(modifier: string | undefined, key: string | undefined): string | null {
  const token = hotkeyKeyToken(key);
  return token ? `${modifier === 'alt' ? 'alt' : 'ctrl'}+${token}` : null;
}

/** The first other binding using the same combo as `target` (core rows first, then plugin commands). */
export function findHotkeyClash(target: HotkeyBinding, all: readonly HotkeyBinding[]): HotkeyBinding | null {
  const combo = hotkeyCombo(target.modifier, target.key);
  if (!combo) return null;
  return all.find((other) => other.id !== target.id && hotkeyCombo(other.modifier, other.key) === combo) ?? null;
}
