import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

const Card = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(function Card(
  { className, ...props },
  ref,
) {
  return (
    <div
      data-slot="card"
      className={cn('bg-card text-card-foreground rounded-xl border border-border shadow-panel', className)}
      ref={ref}
      {...props}
    />
  );
});

const CardHeader = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(function CardHeader(
  { className, ...props },
  ref,
) {
  return <div data-slot="card-header"
    className={cn('flex flex-col gap-1.5 p-6', className)}
    ref={ref}
    {...props} />;
});

const CardTitle = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(function CardTitle(
  { className, ...props },
  ref,
) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold tracking-tight', className)}
      ref={ref}
      {...props}
    />
  );
});

const CardDescription = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function CardDescription({ className, ...props }, ref) {
    return (
      <div
        data-slot="card-description"
        className={cn('text-muted-foreground text-sm', className)}
        ref={ref}
        {...props}
      />
    );
  },
);

const CardContent = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function CardContent({ className, ...props }, ref) {
    return <div data-slot="card-content"
      className={cn('p-6 pt-0', className)}
      ref={ref}
      {...props} />;
  },
);

const CardFooter = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(function CardFooter(
  { className, ...props },
  ref,
) {
  return <div data-slot="card-footer"
    className={cn('flex items-center p-6 pt-0', className)}
    ref={ref}
    {...props} />;
});

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

const ItemCard = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof itemCardVariants>
>(function ItemCard({ className, tone, ...props }, ref) {
  return (
    <div
      data-slot="item-card"
      data-tone={tone ?? 'static'}
      className={cn(itemCardVariants({ tone }), className)}
      ref={ref}
      {...props}
    />
  );
});

export { ItemCard, itemCardVariants };
