import type { Story, StoryDefault } from '@ladle/react';
import { Label, Textarea } from '@pd2-trader/ui';

export default { title: 'Primitives / Textarea' } satisfies StoryDefault;

export const States: Story = () => (
  <div className="flex w-popover flex-col gap-3 rounded-lg border bg-surface p-4">
    <Label htmlFor="ta-1">Trade message template</Label>
    <Textarea id="ta-1"
      defaultValue="WTS {item} for {price} HR, whisper *{account}" />
    <Textarea placeholder="Notes for this listing…" />
    <Textarea disabled
      defaultValue="Disabled" />
    <Textarea aria-invalid
      defaultValue="Message too long" />
  </div>
);
