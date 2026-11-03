import type { Story, StoryDefault } from '@ladle/react';
import { Progress } from '@pd2-trader/ui';

export default { title: 'Primitives / Progress' } satisfies StoryDefault;

export const Values: Story = () => (
  <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4 text-2xs text-muted-foreground">
    {[0, 15, 60, 100].map((value) => (
      <div key={value}
        className="flex flex-col gap-1">
        <span>Scanning stash · {value}%</span>
        <Progress value={value} />
      </div>
    ))}
  </div>
);
