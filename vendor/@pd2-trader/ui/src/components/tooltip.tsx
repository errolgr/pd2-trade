import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '../lib/utils';
import { usePanelPortalContainer } from '../lib/portal';

const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Tap support: Radix tooltips never open on touch (no hover, and a click closes them). `Tooltip` owns the open
 * state so `TooltipTrigger` can toggle it on a touch tap; mouse, pen and keyboard keep the Radix behavior.
 */
interface TooltipTouchContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** True for the rest of the tap's click dispatch, so Radix's close-on-click does not undo the toggle. */
  suppressCloseRef: React.MutableRefObject<boolean>;
}

const TooltipTouchContext = React.createContext<TooltipTouchContextValue | null>(null);

function Tooltip({ open: openProp, defaultOpen = false, onOpenChange, ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;
  const suppressCloseRef = React.useRef(false);

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );
  const handleRadixOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next && suppressCloseRef.current) return;
      setOpen(next);
    },
    [setOpen],
  );
  const touch = React.useMemo(() => ({ open, setOpen, suppressCloseRef }), [open, setOpen]);

  return (
    <TooltipTouchContext.Provider value={touch}>
      <TooltipPrimitive.Root data-slot="tooltip"
        open={open}
        onOpenChange={handleRadixOpenChange}
        {...props} />
    </TooltipTouchContext.Provider>
  );
}

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(function TooltipTrigger({ onPointerDown, onClick, ...props }, ref) {
  const touch = React.useContext(TooltipTouchContext);
  // Per tap: was it a touch, and was the tooltip open before Radix reacted to the pointerdown/focus?
  const tapRef = React.useRef<{ touch: boolean; wasOpen: boolean }>({ touch: false, wasOpen: false });

  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      ref={ref}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        tapRef.current = { touch: event.pointerType === 'touch', wasOpen: touch?.open ?? false };
      }}
      onClick={(event) => {
        onClick?.(event);
        const tap = tapRef.current;
        tapRef.current = { touch: false, wasOpen: false };
        if (!touch || !tap.touch || event.defaultPrevented) return;
        touch.setOpen(!tap.wasOpen);
        // Radix's own onClick (close) runs right after ours in this dispatch; ignore it, then re-arm.
        touch.suppressCloseRef.current = true;
        queueMicrotask(() => {
          touch.suppressCloseRef.current = false;
        });
      }}
      {...props}
    />
  );
});

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal container={usePanelPortalContainer()}>
    <TooltipPrimitive.Content
      data-slot="tooltip-content"
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

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
