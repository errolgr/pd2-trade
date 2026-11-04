'use client';

import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';

import { useUiLabels } from '../lib/labels';
import { cn } from '../lib/utils';
import { usePanelPortalContainer } from '../lib/portal';

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet"
    {...props} />;
}

const SheetTrigger = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Trigger>
>(function SheetTrigger({ ...props }, ref) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger"
    ref={ref}
    {...props} />;
});

const SheetClose = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Close>
>(function SheetClose({ ...props }, ref) {
  return <SheetPrimitive.Close data-slot="sheet-close"
    ref={ref}
    {...props} />;
});

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  const container = usePanelPortalContainer();
  return <SheetPrimitive.Portal data-slot="sheet-portal"
    container={container}
    {...props} />;
}

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(function SheetOverlay({ className, ...props }, ref) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-scrim backdrop-blur-sm duration-(--dur-med) ease-out',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
    side?: 'top' | 'right' | 'bottom' | 'left';
  }
>(function SheetContent({ className, children, side = 'right', ...props }, ref) {
  // Inside an overlay panel the sheet slides over the panel, not the monitor edge
  const inPanel = !!usePanelPortalContainer();
  const labels = useUiLabels();
  return (
    <SheetPortal>
      <SheetOverlay className={inPanel ? 'absolute' : undefined} />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'bg-popover text-popover-foreground border-border data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-panel transition ease-out data-[state=closed]:duration-(--dur-med) data-[state=open]:duration-(--dur-slow)',
          inPanel && 'absolute',
          side === 'right' &&
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
          side === 'left' &&
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
          side === 'top' &&
            'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
          side === 'bottom' &&
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="ring-offset-background focus-visible:ring-ring/60 text-muted-foreground hover:text-foreground hover:bg-accent data-[state=open]:bg-secondary absolute top-4 right-4 rounded-md p-0.5 opacity-80 transition-[color,background-color,opacity,transform] duration-(--dur-fast) ease-out hover:opacity-100 motion-safe:active:scale-90 focus-visible:ring-2 focus-visible:ring-offset-0 focus:outline-hidden disabled:pointer-events-none">
          <XIcon className="size-4" />
          <span className="sr-only">{labels.close}</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
});

const SheetHeader = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function SheetHeader({ className, ...props }, ref) {
    return <div data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 p-4', className)}
      ref={ref}
      {...props} />;
  },
);

const SheetFooter = React.forwardRef<React.ElementRef<'div'>, React.ComponentPropsWithoutRef<'div'>>(
  function SheetFooter({ className, ...props }, ref) {
    return (
      <div data-slot="sheet-footer"
        className={cn('mt-auto flex flex-col gap-2 p-4', className)}
        ref={ref}
        {...props} />
    );
  },
);

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(function SheetTitle({ className, ...props }, ref) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-foreground font-semibold tracking-tight', className)}
      ref={ref}
      {...props}
    />
  );
});

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(function SheetDescription({ className, ...props }, ref) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-muted-foreground text-sm', className)}
      ref={ref}
      {...props}
    />
  );
});

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
