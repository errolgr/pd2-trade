import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { AlertTriangle, HandCoins, Heart, LayoutGrid, List, LogIn, RefreshCw, SearchX, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn, slideInRight, springSnappy } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tip, TooltipProvider } from '@/components/ui/tooltip';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { EmptyState } from '@/pages/currency/components/StatePanel';
import { showToast, useOverlay, usePanel } from '@/overlay';
import { useSignIn } from '@/hooks/useSignIn';
import { useOptions } from '@/hooks/useOptions';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useListingPresence } from '@/hooks/useListingPresence';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { useDealIndicators } from '@/pages/market/enrich/useDealIndicators';
import { type MarketViewMode, useMarketStore } from '@/pages/market/store/useMarketStore';
import { defaultFilters, mergeFilters, upgradeFilters, withSource } from './lib/defaults';
import { applyPreset, BUILT_IN_PRESETS } from './lib/presets';
import type { MarketFilters, MarketTab, ScoredListing, StatPreset } from './lib/types';
import { indexListingOffers } from './lib/listing-offers';
import { scoreListings } from './lib/search';
import { pseudoIdOf } from './lib/stats';
import { withRowPresence } from './lib/presence';
import { type MarketSearch, searchCountText, useMarketSearch } from './hooks/useMarketSearch';
import { type MarketFavorites, useMarketFavorites } from './hooks/useMarketFavorites';
import { type Relaxation, useRelaxations } from './hooks/useRelaxations';
import type { ActiveFilter } from './lib/active-filters';
import { useActiveFilterText, useFilterHighlight } from './components/active-filter-text';
import { FilterHighlightContext } from './components/controls';
import { RelaxationChips, relaxationChips } from './components/RelaxationChips';
import { FilterSidebar } from './components/FilterSidebar';
import { UnsearchedNotice } from './components/SearchControls';
import { ItemNameSearch } from './components/ItemNameSearch';
import { PresenceAsOf, ResultsList } from './components/ResultsList';
import type { LoadMoreState } from './components/card-parts';
import { ResultsFrame } from './components/ResultsFrame';
import { type CardCommand, ResultCards } from './components/ResultCards';
import { useCardCommand } from './hooks/useCardCommand';
import { ListingDetail } from './components/ListingDetail';
import { SavedSearches } from './components/SavedSearches';
import { type ModActionsApi, ModActionsProvider } from './components/ModMenu';
import { mergeStatFilters } from './lib/mod-keys';
import { WatchButton } from './alerts/WatchButton';
import { OpenOnSiteButton } from './components/OpenOnSiteButton';
import { lookupListing } from './alerts/listing-lookup';
import { useEnterTracker } from './components/EnterOnce';
import { useLiveAlertGlow } from './hooks/useLiveAlertGlow';
import { useSearchDefaults } from './hooks/useSearchDefaults';
import { useTranslation } from '@/i18n';
import { MatchesMedian } from '@/pages/price-check/components/MatchesMedian';
import { wtbBoardFilters, wtbSearchBody, wtbSearchFilters, type WtbRequest } from './lib/wtb';
import { MarketApiError } from './alerts/market-api';
import { bumpWtbRequest, searchWtbRequests, updateWtbRequest, type WtbPatch } from './alerts/wtb-api';
import { WantToBuyButton } from './wtb/WantToBuyButton';
import { markWtbCalloutSeen, WtbNewCallout } from './wtb/WtbNewCallout';
import { WtbPostDrawer, type WtbPostDraft } from './wtb/WtbPostDrawer';
import { useWatchWtbPrompt } from './wtb/WatchWtbPrompt';
import { type WtbSelection, WtbRequestDrawer } from './wtb/WtbRequestDrawer';
import { WantedResults, wtbSelectionOf } from './wtb/WantedResults';
import type { WtbOwnerActions } from './wtb/WtbOwnerActions';
import { bumpFailure } from './wtb/wtb-bump';
import { selectionContactItem } from './wtb/wtb-responses';
import { useMyWtbRequests, useStashWtbMatches, useWtbOverlap, useWtbSearch } from './wtb/useWtbData';
import { DemandBar } from './wtb/DemandBar';
import { demandBarModel, demandBodies } from './wtb/wtb-demand';
import { useNow } from './enrich/useNow';
import { useWtbWhisper } from './wtb/useWtbWhisper';
import { useEconomyData } from '@/pages/price-check/hooks/useEconomyData';
import { encodeItemForQuickList } from '@/lib/item-utils';
import { listPriceFor, MAX_OPEN_WTB_PER_USER, wtbDaysLeft } from './lib/wtb';
import { trackEvent } from '@/lib/telemetry';

/** The market's tabs, in order. */
const TABS: readonly MarketTab[] = ['search', 'favorites', 'saved'];
const TAB_LABEL_KEYS = {
  search: 'page.tabs.search',
  favorites: 'page.tabs.favorites',
  saved: 'page.tabs.saved',
} as const;

/** Card hotkeys (lowercase key → action on the selected card). */
const CARD_HOTKEYS: Record<string, CardCommand['action']> = { o: 'offer', w: 'whisper', f: 'favorite' };

/** Typing into a field: the panel's shortcuts stand aside. */
const isTextEntry = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

const SKELETON_ROWS = 8;
const SKELETON_CARDS = 3;

/** `market` panel: filters | results | detail, with Favorites and Saved searches tabs. */
const MarketBrowserPage: React.FC = () => {
  const { t } = useTranslation('market');
  const { payload, payloadVersion, close, visible } = usePanel<'market'>();
  const { openSignIn } = useSignIn();
  const { settings, isLoading: settingsLoading } = useOptions();
  const { marketApi, outgoingOffers, hiddenOutgoingOffers, incomingOffers, authData } = usePd2Website();
  const store = useMarketStore();
  const { viewMode } = store;
  const cards = viewMode === 'cards';
  const signedIn = !!settings?.pd2Token;
  const mode = useMemo(
    () => ({ hardcore: settings?.mode === 'hardcore', ladder: settings?.ladder !== 'non-ladder' }),
    [settings?.mode, settings?.ladder],
  );
  const searchDefaults = useSearchDefaults();

  const [tab, setTab] = useState<MarketTab>('search');
  /** The filters as the sidebar shows them. */
  const [filters, setDraftFilters] = useState<MarketFilters | null>(null);
  /**
   * The filters searches run with: `filters` itself while Auto search is on; with it off, `filters` as of the last
   * Search, so editing them sends nothing until the user asks.
   */
  const [searchFilters, setSearchFilters] = useState<MarketFilters | null>(null);
  /** Filter edits made since the last search (Auto search off): the Search button's count. */
  const [unsearchedEdits, setUnsearchedEdits] = useState(0);
  const { autoSearch } = store;
  /** Show these filters and search them now: opening a saved search, a price check, a seller, a buy request… */
  const setFilters = useCallback((next: MarketFilters) => {
    setDraftFilters(next);
    setSearchFilters(next);
    setUnsearchedEdits(0);
  }, []);
  /**
   * A filter the user changed in the sidebar (or the name search, a preset, a mod menu): searched now with Auto
   * search on, else held for Search. Switching Live / Archive / Wanted swaps the whole results pane, so it searches.
   */
  const editFilters = useCallback(
    (next: MarketFilters) => {
      if (autoSearch || !filters || next.source !== filters.source) {
        setFilters(next);
        return;
      }
      setDraftFilters(next);
      setUnsearchedEdits((n) => n + 1);
    },
    [autoSearch, filters, setFilters],
  );
  /** Auto search off and the sidebar differs from what the results were searched with. */
  const unsearched =
    !autoSearch && !!filters && filters !== searchFilters && JSON.stringify(filters) !== JSON.stringify(searchFilters);
  /** The sidebar's Search (and Ctrl+Enter): search the filters as they are now. */
  const runSearch = () => {
    if (filters && unsearched) setFilters(filters);
  };
  // Auto search turned back on (the sidebar's bolt or Settings › Market): what the sidebar shows is searched, like
  // any other change
  const autoSearchWas = useRef(autoSearch);
  useEffect(() => {
    const turnedOn = autoSearch && !autoSearchWas.current;
    autoSearchWas.current = autoSearch;
    if (turnedOn && filters && filters !== searchFilters) setFilters(filters);
  }, [autoSearch, filters, searchFilters, setFilters]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  /** A listing shown in the detail pane that is not in the list (picked from the seller card). */
  const [extraRow, setExtraRow] = useState<ScoredListing | null>(null);
  /** focusListingId of the last open, until the fresh search for it lands (`searched`: it has started). */
  const [pendingFocus, setPendingFocus] = useState<{ id: string; searched: boolean; searchName?: string } | null>(null);
  /** An alert's listing that was not in the refreshed results: fetched from pd2trader.com for the detail pane. */
  const [missingFocus, setMissingFocus] = useState<{ id: string; searchName?: string } | null>(null);
  /** Cards view: that fetched alert listing, pinned above the results ("From alert: <search>"). */
  const [pinned, setPinned] = useState<{ row: ScoredListing; searchName?: string } | null>(null);
  const statSearchRef = useRef<HTMLInputElement>(null);
  const nameSearchRef = useRef<HTMLInputElement>(null);
  /** Search's right pane: post a buy request for the filters (or edit one of the user's). */
  const [wtbPost, setWtbPost] = useState<{ editing: WtbRequest | null } | null>(null);
  /** A new request's unsaved choices (offer, Must/Nice, expiry…): restored when Want to buy reopens. */
  const postDraft = useRef<WtbPostDraft | null>(null);
  const keepPostDraft = useCallback((draft: WtbPostDraft | null) => {
    postDraft.current = draft;
  }, []);
  /** Wanted source: the request open in the drawer, and the one the keyboard is on. */
  const [wtbSelection, setWtbSelection] = useState<WtbSelection | null>(null);
  const [wtbSelectedId, setWtbSelectedId] = useState<string | null>(null);
  /** The request an owner action (bump, pause…) runs on. */
  const [wtbBusyId, setWtbBusyId] = useState<string | null>(null);

  // keepMounted: nothing is fetched until the panel was first shown
  const [activated, setActivated] = useState(false);
  if (visible && !activated) setActivated(true);

  const token = settings?.pd2Token || null;
  const userId = authData?.user?._id ?? null;
  /** The account sellers whisper about the user's buy requests. */
  const whisperTo = settings?.account || authData?.user?.game?.accounts?.[0] || authData?.user?.username || null;
  const mine = useMyWtbRequests(activated && signedIn, token);
  const { openPanel } = useOverlay();
  const { whisper } = useWtbWhisper('market');

  // Apply openPanel('market', payload) once the saved state (saved searches, last filters) and the settings (the
  // user's search defaults) are loaded. Adjusted during render, like the chat panel's payload handling.
  const [handledVersion, setHandledVersion] = useState(-1);
  /** A response's View request: the request to open (the user's own once Mine has loaded, else from the board). */
  const [pendingRequest, setPendingRequest] = useState<string | null>(null);
  if (store.loaded && !settingsLoading && handledVersion !== payloadVersion) {
    setHandledVersion(payloadVersion);
    const saved = payload?.savedSearchId ? store.savedSearches.find((s) => s.id === payload.savedSearchId) : undefined;
    let next: MarketFilters | null = null;
    if (saved) next = upgradeFilters(saved.filters);
    else if (payload?.filters)
      next = upgradeFilters(mergeFilters(defaultFilters(mode, searchDefaults), payload.filters));
    else if (!filters) next = upgradeFilters(store.lastFilters ?? defaultFilters(mode, searchDefaults));
    if (next) {
      setFilters(next);
      setSelectedId(null);
      setDetailOpen(false);
      setExtraRow(null);
      setPinned(null);
    }
    if (payload?.tab) setTab(payload.tab);
    else if (saved || payload?.filters || payload?.wanted || payload?.requestId) setTab('search');
    if (payload?.wanted) {
      // The requests asking for this kind of item, the one that matched open in the drawer
      const { match, itemText, item } = payload.wanted;
      setFilters(wtbBoardFilters(match.request, defaultFilters(match.request.filters, searchDefaults)));
      setWtbSelectedId(match.request.id);
      setWtbSelection({ request: match.request, niceToHave: match.niceToHave, itemText, listingItem: item });
      setWtbPost(null);
    }
    // A response's View request: opened once the user's own requests are in (or looked up on the board)
    setPendingRequest(payload?.requestId ?? null);
    if (payload?.requestId) setWtbPost(null);
    setPendingFocus(
      payload?.focusListingId ? { id: payload.focusListingId, searched: false, searchName: saved?.name } : null,
    );
  }
  useEffect(() => {
    if (!pendingRequest || (signedIn && mine.status !== 'ready' && mine.status !== 'error')) return;
    /** On the Wanted source (Mine only for the user's own), selected and open in the drawer. */
    const show = (request: WtbRequest, own: boolean) => {
      const board = wtbBoardFilters(request, defaultFilters(request.filters, searchDefaults));
      setFilters(own ? { ...board, wanted: { ...board.wanted, mine: true } } : board);
      setWtbSelectedId(request.id);
      setWtbSelection({ request });
    };
    const own = mine.items.find((r) => r.id === pendingRequest);
    if (own) {
      setPendingRequest(null);
      show(own, true);
      return;
    }
    let cancelled = false;
    const gone = () => showToast({ title: t('wtb.response.requestGone'), variant: 'warning' });
    searchWtbRequests(
      { ladder: mode.ladder, hardcore: mode.hardcore, ids: [pendingRequest], limit: 1 },
      { token },
    ).then(
      (page) => {
        if (cancelled) return;
        setPendingRequest(null);
        if (page.items[0]) show(page.items[0], false);
        else gone();
      },
      () => {
        if (cancelled) return;
        setPendingRequest(null);
        gone();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [pendingRequest, signedIn, mine.status, mine.items, mode, token, searchDefaults, t, setFilters]);

  /** Search on the Wanted source: buy requests instead of listings (the market search doesn't run). */
  const wantedSource = tab === 'search' && filters?.source === 'wanted';
  const search = useMarketSearch(
    marketApi ?? null,
    activated && searchFilters?.source !== 'wanted' ? searchFilters : null,
    {
      signedIn,
      pageSize: settings?.marketPageSize,
    },
  );

  // Wanted: Fits my stash (the stash run through /match in the board's realm), the price check's rune prices for
  // the lowest offer. Like the listing search, it runs on the searched filters (Auto search off: as of Search).
  const boardRealm = useMemo(
    () => ({ ladder: searchFilters?.ladder ?? mode.ladder, hardcore: searchFilters?.hardcore ?? mode.hardcore }),
    [searchFilters?.ladder, searchFilters?.hardcore, mode],
  );
  const stash = useStashWtbMatches(activated && signedIn && wantedSource, boardRealm, token);
  const { calculatedRuneValues } = useEconomyData();
  const wantedFilters = wantedSource && searchFilters ? (searchFilters.wanted ?? {}) : null;
  const fitsStash = !!token && !!wantedFilters?.fitsStash;
  const wantedBody = useMemo(() => {
    if (!wantedSource || !searchFilters) return null;
    // Fits my stash waits for the stash; signed out, Mine only and Fits my stash don't apply
    if (fitsStash && stash.status !== 'ready' && stash.status !== 'error') return null;
    const scoped: MarketFilters = token
      ? searchFilters
      : { ...searchFilters, wanted: { ...searchFilters.wanted, mine: false, fitsStash: false } };
    return wtbSearchBody(scoped, {
      stashIds: fitsStash ? [...stash.byRequest.keys()] : null,
      runeValues: calculatedRuneValues,
    });
  }, [wantedSource, searchFilters, fitsStash, stash.status, stash.byRequest, token, calculatedRuneValues]);
  const wanted = useWtbSearch(wantedBody, token);
  const wantedIds = useMemo(() => wanted.items.map((r) => r.id), [wanted.items]);
  const wantedEnter = useEnterTracker(wantedBody && JSON.stringify(wantedBody), wantedIds);

  // Live / Sold archive: the open buy requests that could take what the search found (the demand bar), asked
  // when a search naming an item ran (stats alone are anything's demand); on Live also the user's own, for
  // "including yours"
  const now = useNow();
  const ran = tab === 'search' ? search.ranFilters : null;
  const demandQuery = useMemo(() => demandBodies(ran, !!token), [ran, token]);
  const demandPage = useWtbOverlap(demandQuery?.body ?? null, token);
  const demandMine = useWtbOverlap(demandQuery?.mineBody ?? null, token);
  const demand =
    ran && demandQuery
      ? demandBarModel(ran.source, demandPage, {
          mine: demandMine?.items ?? null,
          priceStats: search.priceStats ?? null,
          now,
        })
      : null;
  const favorites = useMarketFavorites(marketApi ?? null, signedIn && activated);
  // A search that found nothing: count what dropping each of its filters would find
  const relaxations = useRelaxations(
    marketApi?.searchListings ?? null,
    tab === 'search' && search.status === 'ready' && search.total === 0 ? search.filters : null,
    searchDefaults,
  );
  // The suggestion the pointer is on: its filter is marked in the sidebar (only while that suggestion is shown)
  const [hoveredRelax, setHoveredRelax] = useState<string | null>(null);
  const filterHighlight = useFilterHighlight();
  const hoveredFilter = relaxations?.find((r) => r.id === hoveredRelax)?.value;
  const highlight = useMemo(
    () => (hoveredFilter ? filterHighlight(hoveredFilter.spec) : null),
    [hoveredFilter, filterHighlight],
  );

  // Remember the last search that actually ran (not per keystroke / re-rank: each call writes market-prefs.json);
  // on Wanted, the filters its results came for, so the panel reopens on Wanted
  const { setLastFilters } = store;
  useEffect(() => {
    if (search.ranFilters) setLastFilters(search.ranFilters);
  }, [search.ranFilters, setLastFilters]);
  const wantedRan = wanted.status === 'ready' ? wantedBody : null;
  const filtersRef = useRef(searchFilters);
  filtersRef.current = searchFilters;
  useEffect(() => {
    if (wantedRan && filtersRef.current?.source === 'wanted') setLastFilters(filtersRef.current);
  }, [wantedRan, setLastFilters]);

  const favoriteIds = useMemo(() => new Set(favorites.favorites.map((f) => f.listing_id)), [favorites.favorites]);
  const { toggle: toggleFavoriteAsync } = favorites;
  const toggleFavorite = useCallback((l: MarketListingEntry) => void toggleFavoriteAsync(l), [toggleFavoriteAsync]);
  const favoriteRows = useMemo(
    () =>
      filters
        ? scoreListings(
            favorites.favorites.flatMap((f) => (f.listing ? [f.listing] : [])),
            filters,
          )
        : [],
    [favorites.favorites, filters],
  );

  // Seller presence pops in on search results: they render as the market service sent them, then PD2's current
  // last-seen times (live listings only; asked with the user's token) merge in. Favorites come from PD2 already.
  const presenceIds = useMemo(
    () => search.items.filter((r) => !r.status || r.status === 'active').map((r) => r.listing._id),
    [search.items],
  );
  const presence = useListingPresence(signedIn ? (marketApi ?? null) : null, presenceIds);
  const searchRows = useMemo(() => withRowPresence(search.items, presence), [search.items, presence]);
  const rows = useMemo(
    () => (tab === 'favorites' ? favoriteRows : tab === 'search' ? searchRows : []),
    [tab, favoriteRows, searchRows],
  );
  const listings = useMemo(() => rows.map((r) => r.listing), [rows]);
  const deals = useDealIndicators(listings);
  // Offers hidden from the chat's deals still exist on PD2: they show here too
  const offers = useMemo(
    () => indexListingOffers([...outgoingOffers, ...hiddenOutgoingOffers], incomingOffers),
    [outgoingOffers, hiddenOutgoingOffers, incomingOffers],
  );

  // focusListingId (alert toasts): refetch (the cache predates the new listing), then select it if present
  const { refresh } = search;
  const focusRequested = !!pendingFocus && !pendingFocus.searched;
  useEffect(() => {
    if (focusRequested) refresh();
  }, [focusRequested, refresh]);
  // Adjusted during render: mark the refetch as started, then select the listing once it landed
  if (pendingFocus) {
    if (search.status === 'loading') {
      if (!pendingFocus.searched) setPendingFocus({ ...pendingFocus, searched: true });
    } else if (search.status === 'error' || search.status === 'auth') {
      setPendingFocus(null);
    } else if (pendingFocus.searched && searchFilters && search.filters === searchFilters) {
      setPendingFocus(null);
      if (search.items.some((r) => r.listing._id === pendingFocus.id)) {
        setSelectedId(pendingFocus.id);
        // Cards are self-contained: just select (and scroll to) it
        setDetailOpen(viewMode === 'rows');
        setExtraRow(null);
      } else {
        // An alert's listing outside the results (another page, or sold since): show it on its own
        setMissingFocus({ id: pendingFocus.id, searchName: pendingFocus.searchName });
      }
    }
  }
  useEffect(() => {
    if (!missingFocus || !filters) return;
    let cancelled = false;
    // Shared with the alert toast: usually already looked up when the toast showed
    lookupListing(missingFocus.id)
      .then((detail) => {
        if (cancelled || !detail) return;
        const { listing } = detail;
        const [row] = scoreListings([listing], filters);
        setSelectedId(listing._id);
        if (viewMode === 'cards') {
          // Cards hide the detail pane: pin it as the first card instead
          setPinned({ row, searchName: missingFocus.searchName });
          setExtraRow(null);
        } else {
          setExtraRow(row);
          setDetailOpen(true);
        }
      })
      .catch((error) => console.warn('[market] alert listing lookup failed:', error))
      .finally(() => !cancelled && setMissingFocus(null));
    return () => {
      cancelled = true;
    };
  }, [missingFocus, filters, viewMode]);

  /** Cards view of the search tab: the pinned alert listing first, then the results without it. */
  const cardRows = useMemo(() => {
    if (!pinned || tab !== 'search') return rows;
    return [pinned.row, ...rows.filter((r) => r.listing._id !== pinned.row.listing._id)];
  }, [pinned, rows, tab]);
  const dismissPinned = useCallback(() => setPinned(null), []);

  // Entrance of a fresh result set (a search ran, the favorites loaded); appended pages don't change the key
  const resultKey = tab === 'search' ? search.ranFilters : tab === 'favorites' ? favorites.favorites : null;
  const shownIds = useMemo(() => (cards ? cardRows : rows).map((r) => r.listing._id), [cards, cardRows, rows]);
  const enter = useEnterTracker(resultKey, shownIds);
  /** Cards that just matched a live alert of the current (watched) search: a one-time soft glow. */
  const glowIds = useLiveAlertGlow(filters, store.savedSearches);

  const pseudoKeys = useMemo(
    () =>
      (filters?.stats ?? []).filter((s) => s.enabled && !s.not && s.kind === 'pseudo').map((s) => pseudoIdOf(s.key)),
    [filters?.stats],
  );
  const statKeys = useMemo(
    () => (filters?.stats ?? []).filter((s) => s.enabled && !s.not && s.kind === 'mod').map((s) => s.key),
    [filters?.stats],
  );
  /** Archive results (ended listings): no offer/whisper (the item is gone). */
  const archived = tab === 'search' && filters?.source === 'archive';

  const detailRow =
    (detailOpen &&
      selectedId &&
      (rows.find((r) => r.listing._id === selectedId) ?? (extraRow?.listing._id === selectedId ? extraRow : null))) ||
    null;

  /** Search's buy request pane, and the Wanted source's request drawer, take the detail pane's place. */
  const postOpen = tab === 'search' && !!wtbPost && !archived;
  const requestOpen = wantedSource && !!wtbSelection;
  // Buy requests in use (posting one, the Wanted source): the NEW callout on Want to buy has done its job
  useEffect(() => {
    if (postOpen || wantedSource) markWtbCalloutSeen();
  }, [postOpen, wantedSource]);

  const selectListing = useCallback((id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
    setExtraRow(null);
    setWtbPost(null);
  }, []);
  /** Wanted: a request clicked (or Enter on it): selected and open in the drawer. */
  const openRequest = useCallback((selection: WtbSelection) => {
    setWtbSelectedId(selection.request.id);
    setWtbSelection(selection);
    setWtbPost(null);
  }, []);
  /** "Others want this too": that request on the Wanted source (the post's filters), open in the drawer. */
  const openOthersRequest = (request: WtbRequest) => {
    if (filters) setFilters(withSource(filters, 'wanted', searchDefaults));
    openRequest({ request });
  };
  /**
   * The Wanted board on Would take these items for `f` (the demand bar's View requests, the post drawer's See all):
   * the same overlapping requests their counts were read for.
   */
  const wouldTakeBoard = (f: MarketFilters): MarketFilters => {
    const board = withSource(f, 'wanted', searchDefaults);
    return { ...board, wanted: { ...board.wanted, overlap: true } };
  };
  /** "List at {offer}": the list item tab with the item and the offer as its price. */
  const listAt = useCallback(
    (selection: WtbSelection) => {
      const prefill = listPriceFor(selection.request.offer);
      trackEvent('wtb_list_at_offer', { source: selection.stashItem ? 'stash' : 'priceCheck' });
      if (selection.stashItem) openPanel('quickList', { stashItem: selection.stashItem, prefill }, { focus: true });
      else if (selection.itemText)
        openPanel('quickList', { item: encodeItemForQuickList(selection.itemText), prefill }, { focus: true });
    },
    [openPanel],
  );
  /** Owner actions (pause, resume, close): Mine and the shown request take the server's copy. */
  const { upsert: upsertMine } = mine;
  const { replace: replaceWanted } = wanted;
  const patchRequest = useCallback(
    async (request: WtbRequest, change: WtbPatch) => {
      if (!token) return;
      setWtbBusyId(request.id);
      try {
        const saved = await updateWtbRequest(token, request.id, change);
        upsertMine(saved);
        replaceWanted(saved);
        setWtbSelection((s) => (s?.request.id === saved.id ? { ...s, request: saved } : s));
      } catch (error) {
        if (error instanceof MarketApiError && error.status === 409) {
          showToast({
            title: t('wtb.post.capTitle'),
            description: t('wtb.post.capDescription', { count: MAX_OPEN_WTB_PER_USER }),
            variant: 'warning',
          });
        } else {
          showToast({
            title: t('wtb.mine.updateFailed'),
            description: error instanceof Error ? error.message : String(error),
            variant: 'error',
          });
        }
      } finally {
        setWtbBusyId(null);
      }
    },
    [token, upsertMine, replaceWanted, t],
  );
  /** Bump (or revive an expired request): to the top of Newest with its expiry restarted. */
  const bumpRequest = useCallback(
    async (request: WtbRequest) => {
      if (!token) return;
      setWtbBusyId(request.id);
      try {
        const saved = await bumpWtbRequest(token, request.id);
        upsertMine(saved);
        replaceWanted(saved);
        setWtbSelection((s) => (s?.request.id === saved.id ? { ...s, request: saved } : s));
        showToast({
          title: t('wtb.bump.done', { count: wtbDaysLeft(saved, Date.now()) }),
          variant: 'success',
        });
      } catch (error) {
        const failure = bumpFailure(error, request, Date.now());
        showToast(
          failure.kind === 'cooldown'
            ? {
                title: t('wtb.bump.tooSoon'),
                description: failure.wait
                  ? t('wtb.bump.tooSoonDescription', { h: failure.wait.hours, m: failure.wait.minutes })
                  : undefined,
                variant: 'warning',
              }
            : failure.kind === 'cap'
              ? {
                  title: t('wtb.post.capTitle'),
                  description: t('wtb.post.capDescription', { count: MAX_OPEN_WTB_PER_USER }),
                  variant: 'warning',
                }
              : { title: t('wtb.mine.updateFailed'), description: failure.message, variant: 'error' },
        );
      } finally {
        setWtbBusyId(null);
      }
    },
    [token, upsertMine, replaceWanted, t],
  );
  /** "Want to buy" / the empty search's "Post a buy request": the post pane for the filters on the left. */
  const togglePost = () => {
    setWtbPost(wtbPost ? null : { editing: null });
    setDetailOpen(false);
  };
  /** Watch started: "Also post a buy request?" opens the same post pane (never posts by itself). */
  const watchWtbPrompt = useWatchWtbPrompt({
    signedIn,
    posting: postOpen,
    mine: mine.items,
    onPost: () => {
      setWtbPost({ editing: null });
      setDetailOpen(false);
    },
  });
  /** Mine → Edit: the request's filters into Search, the post pane on it. */
  const editRequest = (request: WtbRequest) => {
    setFilters(wtbSearchFilters(request, defaultFilters(request.filters, searchDefaults)));
    setTab('search');
    setDetailOpen(false);
    setWtbPost({ editing: request });
  };
  const wtbOwner: WtbOwnerActions = {
    onEdit: editRequest,
    onPatch: patchRequest,
    onBump: (request) => void bumpRequest(request),
    busyId: wtbBusyId,
  };
  /** Cards: a click only selects; the card itself has everything the detail pane would. */
  const selectCard = useCallback((id: string) => {
    setSelectedId(id);
    setExtraRow(null);
  }, []);
  /** Hotkeys for the selected card (O offer, W whisper, F favorite). */
  const cardCommands = useCardCommand();
  /** A failed next page (search tab only): the lists' footer offers Retry. */
  const loadMore: LoadMoreState = {
    error: tab === 'search' ? search.loadMoreError : null,
    retryAt: search.loadMoreRetryAt,
    onRetry: () => void search.retryLoadMore(),
  };
  /** Stat row a mod menu just added/updated: the sidebar scrolls to and highlights it. */
  const [statHighlight, setStatHighlight] = useState<{ id: string; nonce: number } | null>(null);
  const changeViewMode = (mode: MarketViewMode) => {
    store.setViewMode(mode);
    setDetailOpen(mode === 'rows' && !!selectedId);
  };

  /** The user's defaults for the current realm and source (Reset, "browse seller"). */
  const freshFilters = (f: MarketFilters) =>
    withSource(defaultFilters({ hardcore: f.hardcore, ladder: f.ladder }, searchDefaults), f.source, searchDefaults);
  const resetFilters = () => filters && editFilters(freshFilters(filters));

  const presets = {
    builtInPresets: BUILT_IN_PRESETS.filter((p) => !store.hiddenPresets.includes(p.id)),
    userPresets: store.userPresets,
    onApplyPreset: (preset: StatPreset) => filters && editFilters(applyPreset(filters, preset)),
    onSavePreset: (name: string) => {
      if (!filters) return;
      store.addPreset({
        name,
        stats: filters.stats.map(({ id: _id, ...rest }) => rest),
        typeCodes: filters.typeCode ? [filters.typeCode] : undefined,
        itemName: filters.itemName,
        rarity: filters.rarity.length ? filters.rarity : undefined,
      });
      showToast({ title: t('page.presetSaved'), description: name, variant: 'success' });
    },
    onRemovePreset: (preset: StatPreset) =>
      preset.builtIn ? store.hideBuiltInPreset(preset.id) : store.removePreset(preset.id),
    onRestorePresets: store.hiddenPresets.length ? store.restoreBuiltInPresets : undefined,
    searchRef: statSearchRef,
    highlight: statHighlight,
  };

  /** Mod-line menus and "add all mods": merge filters by key (the row pulses, no toast), sort by a stat. */
  const modActions = useMemo<ModActionsApi | null>(() => {
    if (!filters) return null;
    return {
      addFilters: (rows) => {
        if (rows.length === 0) return;
        const merge = mergeStatFilters(filters.stats, rows);
        editFilters({ ...filters, stats: merge.stats });
        setTab('search');
        setStatHighlight({ id: merge.id, nonce: Date.now() });
      },
      sortByStat: (key, dir) => {
        editFilters({ ...filters, sort: { by: 'stat', key, dir } });
        setTab('search');
      },
      fill: {
        amount: settings?.fillStatValue ?? 5,
        unit: settings?.statFillMarginUnit ?? 'percent',
        leaveMinEmpty: settings?.statFillLeaveMinEmpty ?? false,
      },
    };
  }, [filters, editFilters, settings?.fillStatValue, settings?.statFillMarginUnit, settings?.statFillLeaveMinEmpty]);

  const browseSeller = (listing: MarketListingEntry) => {
    if (!filters) return;
    setFilters(
      // All of the seller's listings: the default online filters would hide them while the seller is away
      mergeFilters(freshFilters(filters), {
        sellerUserId: listing.user_id,
        sellerName: listing.user?.username,
        userOnlineSite: 'all',
        userOnlineGame: 'all',
      }),
    );
    setTab('search');
    setDetailOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Ctrl+Enter: the sidebar's Search (Auto search off), from anywhere in the panel, typing included
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !autoSearch && tab === 'search') {
      e.preventDefault();
      runSearch();
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey || !(e.target instanceof HTMLElement)) return;
    // Menus, selects and popovers handle their own keys (Escape closes just them)
    if (e.target.closest('[data-radix-popper-content-wrapper]')) return;
    const typing = isTextEntry(e.target);
    if (e.key === 'Escape') {
      e.preventDefault();
      if (typing) {
        e.target.blur();
        e.currentTarget.focus();
      } else if (postOpen) setWtbPost(null);
      else if (requestOpen) setWtbSelection(null);
      else if (detailOpen) setDetailOpen(false);
      else close();
      return;
    }
    if (typing) return;
    // Arrows/Enter drive the list unless a control (button, switch…) has focus
    const onList = e.target === e.currentTarget || !!e.target.closest('[role=listbox]');
    // "/" item name, "?" (Shift+/) add a stat
    if ((e.key === '/' || e.key === '?') && tab === 'search') {
      e.preventDefault();
      (e.key === '/' ? nameSearchRef : statSearchRef).current?.focus();
      return;
    }
    if (wantedSource) {
      // Wanted: the same keys over the requests (Enter opens the drawer, W whispers the buyer)
      const items = wanted.items;
      const index = wtbSelectedId ? items.findIndex((r) => r.id === wtbSelectedId) : -1;
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && onList && items.length > 0) {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        const next =
          index < 0 ? (step > 0 ? 0 : items.length - 1) : Math.min(Math.max(index + step, 0), items.length - 1);
        setWtbSelectedId(items[next].id);
      } else if (e.key === 'Enter' && onList && index >= 0 && !e.target.closest('[aria-haspopup="menu"]')) {
        e.preventDefault();
        openRequest(wtbSelectionOf(items[index], stash));
      } else if (e.key.toLowerCase() === 'w' && !e.shiftKey && index >= 0 && items[index].buyer.userId !== userId) {
        e.preventDefault();
        void whisper(items[index], selectionContactItem(wtbSelectionOf(items[index], stash)));
      }
      return;
    }
    const navRows = cards ? cardRows : rows;
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && onList && navRows.length > 0) {
      e.preventDefault();
      const index = selectedId ? navRows.findIndex((r) => r.listing._id === selectedId) : -1;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const next =
        index < 0 ? (step > 0 ? 0 : navRows.length - 1) : Math.min(Math.max(index + step, 0), navRows.length - 1);
      setSelectedId(navRows[next].listing._id);
      setExtraRow(null);
    } else if (e.key === 'Enter' && onList && selectedId && !e.target.closest('[aria-haspopup="menu"]')) {
      e.preventDefault();
      setDetailOpen(true);
    } else if (cards && selectedId && CARD_HOTKEYS[e.key.toLowerCase()] && !e.shiftKey) {
      e.preventDefault();
      cardCommands.issue(selectedId, CARD_HOTKEYS[e.key.toLowerCase()]);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={300}>
        <ModActionsProvider value={modActions}>
          <WindowPanel
            animate
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className="relative z-10 h-full w-full outline-none"
          >
            <WindowChrome
              title={t('page.title')}
              icon={<Store className="text-primary" />}
              onClose={close}
              closeLabel={t('page.closeLabel')}
              center={
                tab === 'search' &&
                filters && (
                  <ItemNameSearch
                    value={filters.itemName}
                    onChange={(itemName) => editFilters({ ...filters, itemName })}
                    onPickGroup={(group) =>
                      editFilters({ ...filters, itemName: undefined, typeCode: group.typeCode, baseCode: group.code })
                    }
                    ladder={filters.ladder}
                    hardcore={filters.hardcore}
                    inputRef={nameSearchRef}
                  />
                )
              }
              actions={
                <>
                  <Tabs value={tab}
                    onValueChange={(v) => setTab(v as MarketTab)}>
                    <TabsList className="h-7 p-0.5">
                      {TABS.map((value) => {
                        const count =
                          value === 'favorites'
                            ? favorites.favorites.length
                            : value === 'saved'
                              ? store.savedSearches.length
                              : 0;
                        return (
                          <TabsTrigger
                            key={value}
                            value={value}
                            className="h-6 px-2.5 text-xs after:hidden data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                          >
                            {tab === value && (
                              <motion.span
                                layoutId="market-tab-active"
                                transition={springSnappy}
                                aria-hidden
                                className="absolute inset-0 rounded-md bg-background shadow-sm"
                              />
                            )}
                            <span className="relative">
                              {t(TAB_LABEL_KEYS[value])}
                              {count > 0 && (
                                <span className="ml-1 text-[10px] text-muted-foreground tabular-nums">{count}</span>
                              )}
                            </span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </Tabs>
                  {/* Kept in place (hidden) on Saved so the tabs don't jump sideways when switching. */}
                  <Tip label={t('common:actions.refresh')}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn('size-7 p-0', tab === 'saved' && 'invisible')}
                      aria-label={t('common:actions.refresh')}
                      aria-hidden={tab === 'saved' || undefined}
                      tabIndex={tab === 'saved' ? -1 : undefined}
                      onClick={() =>
                        tab === 'favorites'
                          ? void favorites.reload()
                          : wantedSource
                            ? wanted.reload()
                            : search.refresh()
                      }
                    >
                      <RefreshCw
                        className={cn(
                          'size-3.5',
                          (tab === 'favorites'
                            ? favorites.status === 'loading'
                            : wantedSource
                              ? wanted.status === 'loading'
                              : search.status === 'loading') && 'animate-spin',
                        )}
                      />
                    </Button>
                  </Tip>
                </>
              }
            />

            {!filters ? (
              <div className="flex-1 space-y-2 p-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-2/3" />
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 overflow-hidden">
                {tab === 'search' && (
                  <div className="w-[300px] shrink-0">
                    <FilterHighlightContext.Provider value={highlight}>
                      <FilterSidebar
                        filters={filters}
                        onChange={editFilters}
                        onReset={resetFilters}
                        autoSearch={autoSearch}
                        onAutoSearchChange={store.setAutoSearch}
                        unsearchedEdits={unsearched ? Math.max(unsearchedEdits, 1) : 0}
                        onSearch={runSearch}
                        searchDefaults={searchDefaults}
                        stats={presets}
                        sectionsOpen={store.sectionsOpen}
                        onSectionOpen={store.setSectionOpen}
                        facets={search.facets}
                        wantedCounts={{
                          signedIn,
                          stash: stash.status === 'ready' ? stash.byRequest.size : null,
                          mine: mine.status === 'ready' ? mine.items.length : null,
                        }}
                      />
                    </FilterHighlightContext.Provider>
                  </div>
                )}

                <main className="flex min-w-0 flex-1 flex-col">
                  <AnimatePresence mode="wait"
                    initial={false}>
                    <motion.div
                      key={tab}
                      variants={fadeIn}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="flex min-h-0 flex-1 flex-col"
                    >
                      {wantedSource ? (
                        <WantedResults
                          search={wanted}
                          cards={cards}
                          viewModeToggle={<ViewModeToggle value={viewMode}
                            onChange={changeViewMode} />}
                          userId={userId}
                          stash={stash}
                          wanted={filters.wanted ?? {}}
                          onSort={(sort) => setFilters({ ...filters, wanted: { ...filters.wanted, sort } })}
                          onPost={togglePost}
                          selectedId={wtbSelectedId}
                          onOpen={openRequest}
                          onListAt={listAt}
                          owner={wtbOwner}
                          enter={wantedEnter}
                          postOpen={!!wtbPost}
                        />
                      ) : tab === 'saved' ? (
                        <SavedSearches
                          store={store}
                          current={filters}
                          onRun={(s) => {
                            setFilters(upgradeFilters(s.filters));
                            setTab('search');
                            setDetailOpen(false);
                          }}
                        />
                      ) : (
                        <ResultsPane
                          tab={tab}
                          cards={cards}
                          signedIn={signedIn}
                          search={search}
                          favorites={favorites}
                          rows={cards ? cardRows : rows}
                          onSignIn={openSignIn}
                          // No live listing for this search: offer the same search over sold listings
                          onSearchArchive={
                            tab === 'search' && filters?.source === 'live'
                              ? () => setFilters(withSource(filters, 'archive', searchDefaults))
                              : undefined
                          }
                          relaxations={relaxations}
                          onRelax={(r) => search.filters && setFilters(r.value.clear(search.filters))}
                          onRelaxHover={setHoveredRelax}
                          unsearched={tab === 'search' && unsearched}
                          onSearch={runSearch}
                          itemName={(searchFilters ?? filters).itemName}
                          banner={
                            tab === 'search' &&
                            demand && (
                              <DemandBar model={demand}
                                onViewRequests={() => setFilters(wouldTakeBoard(filters))} />
                            )
                          }
                          // Nothing listed: ask for it instead (live searches only, like Watch)
                          onPostRequest={tab === 'search' && filters?.source === 'live' ? togglePost : undefined}
                          emptySubline={[
                            t('wtb.cta.live'),
                            t('wtb.cta.stats', {
                              count: (searchFilters ?? filters).stats.filter((s) => s.enabled && s.key).length,
                            }),
                            ...((searchFilters ?? filters).corrupted === 'yes' ? [t('wtb.cta.corrupted')] : []),
                          ].join(' · ')}
                          toolbar={
                            <>
                              {tab === 'search' && (
                                <>
                                  <OpenOnSiteButton filters={filters} />
                                  <WatchButton filters={filters}
                                    wtbPrompt={watchWtbPrompt} />
                                  <WtbNewCallout show={!archived}>
                                    <WantToBuyButton
                                      open={postOpen}
                                      source={archived ? 'archive' : 'live'}
                                      onToggle={togglePost}
                                    />
                                  </WtbNewCallout>
                                </>
                              )}
                              <ViewModeToggle value={viewMode}
                                onChange={changeViewMode} />
                            </>
                          }
                        >
                          {/* Search rows: presence as of when the results were shown, until the next refresh */}
                          <PresenceAsOf.Provider value={tab === 'search' ? search.shownAt : null}>
                            <AnimatePresence mode="wait"
                              initial={false}>
                              <motion.div
                                key={viewMode}
                                variants={fadeIn}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="flex min-h-0 flex-1 flex-col"
                              >
                                {cards ? (
                                  <ResultCards
                                    rows={cardRows}
                                    enter={enter}
                                    pinned={
                                      pinned && tab === 'search'
                                        ? {
                                            id: pinned.row.listing._id,
                                            searchName: pinned.searchName,
                                            onDismiss: dismissPinned,
                                          }
                                        : null
                                    }
                                    glowIds={glowIds}
                                    selectedId={selectedId}
                                    onSelect={selectCard}
                                    statKeys={statKeys}
                                    command={cardCommands.command}
                                    takeCommand={cardCommands.take}
                                    deals={deals}
                                    offers={offers}
                                    pseudoKeys={pseudoKeys}
                                    favoriteIds={favoriteIds}
                                    onToggleFavorite={toggleFavorite}
                                    archived={archived}
                                    api={marketApi ?? null}
                                    hasMore={tab === 'search' && search.hasMore}
                                    loadingMore={tab === 'search' && search.loadingMore}
                                    onLoadMore={search.loadMore}
                                    loadMore={loadMore}
                                  />
                                ) : (
                                  <ResultsList
                                    rows={rows}
                                    enter={enter}
                                    selectedId={selectedId}
                                    onSelect={selectListing}
                                    deals={deals}
                                    offers={offers}
                                    pseudoKeys={pseudoKeys}
                                    favoriteIds={favoriteIds}
                                    hasMore={tab === 'search' && search.hasMore}
                                    loadingMore={tab === 'search' && search.loadingMore}
                                    onLoadMore={search.loadMore}
                                    loadMore={loadMore}
                                  />
                                )}
                              </motion.div>
                            </AnimatePresence>
                          </PresenceAsOf.Provider>
                        </ResultsPane>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </main>

                <AnimatePresence initial={false}
                  mode="wait">
                  {postOpen && wtbPost ? (
                    <motion.div
                      key={`post:${wtbPost.editing?.id ?? 'new'}`}
                      variants={slideInRight}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="w-[380px] shrink-0"
                    >
                      <WtbPostDrawer
                        filters={filters}
                        editing={wtbPost.editing}
                        token={token}
                        userId={userId}
                        whisperTo={whisperTo}
                        onSignIn={openSignIn}
                        mine={mine}
                        api={marketApi ?? null}
                        searchDefaults={searchDefaults}
                        draft={wtbPost.editing ? null : postDraft.current}
                        onDraftChange={keepPostDraft}
                        onOpenRequest={openOthersRequest}
                        onSeeAllRequests={() => {
                          setFilters(wouldTakeBoard(filters));
                          setWtbPost(null);
                        }}
                        onClose={() => setWtbPost(null)}
                      />
                    </motion.div>
                  ) : requestOpen && wtbSelection ? (
                    <motion.div
                      key="request"
                      variants={slideInRight}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="w-[380px] shrink-0"
                    >
                      <WtbRequestDrawer
                        selection={wtbSelection}
                        own={!!userId && wtbSelection.request.buyer.userId === userId}
                        owner={wtbOwner}
                        onListAt={listAt}
                        onClose={() => setWtbSelection(null)}
                      />
                    </motion.div>
                  ) : (
                    detailRow &&
                    tab !== 'saved' &&
                    !wantedSource && (
                      <motion.div
                        key="detail"
                        variants={slideInRight}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="w-[380px] shrink-0"
                      >
                        <ListingDetail
                          row={detailRow}
                          deal={deals.get(detailRow.listing._id)}
                          api={marketApi ?? null}
                          archived={archived}
                          favorite={favoriteIds.has(detailRow.listing._id)}
                          onToggleFavorite={toggleFavorite}
                          onClose={() => setDetailOpen(false)}
                          onBrowseSeller={browseSeller}
                          onSelectListing={(l) => {
                            setSelectedId(l._id);
                            setDetailOpen(true);
                            setExtraRow(
                              rows.some((r) => r.listing._id === l._id) ? null : scoreListings([l], filters)[0],
                            );
                          }}
                          pseudoKeys={pseudoKeys}
                        />
                      </motion.div>
                    )
                  )}
                </AnimatePresence>
              </div>
            )}
          </WindowPanel>
        </ModActionsProvider>
      </TooltipProvider>
    </MotionConfig>
  );
};

/** Rows | Cards switch of the results header (icon segmented control). */
function ViewModeToggle({ value, onChange }: { value: MarketViewMode; onChange: (mode: MarketViewMode) => void }) {
  const { t } = useTranslation('market');
  const options: { mode: MarketViewMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'rows', label: t('viewMode.rows'), icon: <List className="size-3.5" /> },
    { mode: 'cards', label: t('viewMode.cards'), icon: <LayoutGrid className="size-3.5" /> },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t('viewMode.label')}
      className="flex h-6 shrink-0 rounded-md border border-input bg-background/40 p-0.5"
    >
      {options.map((o) => (
        <Tip key={o.mode}
          label={o.label}>
          <button
            type="button"
            role="radio"
            aria-checked={value === o.mode}
            aria-label={o.label}
            onClick={() => onChange(o.mode)}
            className={cn(
              'relative inline-flex w-6 items-center justify-center rounded-[4px] text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
              value === o.mode && 'text-accent-foreground',
            )}
          >
            {value === o.mode && (
              <motion.span
                layoutId="market-view-active"
                transition={springSnappy}
                aria-hidden
                className="absolute inset-0 rounded-[4px] bg-accent shadow-xs"
              />
            )}
            <span className="relative">{o.icon}</span>
          </button>
        </Tip>
      ))}
    </div>
  );
}

/** Status strip + the results, or the empty / error / sign-in / loading state in their place. */
function ResultsPane({
  tab,
  cards,
  signedIn,
  search,
  favorites,
  rows,
  onSignIn,
  onSearchArchive,
  onPostRequest,
  emptySubline,
  itemName,
  relaxations,
  onRelax,
  onRelaxHover,
  unsearched,
  onSearch,
  toolbar,
  banner,
  children,
}: {
  tab: MarketTab;
  /** Auto search off and the filters changed since these results were searched: say so, and offer Search. */
  unsearched: boolean;
  onSearch: () => void;
  /** Cards view: card-shaped loading skeletons. */
  cards: boolean;
  signedIn: boolean;
  search: MarketSearch;
  favorites: MarketFavorites;
  rows: ScoredListing[];
  onSignIn: () => void;
  /** Set while a live search can be re-run over the archive (offered when it finds nothing). */
  onSearchArchive?: () => void;
  /** Set on a live search: an empty one offers to post a buy request for it. */
  onPostRequest?: () => void;
  /** Under the empty search's title: "Live listings · 2 stats · corrupted". */
  emptySubline: string;
  /** The searched item name, for the empty-state wording. */
  itemName?: string;
  /** The empty search's filters that find something when dropped, best first (null: none, or still counting). */
  relaxations: Relaxation<ActiveFilter>[] | null;
  onRelax: (relaxation: Relaxation<ActiveFilter>) => void;
  /** The suggestion the pointer is on (null: none), to mark its filter in the sidebar. */
  onRelaxHover: (id: string | null) => void;
  /** Right end of the status strip (view toggle). */
  toolbar: React.ReactNode;
  /** Under the status strip, above the results (the demand bar). */
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation(['market', 'common']);
  const filterText = useActiveFilterText();
  if (!signedIn || (tab === 'search' && search.status === 'auth')) {
    return (
      <EmptyState
        className="m-6"
        icon={<LogIn />}
        title={t('results.signInTitle')}
        description={t('results.signInDescription')}
        action={
          <Button size="sm"
            onClick={onSignIn}>
            {t('common:actions.signIn')}
          </Button>
        }
      />
    );
  }

  const loading = tab === 'search' ? search.status === 'loading' : favorites.status === 'loading';
  const error =
    tab === 'search'
      ? search.status === 'error'
        ? search.error
        : null
      : favorites.status === 'error'
        ? favorites.error
        : null;
  const retry = tab === 'search' ? search.refresh : () => void favorites.reload();

  let status: React.ReactNode;
  if (tab === 'favorites') {
    status = t('results.favoritesCount', { count: rows.length });
  } else if (search.status === 'ready') {
    status = searchCountText(search);
  } else if (loading) {
    status = t('results.searching');
  }

  let body: React.ReactNode = children;
  if (error && rows.length === 0) {
    body = (
      <EmptyState
        className="m-6 border-destructive/30 bg-destructive/5"
        icon={<AlertTriangle />}
        title={t('results.searchFailed')}
        description={error}
        action={
          <Button size="sm"
            variant="outline"
            onClick={retry}>
            {t('common:actions.tryAgain')}
          </Button>
        }
      />
    );
  } else if (loading && rows.length === 0) {
    body = cards ? (
      <div aria-busy
        className="space-y-2 p-2">
        {Array.from({ length: SKELETON_CARDS }, (_, i) => (
          <div key={i}
            className="space-y-2 rounded-lg border border-border/50 p-3">
            <div className="flex gap-3">
              <Skeleton className="h-[76px] w-16 shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        ))}
      </div>
    ) : (
      <div aria-busy
        className="space-y-1 p-2">
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <Skeleton key={i}
            className="h-[52px] w-full" />
        ))}
      </div>
    );
  } else if (!loading && rows.length === 0) {
    body =
      tab === 'favorites' ? (
        <EmptyState
          className="m-6"
          icon={<Heart />}
          title={t('results.noFavoritesTitle')}
          description={t('results.noFavoritesDescription')}
        />
      ) : onPostRequest ? (
        <EmptyState
          className="m-6"
          icon={<SearchX />}
          title={itemName ? t('wtb.cta.title', { item: itemName }) : t('wtb.cta.titleAny')}
          description={emptySubline}
          action={
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {onSearchArchive && (
                  <Button size="sm"
                    variant="outline"
                    onClick={onSearchArchive}>
                    {t('results.searchArchive')}
                  </Button>
                )}
                <Button size="sm"
                  onClick={onPostRequest}>
                  <HandCoins className="size-3.5" />
                  {t('wtb.cta.post')}
                </Button>
              </div>
              <p className="max-w-xs text-center text-[11px] text-muted-foreground">{t('wtb.cta.helper')}</p>
              {!!relaxations?.length && (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">{t('wtb.cta.orLoosen')}</span>
                  <RelaxationChips
                    chips={relaxationChips(relaxations, (filter) => filterText(filter.spec))}
                    onPick={(id) => {
                      const picked = relaxations.find((r) => r.id === id);
                      if (picked) onRelax(picked);
                    }}
                    onHover={onRelaxHover}
                  />
                </div>
              )}
            </div>
          }
        />
      ) : relaxations?.length ? (
        <EmptyState
          className="m-6"
          icon={<SearchX />}
          title={t('results.noMatchAll')}
          description={t('results.relaxHint')}
          action={
            <RelaxationChips
              chips={relaxationChips(relaxations, (filter) => filterText(filter.spec))}
              onPick={(id) => {
                const picked = relaxations.find((r) => r.id === id);
                if (picked) onRelax(picked);
              }}
              onHover={onRelaxHover}
            />
          }
        />
      ) : (
        <EmptyState
          className="m-6"
          icon={<SearchX />}
          title={t('results.noListingsTitle')}
          description={t('results.noListingsDescription')}
        />
      );
  }

  // A refetch with the previous rows still shown: thin indeterminate bar under the header, rows dimmed
  const refetching = loading && rows.length > 0;
  return (
    <ResultsFrame
      refetching={refetching}
      stale={unsearched && !refetching}
      toolbar={toolbar}
      banner={banner}
      status={
        <>
          {/* The count keeps one line; the out-of-date notice beside it gives way */}
          {status && <span className="shrink-0 whitespace-nowrap">{status}</span>}
          {tab === 'search' && search.status === 'ready' && search.priceStats && (
            <MatchesMedian
              stats={search.priceStats}
              archived={search.filters?.source === 'archive'}
              // The strip is at the top of the panel: the spread opens over the results
              side="bottom"
            />
          )}
          {error && rows.length > 0 && <span className="min-w-0 truncate text-destructive">{error}</span>}
          {unsearched && <UnsearchedNotice onSearch={onSearch} />}
        </>
      }
    >
      {body}
    </ResultsFrame>
  );
}

export default MarketBrowserPage;
