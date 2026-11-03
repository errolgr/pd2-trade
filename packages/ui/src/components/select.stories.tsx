import type { Story, StoryDefault } from '@ladle/react';
import {
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@pd2-trader/ui';

export default { title: 'Primitives / Select' } satisfies StoryDefault;

const Items = () => (
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Ladder</SelectLabel>
      <SelectItem value="sc-l">Softcore Ladder</SelectItem>
      <SelectItem value="hc-l">Hardcore Ladder</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>Non-ladder</SelectLabel>
      <SelectItem value="sc">Softcore</SelectItem>
      <SelectItem value="hc"
        disabled>
        Hardcore (closed)
      </SelectItem>
    </SelectGroup>
  </SelectContent>
);

export const States: Story = () => (
  <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4">
    <Label>Realm</Label>
    <Select defaultValue="sc-l">
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <Items />
    </Select>
    <Select>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Pick a realm…" />
      </SelectTrigger>
      <Items />
    </Select>
    <Select disabled>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Disabled" />
      </SelectTrigger>
      <Items />
    </Select>
  </div>
);

export const Open: Story = () => (
  <Select defaultValue="sc-l"
    defaultOpen>
    <SelectTrigger className="w-control">
      <SelectValue />
    </SelectTrigger>
    <Items />
  </Select>
);
