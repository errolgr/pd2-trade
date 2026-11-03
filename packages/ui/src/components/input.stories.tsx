import type { Story, StoryDefault } from '@ladle/react';
import { Input, Label } from '@pd2-trader/ui';

export default { title: 'Primitives / Input' } satisfies StoryDefault;

export const States: Story = () => (
  <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4">
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="in-search">Search items</Label>
      <Input id="in-search"
        placeholder="Shako, Enigma, Ber…" />
    </div>
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="in-filled">Account</Label>
      <Input id="in-filled"
        defaultValue="Sorc_Errol" />
    </div>
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="in-dis">Disabled</Label>
      <Input id="in-dis"
        disabled
        defaultValue="Read only" />
    </div>
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="in-err">Invalid</Label>
      <Input id="in-err"
        aria-invalid
        defaultValue="-3" />
    </div>
    <Input type="file" />
  </div>
);
