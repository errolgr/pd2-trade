import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border border-border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'text-destructive border-destructive/40 bg-destructive/10 [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const Alert = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof alertVariants>
>(function Alert({ className, variant, ...props }, ref) {
  return (
    <div data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      ref={ref}
      {...props} />
  );
});

const AlertTitle = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(function AlertTitle(
  { className, ...props },
  ref,
) {
  return (
    <div
      data-slot="alert-title"
      className={cn('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', className)}
      ref={ref}
      {...props}
    />
  );
});

const AlertDescription = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function AlertDescription({ className, ...props }, ref) {
    return (
      <div
        data-slot="alert-description"
        className={cn(
          'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

export { Alert, AlertTitle, AlertDescription };
