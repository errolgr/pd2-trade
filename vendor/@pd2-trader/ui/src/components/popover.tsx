import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '../lib/utils';
import { usePanelPortalContainer } from '../lib/portal';
import { floatingMotionClass, popoverSurfaceClass } from './menu-styles';

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover"
    {...props} />;
}

const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(function PopoverTrigger({ ...props }, ref) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger"
    ref={ref}
    {...props} />;
});

const PopoverAnchor = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Anchor>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Anchor>
>(function PopoverAnchor({ ...props }, ref) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor"
    ref={ref}
    {...props} />;
});

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(function PopoverContent({ className, align = 'center', sideOffset = 4, ...props }, ref) {
  const container = usePanelPortalContainer();
  return (
    <PopoverPrimitive.Portal data-slot="popover-portal"
      container={container}>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(popoverSurfaceClass, floatingMotionClass, 'w-72 p-4', className)}
        ref={ref}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
