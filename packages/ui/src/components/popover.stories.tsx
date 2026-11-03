import type { Story, StoryDefault } from '@ladle/react';
import { Button, Input, Label, Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@pd2-trader/ui';

export default { title: 'Primitives / Popover' } satisfies StoryDefault;

export const Open: Story = () => (
  <Popover defaultOpen>
    <PopoverTrigger asChild>
      <Button variant="outline">Price filter</Button>
    </PopoverTrigger>
    <PopoverContent align="start"
      className="flex flex-col gap-2">
      <Label htmlFor="pop-min">Min (HR)</Label>
      <Input id="pop-min"
        defaultValue="0.5" />
      <Label htmlFor="pop-max">Max (HR)</Label>
      <Input id="pop-max"
        placeholder="No limit" />
    </PopoverContent>
  </Popover>
);

export const Anchored: Story = () => (
  <Popover defaultOpen>
    <PopoverAnchor asChild>
      <div className="w-sidebar rounded-md border bg-surface px-3 py-2 text-xs">Anchor: the stash grid cell</div>
    </PopoverAnchor>
    <PopoverContent side="right"
      className="text-xs">
      Anchored to a non-trigger element.
    </PopoverContent>
  </Popover>
);
