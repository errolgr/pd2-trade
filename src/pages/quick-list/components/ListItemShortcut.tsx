import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { X, GripVertical, Loader2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import { buildGetMarketListingByStashItemQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { isStashItem } from '@/lib/item-utils';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { emit } from '@/lib/browser-events';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { buildGetAllUserMarketListingsQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { incrementMetric, distributionMetric } from '@/lib/sentryMetrics';
import { usePendingListingsQueue, PendingListing } from '@/hooks/usePendingListingsQueue';
import MultipleMatchSelector from './MultipleMatchSelector';

interface ListItemShortcutFormProps {
  item: PriceCheckItem | null;
}

const ListItemShortcutForm: React.FC<ListItemShortcutFormProps> = ({ item }) => {
  const {
    findMatchingItems,
    listSpecificItem,
    authData,
    getMarketListings,
    updateMarketListing,
    updateItemByHash,
    deleteMarketListing,
  } = usePd2Website();
  const { settings } = useOptions();
  const {
    addPendingListing,
    removePendingListing,
    updateLastPolled,
    getPendingListing,
    pendingListings,
    POLL_INTERVAL,
  } = usePendingListingsQueue();
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
  const [showQueueOption, setShowQueueOption] = useState(false); // Track if user explicitly revealed queue option
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef<Set<string>>(new Set()); // Track which items are being processed
  const pendingListingDataRef = useRef<PendingListing | null>(null);

  const form = useForm<ShortcutFormData>({
    resolver: zodResolver(shortcutFormSchema),
    defaultValues: { type: 'exact', note: '', price: '', currency: 'HR' },
  });

  // Get the current window reference
  const appWindow = getCurrentWebviewWindow();

  // Window control handler
  const handleClose = useCallback(async () => {
    await appWindow.hide();
  }, [appWindow]);

  // Complete reset function for new items
  // Note: Does not clear queuedListingIds - queued items should persist across item selections
  const resetAllState = useCallback(() => {
    setMatchingItems([]);
    setSelectedItem(null);
    setError(null);
    setCurrentListings([]);
    setExpandedItems(new Set());
    setIsMarketListingsLoading(false);
    setSubmitLoading(false);
    setShowMultipleMatchSelector(false);
    setPendingMatches([]);
    setPendingMatchListingId(null);
    setShowQueueOption(false);
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
        setShowQueueOption(false); // Reset queue option visibility
        incrementMetric('list_item.auto_selected', 1);
      } else {
        setSelectedItem(null);
        setShowQueueOption(false); // Reset queue option visibility when new search
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

  // Sync queued items from storage on mount and when pendingListings changes
  // This ensures queued items persist even when selecting different items
  useEffect(() => {
    if (authData) {
      // Load all pending listings from storage
      const allPendingIds = new Set(pendingListings.map((p) => p.id));
      setQueuedListingIds(allPendingIds);
      setIsQueued(allPendingIds.size > 0);
    }
  }, [authData, pendingListings]);

  // Find matching items when component mounts or item changes
  useEffect(() => {
    if (item && authData) {
      // Check if this item is already queued
      const existingQueued = pendingListings.find((p) => JSON.stringify(p.item) === JSON.stringify(item));
      if (existingQueued) {
        // Switch to queued tab if item is already queued
        setActiveTab('queued');
      } else {
        // Always search for matching items - queued items are handled separately
        findMatchingItemsInStash();
      }
    } else if (!item) {
      // If item is cleared/null, reset state (but keep queued items)
      resetAllState();
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
      0,
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

  // Process a queued listing once item is found
  const processQueuedListing = useCallback(
    async (pendingListing: PendingListing | undefined, stashItem: GameStashItem) => {
      if (!pendingListing) {
        return;
      }
      if (!stashItem) {
        return;
      }

      const values = pendingListing.formData;

      const priceValue =
        values.price === null || values.price === undefined || values.price === ''
          ? null
          : typeof values.price === 'string'
            ? values.price.trim()
            : values.price;
      const numericPrice = priceValue !== null ? Number(priceValue) : null;
      const hasPrice = numericPrice !== null && !isNaN(numericPrice) && numericPrice > 0;
      const listingType = hasPrice ? 'exact' : 'note';

      try {
        // Refresh listings count before checking to get the most up-to-date count
        if (allListingsQuery) {
          const listingsResult = await getMarketListings(allListingsQuery);
          const currentTotalCount = listingsResult.total;

          // Check if user has reached the maximum number of listings (50)
          if (currentTotalCount >= 50) {
            const warningToast: GenericToastPayload = {
              title: 'Maximum listings reached',
              description:
                'You can only have 50 active listings. Please remove an existing listing before adding a new one.',
              variant: 'error',
            };
            await emit('toast-event', warningToast);
            return;
          }
        }

        const listing = await listSpecificItem(
          stashItem,
          hasPrice && numericPrice !== null ? numericPrice : 0,
          values.note || '',
          listingType,
        );

        await fetchAllListings();

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
              listingId: listing._id,
            },
          },
        };

        await emit('toast-event', toastPayload);
      } catch (err) {
        console.error('[Queue] Failed to process queued listing:', err);
        incrementMetric('list_item.create', 1, { status: 'error', source: 'queued' });
        const errorToast: GenericToastPayload = {
          title: 'Failed to list item',
          description: err instanceof Error ? err.message : 'Failed to list queued item',
          variant: 'error',
        };
        await emit('toast-event', errorToast);
      }
    },
    [listSpecificItem, fetchAllListings, allListingsQuery, getMarketListings, totalListingsCount, appWindow],
  );

  // Poll for all queued items
  const pollForAllQueuedItems = useCallback(async () => {
    if (!authData) {
      return;
    }

    const currentQueuedIds = Array.from(queuedListingIds);
    if (currentQueuedIds.length === 0) {
      setIsPolling(false);
      setIsQueued(false);
      return;
    }

    setIsPolling(true);

    // Process each queued item independently
    const pollPromises = currentQueuedIds.map(async (pendingId) => {
      // Skip if already processing this item
      if (isProcessingRef.current.has(pendingId)) {
        return;
      }

      const pendingListing = getPendingListing(pendingId);
      if (!pendingListing) {
        setQueuedListingIds((prev) => {
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
        // Remove from queue
        removePendingListing(pendingId);
        setQueuedListingIds((prev) => {
          const next = new Set(prev);
          next.delete(pendingId);
          return next;
        });

        // Show error toast
        const timeoutToast: GenericToastPayload = {
          title: 'Listing timeout',
          description: `The item "${pendingListing.item.name || pendingListing.item.type}" could not be listed. The server did not sync the item within the timeout period. Please try again.`,
          variant: 'error',
        };
        emit('toast-event', timeoutToast).catch((err) => {
          console.error('[Queue] Failed to emit timeout toast:', err);
        });
        return;
      }

      updateLastPolled(pendingId);

      try {
        const items = await findMatchingItems(pendingListing.item);

        // Determine which item to use based on whether we have initial matching hashes
        let itemToUse: GameStashItem | null = null;

        if (pendingListing.initialMatchingHashes && pendingListing.initialMatchingHashes.size > 0) {
          // We queued with multiple matches - look for a NEW item (not in initial set)
          const newItems = items.filter((item) => !pendingListing.initialMatchingHashes!.has(item.hash));

          if (newItems.length > 0) {
            // Found a new item! Use the first one (or could use the most recent if we had timestamps)
            itemToUse = newItems[0];
          }
        } else {
          // No initial matching hashes - this was queued with 0 matches, use first item found
          if (items.length > 0) {
            itemToUse = items[0];
          }
        }

        if (itemToUse) {
          // Mark as processing immediately to prevent duplicates
          isProcessingRef.current.add(pendingId);

          // Remove from tracked queue IMMEDIATELY
          setQueuedListingIds((prev) => {
            const next = new Set(prev);
            next.delete(pendingId);
            return next;
          });
          removePendingListing(pendingId);

          // Process the found item
          await processQueuedListing(pendingListing, itemToUse);
          isProcessingRef.current.delete(pendingId);
        } else if (items.length > 1 && !pendingListing.initialMatchingHashes) {
          // Multiple matches but no initial hashes (shouldn't happen, but handle gracefully)
          // This means we queued with 0 matches but now have multiple - show selector
          isProcessingRef.current.add(pendingId);
          setQueuedListingIds((prev) => {
            const next = new Set(prev);
            next.delete(pendingId);
            return next;
          });
          removePendingListing(pendingId);
          pendingListingDataRef.current = pendingListing;
          setPendingMatchListingId(pendingId);
          setPendingMatches(items);
          setShowMultipleMatchSelector(true);
          setMatchingItems(items);
        }
      } catch (err) {
        console.error('[Queue] Error polling for queued item:', pendingId, err);
        isProcessingRef.current.delete(pendingId);
      }
    });

    await Promise.all(pollPromises);

    // Update isQueued state based on remaining queued items
    setQueuedListingIds((prev) => {
      const remaining = Array.from(prev);
      setIsQueued(remaining.length > 0);
      setIsPolling(remaining.length > 0);
      return prev;
    });
  }, [
    authData,
    findMatchingItems,
    getPendingListing,
    updateLastPolled,
    removePendingListing,
    queuedListingIds,
    processQueuedListing,
    POLL_INTERVAL,
  ]);

  // Start polling for all queued items
  useEffect(() => {
    const hasQueuedItems = queuedListingIds.size > 0;

    // Set up polling if we have queued items and no interval is running
    if (hasQueuedItems && !pollIntervalRef.current) {
      // Poll immediately first
      pollForAllQueuedItems();

      // Then set up interval
      pollIntervalRef.current = setInterval(() => {
        pollForAllQueuedItems();
      }, POLL_INTERVAL);
    } else if (!hasQueuedItems && pollIntervalRef.current) {
      // Stop polling if no queued items
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      setIsPolling(false);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedListingIds.size]);

  const handleSubmit = async (values: ShortcutFormData) => {
    // If no item selected and we have an item, allow queuing
    // This includes both: no items found (length === 0) and multiple items found but none selected
    if (!selectedItem && item) {
      // Check listing count before queuing
      await fetchAllListings();
      if (totalListingsCount >= 50) {
        const warningToast: GenericToastPayload = {
          title: 'Maximum listings reached',
          description:
            'You can only have 50 active listings. Please remove an existing listing before adding a new one.',
          variant: 'error',
        };
        await emit('toast-event', warningToast);
        setSubmitLoading(false);
        return;
      }

      // Store initial matching hashes if there are multiple matches
      const initialMatchingHashes =
        matchingItems.length > 0 ? new Set(matchingItems.map((item) => item.hash)) : undefined;

      const pendingId = addPendingListing(item, values, initialMatchingHashes);

      setQueuedListingIds((prev) => new Set([...prev, pendingId]));
      setIsQueued(true);
      setSubmitLoading(false);

      incrementMetric('list_item.queued', 1, {
        has_multiple_matches: matchingItems.length > 0 ? 'true' : 'false',
      });
      const queuedToast: GenericToastPayload = {
        title: 'Item queued',
        description:
          matchingItems.length > 0
            ? "We're waiting for the new item to appear in your stash (usually takes a few minutes). Once it appears, it will be listed automatically."
            : "We're waiting for the server to sync your item (usually takes a few minutes). Once synced, it will be listed automatically.",
        variant: 'default',
      };
      await emit('toast-event', queuedToast);

      // Switch to queued tab to show the queued item
      setActiveTab('queued');

      // Reset form to allow queuing another item, but keep showQueueOption true
      form.reset({ type: 'exact', note: '', price: '', currency: 'HR' });
      // Don't hide window - allow user to queue multiple items
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
      const priceValue =
        values.price === null || values.price === undefined || values.price === ''
          ? null
          : typeof values.price === 'string'
            ? values.price.trim()
            : values.price;
      const numericPrice = priceValue !== null ? Number(priceValue) : null;
      const hasPrice = numericPrice !== null && !isNaN(numericPrice) && numericPrice > 0;
      const listingType = hasPrice ? 'exact' : 'note';

      const isAlreadyListed = !!currentListingForSelected;
      if (isAlreadyListed) {
        // Prepare update fields
        const updateFields: Record<string, any> = {};
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
        await emit('toast-event', { title: 'PD2 Trader', description: 'Listing updated!' });

        const duration = performance.now() - startTime;
        incrementMetric('list_item.update', 1, { status: 'success', listing_type: listingType });
        distributionMetric('list_item.update_duration_ms', duration);
        if (hasPrice && numericPrice !== null) {
          distributionMetric('list_item.update_price_hr', numericPrice);
        }

        await appWindow.hide();
      } else {
        // Check if user has reached the maximum number of listings (50)
        if (totalListingsCount >= 50) {
          const warningToast: GenericToastPayload = {
            title: 'Maximum listings reached',
            description:
              'You can only have 50 active listings. Please remove an existing listing before adding a new one.',
            variant: 'error',
          };
          await emit('toast-event', warningToast);
          setSubmitLoading(false);
          return;
        }
        const listing = await listSpecificItem(
          selectedItem,
          hasPrice && numericPrice !== null ? numericPrice : 0,
          values.note || '',
          listingType,
        );
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
              listingId: listing._id,
            },
          },
        };

        await emit('toast-event', toastPayload);
        await fetchAllListings(); // Refresh all listings
        await appWindow.hide();
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
    const allHashes = matchingItems.map((item) => item.hash).filter(Boolean);
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
  const handleMultipleMatchSelection = useCallback(
    async (stashItem: GameStashItem) => {
      if (!pendingListingDataRef.current || !pendingMatchListingId) {
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
    },
    [processQueuedListing, pendingMatchListingId],
  );

  // Find the current market listing for the selected item
  const currentListingForSelected = useMemo(
    () => (selectedItem ? currentListings.find((c) => c.item.hash === selectedItem.hash) : undefined),
    [selectedItem, currentListings],
  );

  // Prepopulate form fields when selecting a listed item
  useEffect(() => {
    if (!selectedItem || !item) return;

    const resetValues: ShortcutFormData = currentListingForSelected
      ? {
          type:
            typeof currentListingForSelected.hr_price === 'number' && currentListingForSelected.hr_price > 0
              ? 'exact'
              : 'note',
          note: typeof currentListingForSelected.price === 'string' ? currentListingForSelected.price : '',
          price: currentListingForSelected.hr_price ?? '',
          currency: 'HR',
        }
      : { type: 'exact', note: '', price: '', currency: 'HR' };

    form.reset(resetValues);
  }, [selectedItem, currentListingForSelected, form, item]);

  // State for active tab
  const [activeTab, setActiveTab] = useState(item && isStashItem(item) ? 'list-item' : 'listed-items');

  // Auto-switch to list-item tab when a new valid stash item is detected
  // Otherwise default to Manage tab
  useEffect(() => {
    if (item && isStashItem(item)) {
      setActiveTab('list-item');
    } else {
      setActiveTab('listed-items');
    }
  }, [item, resetAllState]);

  // Render queued items view
  const renderQueuedItemsContent = () => {
    const queuedItems = Array.from(queuedListingIds)
      .map((id) => getPendingListing(id))
      .filter((p): p is PendingListing => p !== undefined);

    if (queuedItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 h-full">
          <AlertCircle className="w-12 h-12 text-muted-foreground opacity-50" />
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">No Queued Items</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">Items you queue for listing will appear here.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col py-4 gap-4 w-full h-full bg-background min-h-0">
        <div className="flex flex-col items-center gap-2 text-center flex-shrink-0">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <div className="text-lg font-medium">Items queued for listing</div>
          <div className="text-sm text-muted-foreground max-w-md">
            We&apos;re waiting for the server to sync your items (usually takes a few minutes). Once synced, they will
            be listed automatically.
          </div>
          {isPolling && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking stash...</span>
            </div>
          )}
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col gap-2 pb-4 pr-2">
            {queuedItems.map((pendingListing) => {
              const itemName = pendingListing.item.name || pendingListing.item.type;
              const age = Date.now() - pendingListing.createdAt;
              const maxAge = 60 * POLL_INTERVAL;
              const timeRemaining = Math.max(0, maxAge - age);
              const minutesRemaining = Math.floor(timeRemaining / 60000);

              return (
                <div key={pendingListing.id}
                  className="p-3 border rounded-lg flex justify-between items-center">
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
                      setQueuedListingIds((prev) => {
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
        </ScrollArea>
      </div>
    );
  };

  // Logic to determine what to render inside the "List Item" tab
  const renderListItemContent = () => {
    if (!item) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 h-[300px]">
          <AlertCircle className="w-12 h-12 text-muted-foreground opacity-50" />
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">No Item Selected</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              Copy an item in-game (Ctrl+C) and reopen this window to list it, or select &quot;Manage Listings&quot; to
              view your active trades.
            </p>
          </div>
        </div>
      );
    }

    // 1. Loading or Error
    if (isLoading || error) {
      return (
        <LoadingAndErrorStates
          isLoading={isLoading}
          error={error}
          matchingItems={matchingItems}
          onRetry={findMatchingItemsInStash}
          embedded={true}
        />
      );
    }

    // 3. Multiple Matches Selector
    if (showMultipleMatchSelector && pendingMatches.length > 0) {
      return (
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
      );
    }

    // 4. No Items Found (with Queue option)
    if (matchingItems.length === 0 && !isLoading && !error && item) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <span>No items found matching &quot;{item.name || item.type}&quot;</span>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <span>
                    <AlertCircle className="text-yellow-500 w-4 h-4 cursor-pointer" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs text-center">
                  An item won&apos;t be found unless it is placed in your shared stash (not personal stash) and you have
                  made a new game.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-sm text-muted-foreground max-w-md mt-2">
              You can queue this item to be listed automatically. We&apos;ll wait for the server to sync it from your
              stash (usually takes a few minutes).
            </div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}
              className="w-full max-w-md">
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
      );
    }

    // 5. Default: Item Selection Form
    if (item) {
      return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}
            className="h-full flex flex-col overflow-hidden">
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

            <div className="flex-shrink-0">
              {matchingItems.length > 0 && !selectedItem && !showQueueOption && (
                <div className="mb-2 flex flex-col items-center gap-2">
                  <div className="text-xs text-muted-foreground text-center">None of these match?</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQueueOption(true)}
                    className="text-xs"
                  >
                    Queue Item for Later
                  </Button>
                </div>
              )}
              {(selectedItem || (matchingItems.length > 0 && !selectedItem && showQueueOption)) && (
                <>
                  {matchingItems.length > 0 && !selectedItem && showQueueOption && (
                    <div className="mb-2 text-xs text-muted-foreground text-center">
                      Queue this item to wait for the new one to appear in your stash (usually takes a few minutes).
                    </div>
                  )}
                  <ListingFormFields
                    form={form}
                    selectedItem={selectedItem}
                    currentListings={currentListings}
                    submitLoading={submitLoading}
                    onSubmit={handleSubmit}
                    allowQueue={matchingItems.length > 0 && !selectedItem && showQueueOption}
                  />
                </>
              )}
            </div>
          </form>
        </Form>
      );
    }

    // 6. Fallback (No item provided manually)
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <p className="text-center">
          No item selected. Use the shortcut or navigate with an item parameter to list items.
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col p-4 border rounded-lg bg-background shadow w-screen h-screen overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full flex-1 flex flex-col h-full overflow-hidden"
      >
        <div className="flex justify-between mb-2 items-center"
          id="titlebar">
          <div className="flex items-center gap-1">
            <GripVertical
              data-tauri-drag-region
              className="h-4 w-4 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              id="titlebar-drag-handle"
            />
            <TabsList>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={-1}>
                      <TabsTrigger
                        value="list-item"
                        className="font-bold"
                        style={{ fontFamily: 'DiabloFont' }}
                        disabled={item ? !isStashItem(item) : false}
                      >
                        List Item
                      </TabsTrigger>
                    </span>
                  </TooltipTrigger>
                  {item && !isStashItem(item) && (
                    <TooltipContent>
                      <p>Item must be in your shared stash to list.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <TabsTrigger value="listed-items"
                className="font-bold">
                <span className="font-bold"
                  style={{ fontFamily: 'DiabloFont' }}>
                  Manage
                </span>
                {totalListingsCount > 0 && (
                  <Badge className="font-bold text-xs rounded-full">{totalListingsCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="queued"
                className="font-bold">
                <span className="font-bold"
                  style={{ fontFamily: 'DiabloFont' }}>
                  Queued
                </span>
                {queuedListingIds.size > 0 && (
                  <Badge className="font-bold text-xs rounded-full">{queuedListingIds.size}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <Button type="button"
            id="titlebar-close"
            className="h-6 w-6"
            variant="ghost"
            onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <TabsContent value="list-item"
          className="mt-4 flex-1 flex flex-col min-h-0">
          {renderListItemContent()}
        </TabsContent>

        <TabsContent value="listed-items"
          className="mt-4 flex-1 flex flex-col min-h-0">
          <ListedItemsTab
            onClose={handleClose}
            initialListings={allListings}
            initialTotalCount={totalListingsCount}
            onTotalCountChange={setTotalListingsCount}
          />
        </TabsContent>

        <TabsContent value="queued"
          className="mt-4 flex-1 flex flex-col min-h-0">
          {renderQueuedItemsContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ListItemShortcutForm;
