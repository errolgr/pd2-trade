import { describe, expect, it } from 'vitest';
import { shortcutFormSchema } from './types';

const parse = (data: Record<string, unknown>) => shortcutFormSchema.safeParse({ type: 'exact', ...data });

describe('shortcutFormSchema', () => {
  it('accepts a note-only listing', () => {
    expect(parse({ note: 'offer' }).success).toBe(true);
  });

  it('accepts a price-only listing as number or numeric string', () => {
    expect(parse({ price: 2 }).success).toBe(true);
    expect(parse({ price: '0.5' }).success).toBe(true);
  });

  it.each([
    ['nothing filled', {}],
    ['whitespace note and empty price', { note: '   ', price: '' }],
    ['zero price', { price: 0 }],
    ['zero price as string', { price: '0' }],
    ['negative price', { price: -3 }],
    ['non-numeric price string', { price: 'abc' }],
  ])('rejects %s, attaching the error to the note field', (_label, data) => {
    const result = parse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['note']);
      expect(result.error.issues[0].message).toBe('Please fill in either the note or HR price field.');
    }
  });

  it('accepts an invalid price when a note is present', () => {
    expect(parse({ note: 'pc', price: 0 }).success).toBe(true);
  });

  it('rejects an unknown listing type', () => {
    expect(shortcutFormSchema.safeParse({ type: 'auction', note: 'x' }).success).toBe(false);
  });
});
