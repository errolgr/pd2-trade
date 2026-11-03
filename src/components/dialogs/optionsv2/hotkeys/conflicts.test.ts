import { describe, expect, it } from 'vitest';
import { findHotkeyClash, hotkeyCombo, type HotkeyBinding } from './conflicts';

const CORE: HotkeyBinding[] = [
  { id: 'hotkeyKey', label: 'Price check', modifier: 'ctrl', key: 'd' },
  { id: 'hotkeyKeyMarket', label: 'Market', modifier: 'ctrl', key: 'm' },
  { id: 'hotkeyKeySnapshot', label: 'Snapshot', modifier: 'ctrl', key: '' },
];
const plugin = (commandId: string, modifier: string, key: string): HotkeyBinding => ({
  id: `plugin:com.example.tool:${commandId}`,
  label: `Tool: ${commandId}`,
  modifier,
  key,
});

describe('hotkeyCombo', () => {
  it('builds a modifier+token combo; null when unbound', () => {
    expect(hotkeyCombo('alt', 'm')).toBe('alt+M');
    expect(hotkeyCombo('ctrl', '')).toBeNull();
    expect(hotkeyCombo('ctrl', undefined)).toBeNull();
  });
});

describe('findHotkeyClash', () => {
  it('finds a plugin command clashing with a core hotkey, and the reverse', () => {
    const cmd = plugin('open', 'ctrl', 'M');
    const all = [...CORE, cmd];
    expect(findHotkeyClash(cmd, all)?.label).toBe('Market');
    expect(findHotkeyClash(CORE[1], all)?.label).toBe('Tool: open');
  });

  it('finds clashes between plugin commands', () => {
    const a = plugin('a', 'alt', 'k');
    const b = plugin('b', 'alt', 'k');
    expect(findHotkeyClash(a, [...CORE, a, b])?.id).toBe(b.id);
  });

  it('treats a different modifier as no clash and ignores unbound rows', () => {
    const cmd = plugin('open', 'alt', 'm');
    expect(findHotkeyClash(cmd, [...CORE, cmd])).toBeNull();
    expect(findHotkeyClash(CORE[2], [...CORE, plugin('x', 'ctrl', '')])).toBeNull();
  });

  it('compares by key token (old layout-typed keys match their translation)', () => {
    const cmd = plugin('open', 'ctrl', '[');
    const legacy: HotkeyBinding = { id: 'hotkeyKeyBuilds', label: 'Builds', modifier: 'ctrl', key: 'х' };
    expect(findHotkeyClash(cmd, [legacy, cmd])?.label).toBe('Builds');
  });
});
