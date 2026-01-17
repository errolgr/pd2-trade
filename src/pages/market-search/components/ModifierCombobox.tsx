import React, { useMemo, useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { CheckIcon, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { modifiers } from '@/assets/modifiers';

interface ModifierComboboxProps {
  selectedModifiers: string[];
  onSelectModifier: (modifierName: string) => void;
}

export const ModifierCombobox: React.FC<ModifierComboboxProps> = ({ selectedModifiers, onSelectModifier }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Get display name for modifier
  const getModifierDisplayName = (modifier: (typeof modifiers)[number]): string => {
    if (
      modifier.description?.label &&
      typeof modifier.description.label === 'object' &&
      'positive' in modifier.description.label
    ) {
      return modifier.description.label.positive;
    }
    return modifier.name;
  };

  // Filter modifiers based on search
  const filteredModifiers = useMemo(() => {
    if (!search.trim()) {
      return modifiers;
    }

    const searchLower = search.toLowerCase();
    return modifiers.filter((mod) => {
      const displayName = getModifierDisplayName(mod).toLowerCase();
      const name = mod.name.toLowerCase();
      return displayName.includes(searchLower) || name.includes(searchLower);
    });
  }, [search]);

  const handleSelectModifier = (modifier: (typeof modifiers)[number]) => {
    onSelectModifier(modifier.name);
    // Don't close the popover to allow multiple selections
  };

  // Get display text for the button
  const getButtonText = () => {
    if (selectedModifiers.length === 0) {
      return 'Select modifiers...';
    }
    if (selectedModifiers.length === 1) {
      const modifier = modifiers.find((m) => m.name === selectedModifiers[0]);
      return modifier ? getModifierDisplayName(modifier) : selectedModifiers[0];
    }
    return `${selectedModifiers.length} modifiers selected`;
  };

  return (
    <Popover open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-8 text-xs"
        >
          <span className="truncate">{getButtonText()}</span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0"
        align="start"
        side="bottom"
        sideOffset={4}>
        <Command className="rounded-lg">
          <CommandInput placeholder="Search modifiers..."
            value={search}
            onValueChange={setSearch} />
          <ScrollArea className="h-[300px]">
            <CommandList className="!max-h-none !overflow-hidden">
              <CommandEmpty>No modifiers found.</CommandEmpty>

              <CommandGroup heading="Modifiers">
                {filteredModifiers
                  .filter((modifier) => !!modifier.description?.function)
                  .map((modifier) => {
                    const displayName = getModifierDisplayName(modifier);
                    const isSelected = selectedModifiers.includes(modifier.name);
                    return (
                      <CommandItem
                        key={modifier.id}
                        value={`${displayName} ${modifier.name}`}
                        onSelect={() => handleSelectModifier(modifier)}
                        className="cursor-pointer"
                      >
                        <CheckIcon className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                        <span className="font-medium flex-1">{displayName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">({modifier.name})</span>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </CommandList>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
