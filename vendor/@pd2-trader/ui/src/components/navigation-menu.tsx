import * as React from 'react';
import * as NavigationMenuPrimitive from '@radix-ui/react-navigation-menu';
import { cva } from 'class-variance-authority';
import { ChevronDownIcon } from 'lucide-react';

import { cn } from '../lib/utils';

/**
 * Site/top navigation: a row of links and hover-opened link panels (Radix NavigationMenu). The viewport renders
 * inline under the list (no portal), stacked with `z-popup`. `viewport={false}` drops the shared viewport: each
 * content then opens as its own popover under its trigger, or inside a `NavigationMenuViewport` you place yourself.
 */
const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root> & { viewport?: boolean }
>(function NavigationMenu({ className, children, viewport = true, ...props }, ref) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={cn('group/navigation-menu relative flex max-w-max flex-1 items-center justify-center', className)}
      ref={ref}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  );
});

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(function NavigationMenuList({ className, ...props }, ref) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn('group flex flex-1 list-none items-center justify-center gap-1', className)}
      ref={ref}
      {...props}
    />
  );
});

const NavigationMenuItem = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Item>
>(function NavigationMenuItem({ className, ...props }, ref) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn('relative', className)}
      ref={ref}
      {...props}
    />
  );
});

/**
 * Top-level trigger/link look: quiet text that turns foreground on hover and while open; the current page
 * (`data-active` from `NavigationMenuLink active`, or `aria-current="page"`) takes the theme glow.
 */
const navigationMenuTriggerStyle = cva(
  'group inline-flex h-9 w-max items-center justify-center gap-1 rounded-md bg-transparent px-3 text-sm font-medium text-muted-foreground outline-none transition-[color,background-color,box-shadow] duration-(--dur-fast) hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent/50 data-[state=open]:text-accent-foreground data-[active]:text-glow aria-[current=page]:text-glow',
);

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(function NavigationMenuTrigger({ className, children, ...props }, ref) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), 'group', className)}
      ref={ref}
      {...props}
    >
      {children}
      <ChevronDownIcon
        className="relative top-px size-3.5 transition-transform duration-(--dur-med) group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  );
});

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(function NavigationMenuContent({ className, ...props }, ref) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        'top-0 left-0 w-full p-1.5 md:absolute md:w-auto data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52',
        'not-in-data-[slot=navigation-menu-viewport]:top-full not-in-data-[slot=navigation-menu-viewport]:z-popup not-in-data-[slot=navigation-menu-viewport]:mt-1.5 not-in-data-[slot=navigation-menu-viewport]:overflow-hidden not-in-data-[slot=navigation-menu-viewport]:rounded-lg not-in-data-[slot=navigation-menu-viewport]:border not-in-data-[slot=navigation-menu-viewport]:border-border not-in-data-[slot=navigation-menu-viewport]:bg-popover not-in-data-[slot=navigation-menu-viewport]:text-popover-foreground not-in-data-[slot=navigation-menu-viewport]:shadow-panel not-in-data-[slot=navigation-menu-viewport]:duration-(--dur-med) not-in-data-[slot=navigation-menu-viewport]:data-[state=open]:animate-in not-in-data-[slot=navigation-menu-viewport]:data-[state=closed]:animate-out not-in-data-[slot=navigation-menu-viewport]:data-[state=closed]:zoom-out-95 not-in-data-[slot=navigation-menu-viewport]:data-[state=open]:zoom-in-95 not-in-data-[slot=navigation-menu-viewport]:data-[state=open]:fade-in-0 not-in-data-[slot=navigation-menu-viewport]:data-[state=closed]:fade-out-0',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

const VIEWPORT_ALIGN = {
  start: 'left-0 justify-start',
  center: 'inset-x-0 justify-center',
  end: 'right-0 justify-end',
} as const;

/**
 * Shared panel under the list that holds the open content and animates its size between items. Rendered by
 * `NavigationMenu`; render it yourself (with `viewport={false}` on the root) to align it to the menu's end.
 */
const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport> & { align?: keyof typeof VIEWPORT_ALIGN }
>(function NavigationMenuViewport({ className, align = 'start', ...props }, ref) {
  return (
    <div className={cn('absolute top-full isolate z-popup flex', VIEWPORT_ALIGN[align])}>
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          'relative mt-1.5 h-(--radix-navigation-menu-viewport-height) w-full origin-top overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-panel duration-(--dur-med) data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 md:w-(--radix-navigation-menu-viewport-width)',
          className,
        )}
        ref={ref}
        {...props}
      />
    </div>
  );
});

/** A link in the bar (with `navigationMenuTriggerStyle()`) or a row inside a content panel. `active` marks the current page. */
const NavigationMenuLink = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Link>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Link>
>(function NavigationMenuLink({ className, ...props }, ref) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "flex flex-col gap-0.5 rounded-md px-2.5 py-2 text-sm outline-none transition-colors duration-(--dur-fast) hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/60 data-[active]:bg-accent/50 data-[active]:text-accent-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

/** Small caret under the open trigger, pointing at the viewport. */
const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(function NavigationMenuIndicator({ className, ...props }, ref) {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn(
        'top-full z-raised flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in',
        className,
      )}
      ref={ref}
      {...props}
    >
      <div className="relative top-3/5 size-2 rotate-45 rounded-tl-xs bg-border shadow-panel" />
    </NavigationMenuPrimitive.Indicator>
  );
});

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
};
