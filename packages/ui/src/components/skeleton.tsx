import { cn } from '../lib/utils';
import React from 'react';

const Skeleton = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(function Skeleton(
  { className, ...props },
  ref,
) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'relative overflow-hidden bg-muted rounded-md before:absolute before:inset-0 before:-translate-x-full motion-safe:before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-foreground/10 before:to-transparent motion-reduce:animate-pulse',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

export { Skeleton };
