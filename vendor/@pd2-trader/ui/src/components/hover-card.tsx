import * as React from 'react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';

import { cn } from '../lib/utils';
import { usePanelPortalContainer } from '../lib/portal';
import { floatingMotionClass, popoverSurfaceClass } from './menu-styles';

/**
 * Preview card that opens on pointer hover (item tooltips, price breakdowns). Works without keyboard focus, so it
 * is the hover surface of the non-focusable overlay. Delays are tuned short for the overlay (150ms in, 100ms out).
 */
function HoverCard({ openDelay = 150, closeDelay = 100, ...props }: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card"
    openDelay={openDelay}
    closeDelay={closeDelay}
    {...props} />;
}

const HoverCardTrigger = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Trigger>
>(function HoverCardTrigger({ ...props }, ref) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger"
    ref={ref}
    {...props} />;
});

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content> & {
    /** `default` = popover card (border, background, padding); `bare` = no chrome, for content that brings its own (item tooltips). */
    variant?: 'default' | 'bare';
  }
>(function HoverCardContent({ className, variant = 'default', align = 'center', sideOffset = 4, ...props }, ref) {
  const container = usePanelPortalContainer();
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal"
      container={container}>
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        data-variant={variant}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          popoverSurfaceClass,
          floatingMotionClass,
          variant === 'default' ? 'w-64 p-3' : 'w-auto border-0 bg-transparent p-0 shadow-none',
          className,
        )}
        ref={ref}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
});

export { HoverCard, HoverCardTrigger, HoverCardContent };
