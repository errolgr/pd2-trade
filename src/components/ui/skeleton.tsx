import { cn } from '@/lib/utils';
import React from 'react';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton"
    className={cn('relative overflow-hidden bg-muted rounded-md before:absolute before:inset-0 before:-translate-x-full motion-safe:before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-foreground/10 before:to-transparent motion-reduce:animate-pulse', className)}
    {...props} />;
}

export { Skeleton };
