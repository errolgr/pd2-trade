import type { Story, StoryDefault } from '@ladle/react';
import { Checkbox, Input, Label } from '@pd2-trader/ui';

export default { title: 'Primitives / Label' } satisfies StoryDefault;

export const Default: Story = () => (
  <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4">
    <Label htmlFor="lb-in">Minimum price (HR)</Label>
    <Input id="lb-in"
      defaultValue="0.25" />
    <div className="flex items-center gap-2">
      <Checkbox id="lb-cb" />
      <Label htmlFor="lb-cb">Hide sold</Label>
    </div>
  </div>
);
