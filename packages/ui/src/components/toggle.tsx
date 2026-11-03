'use client';

import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:shadow-[inset_0_0_0_1px_var(--color-border)] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-0 transition-[color,background-color,border-color,box-shadow,transform] duration-(--dur-fast) ease-out motion-safe:active:scale-[0.97] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap",
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'border border-input bg-transparent shadow-xs hover:border-ring/40 hover:bg-accent hover:text-accent-foreground',
        /** Filter chip: pill outline; pressed → primary tint. */
        chip: 'rounded-full border border-border/70 bg-transparent text-muted-foreground hover:border-ring/40 hover:bg-accent/50 data-[state=on]:border-primary/50 data-[state=on]:bg-primary/15 data-[state=on]:text-primary data-[state=on]:shadow-none',
      },
      size: {
        default: 'h-9 px-2 min-w-9',
        sm: 'h-8 px-1.5 min-w-8',
        lg: 'h-10 px-2.5 min-w-10',
      },
    },
    // Chips have their own compact geometry unless a size is passed explicitly.
    compoundVariants: [{ variant: 'chip', size: 'default', class: 'h-6 min-w-0 gap-1 px-2 text-2xs' }],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Toggle, toggleVariants };
