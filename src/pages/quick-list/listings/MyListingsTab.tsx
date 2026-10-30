import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronsUp,
  CircleAlert,
  LayoutList,
  Loader2,
  Rows3,
  RotateCw,
  Search,
  SearchX,
  Store,
  X as XIcon,
} from 'lucide-react';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { subscribeListingDeleted } from '@/hooks/pd2website/listing-events';
import { useOptions } from '@/hooks/useOptions';
import { buildGetAllUserMarketListingsQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { TRADE_LISTINGS_LIMIT } from '@/pages/delist/trade-match';
import { useDealIndicators } from '@/pages/market/enrich/useDealIndicators';
import { useNow } from '@/pages/market/enrich/useNow';
import { indexListingOffers } from '@/pages/market/lib/listing-offers';
import { PD2Website } from '@/common/constants';
import { openUrl } from '@/lib/browser-opener';
import { trackEvent, trackMeasurement } from '@/lib/telemetry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { showToast } from '@/overlay';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import EmptyState from '../components/EmptyState';
import {
  canBump,
  DEFAULT_LISTINGS_SORT,
  DEFAULT_SORT_DIR,
  listingPriceFields,
  type ListingContext,
  type ListingsFilter,
  type ListingsSortKey,
  matchesFilter,
  receivedOffers,
  SORT_KEYS,
  sortListings,
} from './my-listings';
import { ListingCard, ListingRow, ListingRowsHeader, type ListingViewProps } from './ListingViews';
import type { ListingActionHandlers } from './ListingPieces';

// "Bump All" success flash (mirrors the pd2trader.com/overlay demo): keep in sync with --animate-bump-flash.
const BUMP_FLASH_STAGGER_MS = 210;
const BUMP_FLASH_SPREAD_MS = 2500;
const BUMP_FLASH_DURATION_MS = 1050;

const chip =
  'inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs tabular-nums outline-none transition-colors duration-(--dur-fast) focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50';

interface MyListingsTabProps {
  /** The listing count changed (the List tab's 50-listing check and the tab chip). */
  onTotalCountChange?: (count: number) => void;
}

/**
 * Manage tab: every listing of the signed-in user in the current realm (PD2 caps it at 50), as big cards or
 * compact rows, sorted and filtered client-side. The item tooltip shows on hovering the art or the name.
 */
const MyListingsTab: React.FC<MyListingsTabProps> = ({ onTotalCountChange }) => {
  const {
    getMarketListings,
    updateMarketListing,
    updateItemByHash,
    deleteMarketListing,
    bumpAllMarketListings,
    authData,
    incomingOffers,
  } = usePd2Website();
  const { settings, updateSettings } = useOptions();
  const { t } = useTranslation(['quickList', 'common']);
  const now = useNow(30_000);

  const [listings, setListings] = useState<MarketListingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ListingsFilter | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bumpingId, setBumpingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bumpingAll, setBumpingAll] = useState(false);
  const [bumpWave, setBumpWave] = useState<{ key: number; ids: Set<string> }>({ key: 0, ids: new Set() });

  const view = settings?.myListingsView ?? 'cards';
  const sort = settings?.myListingsSort ?? DEFAULT_LISTINGS_SORT;
  const userId = authData?.user?._id;
  const hardcore = settings?.mode === 'hardcore';
  const ladder = settings?.ladder === 'ladder';

  const onCountRef = useRef(onTotalCountChange);
  onCountRef.current = onTotalCountChange;
  useEffect(() => {
    if (listings) onCountRef.current?.(listings.length);
  }, [listings]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const started = performance.now();
    try {
      const result = await getMarketListings(
        buildGetAllUserMarketListingsQuery(userId, hardcore, ladder, TRADE_LISTINGS_LIMIT, 0),
      );
      setListings(result.data);
      trackMeasurement(
        'listed_items_fetch',
        { duration_ms: performance.now() - started, returned_items: result.data.length },
        { outcome: 'success' },
      );
    } catch (err) {
      trackMeasurement('listed_items_fetch', { duration_ms: performance.now() - started }, { outcome: 'error' });
      console.error('Failed to fetch market listings:', err);
      setError(err instanceof Error ? err.message : t('listed.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [userId, hardcore, ladder, getMarketListings, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // A listing removed anywhere (this tab, Ctrl+U, auto-delist, chat) leaves the list
  useEffect(() => subscribeListingDeleted((id) => setListings((prev) => prev && prev.filter((l) => l._id !== id))), []);

  const offers = useMemo(() => indexListingOffers([], incomingOffers ?? []), [incomingOffers]);
  const deals = useDealIndicators(listings ?? []);
  const ctx: ListingContext = useMemo(() => ({ now, offers, deals }), [now, offers, deals]);

  const searched = useMemo(() => {
    if (!listings) return [];
    const q = query.trim();
    if (!q) return listings;
    const fuse = new Fuse(listings, {
      keys: ['item.name', 'item.base.name', 'price', { name: 'hr', getFn: (l) => String(l.hr_price ?? '') }],
      threshold: 0.4,
    });
    return fuse.search(q).map((r) => r.item);
  }, [listings, query]);
  const shown = useMemo(
    () =>
      sortListings(
        searched.filter((l) => matchesFilter(l, filter, ctx)),
        sort,
        ctx,
      ),
    [searched, filter, sort, ctx],
  );
  const readyIds = useMemo(() => (listings ?? []).filter((l) => canBump(l, now)).map((l) => l._id), [listings, now]);
  const offerCount = useMemo(() => (listings ?? []).filter((l) => receivedOffers(l, ctx) > 0).length, [listings, ctx]);

  const patchListing = (id: string, patch: Partial<MarketListingEntry>) =>
    setListings((prev) => prev && prev.map((l) => (l._id === id ? { ...l, ...patch } : l)));

  const handlers: ListingActionHandlers = {
    onBump: async (listing) => {
      setBumpingId(listing._id);
      const started = performance.now();
      try {
        const bumped_at = new Date().toISOString();
        await updateMarketListing(listing._id, { bumped_at });
        updateItemByHash(listing.item.hash, { bumped_at });
        patchListing(listing._id, { bumped_at });
        trackMeasurement(
          'listed_items_bump',
          { duration_ms: performance.now() - started },
          { outcome: 'success', source: 'listed_items_tab' },
        );
        showToast(t('toasts.bumpSuccess'));
      } catch (err) {
        trackMeasurement(
          'listed_items_bump',
          { duration_ms: performance.now() - started },
          { outcome: 'error', source: 'listed_items_tab' },
        );
        console.error('Failed to bump item:', err);
        showToast(t('toasts.bumpFailed'));
      } finally {
        setBumpingId(null);
      }
    },
    onEdit: (listing) => {
      setEditingId(listing._id);
      trackEvent('listed_items_edit_started');
    },
    onDelete: async (listing) => {
      setDeletingId(listing._id);
      const started = performance.now();
      try {
        // The row leaves through the listing-deleted subscription, like listings removed elsewhere
        await deleteMarketListing(listing._id);
        trackMeasurement('listed_items_delete', { duration_ms: performance.now() - started }, { outcome: 'success' });
        showToast(t('toasts.removedMarketListing', { name: listing.item.name }));
      } catch (err) {
        trackMeasurement('listed_items_delete', { duration_ms: performance.now() - started }, { outcome: 'error' });
        console.error('Failed to delete listing:', err);
        showToast(t('toasts.deleteFailed'));
      } finally {
        setDeletingId(null);
      }
    },
    onOpen: (listing) => {
      trackEvent('listed_items_trade_url_opened');
      void openUrl(`${PD2Website.Website}/market/listing/${listing._id}`);
    },
  };

  const saveEdit = async (listing: MarketListingEntry, price: string, note: string) => {
    const started = performance.now();
    const fields = listingPriceFields(price, note);
    try {
      await updateMarketListing(listing._id, fields);
      updateItemByHash(listing.item.hash, fields);
      patchListing(listing._id, fields);
      setEditingId(null);
      trackMeasurement(
        'listed_items_edit_save',
        { duration_ms: performance.now() - started, price_hr: fields.hr_price || undefined },
        { outcome: 'success', listing_type: fields.hr_price > 0 ? 'exact' : 'note' },
      );
      showToast(t('toasts.listingUpdated'));
    } catch (err) {
      trackMeasurement('listed_items_edit_save', { duration_ms: performance.now() - started }, { outcome: 'error' });
      console.error('Failed to update listing:', err);
      showToast(t('toasts.updateFailed'));
    }
  };

  const bumpAll = async () => {
    if (!userId) {
      showToast(t('toasts.bumpAllNotAuthenticated'));
      return;
    }
    const ids = new Set(readyIds);
    setBumpingAll(true);
    const started = performance.now();
    try {
      await bumpAllMarketListings(userId);
      // PD2 bumps only the listings off cooldown
      const bumped_at = new Date().toISOString();
      setListings((prev) => prev && prev.map((l) => (ids.has(l._id) ? { ...l, bumped_at } : l)));
      const key = Date.now();
      setBumpWave({ key, ids });
      setTimeout(
        () => setBumpWave((w) => (w.key === key ? { key: 0, ids: new Set() } : w)),
        BUMP_FLASH_SPREAD_MS + BUMP_FLASH_DURATION_MS,
      );
      trackMeasurement('listed_items_bump_all', { duration_ms: performance.now() - started }, { outcome: 'success' });
      showToast(t('toasts.bumpAllSuccess'));
    } catch (err) {
      trackMeasurement('listed_items_bump_all', { duration_ms: performance.now() - started }, { outcome: 'error' });
      console.error('Failed to bump all items:', err);
      showToast(t('toasts.bumpAllFailed'));
    } finally {
      setBumpingAll(false);
    }
  };

  const setSortKey = (key: ListingsSortKey) => updateSettings({ myListingsSort: { key, dir: DEFAULT_SORT_DIR[key] } });
  const flipSort = () => updateSettings({ myListingsSort: { ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' } });
  const sortByColumn = (key: ListingsSortKey) => (key === sort.key ? flipSort() : setSortKey(key));

  if (!authData) {
    return (
      <EmptyState icon={<Store />}
        title={t('listed.notSignedInTitle')}>
        {t('listed.notSignedInDescription')}
      </EmptyState>
    );
  }
  if (error && !listings) {
    return (
      <EmptyState icon={<CircleAlert />}
        title={t('listed.loadError')}>
        <p className="mb-4 text-destructive">{error}</p>
        <Button onClick={() => void load()}>
          <RotateCw className="size-4" />
          {t('common:actions.retry')}
        </Button>
      </EmptyState>
    );
  }

  const waveIndex = new Map(shown.filter((l) => bumpWave.ids.has(l._id)).map((l, i) => [l._id, i]));
  const stagger = Math.min(BUMP_FLASH_STAGGER_MS, BUMP_FLASH_SPREAD_MS / Math.max(1, waveIndex.size));
  const viewProps = (listing: MarketListingEntry): ListingViewProps => ({
    listing,
    now,
    deal: deals.get(listing._id),
    offers: offers.get(listing._id),
    editing: editingId === listing._id,
    bumping: bumpingId === listing._id,
    deleting: deletingId === listing._id,
    flashKey: waveIndex.has(listing._id) ? bumpWave.key : 0,
    flashDelay: (waveIndex.get(listing._id) ?? 0) * stagger,
    handlers,
    onSaveEdit: saveEdit,
    onCancelEdit: () => setEditingId(null),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) {
                e.preventDefault();
                setQuery('');
              }
            }}
            placeholder={t('myListings.searchPlaceholder', { count: listings?.length ?? 0 })}
            aria-label={t('listed.searchLabel')}
            className="h-7 pr-7 pl-8 text-xs"
          />
          {query && (
            <button
              type="button"
              aria-label={t('listed.clearSearch')}
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-1.5 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <XIcon className="size-3" />
            </button>
          )}
        </div>
        <Select value={sort.key}
          onValueChange={(v) => setSortKey(v as ListingsSortKey)}>
          <SelectTrigger className="h-7 w-40 text-xs"
            aria-label={t('myListings.sort.label')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_KEYS.map((key) => (
              <SelectItem key={key}
                value={key}
                className="text-xs">
                {t(`myListings.sort.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sort.key !== 'attention' && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="size-7 p-0"
                onClick={flipSort}
                aria-label={t('myListings.sort.reverse')}
              >
                {sort.dir === 'asc' ? (
                  <ArrowUpNarrowWide className="size-3.5" />
                ) : (
                  <ArrowDownWideNarrow className="size-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('myListings.sort.reverse')}</TooltipContent>
          </Tooltip>
        )}
        <div
          className="flex h-7 shrink-0 items-center rounded-md border border-border p-0.5"
          role="group"
          aria-label={t('myListings.view.label')}
        >
          {(['cards', 'rows'] as const).map((v) => (
            <Tooltip key={v}
              delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-pressed={view === v}
                  aria-label={t(`myListings.view.${v}`)}
                  onClick={() => updateSettings({ myListingsView: v })}
                  className={cn(
                    'inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-(--dur-fast) [&_svg]:size-3.5',
                    view === v ? 'bg-accent text-foreground' : 'hover:text-foreground',
                  )}
                >
                  {v === 'cards' ? <LayoutList /> : <Rows3 />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{t(`myListings.view.${v}`)}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-pressed={filter === 'ready'}
          onClick={() => setFilter((f) => (f === 'ready' ? null : 'ready'))}
          disabled={readyIds.length === 0 && filter !== 'ready'}
          className={cn(
            chip,
            filter === 'ready'
              ? 'border-success/60 bg-success/15 text-success'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          {t('myListings.filter.ready', { count: readyIds.length })}
        </button>
        <button
          type="button"
          aria-pressed={filter === 'offers'}
          onClick={() => setFilter((f) => (f === 'offers' ? null : 'offers'))}
          disabled={offerCount === 0 && filter !== 'offers'}
          className={cn(
            chip,
            filter === 'offers'
              ? 'border-primary/60 bg-primary/15 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          {t('myListings.filter.offers', { count: offerCount })}
        </button>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {t('myListings.slots', { count: listings?.length ?? 0, max: 50 })}
        </span>
        <Button
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => void bumpAll()}
          disabled={bumpingAll || readyIds.length === 0}
        >
          {bumpingAll ? <Loader2 className="size-3 animate-spin" /> : <ChevronsUp className="size-3.5" />}
          {readyIds.length > 0 ? t('myListings.bumpReady', { count: readyIds.length }) : t('myListings.nothingToBump')}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {!listings ? (
          <div className="flex flex-col gap-2"
            aria-busy>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i}
                className={view === 'cards' ? 'h-[92px] w-full' : 'h-9 w-full'} />
            ))}
          </div>
        ) : shown.length === 0 ? (
          query || filter ? (
            <EmptyState icon={<SearchX />}
              title={t('listed.noMatches')}
              className="p-6">
              {query ? t('listed.noMatchesFor', { query }) : t('myListings.noneForFilter')}
            </EmptyState>
          ) : (
            <EmptyState icon={<Store />}
              title={t('listed.noActiveTitle')}>
              {t('listed.noActiveDescription')}
            </EmptyState>
          )
        ) : view === 'cards' ? (
          <div className="flex flex-col gap-1.5 p-px">
            {shown.map((l) => (
              <ListingCard key={l._id}
                {...viewProps(l)} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card/40"
            role="table">
            <ListingRowsHeader sort={sort}
              onSort={sortByColumn} />
            {shown.map((l) => (
              <ListingRow key={l._id}
                {...viewProps(l)} />
            ))}
          </div>
        )}
        {loading && listings && (
          <div className="flex justify-center py-2"
            role="status">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MyListingsTab;
