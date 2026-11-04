import { Coins, Gem, Search, Settings, Shield } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@pd2-trader/ui';

export const meta = {
  title: 'Inline list',
  description: 'A filterable list with groups, separators, shortcuts and a disabled item. Type to filter; arrow keys move, Enter selects.',
  order: 0,
};

export default function CommandInlineExample() {
  return (
    <Command className="w-popover max-w-full rounded-lg border shadow-panel">
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
    </Command>
  );
}
