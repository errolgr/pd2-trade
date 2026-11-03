import type { Story, StoryDefault } from '@ladle/react';
import { Skeleton } from '@pd2-trader/ui';

export default { title: 'Primitives / Skeleton' } satisfies StoryDefault;

export const Loading: Story = () => (
  <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4">
    <div className="flex items-center gap-3">
      <Skeleton className="size-10 rounded-md" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-20 w-full" />
  </div>
);
