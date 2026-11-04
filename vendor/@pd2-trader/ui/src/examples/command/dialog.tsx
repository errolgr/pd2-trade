import { useState } from 'react';
import { Coins, Search, Shield } from 'lucide-react';
import { Button, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@pd2-trader/ui';

export const meta = {
  title: 'Palette dialog',
  description: '`CommandDialog` puts the list in a modal dialog (title and description are screen-reader only). Open it from a button or a hotkey.',
  order: 2,
};

export default function CommandDialogExample() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border bg-surface p-4">
      <Button variant="outline"
        onClick={() => setOpen(true)}>
        <Search /> Jump to…
      </Button>
      <CommandDialog open={open}
        onOpenChange={setOpen}
        title="Palette"
        description="Jump to an item or panel">
        <CommandInput placeholder="Search items and panels…" />
        <CommandList>
          <CommandEmpty>No items match.</CommandEmpty>
          <CommandGroup heading="Items">
            <CommandItem onSelect={() => setOpen(false)}>
              <Shield /> Harlequin Crest
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Panels">
            <CommandItem onSelect={() => setOpen(false)}>
              <Coins /> Currency
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
