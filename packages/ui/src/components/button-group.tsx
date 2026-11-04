import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';
import { Separator } from './separator';

const buttonGroupVariants = cva(
  "flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal:
          '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none',
        vertical:
          'flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  },
);

const ButtonGroup = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof buttonGroupVariants>
>(function ButtonGroup({ className, orientation, ...props }, ref) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      ref={ref}
      {...props}
    />
  );
});

const ButtonGroupText = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<'div'> & {
    asChild?: boolean;
  }
>(function ButtonGroupText({ className, asChild = false, ...props }, ref) {
  const Comp = asChild ? Slot : 'div';

  return (
    <Comp
      className={cn(
        "bg-muted shadow-xs flex items-center gap-2 rounded-md border px-4 text-sm font-medium [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

const ButtonGroupSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentPropsWithoutRef<typeof Separator>
>(function ButtonGroupSeparator({ className, orientation = 'vertical', ...props }, ref) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn('bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto', className)}
      ref={ref}
      {...props}
    />
  );
});

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
