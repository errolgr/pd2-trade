import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  X,
  GripVertical,
  Loader2,
  AlertCircle,
  Clock,
  Hourglass,
  ListChecks,
  PackageSearch,
  SearchX,
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { buildGetMarketListingByStashItemQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { isStashItem } from '@/lib/item-utils';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import {
  usePd2Website,
  AccountMismatchError,
  AuthenticationError,
  NoAccountSelectedError,
} from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { CustomToastPayload, ToastActionType, GenericToastPayload } from '@/common/types/Events';
import { shortcutFormSchema, ShortcutFormData } from './types';
import ItemSelectionList from './ItemSelectionList';
import ListingFormFields from './ListingFormFields';
import LoadingAndErrorStates from './LoadingAndErrorStates';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ListedItemsTab from './ListedItemsTab';
import { ScrollArea } from '@/components/ui/scroll-area';
import { buildGetAllUserMarketListingsQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { trackEvent, trackMeasurement } from '@/lib/telemetry';
import { usePendingListingsQueue, PendingListing } from '@/hooks/usePendingListingsQueue';
import MultipleMatchSelector from './MultipleMatchSelector';
import EmptyState from './EmptyState';
import { countChip, itemCard } from './styles';
import { WindowPanel } from '@/components/custom/window-chrome';
import { cn } from '@/lib/utils';
import { DUR, EASE_OUT, fadeInUp, listItem, listStagger, popIn } from '@/lib/motion';
import { showToast, usePanel } from '@/overlay';
import { subscribeListingDeleted } from '@/hooks/pd2website/listing-events';
import { exactStashMatches } from '../lib/exact-stash-match';
import { useTranslation } from '@/i18n';

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
  const { t } = useTranslation(['quickList', 'common']);
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
  const [isAccountMismatch, setIsAccountMismatch] = useState(false);
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
  const isPollRunningRef = useRef(false); // Prevent overlapping poll cycles
  const isProcessingRef = useRef<Set<string>>(new Set()); // Track which items are being processed
  const pendingListingDataRef = useRef<PendingListing | null>(null);
  // Every stash item findMatchingItems returned, even when the list shows only the exact match: queueing
  // must wait for an item that is new to all of them.
  const stashCandidatesRef = useRef<GameStashItem[]>([]);

  const form = useForm<ShortcutFormData>({
    resolver: zodResolver(shortcutFormSchema),
    defaultValues: { type: 'exact', note: '', price: '', currency: 'HR' },
  });

  const { close: handleClose } = usePanel<'quickList'>();

  // Complete reset function for new items
  // Note: Does not clear queuedListingIds - queued items should persist across item selections
  const resetAllState = useCallback(() => {
    setMatchingItems([]);
    stashCandidatesRef.current = [];
    setSelectedItem(null);
    setError(null);
    setIsAccountMismatch(false);
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
      const candidates = await findMatchingItems(item);
      const duration = performance.now() - startTime;
      // Narrow to the very item that was copied/inspected when it is identifiable among the candidates.
      const exact = exactStashMatches(item, candidates);
      const items = exact.length > 0 ? exact : candidates;

      trackMeasurement(
        'list_item_matching_search',
        { duration_ms: duration, matched_items: candidates.length, exact_matches: exact.length },
        { outcome: 'success' },
      );

      stashCandidatesRef.current = candidates;
      setMatchingItems(items);
      if (items.length === 1) {
        setSelectedItem(items[0]);
        setShowQueueOption(false); // Reset queue option visibility
        trackEvent('list_item_auto_selected');
      } else {
        setSelectedItem(null);
        setShowQueueOption(false); // Reset queue option visibility when new search
      }
    } catch (err) {
      const duration = performance.now() - startTime;
      trackMeasurement('list_item_matching_search', { duration_ms: duration }, { outcome: 'error' });
      // Account mismatch / expired session / no account chosen are expected user-state conditions, not app bugs
      if (
        !(err instanceof AccountMismatchError) &&
        !(err instanceof AuthenticationError) &&
        !(err instanceof NoAccountSelectedError)
      ) {
        console.error(err instanceof Error ? err.message : 'Failed to find items');
      }

      // Handle account mismatch error with user-friendly message
      if (err instanceof AccountMismatchError) {
        const errorMessage = err.message || t('shortcut.accountMismatchFallback');
        setError(errorMessage);
        setIsAccountMismatch(true);

        const toastPayload: GenericToastPayload = {
          title: t('shortcut.accountMismatchTitle'),
          description: errorMessage,
          variant: 'error',
          duration: 8000,
        };
        showToast(toastPayload);
      } else {
        setError(err instanceof Error ? err.message : t('shortcut.findFailed'));
      }
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

  // A listing removed anywhere (Manage tab, Ctrl+U delist, chat): drop it from the item's listings and
  // refetch the badge count and the Manage tab's first page
  useEffect(
    () =>
      subscribeListingDeleted((listingId) => {
        setCurrentListings((prev) => prev.filter((l) => l._id !== listingId));
        void fetchAllListings();
      }),
    [fetchAllListings],
  );

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
      const startTime = performance.now();
      try {
        // Refresh listings count before checking to get the most up-to-date count
        if (allListingsQuery) {
          const listingsResult = await getMarketListings(allListingsQuery);
          const currentTotalCount = listingsResult.total;

          // Check if user has reached the maximum number of listings (50)
          if (currentTotalCount >= 50) {
            const warningToast: GenericToastPayload = {
              title: t('shortcut.maxListingsTitle'),
              description: t('shortcut.maxListingsDescription'),
              variant: 'error',
            };
            showToast(warningToast);
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

        trackMeasurement(
          'list_item_create',
          { duration_ms: performance.now() - startTime, price_hr: hasPrice ? numericPrice : undefined },
          { outcome: 'success', listing_type: listingType, source: 'queued' },
        );

        // Emit custom toast with listing data
        const toastPayload: CustomToastPayload = {
          title: t('shortcut.itemListedTitle'),
          description: t('shortcut.queuedListedDescription'),
          action: {
            label: stashItem?.name || t('shortcut.goToListing'),
            type: ToastActionType.OPEN_MARKET_LISTING,
            data: {
              listingId: listing._id,
            },
          },
        };

        showToast(toastPayload);
      } catch (err) {
        console.error('[Queue] Failed to process queued listing:', err);
        trackMeasurement(
          'list_item_create',
          { duration_ms: performance.now() - startTime },
          { outcome: 'error', source: 'queued' },
        );
        const errorToast: GenericToastPayload = {
          title: t('shortcut.listFailedTitle'),
          description: err instanceof Error ? err.message : t('shortcut.listQueuedFailed'),
          variant: 'error',
        };
        showToast(errorToast);
      }
    },
    [listSpecificItem, fetchAllListings, allListingsQuery, getMarketListings, totalListingsCount],
  );

  // Poll for all queued items
  const pollForAllQueuedItems = useCallback(async () => {
    if (!authData) {
      return;
    }

    // Prevent overlapping poll cycles
    if (isPollRunningRef.current) {
      return;
    }

    const currentQueuedIds = Array.from(queuedListingIds);
    if (currentQueuedIds.length === 0) {
      setIsPolling(false);
      setIsQueued(false);
      return;
    }

    isPollRunningRef.current = true;
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
          title: t('shortcut.timeoutTitle'),
          description: t('shortcut.timeoutDescription', { name: pendingListing.item.name || pendingListing.item.type }),
          variant: 'error',
        };
        showToast(timeoutToast);
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

        // Handle account mismatch error with user-friendly message
        if (err instanceof AccountMismatchError) {
          // Remove from queue since we can't process it
          removePendingListing(pendingId);
          setQueuedListingIds((prev) => {
            const next = new Set(prev);
            next.delete(pendingId);
            return next;
          });

          const toastPayload: GenericToastPayload = {
            title: t('shortcut.accountMismatchTitle'),
            description: err.message || t('shortcut.accountMismatchFallback'),
            variant: 'error',
            duration: 8000,
          };
          showToast(toastPayload);
        }
      }
    });

    await Promise.all(pollPromises);
    isPollRunningRef.current = false;

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
      setSubmitLoading(true);
      // Check listing count before queuing
      await fetchAllListings();
      if (totalListingsCount >= 50) {
        const warningToast: GenericToastPayload = {
          title: t('shortcut.maxListingsTitle'),
          description: t('shortcut.maxListingsDescription'),
          variant: 'error',
        };
        showToast(warningToast);
        setSubmitLoading(false);
        return;
      }

      // Store the hashes of every stash candidate so the queue waits for an item new to all of them
      const candidates = stashCandidatesRef.current;
      const initialMatchingHashes = candidates.length > 0 ? new Set(candidates.map((item) => item.hash)) : undefined;

      const pendingId = addPendingListing(item, values, initialMatchingHashes);

      setQueuedListingIds((prev) => new Set([...prev, pendingId]));
      setIsQueued(true);
      setSubmitLoading(false);

      trackEvent('list_item_queued', { has_multiple_matches: matchingItems.length > 0 });
      const queuedToast: GenericToastPayload = {
        title: t('shortcut.queuedTitle'),
        description:
          matchingItems.length > 0 ? t('shortcut.queuedNewItemDescription') : t('shortcut.queuedSyncDescription'),
        variant: 'default',
      };
      showToast(queuedToast);

      // Switch to queued tab to show the queued item
      setActiveTab('queued');

      // Reset form to allow queuing another item, but keep showQueueOption true
      form.reset({ type: 'exact', note: '', price: '', currency: 'HR' });
      // Don't hide window - allow user to queue multiple items
      return;
    }

    if (!selectedItem) {
      setError(t('shortcut.selectItemError'));
      trackEvent('list_item_submit_rejected', { reason: 'no_item_selected' });
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
        showToast({ title: 'PD2 Trader', description: t('toasts.listingUpdated') });

        trackMeasurement(
          'list_item_update',
          { duration_ms: performance.now() - startTime, price_hr: hasPrice ? numericPrice : undefined },
          { outcome: 'success', listing_type: listingType },
        );

        handleClose();
      } else {
        // Check if user has reached the maximum number of listings (50)
        if (totalListingsCount >= 50) {
          const warningToast: GenericToastPayload = {
            title: t('shortcut.maxListingsTitle'),
            description: t('shortcut.maxListingsDescription'),
            variant: 'error',
          };
          showToast(warningToast);
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

        trackMeasurement(
          'list_item_create',
          { duration_ms: performance.now() - startTime, price_hr: hasPrice ? numericPrice : undefined },
          { outcome: 'success', listing_type: listingType, source: 'direct' },
        );

        // Emit custom toast with listing data
        const toastPayload: CustomToastPayload = {
          title: t('shortcut.itemListedTitle'),
          description: t('shortcut.addedDescription'),
          action: {
            label: selectedItem?.name || t('shortcut.goToListing'),
            type: ToastActionType.OPEN_MARKET_LISTING,
            data: {
              listingId: listing._id,
            },
          },
        };

        showToast(toastPayload);
        await fetchAllListings(); // Refresh all listings
        handleClose();
      }
    } catch (err) {
      const isAlreadyListed = !!currentListingForSelected;
      trackMeasurement(
        isAlreadyListed ? 'list_item_update' : 'list_item_create',
        { duration_ms: performance.now() - startTime },
        { outcome: 'error', source: isAlreadyListed ? undefined : 'direct' },
      );
      console.error(err instanceof Error ? err.message : 'Failed to list/update item');
      setError(err instanceof Error ? err.message : t('shortcut.listUpdateFailed'));
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
      trackMeasurement(
        'list_item_bump',
        { duration_ms: duration },
        { outcome: 'success', source: 'list_item_shortcut' },
      );
    } catch (err) {
      const duration = performance.now() - startTime;
      trackMeasurement('list_item_bump', { duration_ms: duration }, { outcome: 'error', source: 'list_item_shortcut' });
      throw err;
    }
  };

  const handleRefresh = async () => {
    trackEvent('list_item_refresh');
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
        <EmptyState icon={<ListChecks />}
          title={t('queued.emptyTitle')}
          className="h-full">
          {t('queued.emptyDescription')}
        </EmptyState>
      );
    }

    return (
      <div className="flex flex-col gap-4 w-full h-full min-h-0">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-2 text-center flex-shrink-0 pt-2"
        >
          <span className="relative flex size-12 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/25">
            <Hourglass className="size-5" />
            <Loader2
              className="absolute inset-0 size-12 animate-spin text-primary/50 [animation-duration:2.4s]"
              strokeWidth={1}
            />
          </span>
          <div className="text-base font-semibold tracking-tight">{t('queued.heading')}</div>
          <div className="text-sm text-muted-foreground max-w-md leading-relaxed">{t('queued.description')}</div>
          <AnimatePresence>
            {isPolling && (
              <motion.div
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground"
                role="status"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{t('queued.checkingStash')}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <ScrollArea className="flex-1 min-h-0 [&_[data-radix-scroll-area-viewport]>div]:!block">
          <motion.div
            className="flex flex-col gap-2 p-px pb-2 pr-2"
            variants={listStagger}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence initial={false}>
              {queuedItems.map((pendingListing) => {
                const itemName = pendingListing.item.name || pendingListing.item.type;
                const age = Date.now() - pendingListing.createdAt;
                const maxAge = 60 * POLL_INTERVAL;
                const timeRemaining = Math.max(0, maxAge - age);
                const minutesRemaining = Math.floor(timeRemaining / 60000);
                const elapsedPct = Math.min(100, Math.max(0, (age / maxAge) * 100));
                const { note, price } = pendingListing.formData;

                return (
                  <motion.div
                    layout
                    variants={listItem}
                    exit={{ opacity: 0, x: -12, transition: { duration: DUR.fast } }}
                    key={pendingListing.id}
                    className={itemCard({ className: 'flex items-center justify-between gap-3' })}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{itemName}</div>
                      {(note || price) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {price && (
                            <span className="rounded-full bg-primary/12 px-1.5 py-px font-semibold tabular-nums text-primary">
                              {t('queued.price', { price })}
                            </span>
                          )}
                          {note && <span className="truncate">{t('queued.note', { note })}</span>}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="size-3 shrink-0" />
                        <span className="shrink-0">{t('queued.timeRemaining', { count: minutesRemaining })}</span>
                        <div
                          className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-label={t('queued.timeoutProgress')}
                          aria-valuenow={Math.round(elapsedPct)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="h-full rounded-full bg-primary/70 transition-[width] duration-(--dur-slow) ease-out"
                            style={{ width: `${elapsedPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
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
                      <X className="size-3.5" />
                      {t('common:actions.cancel')}
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </ScrollArea>
      </div>
    );
  };

  // Logic to determine what to render inside the "List Item" tab
  const renderListItemContent = () => {
    if (!item) {
      return (
        <EmptyState icon={<PackageSearch />}
          title={t('shortcut.noItemTitle')}
          className="h-[300px]">
          {t('shortcut.noItemDescription')}
        </EmptyState>
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
          isAccountMismatch={isAccountMismatch}
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
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center py-6 gap-4"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-warning/12 text-warning ring-1 ring-warning/25">
            <SearchX className="size-6" />
          </span>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <span>{t('shortcut.noItemsFound', { name: item.name || item.type })}</span>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('shortcut.whyNotFound')}
                    className="inline-flex rounded-full text-warning outline-none transition-transform duration-(--dur-fast) hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <AlertCircle className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs text-center">
                  {t('shortcut.notFoundTooltip')}
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-sm text-muted-foreground max-w-md leading-relaxed">{t('shortcut.queueHint')}</div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}
              className="w-full max-w-lg">
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
        </motion.div>
      );
    }

    // 5. Default: Item Selection Form
    if (item) {
      const queueMode = matchingItems.length > 0 && !selectedItem && showQueueOption;
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
              onItemSelect={(item) => {
                setSelectedItem(item);
                setShowQueueOption(false);
              }}
              onToggleExpanded={toggleExpandedStats}
              onExpandAll={expandAllStats}
              onCollapseAll={collapseAllStats}
              onBump={handleBump}
              onRefresh={handleRefresh}
            />

            <div className="flex-shrink-0 space-y-2">
              <AnimatePresence initial={false}
                mode="popLayout">
                {!showQueueOption && (
                  <motion.div
                    key="queue-cta"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: DUR.fast, ease: EASE_OUT }}
                    className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-muted/30 py-1.5 pl-3 pr-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{t('shortcut.noneMatch')}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedItem(null);
                        setShowQueueOption(true);
                      }}
                      className="text-xs h-7 px-3"
                    >
                      {t('form.queueItem')}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              {(selectedItem || queueMode) && (
                <motion.div layout="position"
                  className="space-y-2">
                  {queueMode && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-1.5 rounded-md bg-primary/8 px-2 py-1.5 text-xs text-muted-foreground"
                    >
                      <Hourglass className="size-3.5 shrink-0 text-primary" />
                      {t('shortcut.queueModeHint')}
                    </motion.div>
                  )}
                  <ListingFormFields
                    form={form}
                    selectedItem={selectedItem}
                    currentListings={currentListings}
                    submitLoading={submitLoading}
                    onSubmit={handleSubmit}
                    allowQueue={queueMode}
                  />
                </motion.div>
              )}
            </div>
          </form>
        </Form>
      );
    }

    // 6. Fallback (No item provided manually)
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <p className="text-center">{t('shortcut.fallback')}</p>
      </div>
    );
  };

  const tabLabel = (label: string, count: number) => (
    <>
      <span className="font-bold"
        style={{ fontFamily: 'DiabloFont' }}>
        {label}
      </span>
      <AnimatePresence initial={false}>
        {count > 0 && (
          <motion.span
            key={count}
            variants={popIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(countChip, 'h-[18px] min-w-[18px] text-[11px]')}
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
      <WindowPanel animate
        className="h-full w-full">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full flex-1 flex flex-col h-full gap-0 overflow-hidden"
        >
          <div
            className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/70 px-2.5"
            id="titlebar"
            data-panel-drag
          >
            <div className="flex items-center gap-1.5">
              <GripVertical
                data-panel-drag
                className="h-4 w-4 cursor-grab active:cursor-grabbing text-muted-foreground transition-colors duration-(--dur-fast) hover:text-foreground"
                id="titlebar-drag-handle"
              />
              <TabsList className="h-8">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={-1}>
                        <TabsTrigger
                          value="list-item"
                          className="font-bold px-2.5"
                          style={{ fontFamily: 'DiabloFont' }}
                          disabled={item ? !isStashItem(item) : false}
                        >
                          {t('tabs.listItem')}
                        </TabsTrigger>
                      </span>
                    </TooltipTrigger>
                    {item && !isStashItem(item) && (
                      <TooltipContent>
                        <p>{t('tabs.mustBeInStash')}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                <TabsTrigger value="listed-items"
                  className="font-bold px-2.5">
                  {tabLabel(t('tabs.manage'), totalListingsCount)}
                </TabsTrigger>
                <TabsTrigger value="queued"
                  className="font-bold px-2.5">
                  {tabLabel(t('tabs.queued'), queuedListingIds.size)}
                </TabsTrigger>
              </TabsList>
            </div>

            <Button
              type="button"
              id="titlebar-close"
              aria-label={t('common:actions.close')}
              size="icon"
              className="size-7 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              variant="ghost"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <TabsContent value="list-item"
            className="flex-1 flex flex-col min-h-0 px-4 pt-3 pb-4">
            {renderListItemContent()}
          </TabsContent>

          <TabsContent value="listed-items"
            className="flex-1 flex flex-col min-h-0 px-4 pt-3 pb-4">
            <ListedItemsTab
              onClose={handleClose}
              initialListings={allListings}
              initialTotalCount={totalListingsCount}
              onTotalCountChange={setTotalListingsCount}
              onListingsChange={setAllListings}
            />
          </TabsContent>

          <TabsContent value="queued"
            className="flex-1 flex flex-col min-h-0 px-4 pt-3 pb-4">
            {renderQueuedItemsContent()}
          </TabsContent>
        </Tabs>
      </WindowPanel>
    </MotionConfig>
  );
};

export default ListItemShortcutForm;
