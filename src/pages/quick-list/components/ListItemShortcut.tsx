import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RUNE_API_MAP } from '../../price-check/lib/types';
import { Check, Cross, X, Search, Loader2 } from "lucide-react";
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { usePD2WebsiteClient } from '@/hooks/pd2website/usePD2WebsiteClient';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from "@/components/ui/badge"
import { cn } from '@/lib/utils';

interface ListItemShortcutFormProps {
  item: PriceCheckItem;
}

const runeOptions = Object.keys(RUNE_API_MAP);

const priceTypeOptions = [
  { value: 'note', label: 'Note' },
  { value: 'exact', label: 'Exact Price' },
  { value: 'negotiable', label: 'Negotiable Price' },
];

const shortcutFormSchema = z.object({
  type: z.enum(['note', 'negotiable', 'exact']),
  note: z.string().optional(),
  price: z.coerce.number().min(1, 'Enter a price').optional(),
  currency: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === 'note') return !!data.note && data.note.length > 0;
    if (data.type === 'negotiable' || data.type === 'exact') return !!data.price && !!data.currency;
    return false;
  },
  {
    message: 'Please fill out the required fields.',
    path: ['note', 'price', 'currency'],
  }
);
type ShortcutFormValues = z.infer<typeof shortcutFormSchema>;

// Helper to get rune image path
const getRuneImg = (rune: string) => `runes/Rune${rune.split(" ")[0]}.png`;

// Rune hierarchy for sorting
const RUNE_HIERARCHY = [
  "Zod", "Cham", "Jah", "Ber", "Sur", "Lo", "Ohm", "Vex",
  "Gul", "Ist", "Mal", "Um", "Pul", "Lem", "Fal", "Ko",
  "Lum", "Io", "Hel", "Dol", "Shael", "Sol", "Amn", "Thul",
  "Ort", "Ral", "Tal", "Ith", "Eth", "Nef", "Tir", "Eld", "El"
];

// Sort runeOptions by hierarchy
const sortedRuneOptions = [...runeOptions].sort((a, b) => {
  return RUNE_HIERARCHY.indexOf(a) + RUNE_HIERARCHY.indexOf(b);
});

const ListItemShortcutForm: React.FC<ListItemShortcutFormProps> = ({ item }) => {
  
  const { findMatchingItems, listSpecificItem } = usePD2WebsiteClient();
  const [matchingItems, setMatchingItems] = useState<GameStashItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GameStashItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const form = useForm<ShortcutFormValues>({
    resolver: zodResolver(shortcutFormSchema),
    defaultValues: { type: 'note', note: '', price: undefined, currency: 'HR' },
  });

  const type = form.watch('type');

  useEffect(() => {
    console.log('findMatchingItems ' + item);
  }, [item])
  // Find matching items when component mounts
  React.useEffect(() => {
    if (item) {
      findMatchingItemsInStash();
    }
  }, [item]);

  const findMatchingItemsInStash = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await findMatchingItems(item);
      setMatchingItems(items);
      if (items.length === 1) {
        setSelectedItem(items[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (values: ShortcutFormValues) => {
    if (!selectedItem) {
      setError('Please select an item to list');
      return;
    }

    try {
      const price = values.type !== 'note' ? Number(values.price) : 0;
      await listSpecificItem(selectedItem, price);
      form.reset({ type: 'note', note: '', price: undefined, currency: 'HR' });
      getCurrentWebviewWindow().close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list item');
    }
  };

  const toggleExpandedStats = (itemHash: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemHash)) {
      newExpanded.delete(itemHash);
    } else {
      newExpanded.add(itemHash);
    }
    setExpandedItems(newExpanded);
  };

  const expandAllStats = () => {
    const allHashes = matchingItems.map(item => item.hash).filter(Boolean);
    setExpandedItems(new Set(allHashes));
  };

  const collapseAllStats = () => {
    setExpandedItems(new Set());
  };

  const renderItemStats = (stashItem: GameStashItem) => {
    const isExpanded = expandedItems.has(stashItem.hash);
    const hasModifiers = stashItem.modifiers && stashItem.modifiers.length > 0;
    
    const filteredModifiers = stashItem.modifiers.filter((mod) => {
      return mod.name !== 'corrupted'
    });

    return (
      <div className="text-xs space-y-1">
        <div className='flex flex-row gap-1'>
        {stashItem.is_ethereal && (
          <Badge className='text-xs rounded-lg'>Ethereal</Badge>
        )}
        {stashItem.corrupted && (
          <Badge variant={'destructive'} className='text-xs rounded-lg'>Corrupted</Badge>
        )}
        {stashItem.is_runeword && (
          <Badge variant='secondary' className='text-xs rounded-lg'>Runeword</Badge>
        )}
        {stashItem.socket_count > 0 && (
          <Badge variant='secondary' className='text-xs rounded-lg'>
            <Badge className='rounded-4xl text-xs h-4 w-4'>
            {stashItem.socket_count}
            </Badge>
             Socket{stashItem.socket_count > 1 ? 's' : ''}
            </Badge>
        )}
        </div>

        {hasModifiers && (
          <div className="mt-2">
            {isExpanded ? (
              // Show all modifiers when expanded
              filteredModifiers.map((mod, idx) => (
                <div key={idx} className={cn("text-gray-200 truncate", {'text-red-500': stashItem?.corruptions && stashItem.corruptions.includes(mod.name)})}>
                  {mod.label}
                  {mod?.min && mod?.max && `: [${mod.min} - ${mod.max}]`}
                </div>
              ))
            ) : (
              // Show first 3 modifiers when collapsed
              <>
                {filteredModifiers.slice(0, 3).map((mod, idx) => (
                  <div key={idx} className={cn("text-gray-200 truncate", {'text-red-500': stashItem?.corruptions && stashItem.corruptions.includes(mod.name)})}>
                    {mod.label}
                    {mod?.min && mod?.max && `: [${mod.min} - ${mod.max}]`}
                  </div>
                ))}
                {filteredModifiers.length > 3 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpandedStats(stashItem.hash);
                    }}
                    className="text-blue-500 hover:text-blue-700 text-xs underline"
                  >
                    Show More
                  </button>
                )}
              </>
            )}
            {isExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpandedStats(stashItem.hash);
                }}
                className="text-gray-500 hover:text-gray-700 text-xs underline"
              >
                Show Less
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="inline-block p-4 border rounded-lg bg-background shadow w-screen">
        <div className="flex justify-between mb-2 items-center">
          <span style={{fontFamily: 'DiabloFont'}}>List Item</span>
          <Button className="h-6 w-6" variant='ghost' onClick={() => getCurrentWebviewWindow().close()}>
            <X className='h-4 w-4'/>
          </Button>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Searching for items...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inline-block p-4 border rounded-lg bg-background shadow w-screen">
        <div className="flex justify-between mb-2 items-center">
          <span style={{fontFamily: 'DiabloFont'}}>List Item</span>
          <Button className="h-6 w-6" variant='ghost' onClick={() => getCurrentWebviewWindow().close()}>
            <X className='h-4 w-4'/>
          </Button>
        </div>
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={findMatchingItemsInStash} className="w-full">
          <Search className="h-4 w-4 mr-2" />
          Retry Search
        </Button>
      </div>
    );
  }

  if (matchingItems.length === 0) {
    return (
      <div className="inline-block p-4 border rounded-lg bg-background shadow w-screen">
        <div className="flex justify-between mb-2 items-center">
          <span style={{fontFamily: 'DiabloFont'}}>List Item</span>
          <Button className="h-6 w-6" variant='ghost' onClick={() => getCurrentWebviewWindow().close()}>
            <X className='h-4 w-4'/>
          </Button>
        </div>
        <div className="text-center py-8 text-gray-500">
          No items found matching "{item.name}"
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="inline-block p-4 border rounded-lg bg-background shadow w-screen">
        <div className="flex justify-between mb-2 items-center">
          <span style={{fontFamily: 'DiabloFont'}}>List Item</span>
          <Button className="h-6 w-6" variant='ghost' onClick={() => getCurrentWebviewWindow().close()}>
            <X className='h-4 w-4'/>
          </Button>
        </div>

        {/* Item Selection */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium">Select Item ({matchingItems.length} found):</div>
            <div className="flex gap-2">
              <button
                onClick={expandedItems.size > 0 ? collapseAllStats : expandAllStats}
                className="text-blue-500 hover:text-blue-700 text-xs underline"
              >
                {expandedItems.size > 0 ? 'Show Less' : 'Show All Stats'}
              </button>
            </div>
          </div>
          <ScrollArea className="pr-2">
            <div className='flex flex-col gap-2 max-h-[20rem]'>
            {matchingItems.map((stashItem, index) => (
              <div
                key={stashItem.hash || index}
                className={`p-3 border rounded cursor-pointer transition-colors ${
                  selectedItem?.hash === stashItem.hash ? 'border-gray-300' : 'border-neutral-600 hover:border-neutral-5'
                }`}
                onClick={() => setSelectedItem(stashItem)}
              >
                <div className={qualityColor(stashItem.quality.name)} style={{fontFamily: 'DiabloFont'}}>{stashItem.name}</div>
                {renderItemStats(stashItem)}
              </div>
            ))}
            </div>
        
          </ScrollArea>
        
        </div>

        <div className="flex flex-wrap items-end gap-1">
          {/* Listing Type Dropdown */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="m-0 p-0 min-w-50">
                <FormLabel className="sr-only">Listing Type</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className='w-full'>
                      <SelectValue>{priceTypeOptions.find(opt => opt.value === field.value)?.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {priceTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Note or Price Input */}
          {type === 'note' ? (
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem className="flex-1 m-0 p-0 min-w-0 w-14">
                  <FormLabel className="sr-only">Note</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a note..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem className="flex-1 p-0 min-w-0 w-30">
                  <FormLabel className="sr-only">HR</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="HR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
           <Button type="submit" disabled={!selectedItem} style={{fontFamily: 'DiabloFont', fontWeight: 600}}>
            POST
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ListItemShortcutForm; 