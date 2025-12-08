import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { X, GripVertical, Loader2, AlertCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { buildGetMarketListingByStashItemQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { emit } from '@tauri-apps/api/event';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { CustomToastPayload, ToastActionType, GenericToastPayload } from '@/common/types/Events';
import { shortcutFormSchema, ShortcutFormData } from './types';
import ItemSelectionList from './ItemSelectionList';
import ListingFormFields from './ListingFormFields';
import LoadingAndErrorStates from './LoadingAndErrorStates';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ListedItemsTab from './ListedItemsTab';
import { Badge } from '@/components/ui/badge';
import { buildGetAllUserMarketListingsQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { incrementMetric, distributionMetric } from '@/lib/sentryMetrics';
import { usePendingListingsQueue, PendingListing } from '@/hooks/usePendingListingsQueue';
import MultipleMatchSelector from './MultipleMatchSelector';

interface ListItemShortcutFormProps {
  item: PriceCheckItem | null;
}

const ListItemShortcutForm: React.FC<ListItemShortcutFormProps> = ({ item }) => {
  const { findMatchingItems, listSpecificItem, authData, getMarketListings, updateMarketListing, updateItemByHash, deleteMarketListing } = usePd2Website();
  const { settings } = useOptions();
  const { addPendingListing, removePendingListing, updateLastPolled, getPendingListing, pendingListings, POLL_INTERVAL } = usePendingListingsQueue();
  const [matchingItems, setMatchingItems] = useState<GameStashItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GameStashItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentListings, setCurrentListings] = useState<MarketListingEntry[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isMarketListingsLoading, setIsMarketListingsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [totalListingsCount, setTotalListingsCount] = useState<number>(0);
  const [allListings, setAllListings] = useState<MarketListingEntry[]>([]);
  const [isQueued, setIsQueued] = useState(false);
  const [queuedListingIds, setQueuedListingIds] = useState<Set<string>>(new Set());
  const [isPolling, setIsPolling] = useState(false);
  const [showMultipleMatchSelector, setShowMultipleMatchSelector] = useState(false);
  const [pendingMatches, setPendingMatches] = useState<GameStashItem[]>([]);
  const [pendingMatchListingId, setPendingMatchListingId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef<Set<string>>(new Set()); // Track which items are being processed
  const pendingListingDataRef = useRef<PendingListing | null>(null);
  
  const form = useForm<ShortcutFormData>({
    resolver: zodResolver(shortcutFormSchema),
    defaultValues: { type: 'exact', note: '', price: '', currency: 'HR' },
  });

  // Get the current window reference (Tauri v2 API)
  const appWindow = useMemo(() => getCurrentWebviewWindow(), []);

  // Window control handler
  const handleClose = useCallback(() => {
    appWindow.hide();
  }, [appWindow]);


  // Complete reset function for new items
  const resetAllState = useCallback(() => {
    setMatchingItems([]);
    setSelectedItem(null);
    setError(null);
    setCurrentListings([]);
    setExpandedItems(new Set());
    setIsMarketListingsLoading(false);
    setSubmitLoading(false);
    setIsQueued(false);
    setQueuedListingIds(new Set());
    setShowMultipleMatchSelector(false);
    setPendingMatches([]);
    setPendingMatchListingId(null);
    isProcessingRef.current = new Set();
    pendingListingDataRef.current = null;
    form.reset({ type: 'exact', note: '', price: '', currency: 'HR' });
  }, [form]);

  const findMatchingItemsInStash = useCallback(async () => {
    // Reset everything first when starting a new search
    resetAllState();
    
    setIsLoading(true);
    setError(null);
    const startTime = performance.now();
    try {
      const items = await findMatchingItems(item);
      const duration = performance.now() - startTime;
      
      // Track matching items found
      incrementMetric('list_item.matching_items.search', 1, { status: 'success' });
      distributionMetric('list_item.matching_items.count', items.length);
      distributionMetric('list_item.matching_items.search_duration_ms', duration);
      
      setMatchingItems(items);
      if (items.length === 1) {
        setSelectedItem(items[0]);
        incrementMetric('list_item.auto_selected', 1);
      } else {
        setSelectedItem(null);
      }
    } catch (err) {
      const duration = performance.now() - startTime;
      incrementMetric('list_item.matching_items.search', 1, { status: 'error' });
      distributionMetric('list_item.matching_items.search_duration_ms', duration);
      console.error(err instanceof Error ? err.message : 'Failed to find items');
      setError(err instanceof Error ? err.message : 'Failed to find items');
    } finally {
      setIsLoading(false);
    }
  }, [findMatchingItems, item, resetAllState]);

  // Sync queued items from storage on mount and when item changes
  useEffect(() => {
    if (authData) {
      // Load all pending listings from storage
      const allPendingIds = new Set(pendingListings.map(p => p.id));
      if (allPendingIds.size > 0) {
        setQueuedListingIds(allPendingIds);
        setIsQueued(true);
      }
    }
  }, [authData, pendingListings.length]); // Only depend on length to avoid infinite loops

  // Find matching items when component mounts or item changes
  useEffect(() => {
    if (item && authData) {
      // Check if this item is already queued
      const existingQueued = pendingListings.find(p => 
        JSON.stringify(p.item) === JSON.stringify(item)
      );
      if (existingQueued) {
        console.log('[Queue] Found existing queued item:', existingQueued.id);
        setQueuedListingIds(prev => new Set([...prev, existingQueued.id]));
        setIsQueued(true);
      } else {
        // Only search if item is not queued
        findMatchingItemsInStash();
      }
    }
    // Only depend on item and authData to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, authData]);

  const pd2MarketQuery = useMemo(() => {
    if (!item || !authData || matchingItems.length === 0) return null;
    return buildGetMarketListingByStashItemQuery(matchingItems, authData.user._id);
  }, [matchingItems, authData, item]);

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

  // Fetch all user listings for the badge and to pass to ListedItemsTab
  const allListingsQuery = useMemo(() => {
    if (!authData || !settings) return null;
    return buildGetAllUserMarketListingsQuery(
      authData.user._id,
      settings.mode === 'hardcore',
      settings.ladder === 'ladder',
      5, // Fetch first page (5 items to match ITEMS_PER_PAGE) to get both data and total count
      0
    );
  }, [authData, settings]);

  const fetchAllListings = useCallback(async () => {
    if (!allListingsQuery) return;
    try {
      const result = await getMarketListings(allListingsQuery);
      setAllListings(result.data);
      setTotalListingsCount(result.total);
    } catch (err) {
      console.error('Failed to fetch all listings:', err);
      setAllListings([]);
      setTotalListingsCount(0);
    }
  }, [allListingsQuery, getMarketListings]);

  useEffect(() => {
    fetchAllListings();
  }, [fetchAllListings]);

  // Poll for all queued items
  const pollForAllQueuedItems = useCallback(async () => {
    if (!authData) {
      console.log('[Queue] Skipping poll - missing authData');
      return;
    }

    const currentQueuedIds = Array.from(queuedListingIds);
    if (currentQueuedIds.length === 0) {
      console.log('[Queue] No queued items to poll');
      setIsPolling(false);
      setIsQueued(false);
      return;
    }

    console.log('[Queue] Polling for queued items:', currentQueuedIds.length);
    setIsPolling(true);

    // Process each queued item independently
    const pollPromises = currentQueuedIds.map(async (pendingId) => {
      // Skip if already processing this item
      if (isProcessingRef.current.has(pendingId)) {
        console.log('[Queue] Skipping poll - already processing:', pendingId);
        return;
      }

      const pendingListing = getPendingListing(pendingId);
      if (!pendingListing) {
        console.log('[Queue] Pending listing not found, removing from tracked:', pendingId);
        setQueuedListingIds(prev => {
          const next = new Set(prev);
          next.delete(pendingId);
          return next;
        });
        return;
      }

      // Check for timeout (MAX_POLL_ATTEMPTS * POLL_INTERVAL)
      const now = Date.now();
      const age = now - pendingListing.createdAt;
      const maxAge = 60 * POLL_INTERVAL; // MAX_POLL_ATTEMPTS * POLL_INTERVAL
      if (age >= maxAge) {
        console.log('[Queue] Polling timeout reached for:', pendingId, 'Age:', age, 'Max:', maxAge);
        // Remove from queue
        removePendingListing(pendingId);
        setQueuedListingIds(prev => {
          const next = new Set(prev);
          next.delete(pendingId);
          return next;
        });
        
        // Show error toast
        const timeoutToast: GenericToastPayload = {
          title: 'Listing timeout',
          description: `The item "${pendingListing.item.name || pendingListing.item.type}" could not be listed. The server did not sync the item within the timeout period. Please try again.`,
          variant: 'error'
        };
        emit('toast-event', timeoutToast).catch(err => {
          console.error('[Queue] Failed to emit timeout toast:', err);
        });
        return;
      }

      updateLastPolled(pendingId);

      try {
        console.log('[Queue] Searching for matching items in stash for:', pendingId);
        const items = await findMatchingItems(pendingListing.item);
        console.log('[Queue] Found matching items for', pendingId, ':', items.length);
        
        if (items.length > 0) {
          console.log('[Queue] Items found! Starting processing for:', pendingId);
          // Mark as processing immediately to prevent duplicates
          isProcessingRef.current.add(pendingId);
          
          // Remove from tracked queue IMMEDIATELY
          setQueuedListingIds(prev => {
            const next = new Set(prev);
            next.delete(pendingId);
            return next;
          });
          removePendingListing(pendingId);

          if (items.length === 1) {
            // Single match - auto list
            console.log('[Queue] Single match found, auto-listing:', items[0].name, items[0].hash);
            await processQueuedListing(pendingListing, items[0]);
            isProcessingRef.current.delete(pendingId);
          } else {
            // Multiple matches - show selector
            console.log('[Queue] Multiple matches found, showing selector:', items.length);
            // Store the pending listing data and ID
            pendingListingDataRef.current = pendingListing;
            setPendingMatchListingId(pendingId);
            setPendingMatches(items);
            setShowMultipleMatchSelector(true);
            setMatchingItems(items);
            // Keep processing flag set until user selects
          }
        }
      } catch (err) {
        console.error('[Queue] Error polling for queued item:', pendingId, err);
        isProcessingRef.current.delete(pendingId);
      }
    });

    await Promise.all(pollPromises);
    
    // Update isQueued state based on remaining queued items
    setQueuedListingIds(prev => {
      const remaining = Array.from(prev);
      setIsQueued(remaining.length > 0);
      setIsPolling(remaining.length > 0);
      return prev;
    });
  }, [authData, findMatchingItems, getPendingListing, updateLastPolled, removePendingListing, emit, queuedListingIds]);

  // Process a queued listing once item is found
  const processQueuedListing = useCallback(async (pendingListing: PendingListing | undefined, stashItem: GameStashItem) => {
    console.log('[Queue] processQueuedListing called:', {
      hasPendingListing: !!pendingListing,
      hasStashItem: !!stashItem,
      stashItemName: stashItem?.name,
      stashItemHash: stashItem?.hash,
      isProcessing: isProcessingRef.current
    });
    
    if (!pendingListing) {
      console.log('[Queue] No pending listing provided, aborting');
      return;
    }
    if (!stashItem) {
      console.log('[Queue] No stash item provided, aborting');
      return;
    }
    
    // Note: isProcessingRef is already set to true in pollForQueuedItem when items are found
    // So we don't need to check or set it here - it's already protected
    console.log('[Queue] Processing queued listing (flag already set)');

    const values = pendingListing.formData;
    console.log('[Queue] Processing with form data:', values);
    
    const priceValue = values.price === null || values.price === undefined || values.price === '' 
      ? null 
      : (typeof values.price === 'string' ? values.price.trim() : values.price);
    const numericPrice = priceValue !== null ? Number(priceValue) : null;
    const hasPrice = numericPrice !== null && !isNaN(numericPrice) && numericPrice > 0;
    const hasNote = values.note && values.note.trim().length > 0;
    const listingType = hasPrice ? 'exact' : 'note';
    
    console.log('[Queue] Listing details:', {
      hasPrice,
      numericPrice,
      hasNote,
      note: values.note,
      listingType,
      totalListingsCount
    });

    try {
      // Refresh listings count before checking to get the most up-to-date count
      if (allListingsQuery) {
        const listingsResult = await getMarketListings(allListingsQuery);
        const currentTotalCount = listingsResult.total;
        
        // Check if user has reached the maximum number of listings (50)
        if (currentTotalCount >= 50) {
          console.log('[Queue] Maximum listings reached, cannot list. Count:', currentTotalCount);
          const warningToast: GenericToastPayload = {
            title: 'Maximum listings reached',
            description: 'You can only have 50 active listings. Please remove an existing listing before adding a new one.',
            variant: 'error'
          };
          await emit('toast-event', warningToast);
          return;
        }
      }

      console.log('[Queue] Calling listSpecificItem with:', {
        stashItemName: stashItem.name,
        stashItemHash: stashItem.hash,
        hrPrice: hasPrice && numericPrice !== null ? numericPrice : 0,
        note: values.note || '',
        listingType
      });
      
      const listing = await listSpecificItem(
        stashItem, 
        hasPrice && numericPrice !== null ? numericPrice : 0, 
        values.note || '', 
        listingType
      );
      
      console.log('[Queue] Listing created successfully:', listing._id);
      
      await fetchAllListings();
      console.log('[Queue] Fetched all listings');

      incrementMetric('list_item.create', 1, { status: 'success', listing_type: listingType, source: 'queued' });
      if (hasPrice && numericPrice !== null) {
        distributionMetric('list_item.create_price_hr', numericPrice);
      }

      // Emit custom toast with listing data
      const toastPayload: CustomToastPayload = {
        title: 'Item listed!',
        description: `Your queued item has been listed on the PD2 marketplace.`,
        action: {
          label: stashItem?.name || 'Go to listing',
          type: ToastActionType.OPEN_MARKET_LISTING,
          data: {
            listingId: listing._id
          }
        }
      };
      
      await emit('toast-event', toastPayload);
      console.log('[Queue] Toast notification sent, hiding window');
      appWindow.hide();
    } catch (err) {
      console.error('[Queue] Failed to process queued listing:', err);
      incrementMetric('list_item.create', 1, { status: 'error', source: 'queued' });
      const errorToast: GenericToastPayload = {
        title: 'Failed to list item',
        description: err instanceof Error ? err.message : 'Failed to list queued item',
        variant: 'error'
      };
      await emit('toast-event', errorToast);
    } finally {
      // Processing flag is managed by pollForAllQueuedItems
      console.log('[Queue] Processing complete');
    }
  }, [listSpecificItem, fetchAllListings, allListingsQuery, getMarketListings, authData, settings, appWindow, emit]);

  // Start polling for all queued items
  useEffect(() => {
    const hasQueuedItems = queuedListingIds.size > 0;
    console.log('[Queue] Polling effect triggered:', {
      queuedCount: queuedListingIds.size,
      hasPollInterval: !!pollIntervalRef.current,
      hasQueuedItems
    });
    
    // Set up polling if we have queued items and no interval is running
    if (hasQueuedItems && !pollIntervalRef.current) {
      console.log('[Queue] Starting polling for', queuedListingIds.size, 'queued items');
      
      // Poll immediately first
      pollForAllQueuedItems();
      
      // Then set up interval
      pollIntervalRef.current = setInterval(() => {
        console.log('[Queue] Polling interval tick');
        pollForAllQueuedItems();
      }, POLL_INTERVAL);
      
      console.log('[Queue] Polling interval set up with interval:', POLL_INTERVAL);
    } else if (!hasQueuedItems && pollIntervalRef.current) {
      // Stop polling if no queued items
      console.log('[Queue] No queued items, stopping polling');
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      setIsPolling(false);
    }

    return () => {
      console.log('[Queue] Cleaning up polling interval');
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedListingIds.size]);

  const handleSubmit = async (values: ShortcutFormData) => {
    // If no items found and we have an item, allow queuing
    if (!selectedItem && matchingItems.length === 0 && item) {
      // Check listing count before queuing
      await fetchAllListings();
      if (totalListingsCount >= 50) {
        console.log('[Queue] Maximum listings reached, cannot queue. Count:', totalListingsCount);
        const warningToast: GenericToastPayload = {
          title: 'Maximum listings reached',
          description: 'You can only have 50 active listings. Please remove an existing listing before adding a new one.',
          variant: 'error'
        };
        await emit('toast-event', warningToast);
        setSubmitLoading(false);
        return;
      }

      console.log('[Queue] Queuing item for later listing:', {
        itemName: item.name || item.type,
        formData: values
      });
      
      const pendingId = addPendingListing(item, values);
      console.log('[Queue] Item queued with ID:', pendingId);
      
      setQueuedListingIds(prev => new Set([...prev, pendingId]));
      setIsQueued(true);
      setSubmitLoading(false);
      
      incrementMetric('list_item.queued', 1);
      const queuedToast: GenericToastPayload = {
        title: 'Item queued',
        description: 'We\'re waiting for the server to sync your item (usually takes a few minutes). Once synced, it will be listed automatically.',
        variant: 'default'
      };
      await emit('toast-event', queuedToast);
      appWindow.hide();
      return;
    }

    if (!selectedItem) {
      setError('Please select an item to list');
      incrementMetric('list_item.submit_attempt', 1, { status: 'validation_error', reason: 'no_item_selected' });
      return;
    }
    setSubmitLoading(true);
    const startTime = performance.now();
    try {
      // Determine type based on which fields are filled
      // Normalize price: handle empty strings, whitespace, undefined, null
      const priceValue = values.price === null || values.price === undefined || values.price === '' 
        ? null 
        : (typeof values.price === 'string' ? values.price.trim() : values.price);
      const numericPrice = priceValue !== null ? Number(priceValue) : null;
      const hasPrice = numericPrice !== null && !isNaN(numericPrice) && numericPrice > 0;
      const hasNote = values.note && values.note.trim().length > 0;
      const listingType = hasPrice ? 'exact' : 'note';
      
      const isAlreadyListed = !!currentListingForSelected;
      if (isAlreadyListed) {
        // Prepare update fields
        let updateFields: Record<string, any> = {};
        if (listingType === 'note') {
          updateFields.price = values.note || '';
          updateFields.hr_price = 0;
        } else if (listingType === 'exact') {
          updateFields.hr_price = numericPrice;
          updateFields.price = values.note || '';
        }
        await updateMarketListing(currentListingForSelected._id, updateFields);
        await updateItemByHash(selectedItem.hash, updateFields);
        await fetchAllListings(); // Refresh all listings
        await emit('toast-event', 'Listing updated!');
        
        const duration = performance.now() - startTime;
        incrementMetric('list_item.update', 1, { status: 'success', listing_type: listingType });
        distributionMetric('list_item.update_duration_ms', duration);
        if (hasPrice && numericPrice !== null) {
          distributionMetric('list_item.update_price_hr', numericPrice);
        }
        
        appWindow.hide();
      } else {
        // Check if user has reached the maximum number of listings (50)
        if (totalListingsCount >= 50) {
          const warningToast: GenericToastPayload = {
            title: 'Maximum listings reached',
            description: 'You can only have 50 active listings. Please remove an existing listing before adding a new one.',
            variant: 'error'
          };
          await emit('toast-event', warningToast);
          setSubmitLoading(false);
          return;
        }
        const listing = await listSpecificItem(selectedItem, hasPrice && numericPrice !== null ? numericPrice : 0, values.note || '', listingType);
        form.reset({ type: 'exact', note: '', price: '', currency: 'HR' });
        
        const duration = performance.now() - startTime;
        incrementMetric('list_item.create', 1, { status: 'success', listing_type: listingType });
        distributionMetric('list_item.create_duration_ms', duration);
        if (hasPrice && numericPrice !== null) {
          distributionMetric('list_item.create_price_hr', numericPrice);
        }
        
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
        await fetchAllListings(); // Refresh all listings
        appWindow.hide();
      }
    } catch (err) {
      const duration = performance.now() - startTime;
      const isAlreadyListed = !!currentListingForSelected;
      const action = isAlreadyListed ? 'update' : 'create';
      incrementMetric(`list_item.${action}`, 1, { status: 'error' });
      distributionMetric(`list_item.${action}_duration_ms`, duration);
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
    const startTime = performance.now();
    try {
      await updateMarketListing(marketId, { bumped_at: new Date().toISOString() });
      await updateItemByHash(itemHash, { bumped_at: new Date().toISOString() });
      const duration = performance.now() - startTime;
      incrementMetric('list_item.bump', 1, { status: 'success', source: 'list_item_shortcut' });
      distributionMetric('list_item.bump_duration_ms', duration);
    } catch (err) {
      const duration = performance.now() - startTime;
      incrementMetric('list_item.bump', 1, { status: 'error', source: 'list_item_shortcut' });
      distributionMetric('list_item.bump_duration_ms', duration);
      throw err;
    }
  };

  const handleRefresh = async () => {
    incrementMetric('list_item.refresh', 1);
    await getMarketListingsForStashItems();
    await findMatchingItemsInStash();
  };

  // Handle selection from multiple matches
  const handleMultipleMatchSelection = useCallback(async (stashItem: GameStashItem) => {
    if (!pendingListingDataRef.current || !pendingMatchListingId) {
      console.error('No pending listing data available for multiple match selection');
      return;
    }

    const pendingListing = pendingListingDataRef.current;
    const listingId = pendingMatchListingId;
    
    setShowMultipleMatchSelector(false);
    setPendingMatches([]);
    setPendingMatchListingId(null);
    pendingListingDataRef.current = null;
    
    // Remove from processing set after processing
    await processQueuedListing(pendingListing, stashItem);
    isProcessingRef.current.delete(listingId);
  }, [processQueuedListing, pendingMatchListingId]);

  // Find the current market listing for the selected item
  const currentListingForSelected = useMemo(() => 
    selectedItem ? currentListings.find((c) => c.item.hash === selectedItem.hash) : undefined,
    [selectedItem, currentListings]
  );

  // Prepopulate form fields when selecting a listed item
  useEffect(() => {
    if (!selectedItem || !item) return;
  
    const resetValues: ShortcutFormData = currentListingForSelected
      ? { 
          type: typeof currentListingForSelected.hr_price === 'number' && currentListingForSelected.hr_price > 0  ? 'exact' : 'note',
          note: typeof currentListingForSelected.price === 'string' ? currentListingForSelected.price : '',
          price: currentListingForSelected.hr_price ?? '',
          currency: 'HR',
        }
      : { type: 'exact', note: '', price: '', currency: 'HR' };
  
    form.reset(resetValues);
  }, [selectedItem, currentListingForSelected, form, item]);

  // If no item is provided, show only the Listed Items tab
  if (!item) {
    return (
      <div className="inline-block p-4 border rounded-lg bg-background shadow w-screen h-screen">
        <div className="flex justify-between mb-2 items-center" id="titlebar">
          <div className="flex items-center gap-1">
            <GripVertical 
              data-tauri-drag-region
              className="h-4 w-4 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" 
              id="titlebar-drag-handle"
            />
            <span style={{fontFamily: 'DiabloFont'}} className="mt-1">Listed Items</span>
          </div>
          <Button 
            type="button" 
            id="titlebar-close"
            className="h-6 w-6" 
            variant='ghost' 
            onClick={handleClose}
          >
            <X className='h-4 w-4'/>
          </Button>
        </div>
        <ListedItemsTab onClose={handleClose} />
      </div>
    );
  }

  // Check for loading/error states first
  if (isLoading || error) {
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

  // Show queued status
  if (isQueued && queuedListingIds.size > 0) {
    const queuedItems = Array.from(queuedListingIds)
      .map(id => getPendingListing(id))
      .filter((p): p is PendingListing => p !== undefined);
    
    return (
      <div className="inline-block p-4 border rounded-lg bg-background shadow w-screen h-screen">
        <div className="flex justify-between mb-2 items-center" id="titlebar">
          <div className="flex items-center gap-1">
            <GripVertical 
              data-tauri-drag-region
              className="h-4 w-4 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" 
              id="titlebar-drag-handle"
            />
            <span style={{fontFamily: 'DiabloFont'}} className="mt-1">
              Queued Items ({queuedItems.length})
            </span>
          </div>
          <Button 
            type="button" 
            id="titlebar-close"
            className="h-6 w-6" 
            variant='ghost' 
            onClick={handleClose}
          >
            <X className='h-4 w-4'/>
          </Button>
        </div>
        <div className="flex flex-col py-4 gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <div className="text-lg font-medium">Items queued for listing</div>
            <div className="text-sm text-muted-foreground max-w-md">
              We're waiting for the server to sync your items (usually takes a few minutes). Once synced, they will be listed automatically.
            </div>
            {isPolling && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking stash...</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            {queuedItems.map((pendingListing) => {
              const itemName = pendingListing.item.name || pendingListing.item.type;
              const age = Date.now() - pendingListing.createdAt;
              const maxAge = 60 * POLL_INTERVAL;
              const timeRemaining = Math.max(0, maxAge - age);
              const minutesRemaining = Math.floor(timeRemaining / 60000);
              
              return (
                <div key={pendingListing.id} className="p-3 border rounded-lg flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-medium">{itemName}</div>
                    <div className="text-xs text-muted-foreground">
                      {pendingListing.formData.note && `Note: ${pendingListing.formData.note}`}
                      {pendingListing.formData.price && `Price: ${pendingListing.formData.price} HR`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Time remaining: ~{minutesRemaining} minutes
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      removePendingListing(pendingListing.id);
                      setQueuedListingIds(prev => {
                        const next = new Set(prev);
                        next.delete(pendingListing.id);
                        if (next.size === 0) {
                          setIsQueued(false);
                          if (pollIntervalRef.current) {
                            clearInterval(pollIntervalRef.current);
                            pollIntervalRef.current = null;
                          }
                          if (item) {
                            findMatchingItemsInStash();
                          }
                        }
                        return next;
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Show multiple match selector if needed
  if (showMultipleMatchSelector && pendingMatches.length > 0) {
    return (
      <div className="inline-block p-4 border rounded-lg bg-background shadow w-screen h-screen">
        <div className="flex justify-between mb-2 items-center" id="titlebar">
          <div className="flex items-center gap-1">
            <GripVertical 
              data-tauri-drag-region
              className="h-4 w-4 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" 
              id="titlebar-drag-handle"
            />
            <span style={{fontFamily: 'DiabloFont'}} className="mt-1">Select Item to List</span>
          </div>
          <Button 
            type="button" 
            id="titlebar-close"
            className="h-6 w-6" 
            variant='ghost' 
            onClick={handleClose}
          >
            <X className='h-4 w-4'/>
          </Button>
        </div>
        <Form {...form}>
          <form>
            <MultipleMatchSelector
              matchingItems={pendingMatches}
              expandedItems={expandedItems}
              onItemSelect={handleMultipleMatchSelection}
              onToggleExpanded={toggleExpandedStats}
              onExpandAll={expandAllStats}
              onCollapseAll={collapseAllStats}
            />
          </form>
        </Form>
      </div>
    );
  }

  // Show no items found with queue option
  if (matchingItems.length === 0 && !isLoading && !error && item) {
    return (
      <div className="inline-block p-4 border rounded-lg bg-background shadow w-screen h-screen">
        <div className="flex justify-between mb-2 items-center" id="titlebar">
          <div className="flex items-center gap-1">
            <GripVertical 
              data-tauri-drag-region
              className="h-4 w-4 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" 
              id="titlebar-drag-handle"
            />
            <span style={{fontFamily: 'DiabloFont'}} className="mt-1">List Item</span>
          </div>
          <Button 
            type="button" 
            id="titlebar-close"
            className="h-6 w-6" 
            variant='ghost' 
            onClick={handleClose}
          >
            <X className='h-4 w-4'/>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <span>No items found matching "{item.name || item.type}"</span>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <span>
                    <AlertCircle className="text-yellow-500 w-4 h-4 cursor-pointer" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs text-center">
                  An item won't be found unless it is placed in your shared stash (not personal stash) and you have made a new game.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-sm text-muted-foreground max-w-md mt-2">
              You can queue this item to be listed automatically. We'll wait for the server to sync it from your stash (usually takes a few minutes).
            </div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full max-w-md">
              <ListingFormFields
                form={form}
                selectedItem={null}
                currentListings={[]}
                submitLoading={submitLoading}
                onSubmit={handleSubmit}
                allowQueue={true}
              />
            </form>
          </Form>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-block p-4 border rounded-lg bg-background shadow w-screen h-screen">

      <Tabs defaultValue="list-item" className="w-full">
      <div className="flex justify-between mb-2 items-center" id="titlebar">
        <div className="flex items-center gap-1">
            <GripVertical 
              data-tauri-drag-region
              className="h-4 w-4 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" 
              id="titlebar-drag-handle"
            />
            <TabsList>
              <TabsTrigger value="list-item" className="font-bold" style={{fontFamily: 'DiabloFont'}}>List Item</TabsTrigger>
              <TabsTrigger value="listed-items" className="font-bold" >
                <span className="font-bold" style={{fontFamily: 'DiabloFont'}}>Manage</span>
                {totalListingsCount > 0 && <Badge className="font-bold text-xs rounded-full">{totalListingsCount}</Badge>}
              </TabsTrigger>
            </TabsList>  
          </div>
      
          <Button 
            type="button" 
            id="titlebar-close"
            className="h-6 w-6" 
            variant='ghost' 
            onClick={handleClose}
          >
            <X className='h-4 w-4'/>
          </Button>
        </div>
        
        <TabsContent value="list-item" className="mt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
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
                selectedItem={selectedItem}
                currentListings={currentListings}
                submitLoading={submitLoading}
                onSubmit={handleSubmit}
              />
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="listed-items" className="mt-4">
          <ListedItemsTab 
            onClose={handleClose} 
            initialListings={allListings}
            initialTotalCount={totalListingsCount}
            onTotalCountChange={setTotalListingsCount}
            onListingsChange={setAllListings}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ListItemShortcutForm; 