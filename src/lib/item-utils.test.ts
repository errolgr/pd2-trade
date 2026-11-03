import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clipboardContainsValidItem,
  createItemsMapByKey,
  encodeItem,
  encodeItemForQuickList,
  escapeUnicode,
  isStashItem,
  repairClipboardText,
  sleep,
} from './item-utils';
import type { ItemType } from '@/assets/itemFuzzySearch';

const decode = (b64: string) => decodeURIComponent(escape(atob(b64)));

describe('createItemsMapByKey', () => {
  it('indexes items by key, last duplicate wins', () => {
    const items = [
      { key: 'a', name: 'A1' },
      { key: 'b', name: 'B' },
      { key: 'a', name: 'A2' },
    ] as unknown as ItemType[];
    const map = createItemsMapByKey(items);
    expect(Object.keys(map).sort()).toEqual(['a', 'b']);
    expect(map.a.name).toBe('A2');
  });
});

describe('item encoding', () => {
  const raw = JSON.stringify({ name: 'Tal Rasha’s Lidless Eye', type: 'Swirling Crystal' });

  it('escapeUnicode turns multibyte chars into a latin1 byte string btoa accepts', () => {
    const escaped = escapeUnicode('’');
    expect(escaped).toHaveLength(3);
    expect(() => btoa(escaped)).not.toThrow();
  });

  it('encodeItemForQuickList round-trips non-ASCII JSON through base64', () => {
    expect(decode(encodeItemForQuickList(raw))).toBe(raw);
  });

  it('encodeItem is URL-safe and round-trips', () => {
    const encoded = encodeItem(raw);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decode(decodeURIComponent(encoded))).toBe(raw);
  });
});

describe('repairClipboardText', () => {
  // UTF-8 bytes of `s` read back one byte per character as Windows-1252, as an ANSI clipboard delivers them
  const asCp1252 = (s: string) => {
    const high: Record<number, string> = { 0x80: '€', 0x92: '’', 0x99: '™' };
    return [...new TextEncoder().encode(s)].map((b) => high[b] ?? String.fromCharCode(b)).join('');
  };

  it('restores colour codes that arrived as "Ã¿c"', () => {
    const raw = JSON.stringify({ name: 'ÿc0Monster Density:ÿc3 +206%' });
    expect(asCp1252(raw)).toContain('Ã¿c0Monster Density');
    expect(repairClipboardText(asCp1252(raw))).toBe(raw);
  });

  it('restores characters whose bytes fall in the Windows-1252 0x80-0x9F range', () => {
    const raw = JSON.stringify({ name: 'Tal Rasha’s Lidless Eye' });
    expect(repairClipboardText(asCp1252(raw))).toBe(raw);
  });

  it.each([
    ['plain ASCII', '{"name":"Shako"}'],
    ['correct UTF-8 text', '{"name":"ÿc4Tal Rasha’s"}'],
    ['Latin-1 text that is not valid UTF-8 once re-encoded', 'Ãé'],
  ])('leaves %s unchanged', (_, text) => {
    expect(repairClipboardText(text)).toBe(text);
  });
});

describe('clipboardContainsValidItem', () => {
  const item = (over: Record<string, unknown>) =>
    JSON.stringify({ quality: 'Rare', type: 'Ring', iLevel: 80, ...over });

  it('accepts an item with stats', () => {
    expect(clipboardContainsValidItem(item({ stats: [{ stat_id: 105, name: 'FCR' }] }))).toBe(true);
  });

  it.each([
    ['invalid JSON', '{nope'],
    ['a primitive', '42'],
    ['null', 'null'],
    ['missing quality', JSON.stringify({ type: 'Ring', iLevel: 1, stats: [{}] })],
    ['non-numeric iLevel', JSON.stringify({ quality: 'Rare', type: 'Ring', iLevel: '80', stats: [{}] })],
  ])('rejects %s', (_label, json) => {
    expect(clipboardContainsValidItem(json)).toBe(false);
  });

  it('rejects stat-less magic/rare items (not a base)', () => {
    expect(clipboardContainsValidItem(item({ stats: [] }))).toBe(false);
    expect(clipboardContainsValidItem(item({ quality: 'Magic' }))).toBe(false);
  });

  it('accepts stat-less Normal/Superior items of a known base type', () => {
    expect(clipboardContainsValidItem(item({ quality: 'Normal', type: 'Monarch', stats: [] }))).toBe(true);
    expect(clipboardContainsValidItem(item({ quality: 'Superior', type: 'Monarchÿc\\/' }))).toBe(true);
  });

  it('rejects stat-less Normal items of an unknown base type', () => {
    expect(clipboardContainsValidItem(item({ quality: 'Normal', type: 'Mystery Box', stats: null }))).toBe(false);
  });
});

describe('isStashItem', () => {
  it('detects stash location from an object or a JSON string', () => {
    expect(isStashItem({ location: 'Stash' })).toBe(true);
    expect(isStashItem(JSON.stringify({ location: 'Stash' }))).toBe(true);
  });

  it('is false for other locations, nullish input and malformed JSON', () => {
    expect(isStashItem({ location: 'Inventory' })).toBe(false);
    expect(isStashItem(null)).toBe(false);
    expect(isStashItem('{bad')).toBe(false);
  });
});

describe('sleep', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves only after the given delay', async () => {
    vi.useFakeTimers();
    let done = false;
    const p = sleep(100).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(99);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await p;
    expect(done).toBe(true);
  });
});
