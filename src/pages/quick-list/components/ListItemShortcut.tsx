import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { X, GripVertical, Loader2, AlertCircle, Clock, Hourglass, ListChecks, PackageSearch } from 'lucide-react';
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
import { isNetworkError } from '@/lib/network-errors';
import { useOptions } from '@/hooks/useOptions';
import { CustomToastPayload, ToastActionType, GenericToastPayload } from '@/common/types/Events';
import { shortcutFormSchema, ShortcutFormData } from './types';
import ItemSelectionList from './ItemSelectionList';
import { ClipboardStatsDisplay } from './ItemStatsDisplay';
import ListingFormFields from './ListingFormFields';
import LoadingAndErrorStates from './LoadingAndErrorStates';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import MyListingsTab, { type ListingFocus } from '../listings/MyListingsTab';
import { ScrollArea } from '@/components/ui/scroll-area';
import { buildGetAllUserMarketListingsQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { trackEvent, trackMeasurement } from '@/lib/telemetry';
import { usePendingListingsQueue, PendingListing } from '@/hooks/usePendingListingsQueue';
import MultipleMatchSelector from './MultipleMatchSelector';
import EmptyState from './EmptyState';
import { countChip, itemCard, sectionLabel } from './styles';
import { WindowPanel } from '@/components/custom/window-chrome';
import { cn } from '@/lib/utils';
import { DUR, fadeInUp, listItem, listStagger, popIn } from '@/lib/motion';
import { showToast, usePanel } from '@/overlay';
import { subscribeListingDeleted } from '@/hooks/pd2website/listing-events';
import { diffStashItem, matchStashItem, type StashMatchTier } from '../lib/exact-stash-match';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { useTranslation } from '@/i18n';
import { wtbOverlapBody, type WtbListPrice } from '@/pages/market/lib/wtb';
import { useWtbItemMatches, useWtbSession } from '@/pages/market/wtb/useWtbData';
import { WtbBuyersChip } from '@/pages/market/wtb/WtbBuyersChip';
import { stashItemSearch } from '@/pages/market/wtb/wtb-chip';
import { itemRowValue } from '@/pages/market/wtb/wtb-text';

/** Overlapping requests read for the buyers chip's "Almost" (requests one stat away). */
const WTB_NEAR_LOOKUP = 50;

/** The pending card's key in `expandedItems` (stash items are keyed by hash). */
const CLIPBOARD_STATS_ID = 'clipboard';

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
  const [isQueued, setIsQueued] = useState(false);
  const [queuedListingIds, setQueuedListingIds] = useState<Set<string>>(new Set());
  const [isPolling, setIsPolling] = useState(false);
  const [showMultipleMatchSelector, setShowMultipleMatchSelector] = useState(false);
  const [pendingMatches, setPendingMatches] = useState<GameStashItem[]>([]);
  const [pendingMatchListingId, setPendingMatchListingId] = useState<string | null>(null);
  // How the copied item was found among the stash candidates; `none` lists them only when the user asks to pick by hand
  const [matchTier, setMatchTier] = useState<StashMatchTier | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollRunningRef = useRef(false); // Prevent overlapping poll cycles
  const isProcessingRef = useRef<Set<string>>(new Set()); // Track which items are being processed
  const pendingListingDataRef = useRef<PendingListing | null>(null);
  // Every stash item findMatchingItems returned, even when the list shows only the matched ones: queueing
  // must wait for an item that is new to all of them.
  const stashCandidatesRef = useRef<GameStashItem[]>([]);

  const form = useForm<ShortcutFormData>({
    resolver: zodResolver(shortcutFormSchema),
    defaultValues: { type: 'exact', note: '', price: '', currency: 'HR' },
  });

  const { close: handleClose, payload, payloadVersion } = usePanel<'quickList'>();
  // openPanel('quickList', { listingId, edit }) (the palette): the Manage tab, on that listing
  const focusListing = useMemo<ListingFocus | null>(
    () => (payload?.listingId ? { listingId: payload.listingId, edit: payload.edit, version: payloadVersion } : null),
    [payload, payloadVersion],
  );
  /** A stash item to list as is (the market's "List at {offer}" for a buy request it fits): no stash search. */
  const directItem = payload?.stashItem ?? null;
  // A buyer's offer to list the item at (the market's "List it at {offer}"), applied once its form is set up
  const prefill = payload?.item || payload?.stashItem ? payload.prefill : undefined;

  // Open buy requests this stash item matches: the compact "a buyer wants this" banner over the price field
  const wtb = useWtbSession();
  const itemText = useMemo(() => (item && isStashItem(item) ? JSON.stringify(item) : null), [item]);
  const wtbMatches = useWtbItemMatches(itemText, wtb.realm, wtb.token);
  /** "List at {offer}" / Relist: the HR price (and its note), or the note alone when there is no HR value. */
  const applyListPrice = useCallback(
    (price: WtbListPrice) => {
      if ('price' in price) {
        form.setValue('type', 'exact');
        form.setValue('price', price.price, { shouldValidate: true });
        if (price.note) form.setValue('note', price.note);
      } else {
        form.setValue('type', 'note');
        form.setValue('note', price.note, { shouldValidate: true });
      }
    },
    [form],
  );

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
    setMatchTier(null);
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
      // Only the very item that was copied/inspected is offered; with none, it hasn't synced yet and posting queues it
      const match = matchStashItem(item, candidates);

      trackMeasurement(
        'list_item_matching_search',
        { duration_ms: duration, matched_items: candidates.length, exact_matches: match.items.length },
        { outcome: 'success', match_tier: match.tier },
      );

      stashCandidatesRef.current = candidates;
      setMatchTier(match.tier);
      setMatchingItems(match.items);
      if (match.items.length === 1) {
        setSelectedItem(match.items[0]);
        trackEvent('list_item_auto_selected', { match_tier: match.tier });
      } else {
        setSelectedItem(null);
      }
    } catch (err) {
      const duration = performance.now() - startTime;
      trackMeasurement('list_item_matching_search', { duration_ms: duration }, { outcome: 'error' });
      // Account mismatch / expired session / no account chosen are expected user-state conditions, not app bugs;
      // PD2 unreachable (the HTTP plugin rejects with its error string) is nothing the app can fix
      if (isNetworkError(err)) {
        console.warn('[QuickList] Failed to find items:', err);
      } else if (
        !(err instanceof AccountMismatchError) &&
        !(err instanceof AuthenticationError) &&
        !(err instanceof NoAccountSelectedError)
      ) {
        console.error('[QuickList] Failed to find items:', err);
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

  // Find matching items when component mounts or item changes; a stash item handed over directly is the match
  useEffect(() => {
    if (directItem) {
      resetAllState();
      stashCandidatesRef.current = [directItem];
      setMatchTier('exact');
      setMatchingItems([directItem]);
      setSelectedItem(directItem);
    } else if (item && authData) {
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
    // Only depend on the item and authData to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, directItem, authData]);

  const pd2MarketQuery = useMemo(() => {
    if ((!item && !directItem) || !authData || matchingItems.length === 0) return null;
    return buildGetMarketListingByStashItemQuery(matchingItems, authData.user._id);
  }, [matchingItems, authData, item, directItem]);

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

  // The listing count (tab chip, 50-listing check): one row is enough, PD2 sends the total. Keyed by the user,
  // mode and ladder only, so other settings changes don't refetch it.
  const userId = authData?.user?._id;
  const hardcore = settings?.mode === 'hardcore';
  const ladder = settings?.ladder === 'ladder';
  const allListingsQuery = useMemo(
    () => (userId ? buildGetAllUserMarketListingsQuery(userId, hardcore, ladder, 1, 0) : null),
    [userId, hardcore, ladder],
  );

  const fetchAllListings = useCallback(async () => {
    if (!allListingsQuery) return;
    try {
      const result = await getMarketListings(allListingsQuery);
      setTotalListingsCount(result.total);
    } catch (err) {
      console.error('Failed to fetch all listings:', err);
      setTotalListingsCount(0);
    }
  }, [allListingsQuery, getMarketListings]);

  useEffect(() => {
    fetchAllListings();
  }, [fetchAllListings]);

  // A listing removed anywhere (Manage tab, Ctrl+U delist, chat): drop it from the item's listings and
  // refetch the listing count
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
          // null: a 401, re-authentication started
          if (!listingsResult) throw new AuthenticationError('Sign in to PD2 to list this item');
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
        if (isNetworkError(err)) console.warn('[Queue] Failed to process queued listing:', err);
        else if (!(err instanceof AuthenticationError)) console.error('[Queue] Failed to process queued listing:', err);
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
        // Queued beside stash candidates: only an item new to all of them can be the one waited for
        const known = pendingListing.initialMatchingHashes;
        const fresh = known && known.size > 0 ? items.filter((i) => !known.has(i.hash)) : items;
        // The copied item among them when it is identifiable, else the only one
        const itemToUse: GameStashItem | null =
          matchStashItem(pendingListing.item, fresh).items[0] ?? (fresh.length === 1 ? fresh[0] : null);

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
        } else if (fresh.length > 1) {
          // Several new items, none provably the copied one: the user picks
          isProcessingRef.current.add(pendingId);
          setQueuedListingIds((prev) => {
            const next = new Set(prev);
            next.delete(pendingId);
            return next;
          });
          removePendingListing(pendingId);
          pendingListingDataRef.current = pendingListing;
          setPendingMatchListingId(pendingId);
          setPendingMatches(fresh);
          setShowMultipleMatchSelector(true);
          setMatchingItems(fresh);
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

  // A hand-picked or loosely matched item once listed: what its stash copy shows that the clipboard doesn't (and the
  // other way round), so the exact check can learn what the clipboard copy drops
  const trackMatchDrift = (stashItem: GameStashItem) => {
    if (!item || (matchTier !== 'loose' && matchTier !== 'none')) return;
    const diff = diffStashItem(item, stashItem);
    trackEvent('list_item_match_drift', {
      match_tier: matchTier === 'none' ? 'hand_picked' : 'loose',
      quality: item.quality,
      item_level_differs: diff.itemLevel,
      ethereal_differs: diff.ethereal,
      sockets_differs: diff.sockets,
      clipboard_only_stats: diff.clipboardOnlyStats.join(',') || undefined,
      stash_only_modifiers: diff.stashOnlyModifiers.join(',') || undefined,
    });
  };

  const handleSubmit = async (values: ShortcutFormData) => {
    // No stash item is the copied one (it hasn't synced yet): queue it
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

      trackEvent('list_item_queued', { has_multiple_matches: candidates.length > 0 });
      const queuedToast: GenericToastPayload = {
        title: t('shortcut.queuedTitle'),
        description:
          candidates.length > 0 ? t('shortcut.queuedNewItemDescription') : t('shortcut.queuedSyncDescription'),
        variant: 'default',
      };
      showToast(queuedToast);

      // Switch to queued tab to show the queued item
      setActiveTab('queued');

      // Reset form to allow queuing another item
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
        trackMatchDrift(selectedItem);
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
        trackMatchDrift(selectedItem);
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
      if (isNetworkError(err)) console.warn('[QuickList] Failed to list/update item:', err);
      else if (!(err instanceof AuthenticationError)) console.error('[QuickList] Failed to list/update item:', err);
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

  // Prepopulate form fields when selecting a listed item; a buyer's offer to list at goes over them
  useEffect(() => {
    if (!selectedItem || (!item && !directItem)) return;

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
    if (prefill) applyListPrice(prefill);
  }, [selectedItem, currentListingForSelected, form, item, directItem, prefill, applyListPrice]);

  // State for active tab
  const [activeTab, setActiveTab] = useState(directItem || (item && isStashItem(item)) ? 'list-item' : 'listed-items');

  // Auto-switch to list-item tab when a new valid stash item is detected
  // Otherwise default to Manage tab
  useEffect(() => {
    if (directItem || (item && isStashItem(item))) {
      setActiveTab('list-item');
    } else {
      setActiveTab('listed-items');
    }
  }, [item, directItem, resetAllState]);
  useEffect(() => {
    if (focusListing) setActiveTab('listed-items');
  }, [focusListing]);

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

  // Beside the item's name: buyers whose request it fills, "List at {offer}" filling the price; `stashItem` (the
  // one listed) gives the values the buyers' stats are read against
  const wtbChip = (stashItem: GameStashItem | null) => (
    <WtbBuyersChip
      matches={wtbMatches}
      itemText={itemText}
      contactItem={stashItem ? { item: stashItem } : itemText ? { text: itemText } : null}
      valueOf={(row) => (stashItem ? itemRowValue(stashItem, row) : null)}
      nearBody={
        stashItem && wtb.realm
          ? wtbOverlapBody(stashItemSearch(stashItem, wtb.realm), { limit: WTB_NEAR_LOOKUP })
          : null
      }
      realm={wtb.realm}
      token={wtb.token}
      source="listItem"
      onListAt={applyListPrice}
    />
  );

  // Logic to determine what to render inside the "List Item" tab
  const renderListItemContent = () => {
    if (!item && !directItem) {
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

    // 4. The copied item is in no stash item (it hasn't synced yet): posting queues it until it shows up
    if (matchingItems.length === 0 && item) {
      const name = (item.isRuneword ? item.runeword : item.name) || item.type;
      return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}
            className="h-full flex flex-col gap-3 overflow-hidden">
            <ScrollArea className="min-h-0 flex-1 pr-2 [&_[data-radix-scroll-area-viewport]>div]:!block">
              <motion.div variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-2 p-px">
                <span className={sectionLabel}>{t('shortcut.pendingLabel')}</span>
                <div className={itemCard({ tone: 'pending' })}>
                  <div className="flex min-h-7 items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={cn('truncate', qualityColor(item.quality))}
                        style={{ fontFamily: 'DiabloFont' }}>
                        {name}
                      </div>
                      {wtbChip(null)}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <Hourglass className="size-3" />
                      {t('shortcut.pendingBadge')}
                    </span>
                  </div>
                  {name !== item.type && <div className="text-xs text-muted-foreground">{item.type}</div>}
                  <ClipboardStatsDisplay
                    id={CLIPBOARD_STATS_ID}
                    item={item}
                    isExpanded={expandedItems.has(CLIPBOARD_STATS_ID)}
                    onToggleExpanded={toggleExpandedStats}
                  />
                  <div className="mt-2 flex items-start gap-1.5 border-t border-border/60 pt-2 text-xs leading-relaxed text-muted-foreground">
                    <span>{t('shortcut.pendingDescription')}</span>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={t('shortcut.whyNotFound')}
                          className="mt-0.5 inline-flex shrink-0 rounded-full text-primary outline-none transition-transform duration-(--dur-fast) hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring/60"
                        >
                          <AlertCircle className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs text-center">
                        {t('shortcut.notFoundTooltip')}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </motion.div>
            </ScrollArea>
            <div className="flex-shrink-0 space-y-2">
              {stashCandidatesRef.current.length > 0 && (
                // The way to a similar stash item when the copied one did sync but matched none
                <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-muted/30 py-1.5 pl-3 pr-1.5">
                  <div className="flex items-center gap-2">
                    <PackageSearch className="size-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{t('shortcut.alreadyInStash')}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMatchingItems(stashCandidatesRef.current)}
                    className="text-xs h-7 px-3"
                  >
                    {t('shortcut.pickFromStash')}
                  </Button>
                </div>
              )}
              <ListingFormFields
                form={form}
                selectedItem={null}
                currentListings={[]}
                submitLoading={submitLoading}
                onSubmit={handleSubmit}
                allowQueue={true}
              />
            </div>
          </form>
        </Form>
      );
    }

    // 5. Default: Item Selection Form
    if (item || directItem) {
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
              buyers={wtbChip(selectedItem ?? matchingItems[0] ?? null)}
            />

            <div className="flex-shrink-0 space-y-2">
              {matchTier === 'none' && (
                // Picking by hand among the similar items: the way back to queueing the copied one
                <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-muted/30 py-1.5 pl-3 pr-1.5">
                  <div className="flex items-center gap-2">
                    <Hourglass className="size-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{t('shortcut.notInList')}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedItem(null);
                      setMatchingItems([]);
                    }}
                    className="text-xs h-7 px-3"
                  >
                    {t('form.queueItem')}
                  </Button>
                </div>
              )}
              {selectedItem && (
                <ListingFormFields
                  form={form}
                  selectedItem={selectedItem}
                  currentListings={currentListings}
                  submitLoading={submitLoading}
                  onSubmit={handleSubmit}
                />
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
            className="flex-1 flex flex-col min-h-0 px-3 pt-2.5 pb-3">
            <MyListingsTab onTotalCountChange={setTotalListingsCount}
              focus={focusListing} />
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
