import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';
import { usePanelPortalContainer } from '@/overlay/portal';

/** Set by TooltipProvider so a Tooltip outside any provider (isolated renders, tests) can supply its own. */
const ProviderPresent = React.createContext(false);

function TooltipProvider(props: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <ProviderPresent.Provider value>
      <TooltipPrimitive.Provider {...props} />
    </ProviderPresent.Provider>
  );
}

function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const root = <TooltipPrimitive.Root {...props} />;
  return React.useContext(ProviderPresent) ? root : <TooltipPrimitive.Provider>{root}</TooltipPrimitive.Provider>;
}

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal container={usePanelPortalContainer()}>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-xs text-popover-foreground shadow-panel duration-(--dur-fast) ease-out animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * The overlay's hover hint for one trigger element; use it instead of the native `title` attribute (the WebView
 * draws that as a system tooltip that can land behind or outside the overlay). The child must take a ref and spread
 * props onto a DOM element (a DOM element or a forwardRef component). No `label` keeps the child and shows nothing.
 * A disabled `<button>` gets no pointer events: use aria-disabled, or wrap it in a `<span tabIndex={0}>`.
 */
function Tip({
  label,
  side = 'top',
  align,
  className,
  children,
}: {
  label: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  className?: string;
  children: React.ReactElement;
}) {
  const hasLabel = label != null && label !== false && label !== '';
  return (
    <Tooltip open={hasLabel ? undefined : false}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      {hasLabel && (
        <TooltipContent side={side}
          align={align}
          className={cn('max-w-64 whitespace-pre-line', className)}>
          {label}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, Tip };
