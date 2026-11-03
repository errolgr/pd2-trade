import React, { useCallback, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  Check,
  Download,
  Globe,
  PackageSearch,
  Puzzle,
  ShieldCheck,
} from 'lucide-react';
import { CATEGORIES, type Category, type Permission } from '@pd2-trader/plugin-sdk';
import {
  PanelChrome,
  PanelSurface,
  Badge,
  Button,
  Input,
  ScrollArea,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  Banner,
  EmptyState,
  cn,
} from '@pd2-trader/ui';
import { showToast, usePanel } from '@/overlay';
import { useTranslation } from '@/i18n';
import type { PluginView } from '../host/manager';
import { marketplaceApi, type Listing, type ListingDetail } from '../marketplace/api';
import { isBlocked } from '../marketplace/install';
import { listingState, type ListingState } from '../marketplace/listing-state';
import { marketplace } from '../PluginHostBridge';
import { usePluginHost } from './hooks';
import { permissionKey } from './permission-labels';
import {
  PluginEnableSwitch,
  PluginSourceBadge,
  PluginStatusBadge,
  PluginStatusText,
  ReviewUpdateButton,
  UninstallPluginButton,
} from './PluginManageControls';

/**
 * `plugins` panel (PRD C1.1): browse/search the marketplace by category, a listing's detail (versions and the
 * full permissions view), verified install through the consent sheet, and the installed plugins.
 */

type Tab = 'browse' | 'installed';

const SEARCH_DEBOUNCE_MS = 300;
const TRIGGER_CLASS = 'h-6 px-2.5 text-xs after:hidden data-[state=active]:bg-background data-[state=active]:shadow-sm';
const TONE_BADGE = {
  success: 'border-success/30 bg-success/10 text-success',
  destructive: 'border-destructive/35 bg-destructive/10 text-destructive',
  muted: 'border-border text-muted-foreground',
} as const;

export default function PluginsPage() {
  const { t } = useTranslation('plugins');
  const { payload, payloadVersion, close } = usePanel<'plugins'>();
  const host = usePluginHost();
  const [tab, setTab] = useState<Tab>(payload?.tab ?? 'browse');
  const [query, setQuery] = useState(payload?.q ?? '');
  const [detailId, setDetailId] = useState<string | null>(payload?.pluginId ?? null);
  const installer = useInstaller();
  // marketplace.blocklist is not a store: refresh it when the panel opens and re-render once applied.
  const [, setBlocklistVersion] = useState(0);

  useEffect(() => {
    setTab(payload?.tab ?? 'browse');
    if (payload?.q !== undefined) setQuery(payload.q);
    setDetailId(payload?.pluginId ?? null);
    // Only a new openPanel() call re-applies the payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadVersion]);

  useEffect(() => {
    let live = true;
    void marketplace.checkBlocklist().then(() => live && setBlocklistVersion((v) => v + 1));
    return () => {
      live = false;
    };
  }, []);

  const installedById = new Map(host.plugins.map((p) => [p.installed.id, p]));
  const stateOf = (listing: Pick<Listing, 'id' | 'latestVersion'>) =>
    listingState(listing, installedById.get(listing.id)?.installed, marketplace.blocklist);

  return (
    <MotionConfig reducedMotion="user">
      <PanelSurface animate
        className="flex h-full w-full flex-col">
        <PanelChrome
          title={t('marketplace.title')}
          icon={<Puzzle className="text-primary" />}
          onClose={close}
          closeLabel={t('marketplace.closeLabel')}
          center={
            tab === 'browse' && (
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setDetailId(null);
                }}
                placeholder={t('marketplace.search')}
                aria-label={t('marketplace.search')}
                className="h-7 w-64 text-xs"
              />
            )
          }
          actions={
            <Tabs value={tab}
              onValueChange={(v) => setTab(v as Tab)}>
              <TabsList className="h-7 p-0.5">
                <TabsTrigger value="browse"
                  className={TRIGGER_CLASS}>
                  {t('marketplace.tabs.browse')}
                </TabsTrigger>
                <TabsTrigger value="installed"
                  className={TRIGGER_CLASS}>
                  {t('marketplace.tabs.installed')}
                  {host.plugins.length > 0 && (
                    <span className="ml-1 text-xs tabular-nums text-muted-foreground">{host.plugins.length}</span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-3 text-xs">
            {tab === 'installed' ? (
              <InstalledList plugins={host.plugins}
                ready={host.ready}
                onBrowse={() => setTab('browse')} />
            ) : detailId ? (
              <ListingDetailView
                id={detailId}
                stateOf={stateOf}
                installedVersion={installedById.get(detailId)?.installed.version}
                installer={installer}
                onBack={() => setDetailId(null)}
              />
            ) : (
              <BrowseList query={query}
                stateOf={stateOf}
                installer={installer}
                onOpen={setDetailId} />
            )}
          </div>
        </ScrollArea>
      </PanelSurface>
    </MotionConfig>
  );
}

// ---- install ------------------------------------------------------------------------------------------------

interface Installer {
  pending: string | null;
  errors: Record<string, string>;
  install(listing: Pick<Listing, 'id' | 'name'>): Promise<void>;
}

/** Verified install (hash + signature, then the consent sheet); one at a time, errors kept per listing. */
function useInstaller(): Installer {
  const { t } = useTranslation('plugins');
  const [pending, setPending] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const install = useCallback(
    async ({ id, name }: Pick<Listing, 'id' | 'name'>) => {
      setPending(id);
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      try {
        if (await marketplace.install(id))
          showToast({ title: t('marketplace.installedToast', { name }), variant: 'success' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setErrors((prev) => ({ ...prev, [id]: message }));
        showToast({ title: t('marketplace.installFailed', { name }), description: message, variant: 'error' });
      } finally {
        setPending(null);
      }
    },
    [t],
  );
  return { pending, errors, install };
}

function ListingAction({
  listing,
  state,
  installer,
}: {
  listing: Pick<Listing, 'id' | 'name'>;
  state: ListingState;
  installer: Installer;
}) {
  const { t } = useTranslation('plugins');
  const busy = installer.pending === listing.id;
  if (state.kind === 'blocked')
    return (
      <Badge
        variant="outline"
        className={TONE_BADGE.destructive}
        title={state.reason ? t('marketplace.blockedHint', { reason: state.reason }) : undefined}
      >
        <Ban aria-hidden />
        {t('marketplace.blocked')}
      </Badge>
    );
  if (state.kind === 'installed')
    return (
      <Badge variant="outline"
        className={TONE_BADGE.success}>
        <Check aria-hidden />
        {t('marketplace.installed')}
      </Badge>
    );
  return (
    <Button
      size="sm"
      variant={state.kind === 'update' ? 'secondary' : 'default'}
      disabled={installer.pending !== null}
      onClick={() => void installer.install(listing)}
    >
      <Download className="size-4" />
      {busy
        ? t('marketplace.installing')
        : state.kind === 'update'
          ? t('marketplace.updateAvailable', { version: state.version })
          : t('marketplace.install')}
    </Button>
  );
}

// ---- browse -------------------------------------------------------------------------------------------------

interface ListingsState {
  /** The query these results belong to; results of another query read as loading. */
  key: string;
  items: Listing[];
  nextCursor: string | null;
  status: 'loading' | 'ok' | 'error';
  more: 'idle' | 'loading' | 'error';
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function useListings(q: string, category: Category | null) {
  const [attempt, setAttempt] = useState(0);
  const key = `${attempt}|${category ?? ''}|${q}`;
  const [state, setState] = useState<ListingsState>({
    key: '',
    items: [],
    nextCursor: null,
    status: 'loading',
    more: 'idle',
  });

  useEffect(() => {
    let live = true;
    marketplaceApi
      .list({ q: q || undefined, category: category ?? undefined })
      .then(
        (page) =>
          live && setState({ key, items: page.items, nextCursor: page.nextCursor ?? null, status: 'ok', more: 'idle' }),
      )
      .catch(() => live && setState({ key, items: [], nextCursor: null, status: 'error', more: 'idle' }));
    return () => {
      live = false;
    };
  }, [key, q, category]);

  const current: ListingsState =
    state.key === key ? state : { key, items: [], nextCursor: null, status: 'loading', more: 'idle' };
  const loadMore = () => {
    const cursor = current.nextCursor;
    if (!cursor || current.more === 'loading') return;
    // Page results only land on the query they were requested for.
    const update = (fn: (s: ListingsState) => ListingsState) => setState((s) => (s.key === key ? fn(s) : s));
    update((s) => ({ ...s, more: 'loading' }));
    marketplaceApi
      .list({ q: q || undefined, category: category ?? undefined, cursor })
      .then((page) =>
        update((s) => ({
          ...s,
          items: [...s.items, ...page.items],
          nextCursor: page.nextCursor ?? null,
          more: 'idle',
        })),
      )
      .catch(() => update((s) => ({ ...s, more: 'error' })));
  };

  return { ...current, retry: () => setAttempt((a) => a + 1), loadMore };
}

function BrowseList({
  query,
  stateOf,
  installer,
  onOpen,
}: {
  query: string;
  stateOf: (listing: Listing) => ListingState;
  installer: Installer;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation('plugins');
  const [category, setCategory] = useState<Category | null>(null);
  const q = useDebounced(query.trim(), SEARCH_DEBOUNCE_MS);
  const listings = useListings(q, category);

  return (
    <>
      <div role="group"
        aria-label={t('marketplace.categoryFilter')}
        className="flex flex-wrap gap-1">
        {[null, ...CATEGORIES].map((c) => (
          <Button
            key={c ?? 'all'}
            size="sm"
            variant={category === c ? 'secondary' : 'ghost'}
            aria-pressed={category === c}
            className="h-7 rounded-full px-2.5 text-xs"
            onClick={() => setCategory(c)}
          >
            {t(`marketplace.categories.${c ?? 'all'}`)}
          </Button>
        ))}
      </div>

      {listings.status === 'error' ? (
        <LoadError onRetry={listings.retry} />
      ) : listings.status === 'loading' ? (
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : listings.items.length === 0 ? (
        <EmptyState icon={<PackageSearch />}
          title={t('marketplace.empty')}
          description={t('marketplace.emptyHint')} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {listings.items.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                state={stateOf(listing)}
                installer={installer}
                onOpen={() => onOpen(listing.id)}
              />
            ))}
          </div>
          {listings.more === 'error' && <LoadError onRetry={listings.loadMore} />}
          {listings.nextCursor && listings.more !== 'error' && (
            <Button
              variant="outline"
              size="sm"
              className="self-center"
              disabled={listings.more === 'loading'}
              onClick={listings.loadMore}
            >
              {t('marketplace.loadMore')}
            </Button>
          )}
        </>
      )}
    </>
  );
}

function LoadError({ onRetry, title }: { onRetry: () => void; title?: string }) {
  const { t } = useTranslation('plugins');
  return (
    <Banner
      tone="destructive"
      role="alert"
      icon={<AlertTriangle />}
      actions={
        <Button size="sm"
          variant="outline"
          onClick={onRetry}>
          {t('marketplace.retry')}
        </Button>
      }
    >
      <span className="block font-medium">{title ?? t('marketplace.loadFailed')}</span>
      <span className="block text-xs text-muted-foreground">{t('marketplace.loadFailedHint')}</span>
    </Banner>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card/60 p-2.5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-full" />
      <div className="flex gap-1">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}

function ListingMeta({ listing }: { listing: Listing }) {
  const { t } = useTranslation('plugins');
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
      {listing.author && <span className="truncate">{t('marketplace.by', { author: listing.author })}</span>}
      {listing.verified && (
        <span className="inline-flex items-center gap-0.5 text-success">
          <BadgeCheck className="size-3.5"
            aria-hidden />
          {t('marketplace.verified')}
        </span>
      )}
      <span aria-hidden>·</span>
      <span className="tabular-nums">{t('marketplace.installs', { count: listing.installs })}</span>
    </div>
  );
}

function AccessChips({ permissions, network }: { permissions: Permission[]; network: string[] }) {
  const { t } = useTranslation('plugins');
  if (permissions.length === 0 && network.length === 0)
    return <span className="text-muted-foreground">{t('marketplace.noAccess')}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {permissions.map((p) => (
        <Badge
          key={p}
          variant="outline"
          className={cn(TONE_BADGE.muted, 'rounded-sm px-1.5 py-0')}
          title={t(permissionKey(p, 'description'))}
        >
          <ShieldCheck aria-hidden />
          {t(permissionKey(p, 'label'))}
        </Badge>
      ))}
      {network.map((host) => (
        <Badge
          key={host}
          variant="outline"
          className="rounded-sm border-warning/35 bg-warning/10 px-1.5 py-0 text-warning"
          title={t('consent.network', { host })}
        >
          <Globe aria-hidden />
          {host}
        </Badge>
      ))}
    </div>
  );
}

function ListingCard({
  listing,
  state,
  installer,
  onOpen,
}: {
  listing: Listing;
  state: ListingState;
  installer: Installer;
  onOpen: () => void;
}) {
  return (
    <article className="flex flex-col gap-2 rounded-md border border-border bg-card/60 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Button
            variant="link"
            className="h-auto max-w-full justify-start truncate p-0 text-sm font-semibold text-foreground"
            onClick={onOpen}
          >
            {listing.name}
          </Button>
          <ListingMeta listing={listing} />
        </div>
        <ListingAction listing={listing}
          state={state}
          installer={installer} />
      </div>
      {listing.summary && <p className="line-clamp-2 text-muted-foreground">{listing.summary}</p>}
      <AccessChips permissions={listing.permissions}
        network={listing.network} />
    </article>
  );
}

// ---- detail -------------------------------------------------------------------------------------------------

function ListingDetailView({
  id,
  stateOf,
  installedVersion,
  installer,
  onBack,
}: {
  id: string;
  stateOf: (listing: Pick<Listing, 'id' | 'latestVersion'>) => ListingState;
  installedVersion?: string;
  installer: Installer;
  onBack: () => void;
}) {
  const { t } = useTranslation('plugins');
  const [attempt, setAttempt] = useState(0);
  const key = `${attempt}|${id}`;
  // Keyed by request: a result for another id/attempt reads as loading.
  const [loaded, setLoaded] = useState<{ key: string; detail: ListingDetail | null }>({ key: '', detail: null });

  useEffect(() => {
    let live = true;
    marketplaceApi
      .get(id)
      .then((detail) => live && setLoaded({ key, detail }))
      .catch(() => live && setLoaded({ key, detail: null }));
    return () => {
      live = false;
    };
  }, [key, id]);

  const settled = loaded.key === key;
  const detail = settled ? loaded.detail : null;
  const failed = settled && !loaded.detail;

  const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
  const error = installer.errors[id];

  return (
    <>
      <Button variant="ghost"
        size="sm"
        className="self-start"
        onClick={onBack}>
        <ArrowLeft className="size-4" />
        {t('marketplace.detail.back')}
      </Button>

      {failed ? (
        <LoadError title={t('marketplace.detail.loadFailed')}
          onRetry={() => setAttempt((a) => a + 1)} />
      ) : !detail ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-sm font-semibold">{detail.name}</h2>
                <span className="tabular-nums text-muted-foreground">{detail.latestVersion}</span>
              </div>
              <ListingMeta listing={detail} />
            </div>
            <ListingAction listing={detail}
              state={stateOf(detail)}
              installer={installer} />
          </div>
          {detail.summary && <p className="text-muted-foreground">{detail.summary}</p>}
          {error && (
            <Banner tone="destructive"
              role="alert"
              icon={<AlertTriangle />}>
              <span className="block font-medium">{t('marketplace.installFailed', { name: detail.name })}</span>
              <span className="block text-xs text-muted-foreground">{error}</span>
            </Banner>
          )}

          <section className="flex flex-col gap-1.5">
            <h3 className="font-semibold">{t('marketplace.detail.access')}</h3>
            {detail.permissions.length === 0 && detail.network.length === 0 ? (
              <p className="text-muted-foreground">{t('consent.nothing')}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {detail.permissions.map((p) => (
                  <li key={p}
                    className="flex items-start gap-2 rounded-md border border-border bg-card/60 p-2">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden />
                    <span>
                      <span className="font-medium">{t(permissionKey(p, 'label'))}</span>
                      <span className="block text-muted-foreground">{t(permissionKey(p, 'description'))}</span>
                    </span>
                  </li>
                ))}
                {detail.network.map((host) => (
                  <li
                    key={host}
                    className="flex items-start gap-2 rounded-md border border-warning/35 bg-warning/10 p-2"
                  >
                    <Globe className="mt-0.5 size-3.5 shrink-0 text-warning"
                      aria-hidden />
                    <span>
                      <span className="font-medium">{t('consent.network', { host })}</span>
                      <span className="block text-muted-foreground">{t('consent.networkHint')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-1.5">
            <h3 className="font-semibold">{t('marketplace.detail.versions')}</h3>
            {detail.versions.length === 0 ? (
              <p className="text-muted-foreground">{t('marketplace.detail.noVersions')}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {detail.versions.map((v) => {
                  const blocked = v.status === 'blocked' || !!isBlocked(marketplace.blocklist, id, v.version);
                  const date = Date.parse(v.publishedAt);
                  return (
                    <li key={v.version}
                      className="flex items-center gap-2 px-2.5 py-1.5">
                      <span className="font-medium tabular-nums">{v.version}</span>
                      {v.version === detail.latestVersion && (
                        <Badge variant="outline"
                          className={cn(TONE_BADGE.muted, 'rounded-sm px-1.5 py-0')}>
                          {t('marketplace.detail.latest')}
                        </Badge>
                      )}
                      {v.version === installedVersion && (
                        <Badge variant="outline"
                          className={cn(TONE_BADGE.success, 'rounded-sm px-1.5 py-0')}>
                          {t('marketplace.detail.current')}
                        </Badge>
                      )}
                      {blocked && (
                        <Badge variant="outline"
                          className={cn(TONE_BADGE.destructive, 'rounded-sm px-1.5 py-0')}>
                          {t('marketplace.blocked')}
                        </Badge>
                      )}
                      {!Number.isNaN(date) && (
                        <span className="ml-auto text-muted-foreground">
                          {t('marketplace.detail.published', { date: dateFormat.format(date) })}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}

// ---- installed ----------------------------------------------------------------------------------------------

function InstalledList({ plugins, ready, onBrowse }: { plugins: PluginView[]; ready: boolean; onBrowse: () => void }) {
  const { t } = useTranslation('plugins');
  if (!ready)
    return (
      <div className="flex flex-col gap-2">
        {[0, 1].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  if (plugins.length === 0)
    return (
      <EmptyState
        icon={<Puzzle />}
        title={t('marketplace.emptyInstalled')}
        description={t('marketplace.emptyInstalledHint')}
        action={
          <Button size="sm"
            onClick={onBrowse}>
            {t('marketplace.browse')}
          </Button>
        }
      />
    );
  return (
    <ul className="flex flex-col gap-2">
      {plugins.map((view) => (
        <li key={view.installed.id}
          className="flex items-start gap-3 rounded-md border border-border bg-card/60 p-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-semibold">{view.installed.name}</span>
              <span className="tabular-nums text-muted-foreground">{view.installed.version}</span>
              <PluginSourceBadge view={view}
                className="rounded-sm px-1.5 py-0" />
              <PluginStatusBadge view={view}
                className="rounded-sm px-1.5 py-0" />
            </div>
            {view.manifest?.description && <p className="text-muted-foreground">{view.manifest.description}</p>}
            <PluginStatusText view={view} />
            {view.manifest && (
              <AccessChips permissions={view.installed.granted.permissions}
                network={view.installed.granted.network} />
            )}
            <div className="flex">
              <ReviewUpdateButton view={view} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <PluginEnableSwitch view={view} />
            <UninstallPluginButton view={view} />
          </div>
        </li>
      ))}
    </ul>
  );
}
