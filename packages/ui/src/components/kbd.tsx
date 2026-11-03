import * as React from 'react';

import { cn } from '../lib/utils';

/** A keycap: hotkeys and shortcuts in copy and menus ("Ctrl", "D"). Inherits nothing but the font family. */
function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-1 rounded-sm border border-border bg-muted px-1 font-sans text-2xs font-medium text-muted-foreground shadow-xs [&_svg:not([class*="size-"])]:size-3',
        className,
      )}
      {...props}
    />
  );
}

/** Keys pressed together (`Ctrl` + `M`): keycaps with a small gap. */
function KbdGroup({ className, ...props }: React.ComponentProps<'kbd'>) {
  return <kbd data-slot="kbd-group"
    className={cn('inline-flex items-center gap-1', className)}
    {...props} />;
}

export { Kbd, KbdGroup };
