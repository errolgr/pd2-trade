import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('drops falsy classes and lets later Tailwind utilities win conflicts', () => {
    expect(cn('px-2 text-sm', false, undefined, { hidden: false, block: true }, 'px-4')).toBe('text-sm block px-4');
  });

  it('keeps a named type step next to a text color (distinct groups)', () => {
    expect(cn('text-2xs text-muted-foreground')).toBe('text-2xs text-muted-foreground');
    expect(cn('text-muted-foreground text-3xs')).toBe('text-muted-foreground text-3xs');
  });

  it('resolves conflicts inside the named scales', () => {
    expect(cn('text-xs', 'text-2xs')).toBe('text-2xs');
    expect(cn('w-control', 'w-55')).toBe('w-55');
    expect(cn('tracking-wide', 'tracking-caps')).toBe('tracking-caps');
  });
});
