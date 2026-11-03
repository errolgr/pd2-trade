import type { Story, StoryDefault } from '@ladle/react';
import { Coins, Gem, Search, Settings, Shield } from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@pd2-trader/ui';

export default { title: 'Primitives / Command' } satisfies StoryDefault;

const Items = () => (
  <>
    <CommandInput placeholder="Search items, panels, settings…" />
    <CommandList>
      <CommandEmpty>No items match.</CommandEmpty>
      <CommandGroup heading="Items">
        <CommandItem>
          <Shield /> Harlequin Crest
        </CommandItem>
        <CommandItem>
          <Gem /> Ber Rune
        </CommandItem>
        <CommandItem disabled>
          <Gem /> Zod Rune (no trades)
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Panels">
        <CommandItem>
          <Search /> Item search <CommandShortcut>Ctrl F</CommandShortcut>
        </CommandItem>
        <CommandItem>
          <Coins /> Currency <CommandShortcut>Ctrl M</CommandShortcut>
        </CommandItem>
        <CommandItem>
          <Settings /> Settings
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </>
);

export const Inline: Story = () => (
  <Command className="w-popover rounded-lg border shadow-md">
    <Items />
  </Command>
);

export const Empty: Story = () => (
  <Command className="w-popover rounded-lg border shadow-md">
    <CommandInput placeholder="Search…"
      value="Tyrael's Might" />
    <CommandList>
      <CommandEmpty>No items match.</CommandEmpty>
      <CommandGroup heading="Items">
        <CommandItem>Harlequin Crest</CommandItem>
      </CommandGroup>
    </CommandList>
  </Command>
);

export const Dialog: Story = () => (
  <CommandDialog defaultOpen
    title="Palette"
    description="Jump to an item or panel">
    <Items />
  </CommandDialog>
);
