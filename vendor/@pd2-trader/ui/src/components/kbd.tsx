import * as React from 'react';

import { cn } from '../lib/utils';

/** A keycap: hotkeys and shortcuts in copy and menus ("Ctrl", "D"). Inherits nothing but the font family. */
const Kbd = React.forwardRef<React.ElementRef<'kbd'>, React.ComponentPropsWithoutRef<'kbd'>>(function Kbd(
  { className, ...props },
  ref,
) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-1 rounded-sm border border-border bg-muted px-1 font-sans text-2xs font-medium text-muted-foreground shadow-xs [&_svg:not([class*="size-"])]:size-3',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

/** Keys pressed together (`Ctrl` + `M`): keycaps with a small gap. */
const KbdGroup = React.forwardRef<React.ElementRef<'kbd'>, React.ComponentPropsWithoutRef<'kbd'>>(function KbdGroup(
  { className, ...props },
  ref,
) {
  return <kbd data-slot="kbd-group"
    className={cn('inline-flex items-center gap-1', className)}
    ref={ref}
    {...props} />;
});

/**
 * Split a shortcut string into its keys: `'Ctrl+Shift+D'` → `['Ctrl', 'Shift', 'D']`. Whitespace around keys is
 * trimmed; a `+` key is written as a trailing or doubled `+` (`'Ctrl++'` → `['Ctrl', '+']`). Keys are not translated.
 */
function parseKeyCombo(combo: string): string[] {
  const keys: string[] = [];
  let current = '';
  for (const ch of combo) {
    if (ch === '+' && current.trim() !== '') {
      keys.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() !== '') keys.push(current.trim());
  return keys;
}

interface KbdComboProps extends Omit<React.ComponentPropsWithoutRef<'kbd'>, 'children'> {
  /** `'Ctrl+Shift+D'` (split on `+`) or the keys as an array. Rendered as written (no ⌘/⇧ symbols). */
  keys: string | string[];
}

/** A whole shortcut from a string: one Kbd per key inside a KbdGroup, with a visual `+` between keys. */
const KbdCombo = React.forwardRef<React.ElementRef<'kbd'>, KbdComboProps>(function KbdCombo(
  { keys, ...props },
  ref,
) {
  const list = typeof keys === 'string' ? parseKeyCombo(keys) : keys;
  return (
    <KbdGroup data-slot="kbd-combo"
      ref={ref}
      {...props}>
      {list.map((key, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span aria-hidden
              className="text-3xs text-muted-foreground">
              +
            </span>
          )}
          <Kbd>{key}</Kbd>
        </React.Fragment>
      ))}
    </KbdGroup>
  );
});

export { Kbd, KbdGroup, KbdCombo, parseKeyCombo };
export type { KbdComboProps };
