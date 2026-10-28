import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { AlertTriangle, Heart, LayoutGrid, List, LogIn, RefreshCw, SearchX, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DUR, EASE_OUT, fadeIn, slideInRight, springSnappy } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { EmptyState } from '@/pages/currency/components/StatePanel';
import { showToast, usePanel } from '@/overlay';
import { useSignIn } from '@/hooks/useSignIn';
import { useOptions } from '@/hooks/useOptions';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { useDealIndicators } from '@/pages/market/enrich/useDealIndicators';
import { type MarketViewMode, useMarketStore } from '@/pages/market/store/useMarketStore';
import { defaultFilters, mergeFilters, upgradeFilters, withSource } from './lib/defaults';
import { applyPreset, BUILT_IN_PRESETS } from './lib/presets';
import type { MarketFilters, MarketTab, ScoredListing, StatPreset } from './lib/types';
import { indexListingOffers } from './lib/listing-offers';
import { scoreListings } from './lib/search';
import { type MarketSearch, searchCountText, useMarketSearch } from './hooks/useMarketSearch';
import { type MarketFavorites, useMarketFavorites } from './hooks/useMarketFavorites';
import { FilterSidebar } from './components/FilterSidebar';
import { ItemNameSearch } from './components/ItemNameSearch';
import { type LoadMoreState, ResultsList } from './components/ResultsList';
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
import { useTranslation } from '@/i18n';

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
  const { settings } = useOptions();
  const { marketApi, outgoingOffers, hiddenOutgoingOffers, incomingOffers } = usePd2Website();
  const store = useMarketStore();
  const { viewMode } = store;
  const cards = viewMode === 'cards';
  const signedIn = !!settings?.pd2Token;
  const mode = useMemo(
    () => ({ hardcore: settings?.mode === 'hardcore', ladder: settings?.ladder !== 'non-ladder' }),
    [settings?.mode, settings?.ladder],
  );

  const [tab, setTab] = useState<MarketTab>('search');
  const [filters, setFilters] = useState<MarketFilters | null>(null);
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

  // keepMounted: nothing is fetched until the panel was first shown
  const [activated, setActivated] = useState(false);
  if (visible && !activated) setActivated(true);

  // Apply openPanel('market', payload) once the saved state is loaded (saved searches, last filters).
  // Adjusted during render, like the chat panel's payload handling.
  const [handledVersion, setHandledVersion] = useState(-1);
  if (store.loaded && handledVersion !== payloadVersion) {
    setHandledVersion(payloadVersion);
    const saved = payload?.savedSearchId ? store.savedSearches.find((s) => s.id === payload.savedSearchId) : undefined;
    let next: MarketFilters | null = null;
    if (saved) next = upgradeFilters(saved.filters);
    else if (payload?.filters) next = upgradeFilters(mergeFilters(defaultFilters(mode), payload.filters));
    else if (!filters) next = upgradeFilters(store.lastFilters ?? defaultFilters(mode));
    if (next) {
      setFilters(next);
      setSelectedId(null);
      setDetailOpen(false);
      setExtraRow(null);
      setPinned(null);
    }
    if (payload?.tab) setTab(payload.tab);
    else if (saved || payload?.filters) setTab('search');
    setPendingFocus(
      payload?.focusListingId ? { id: payload.focusListingId, searched: false, searchName: saved?.name } : null,
    );
  }

  const search = useMarketSearch(marketApi ?? null, activated ? filters : null, { signedIn });
  const favorites = useMarketFavorites(marketApi ?? null, signedIn && activated);

  // Remember the last search that actually ran (not per keystroke / re-rank: each call writes market-prefs.json)
  const { setLastFilters } = store;
  useEffect(() => {
    if (search.ranFilters) setLastFilters(search.ranFilters);
  }, [search.ranFilters, setLastFilters]);

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

  const rows = useMemo(
    () => (tab === 'favorites' ? favoriteRows : tab === 'search' ? search.items : []),
    [tab, favoriteRows, search.items],
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
    } else if (pendingFocus.searched && filters && search.filters === filters) {
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
    () => (filters?.stats ?? []).filter((s) => s.enabled && !s.not && s.kind === 'pseudo').map((s) => s.key),
    [filters?.stats],
  );
  const statKeys = useMemo(
    () => (filters?.stats ?? []).filter((s) => s.enabled && !s.not && s.kind === 'mod').map((s) => s.key),
    [filters?.stats],
  );
  /** Sold archive results: no offer/whisper (the item is gone). */
  const archived = tab === 'search' && filters?.source === 'archive';

  const detailRow =
    (detailOpen &&
      selectedId &&
      (rows.find((r) => r.listing._id === selectedId) ?? (extraRow?.listing._id === selectedId ? extraRow : null))) ||
    null;

  const selectListing = useCallback((id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
    setExtraRow(null);
  }, []);
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

  /** Defaults for the current realm and source (Clear, "browse seller"). */
  const freshFilters = (f: MarketFilters) =>
    withSource(defaultFilters({ hardcore: f.hardcore, ladder: f.ladder }), f.source);
  const resetFilters = () => filters && setFilters(freshFilters(filters));

  const presets = {
    builtInPresets: BUILT_IN_PRESETS.filter((p) => !store.hiddenPresets.includes(p.id)),
    userPresets: store.userPresets,
    onApplyPreset: (preset: StatPreset) => filters && setFilters(applyPreset(filters, preset)),
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
        setFilters({ ...filters, stats: merge.stats });
        setTab('search');
        setStatHighlight({ id: merge.id, nonce: Date.now() });
      },
      sortByStat: (key, dir) => {
        setFilters({ ...filters, sort: { by: 'stat', key, dir } });
        setTab('search');
      },
      fill: {
        amount: settings?.fillStatValue ?? 5,
        unit: settings?.statFillMarginUnit ?? 'percent',
        leaveMinEmpty: settings?.statFillLeaveMinEmpty ?? false,
      },
    };
  }, [filters, settings?.fillStatValue, settings?.statFillMarginUnit, settings?.statFillLeaveMinEmpty]);

  const browseSeller = (listing: MarketListingEntry) => {
    if (!filters) return;
    setFilters(
      mergeFilters(freshFilters(filters), { sellerUserId: listing.user_id, sellerName: listing.user?.username }),
    );
    setTab('search');
    setDetailOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !(e.target instanceof HTMLElement)) return;
    // Menus, selects and popovers handle their own keys (Escape closes just them)
    if (e.target.closest('[data-radix-popper-content-wrapper]')) return;
    const typing = isTextEntry(e.target);
    if (e.key === 'Escape') {
      e.preventDefault();
      if (typing) {
        e.target.blur();
        e.currentTarget.focus();
      } else if (detailOpen) setDetailOpen(false);
      else close();
      return;
    }
    if (typing) return;
    const navRows = cards ? cardRows : rows;
    // Arrows/Enter drive the list unless a control (button, switch…) has focus
    const onList = e.target === e.currentTarget || !!e.target.closest('[role=listbox]');
    // "/" item name, "?" (Shift+/) add a stat
    if ((e.key === '/' || e.key === '?') && tab === 'search') {
      e.preventDefault();
      (e.key === '/' ? nameSearchRef : statSearchRef).current?.focus();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && onList && navRows.length > 0) {
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
                    onChange={(itemName) => setFilters({ ...filters, itemName })}
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
                      {(['search', 'favorites', 'saved'] as const).map((value) => {
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
                              {value === 'search'
                                ? t('page.tabs.search')
                                : value === 'favorites'
                                  ? t('page.tabs.favorites')
                                  : t('page.tabs.saved')}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn('size-7 p-0', tab === 'saved' && 'invisible')}
                    aria-label={t('common:actions.refresh')}
                    aria-hidden={tab === 'saved' || undefined}
                    tabIndex={tab === 'saved' ? -1 : undefined}
                    title={t('common:actions.refresh')}
                    onClick={() => (tab === 'favorites' ? void favorites.reload() : search.refresh())}
                  >
                    <RefreshCw
                      className={cn(
                        'size-3.5',
                        (tab === 'favorites' ? favorites.status === 'loading' : search.status === 'loading') &&
                          'animate-spin',
                      )}
                    />
                  </Button>
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
                    <FilterSidebar
                      filters={filters}
                      onChange={setFilters}
                      onReset={resetFilters}
                      stats={presets}
                      sectionsOpen={store.sectionsOpen}
                      onSectionOpen={store.setSectionOpen}
                    />
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
                      {tab === 'saved' ? (
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
                              ? () => setFilters(withSource(filters, 'archive'))
                              : undefined
                          }
                          itemName={filters?.itemName}
                          toolbar={
                            <>
                              {tab === 'search' && (
                                <>
                                  <OpenOnSiteButton filters={filters} />
                                  <WatchButton filters={filters} />
                                </>
                              )}
                              <ViewModeToggle value={viewMode}
                                onChange={changeViewMode} />
                            </>
                          }
                        >
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
                        </ResultsPane>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </main>

                <AnimatePresence initial={false}>
                  {detailRow && tab !== 'saved' && (
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
        <button
          key={o.mode}
          type="button"
          role="radio"
          aria-checked={value === o.mode}
          aria-label={o.label}
          title={o.label}
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
  itemName,
  toolbar,
  children,
}: {
  tab: MarketTab;
  /** Cards view: card-shaped loading skeletons. */
  cards: boolean;
  signedIn: boolean;
  search: MarketSearch;
  favorites: MarketFavorites;
  rows: ScoredListing[];
  onSignIn: () => void;
  /** Set while a live search can be re-run over the sold archive (offered when it finds nothing). */
  onSearchArchive?: () => void;
  /** The searched item name, for the empty-state wording. */
  itemName?: string;
  /** Right end of the status strip (view toggle). */
  toolbar: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation(['market', 'common']);
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
      ) : onSearchArchive ? (
        <EmptyState
          className="m-6"
          icon={<SearchX />}
          title={itemName ? t('results.noLiveListingsFor', { itemName }) : t('results.noLiveListings')}
          description={t('results.searchArchivePrompt')}
          action={
            <Button size="sm"
              onClick={onSearchArchive}>
              {t('results.searchArchive')}
            </Button>
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex h-8 shrink-0 items-center gap-2 border-b border-border/60 bg-muted/20 px-2.5 text-[11px] text-muted-foreground">
        {status}
        {error && rows.length > 0 && <span className="min-w-0 truncate text-destructive">{error}</span>}
        <span className="ml-auto" />
        {toolbar}
        <AnimatePresence>
          {refetching && (
            <motion.div
              key="refetch"
              role="progressbar"
              aria-label={t('results.refreshing')}
              className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR.fast }}
            >
              <motion.div
                className="h-full w-1/3 rounded-full bg-primary/70"
                initial={{ x: '-100%' }}
                animate={{ x: '300%' }}
                transition={{ duration: 1.1, ease: EASE_OUT, repeat: Infinity }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col transition-opacity duration-(--dur-med)',
          refetching && 'opacity-70',
        )}
      >
        {body}
      </div>
    </div>
  );
}

export default MarketBrowserPage;
