import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium select-none transition-[color,background-color,border-color,box-shadow,transform] duration-(--dur-fast) ease-out motion-safe:active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-0 aria-invalid:ring-2 aria-invalid:ring-destructive/50",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-glow',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/50',
        outline:
          'border border-input bg-background/60 shadow-xs hover:border-ring/50 hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        /** Inline text action ("Clear"): muted, turns foreground on hover, no fill. */
        quiet: 'text-muted-foreground hover:text-foreground',
        /** Input-look trigger for pickers / comboboxes. */
        field:
          'justify-between border border-input bg-background/60 font-normal shadow-xs hover:border-ring/50 data-[state=open]:border-ring/60',
      },
      size: {
        default: 'h-9 px-4 py-2 text-sm has-[>svg]:px-3',
        xs: 'h-6 gap-1 rounded-sm px-2 text-2xs has-[>svg]:px-1.5',
        sm: 'h-8 rounded-md px-3 text-sm has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 text-sm has-[>svg]:px-4',
        icon: 'size-9 text-sm',
        'icon-sm': 'size-7 text-sm',
        'icon-xs': 'size-6 text-xs',
        'icon-2xs': "size-5 text-2xs [&_svg:not([class*='size-'])]:size-3.5",
        /** Full-width list row; with `ghost`, aria-selected / aria-current / data-active mark the current row. */
        row: 'h-auto w-full justify-start gap-2 px-2 py-1.5 text-left text-sm font-normal whitespace-normal aria-selected:bg-accent aria-selected:text-accent-foreground aria-[current=page]:bg-accent aria-[current=true]:bg-accent data-active:bg-accent data-active:text-accent-foreground',
        /** No box: sits inside running text and inherits its font size. */
        inline: 'h-auto gap-1 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<'button'> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';

  return <Comp ref={ref}
    data-slot="button"
    className={cn(buttonVariants({ variant, size, className }))}
    {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
