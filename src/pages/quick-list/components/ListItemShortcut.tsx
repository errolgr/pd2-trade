import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { X } from "lucide-react";
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { buildGetMarketListingByStashItemQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { emit } from '@tauri-apps/api/event';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { CustomToastPayload, ToastActionType } from '@/common/types/Events';
import { shortcutFormSchema, ShortcutFormData } from './types';
import ItemSelectionList from './ItemSelectionList';
import ListingFormFields from './ListingFormFields';
import LoadingAndErrorStates from './LoadingAndErrorStates';

interface ListItemShortcutFormProps {
  item: PriceCheckItem;
}

const ListItemShortcutForm: React.FC<ListItemShortcutFormProps> = ({ item }) => {
  const { findMatchingItems, listSpecificItem, authData, getMarketListings, updateMarketListing, updateItemByHash, deleteMarketListing } = usePd2Website();
  const [matchingItems, setMatchingItems] = useState<GameStashItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GameStashItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentListings, setCurrentListings] = useState<MarketListingEntry[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isMarketListingsLoading, setIsMarketListingsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  const form = useForm<ShortcutFormData>({
    resolver: zodResolver(shortcutFormSchema),
    defaultValues: { type: 'exact', note: '', price: '', currency: 'HR' },
  });

  const type = form.watch('type');

  // Complete reset function for new items
  const resetAllState = useCallback(() => {
    setMatchingItems([]);
    setSelectedItem(null);
    setError(null);
    setCurrentListings([]);
    setExpandedItems(new Set());
    setIsMarketListingsLoading(false);
    setSubmitLoading(false);
    form.reset({ type: 'exact', note: '', price: '', currency: 'HR' });
  }, [form]);

  const findMatchingItemsInStash = useCallback(async () => {
    // Reset everything first when starting a new search
    resetAllState();
    
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
  }, [findMatchingItems, item, resetAllState]);

  // Find matching items when component mounts or item changes
  useEffect(() => {
    if (item && authData) {
      findMatchingItemsInStash();
    }
  }, [item, authData, findMatchingItemsInStash]);

  const pd2MarketQuery = useMemo(() => {
    if (!authData || matchingItems.length === 0) return null;
    return buildGetMarketListingByStashItemQuery(matchingItems, authData.user._id);
  }, [matchingItems, authData]);

  const getMarketListingsForStashItems = useCallback(async () => {
    if (!pd2MarketQuery) return;
    
    setIsMarketListingsLoading(true);
    try {
      const result = await getMarketListings(pd2MarketQuery);
      if (result.data.length > 0) {
        setCurrentListings(result.data.map((item) => item));
      } else {
        setCurrentListings([]);
      }
    } catch (err) {
      console.error('Failed to fetch market listings:', err);
      setCurrentListings([]);
    } finally {
      setIsMarketListingsLoading(false);
    }
  }, [pd2MarketQuery, getMarketListings]);

  // Fetch market listings when pd2MarketQuery changes (after matching items are found)
  useEffect(() => {
    if (pd2MarketQuery) {
      getMarketListingsForStashItems();
    }
  }, [pd2MarketQuery, getMarketListingsForStashItems]);

  const handleSubmit = async (values: ShortcutFormData) => {
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
        const listing = await listSpecificItem(selectedItem, Number(values.price), values.note, values?.type);
        form.reset({ type: 'note', note: '', price: '', currency: 'HR' });
        
        // Emit custom toast with listing data
        const toastPayload: CustomToastPayload = {
          title: 'Item listed!',
          description: `Added to the PD2 marketplace.`,
          action: {
            label: selectedItem?.name || 'Go to listing',
            type: ToastActionType.OPEN_MARKET_LISTING,
            data: {
              listingId: listing._id
            }
          }
        };
        
        await emit('toast-event', toastPayload);
        
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

  const handleBump = async (marketId: string, itemHash: string) => {
    await updateMarketListing(marketId, { bumped_at: new Date().toISOString() });
    await updateItemByHash(itemHash, { bumped_at: new Date().toISOString() });
  };

  const handleRefresh = async () => {
    await getMarketListingsForStashItems();
    await findMatchingItemsInStash();
  };

  // Find the current market listing for the selected item
  const currentListingForSelected = useMemo(() => 
    selectedItem ? currentListings.find((c) => c.item.hash === selectedItem.hash) : undefined,
    [selectedItem, currentListings]
  );

  // Prepopulate form fields when selecting a listed item
  useEffect(() => {
    if (!selectedItem) return;
  
    const resetValues: ShortcutFormData = currentListingForSelected
      ? { 
          type: currentListingForSelected.price.includes('obo') ? 'negotiable' :
                typeof currentListingForSelected.hr_price === 'number' && currentListingForSelected.hr_price > 0  ? 'exact' :
                'note',
          note: typeof currentListingForSelected.price === 'string' ? currentListingForSelected.price : '',
          price: currentListingForSelected.hr_price ?? '',
          currency: 'HR',
        }
      : { type: 'exact', note: '', price: '', currency: 'HR' };
  
    form.reset(resetValues);
  }, [selectedItem, currentListingForSelected, form]);

  // Check for loading/error states first
  if (isLoading || error || matchingItems.length === 0) {
    return (
      <LoadingAndErrorStates
        isLoading={isLoading}
        error={error}
        matchingItems={matchingItems}
        item={item}
        onRetry={findMatchingItemsInStash}
      />
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

        <ItemSelectionList
          deleteMarketListing={deleteMarketListing}
          matchingItems={matchingItems}
          selectedItem={selectedItem}
          currentListings={currentListings}
          expandedItems={expandedItems}
          isMarketListingsLoading={isMarketListingsLoading}
          onItemSelect={setSelectedItem}
          onToggleExpanded={toggleExpandedStats}
          onExpandAll={expandAllStats}
          onCollapseAll={collapseAllStats}
          onBump={handleBump}
          onRefresh={handleRefresh}
        />

        <ListingFormFields
          form={form}
          type={type}
          selectedItem={selectedItem}
          currentListings={currentListings}
          submitLoading={submitLoading}
          onSubmit={handleSubmit}
        />
      </form>
    </Form>
  );
};

export default ListItemShortcutForm; 