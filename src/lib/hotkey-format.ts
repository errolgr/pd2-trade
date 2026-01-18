/**
 * Format a hotkey combination for display
 * @param modifier The modifier key ('ctrl' or 'alt')
 * @param key The key character
 * @returns Formatted string like "Ctrl+M" or "Alt+L"
 */
export function formatHotkey(modifier: 'ctrl' | 'alt', key: string): string {
  const modifierDisplay = modifier === 'ctrl' ? 'Ctrl' : 'Alt';
  const keyDisplay = key.toUpperCase();
  return `${modifierDisplay}+${keyDisplay}`;
}
