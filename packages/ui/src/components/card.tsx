import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('bg-card text-card-foreground rounded-xl border border-border shadow-panel', className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-header"
    className={cn('flex flex-col gap-1.5 p-6', className)}
    {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-title"
      className={cn('leading-none font-semibold tracking-tight', className)}
      {...props} />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-description"
    className={cn('text-muted-foreground text-sm', className)}
    {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content"
    className={cn('p-6 pt-0', className)}
    {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-footer"
    className={cn('flex items-center p-6 pt-0', className)}
    {...props} />;
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };

/** Item card surface (quick-list, manage, queue and delist rows): `tone` static | interactive | selected | danger. */
const itemCardVariants = cva(
  'group/card relative rounded-lg border bg-card/60 p-3 text-card-foreground shadow-xs transition-[border-color,background-color,box-shadow,opacity,transform] duration-(--dur-fast) ease-out',
  {
    variants: {
      tone: {
        static: 'border-border',
        interactive:
          'cursor-pointer border-border outline-none hover:border-ring/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/60 motion-safe:active:scale-[0.995]',
        selected:
          'cursor-pointer border-primary/70 bg-primary/8 shadow-glow outline-none ring-1 ring-primary/40 focus-visible:ring-2 focus-visible:ring-ring/60',
        danger:
          'cursor-pointer border-border outline-none hover:border-destructive/60 hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/50',
      },
    },
    defaultVariants: { tone: 'static' },
  },
);

function ItemCard({ className, tone, ...props }: React.ComponentProps<'div'> & VariantProps<typeof itemCardVariants>) {
  return (
    <div
      data-slot="item-card"
      data-tone={tone ?? 'static'}
      className={cn(itemCardVariants({ tone }), className)}
      {...props}
    />
  );
}

export { ItemCard, itemCardVariants };
