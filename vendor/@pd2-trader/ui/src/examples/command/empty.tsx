import { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@pd2-trader/ui';

export const meta = {
  title: 'No results',
  description: '`CommandEmpty` renders when nothing matches the query. Controlled `value` / `onValueChange` on the input.',
  order: 1,
};

export default function CommandEmptyExample() {
  const [query, setQuery] = useState("Tyrael's Might");
  return (
    <Command className="w-popover max-w-full rounded-lg border shadow-panel">
      <CommandInput placeholder="Search…"
        value={query}
        onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No items match.</CommandEmpty>
        <CommandGroup heading="Items">
          <CommandItem>Harlequin Crest</CommandItem>
          <CommandItem>Griffon&apos;s Eye</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
