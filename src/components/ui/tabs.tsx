import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs"
    className={cn('flex flex-col gap-2', className)}
    {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'bg-muted/70 text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg border border-border/60 p-1',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background data-[state=active]:text-foreground hover:text-foreground outline-none relative inline-flex items-center justify-center gap-2 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-(--dur-med) ease-out focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 aria-invalid:focus-visible:ring-0 data-[state=active]:shadow-sm after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary after:scale-x-0 after:transition-transform after:duration-(--dur-med) after:ease-out data-[state=active]:after:scale-x-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'outline-none flex-1 transition-[color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring/60 aria-invalid:focus-visible:ring-0 motion-safe:data-[state=active]:animate-in motion-safe:data-[state=active]:fade-in-0 data-[state=active]:duration-(--dur-med)',
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
