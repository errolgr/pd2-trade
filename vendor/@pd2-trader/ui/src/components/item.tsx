import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';
import { Separator } from './separator';

/** Set by ItemGroup so its Items become list items. */
const ItemGroupContext = React.createContext(false);

const ItemGroup = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(function ItemGroup(
  { className, ...props },
  ref,
) {
  return (
    <ItemGroupContext.Provider value>
      <div role="list"
        data-slot="item-group"
        className={cn('group/item-group flex flex-col', className)}
        ref={ref}
        {...props} />
    </ItemGroupContext.Provider>
  );
});

const ItemSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentPropsWithoutRef<typeof Separator>
>(function ItemSeparator({ className, ...props }, ref) {
  return <Separator data-slot="item-separator"
    orientation="horizontal"
    className={cn('my-0', className)}
    ref={ref}
    {...props} />;
});

const itemVariants = cva(
  'group/item flex flex-wrap items-center rounded-md border border-transparent text-sm outline-none transition-colors duration-(--dur-fast) ease-out focus-visible:ring-2 focus-visible:ring-ring/60 [a]:hover:bg-accent [a]:hover:text-accent-foreground',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: 'border-border',
        muted: 'bg-muted/50',
      },
      size: {
        default: 'gap-3 p-3',
        sm: 'gap-2 px-2.5 py-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/**
 * A content row: media, title + description, actions. `asChild` renders a link (`<a>`, router `Link`) with the
 * row styles; inside an ItemGroup it is a list item.
 */
const Item = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof itemVariants> & { asChild?: boolean }
>(function Item({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) {
  const Comp = asChild ? Slot : 'div';
  const inGroup = React.useContext(ItemGroupContext);
  return (
    <Comp
      role={inGroup && !asChild ? 'listitem' : undefined}
      data-slot="item"
      data-variant={variant}
      data-size={size}
      className={cn(itemVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});

const itemMediaVariants = cva(
  'flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "size-8 rounded-sm border border-border bg-muted text-muted-foreground [&_svg:not([class*='size-'])]:size-4",
        image: 'size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const ItemMedia = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof itemMediaVariants>
>(function ItemMedia({ className, variant = 'default', ...props }, ref) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant, className }))}
      ref={ref}
      {...props}
    />
  );
});

const ItemContent = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function ItemContent({ className, ...props }, ref) {
    return (
      <div
        data-slot="item-content"
        className={cn('flex min-w-0 flex-1 flex-col gap-0.5 [&+[data-slot=item-content]]:flex-none', className)}
        ref={ref}
        {...props}
      />
    );
  },
);

const ItemTitle = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(function ItemTitle(
  { className, ...props },
  ref,
) {
  return (
    <div
      data-slot="item-title"
      className={cn('flex w-fit min-w-0 items-center gap-2 text-sm leading-snug font-medium', className)}
      ref={ref}
      {...props}
    />
  );
});

const ItemDescription = React.forwardRef<React.ElementRef<'p'>, React.ComponentPropsWithoutRef<'p'>>(
  function ItemDescription({ className, ...props }, ref) {
    return (
      <p
        data-slot="item-description"
        className={cn(
          'line-clamp-2 text-xs font-normal text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-foreground',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

const ItemActions = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function ItemActions({ className, ...props }, ref) {
    return <div data-slot="item-actions"
      className={cn('flex shrink-0 items-center gap-2', className)}
      ref={ref}
      {...props} />;
  },
);

const ItemHeader = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function ItemHeader({ className, ...props }, ref) {
    return (
      <div
        data-slot="item-header"
        className={cn('flex basis-full items-center justify-between gap-2', className)}
        ref={ref}
        {...props}
      />
    );
  },
);

const ItemFooter = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function ItemFooter({ className, ...props }, ref) {
    return (
      <div
        data-slot="item-footer"
        className={cn('flex basis-full items-center justify-between gap-2', className)}
        ref={ref}
        {...props}
      />
    );
  },
);

export {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
  ItemHeader,
  ItemFooter,
};
