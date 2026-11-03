import type { Story, StoryDefault } from '@ladle/react';
import { Label, Switch } from '@pd2-trader/ui';

export default { title: 'Primitives / Switch' } satisfies StoryDefault;

export const States: Story = () => (
  <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4">
    <div className="flex items-center justify-between">
      <Label htmlFor="sw-1">Price-check on hotkey</Label>
      <Switch id="sw-1"
        defaultChecked />
    </div>
    <div className="flex items-center justify-between">
      <Label htmlFor="sw-2">Whisper notifications</Label>
      <Switch id="sw-2" />
    </div>
    <div className="flex items-center justify-between">
      <Label htmlFor="sw-3">Auto-bump (disabled)</Label>
      <Switch id="sw-3"
        disabled />
    </div>
  </div>
);
