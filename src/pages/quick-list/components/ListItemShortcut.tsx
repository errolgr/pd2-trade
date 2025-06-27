import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RUNE_API_MAP } from '../../price-check/lib/types';
import { Check, Cross, X, Search, Loader2, AlertCircle } from "lucide-react";
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from "@/components/ui/badge"
import { cn } from '@/lib/utils';
import { buildGetMarketListingByStashItemQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import moment from 'moment';
import { MarketListingEntry, MarketListingResult } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { emit } from '@tauri-apps/api/event';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';

interface ListItemShortcutFormProps {
  item: PriceCheckItem;
}

const runeOptions = Object.keys(RUNE_API_MAP);

const priceTypeOptions = [
  { value: 'exact', label: 'Exact Price' },
  { value: 'note', label: 'Note' },
  { value: 'negotiable', label: 'Negotiable Price' },
];

const shortcutFormSchema = z.object({
  type: z.enum(['note', 'negotiable', 'exact']),
  note: z.string().optional(),
  price: z.union([z.string(), z.number()]).optional(),
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
  
  const { findMatchingItems, listSpecificItem, authData, getMarketListings, updateMarketListing, updateItemByHash } = usePd2Website();
  const [matchingItems, setMatchingItems] = useState<GameStashItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GameStashItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentListings, setCurrentListings] = useState<MarketListingEntry[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [bumping, setBumping] = useState<string | null>(null);
  const [hoveredHash, setHoveredHash] = useState<string | null>(null);
  const [justBumped, setJustBumped] = useState<string | null>(null);
  const [isMarketListingsLoading, setIsMarketListingsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const form = useForm<z.infer<typeof shortcutFormSchema>>({
    resolver: zodResolver(shortcutFormSchema),
    defaultValues: { type: 'exact', note: '', price: '', currency: 'HR' },
  });

  const type = form.watch('type');


  // Find matching items when component mounts
  React.useEffect(() => {
    if (item && authData) {
      findMatchingItemsInStash();
    }
  }, [item, authData]);

  const findMatchingItemsInStash = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await findMatchingItems(item);
      setMatchingItems(items);
      if (items.length === 1) {
        setSelectedItem(items[0]);
      } else {
        setSelectedItem(null);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : 'Failed to find items');
      setError(err instanceof Error ? err.message : 'Failed to find items');
    } finally {
      setIsLoading(false);
    }
  };

  const pd2MarketQuery = useMemo(() => {
    if (!authData) return null;
    return buildGetMarketListingByStashItemQuery(matchingItems, authData.user._id);
  }, [matchingItems, authData]);

  const getMarketListingsForStashItems = useCallback(async () => {
    setIsMarketListingsLoading(true);
    const result = await getMarketListings(pd2MarketQuery);
    if (result.data.length > 0) {
      setCurrentListings(result.data.map((item) => item));
    }
    setIsMarketListingsLoading(false);
  }, [pd2MarketQuery]);

  const handleSubmit = async (values: z.infer<typeof shortcutFormSchema>) => {
    if (!selectedItem) {
      setError('Please select an item to list');
      return;
    }
    setSubmitLoading(true);
    try {
      const isAlreadyListed = !!currentListingForSelected;
      if (isAlreadyListed) {
        // Prepare update fields
        let updateFields: Record<string, any> = {};
        if (values.type === 'note') {
          updateFields.price = values.note;
        } else if (values.type === 'exact' || values.type === 'negotiable') {
          updateFields.hr_price = Number(values.price);
          updateFields.price = values.type === 'negotiable' ? 'obo' : values.note;
        }
        await updateMarketListing(currentListingForSelected._id, updateFields);
        await updateItemByHash(selectedItem.hash, updateFields);
        await emit('toast-event', 'Listing updated!');
        getCurrentWebviewWindow().hide();
      } else {
        await listSpecificItem(selectedItem, Number(values.price), values.note, values?.type);
        form.reset({ type: 'note', note: '', price: '', currency: 'HR' });
        await emit('toast-event', 'Item listed!');
        getCurrentWebviewWindow().hide();
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : 'Failed to list/update item');
      setError(err instanceof Error ? err.message : 'Failed to list/update item');
    } finally {
      setSubmitLoading(false);
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

  // Fetch current listings when matchingItems or authData changes
  useEffect(() => {
    if (matchingItems.length > 0 && authData) {
      getMarketListingsForStashItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchingItems, authData]);

  const canBump = (stashItem: GameStashItem) => {
    const itemData = currentListings.find((c) => c.item.hash === stashItem.hash);
    if (!itemData || !itemData.bumped_at) return true;
    const lastBump = moment(itemData.bumped_at);
    const now = moment();
    return now.diff(lastBump, 'hours') >= 12;
  };

  const timeUntilBump = (stashItem: GameStashItem) => {
    const itemData = currentListings.find((c) => c.item.hash === stashItem.hash);
    if (!itemData || !itemData.bumped_at) return '';
    const lastBump = moment(itemData.bumped_at);
    const nextBump = lastBump.clone().add(12, 'hours');
    return nextBump.fromNow();
  };

  // Find the current market listing for the selected item
  const currentListingForSelected = selectedItem ? currentListings.find((c) => c.item.hash === selectedItem.hash) : undefined;

  // Prepopulate form fields when selecting a listed item
  useEffect(() => {
    if (!selectedItem) return;

    let resetValues: z.infer<typeof shortcutFormSchema> = { type: 'exact', note: '', price: '', currency: 'HR' };

    if (currentListingForSelected) {
      // If the item is listed, prepopulate the fields
      if (currentListingForSelected.price && typeof currentListingForSelected.price === 'string') {
        resetValues = { ...resetValues, type: 'note', note: currentListingForSelected.price };
      }
      if (currentListingForSelected.hr_price) {
        resetValues = { ...resetValues, type: 'exact', price: currentListingForSelected.hr_price, currency: 'HR' };
      }
      // If you want to handle 'negotiable', add logic here
    }
    
    form.reset(resetValues);
  }, [selectedItem, currentListingForSelected]);

  if (isLoading) {
    return (
      <div className="inline-block p-4 border rounded-lg bg-background shadow w-screen">
        <div className="flex justify-between mb-2 items-center">
          <span style={{fontFamily: 'DiabloFont'}}>List Item</span>
          <Button className="h-6 w-6" variant='ghost' onClick={() => getCurrentWebviewWindow().hide()}>
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
          <Button className="h-6 w-6" variant='ghost' onClick={() => getCurrentWebviewWindow().hide()}>
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
          <Button className="h-6 w-6" variant='ghost' onClick={() => getCurrentWebviewWindow().hide()}>
            <X className='h-4 w-4'/>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 gap-2">
          <div className="flex items-center gap-2">
    
            <span>No items found matching "{item.name}"</span>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span>
                  <AlertCircle className="text-yellow-500 w-4 h-4 cursor-pointer" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs text-center">
                An item won't be found unless it is placed in your stash and you have made a new game.<br />
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form className="inline-block p-4 border rounded-lg bg-background shadow w-screen" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="flex justify-between mb-2 items-center">
          <span style={{fontFamily: 'DiabloFont'}}>List Item</span>
          <Button type="button" className="h-6 w-6" variant='ghost' onClick={() => getCurrentWebviewWindow().hide()}>
            <X className='h-4 w-4'/>
          </Button>
        </div>

        {/* Item Selection */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-medium flex items-center gap-2">
              Select Item ({matchingItems.length} found)
              {isMarketListingsLoading && (
                <span className="flex items-center gap-1 text-xs text-gray-400 ml-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading market listings...
                </span>
              )}
            </div>
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
                <div className="flex justify-between items-center gap-2">
                  <div className={qualityColor(stashItem.quality.name)} style={{fontFamily: 'DiabloFont'}}>{stashItem.name}</div>
                  {currentListings.find((c) => c.item.hash == stashItem.hash) && (
                    <>
                      <span
                        onMouseEnter={() => setHoveredHash(stashItem.hash)}
                        onMouseLeave={() => {
                          setHoveredHash(null);
                          setJustBumped(null);
                        }}
                        style={{ display: 'inline-block', position: 'relative' }}
                      >
                        {justBumped === stashItem.hash ? (
                          <Badge variant="secondary" className="text-xs rounded-lg flex items-center gap-1 justify-center w-13 h-5" style={{ background: 'white', color: 'black' }}>
                            <Check className="w-3 h-3" />
                          </Badge>
                        ) : hoveredHash === stashItem.hash ? (
                          canBump(stashItem) ? (
                            <Badge
                              asChild
                              className="text-xs rounded-lg cursor-pointer flex items-center gap-1 justify-center w-13 h-5"
                              style={{ background: 'white', color: 'black' }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setBumping(stashItem.hash);
                                const marketId = currentListings.find((c) => c.item.hash == stashItem.hash)._id;
                                await updateMarketListing(marketId, { bumped_at: new Date().toISOString() });
                                await getMarketListingsForStashItems();
                                await updateItemByHash(stashItem.hash, { bumped_at: new Date().toISOString() });
                                await findMatchingItemsInStash();
                                setBumping(null);
                                setJustBumped(stashItem.hash);
                                emit('toast-event', 'Item bumped successfully!');
                              }}
                            >
                              <span>Bump</span>
                            </Badge>
                          ) : (
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <span>
                                  <Badge variant="secondary" className="text-xs rounded-lg bg-green-600 text-white cursor-not-allowed justify-center w-13 h-5">Listed</Badge>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {`You can bump this item ${timeUntilBump(stashItem)}`}
                              </TooltipContent>
                            </Tooltip>
                          )
                        ) : (
                          <Badge variant="secondary" className="text-xs rounded-lg bg-green-600 text-white justify-center w-13 h-5">Listed</Badge>
                        )}
                      </span>
                    </>
                  )}
                </div>
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
                    <Input type="number" min={0} step={0.01} placeholder="HR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
           {selectedItem && currentListings.find((c) => c.item.hash === selectedItem.hash) ? (
            <Button type="submit" style={{fontFamily: 'DiabloFont', fontWeight: 600}} disabled={submitLoading}>
              {submitLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2 inline" /> : null}
              Update
            </Button>
           ) : (
             <Button type="submit" disabled={!selectedItem || submitLoading} style={{fontFamily: 'DiabloFont', fontWeight: 600}}>
               {submitLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2 inline" /> : null}
               Post
             </Button>
           )}
        </div>
      </form>
    </Form>
  );
};

export default ListItemShortcutForm; 