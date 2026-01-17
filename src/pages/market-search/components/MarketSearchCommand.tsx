import React, { useMemo, useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCategorizedItems, ItemCategory, CategorizedItemType, CategorizedUniqueItem } from '../lib/categorizeItems';

interface MarketSearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectItemType: (typeValue: string | { $in: string[] }) => void;
  onSelectUniqueItem: (itemName: string, baseCode?: string) => void;
  children: React.ReactNode;
}

const CATEGORY_ORDER: ItemCategory[] = ['Weapons', 'Armor', 'Accessories', 'Class Specific', 'Other'];

export const MarketSearchCommand: React.FC<MarketSearchCommandProps> = ({
  open,
  onOpenChange,
  onSelectItemType,
  onSelectUniqueItem,
  children,
}) => {
  const [search, setSearch] = useState('');

  const categorizedItems = useMemo(() => getCategorizedItems(), []);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!search.trim()) {
      return categorizedItems;
    }

    const searchLower = search.toLowerCase();
    const filtered: typeof categorizedItems = {
      Weapons: { itemTypes: [], uniqueItems: [] },
      Armor: { itemTypes: [], uniqueItems: [] },
      Accessories: { itemTypes: [], uniqueItems: [] },
      'Class Specific': { itemTypes: [], uniqueItems: [] },
      Other: { itemTypes: [], uniqueItems: [] },
    };

    Object.keys(categorizedItems).forEach((category) => {
      const cat = category as ItemCategory;

      // Filter item types
      filtered[cat].itemTypes = categorizedItems[cat].itemTypes.filter((item) =>
        item.typeLabel.toLowerCase().includes(searchLower),
      );

      // Filter unique items
      filtered[cat].uniqueItems = categorizedItems[cat].uniqueItems.filter(
        (item) =>
          (item.name?.toLowerCase() || '').includes(searchLower) ||
          (item.base?.toLowerCase() || '').includes(searchLower) ||
          (item.key?.toLowerCase() || '').includes(searchLower),
      );
    });

    return filtered;
  }, [categorizedItems, search]);

  const handleSelectItemType = (item: CategorizedItemType) => {
    onSelectItemType(item.typeValue);
    onOpenChange(false);
    setSearch('');
  };

  const handleSelectUniqueItem = (item: CategorizedUniqueItem) => {
    onSelectUniqueItem(item.name, item.base_code);
    onOpenChange(false);
    setSearch('');
  };

  return (
    <Popover open={open}
      onOpenChange={onOpenChange}
      modal={false}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        className="w-full max-w-md p-0"
        align="start"
        side="bottom"
        sideOffset={-42}
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        onInteractOutside={(e) => {
          // Prevent closing when clicking on the input
          const target = e.target as HTMLElement;
          if (target.closest('input')) {
            e.preventDefault();
          }
        }}
      >
        <Command className="rounded-lg">
          <CommandInput placeholder="Search items or types..."
            value={search}
            onValueChange={setSearch} />
          <ScrollArea className="h-[300px]">
            <CommandList className="!max-h-none !overflow-hidden">
              <CommandEmpty>No results found.</CommandEmpty>

              {/* Item Types Category */}
              {(() => {
                const allItemTypes = CATEGORY_ORDER.flatMap((category) => filteredItems[category].itemTypes);
                if (allItemTypes.length > 0) {
                  return (
                    <CommandGroup heading="Type">
                      {allItemTypes.map((item) => (
                        <CommandItem
                          key={`type-${item.typeLabel}`}
                          value={`${item.typeLabel} Type`}
                          onSelect={() => handleSelectItemType(item)}
                          className="cursor-pointer"
                        >
                          <span className="font-medium">{item.typeLabel}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                }
                return null;
              })()}

              {/* Unique Items by Category */}
              {CATEGORY_ORDER.map((category) => {
                const categoryData = filteredItems[category];
                const hasUniqueItems = categoryData.uniqueItems.length > 0;

                if (!hasUniqueItems) {
                  return null;
                }

                return (
                  <CommandGroup key={category}
                    heading={category}>
                    {categoryData.uniqueItems.map((item) => (
                      <CommandItem
                        key={`unique-${item.id}`}
                        value={`${item.name} ${item.base} ${category}`}
                        onSelect={() => handleSelectUniqueItem(item)}
                        className="cursor-pointer"
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">({item.base})</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
