import * as React from 'react';
import { GripVertical } from 'lucide-react';
import * as ResizablePrimitive from 'react-resizable-panels';

import { cn } from '../lib/utils';

/** Split layout container (react-resizable-panels). `direction` is required: `horizontal` = side by side. */
function ResizablePanelGroup({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  return (
    <ResizablePrimitive.PanelGroup
      data-slot="resizable-panel-group"
      className={cn('flex size-full data-[panel-group-direction=vertical]:flex-col', className)}
      {...props}
    />
  );
}

/** One pane; sizes are percentages of the group (`defaultSize`, `minSize`, `maxSize`). */
function ResizablePanel({ ...props }: React.ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel"
    {...props} />;
}

/**
 * Drag handle between two panels: a hairline with a wider invisible hit area. `withHandle` shows a grip.
 * Keyboard (arrows / Home / End) comes from the library once the handle has focus.
 */
function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & { withHandle?: boolean }) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        'relative flex w-px shrink-0 items-center justify-center bg-border outline-none transition-colors duration-(--dur-fast) ease-out',
        'after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2',
        'hover:bg-ring/60 data-[resize-handle-state=drag]:bg-ring focus-visible:ring-2 focus-visible:ring-ring/60',
        'data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full',
        'data-[panel-group-direction=vertical]:after:inset-x-0 data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:top-1/2 data-[panel-group-direction=vertical]:after:h-2 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2',
        '[&[data-panel-group-direction=vertical]>div]:rotate-90',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-xs border border-border bg-surface-elevated text-muted-foreground">
          <GripVertical className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
